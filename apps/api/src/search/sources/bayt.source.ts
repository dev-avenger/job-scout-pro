import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'bayt-source' });

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Bayt country slugs we can search. The user's first location preference
// selects the country; Pakistan is the default.
const KNOWN_COUNTRIES = [
  'pakistan',
  'india',
  'uae',
  'saudi-arabia',
  'qatar',
  'kuwait',
  'bahrain',
  'oman',
  'egypt',
  'jordan',
  'lebanon',
];

function keywordSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Bayt.com job board (Middle East & South Asia, including Pakistan).
 * No public API — parses the public search pages with a browser user agent.
 */
@Injectable()
export class BaytSource implements IJobSource {
  readonly name = 'bayt';
  readonly channel = 'bayt';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];

    const locationPref = criteria.locations?.[0]?.toLowerCase().replace(/\s+/g, '-');
    const country = locationPref && KNOWN_COUNTRIES.includes(locationPref) ? locationPref : 'pakistan';

    const seen = new Set<string>();
    // One search page per keyword, capped to keep runs fast
    const keywords = criteria.keywords.slice(0, 4);

    for (const keyword of keywords) {
      const url = `https://www.bayt.com/en/${country}/jobs/${keywordSlug(keyword)}-jobs/`;

      let html: string;
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
        });
        if (!response.ok) {
          logger.warn({ status: response.status, url }, 'Bayt request failed');
          continue;
        }
        html = await response.text();
      } catch (err) {
        logger.error({ error: err, url }, 'Bayt fetch failed');
        continue;
      }

      const $ = cheerio.load(html);
      const cards = $('li[data-js-job]');
      logger.info({ keyword, country, count: cards.length }, 'Parsed Bayt search page');

      for (let i = 0; i < cards.length; i++) {
        const card = cards.eq(i);
        const jobId = card.attr('data-job-id') || '';
        if (jobId && seen.has(jobId)) continue;
        if (jobId) seen.add(jobId);

        const titleEl = card.find('h2 a');
        const title = titleEl.text().trim();
        const href = titleEl.attr('href') || '';
        const companyName = card.find('.job-company-location-wrapper a.t-bold').first().text().trim();
        const location = card.find('.job-company-location-wrapper .t-mute span').first().text().trim();
        const description = card.find('.jb-descr').text().replace(/\s+/g, ' ').trim();

        if (!title || !companyName) continue;
        if (excludeCompanies.some((c) => companyName.toLowerCase().includes(c))) continue;

        // The page is already keyword-scoped, but apply the same matcher so
        // blacklist-style criteria behave consistently across sources.
        const fullText = `${title} ${description}`.toLowerCase();
        if (!matchesKeywords(fullText, criteria.keywords)) continue;

        const postedTs = card.find('[data-automation-jobActiveDate]').attr('data-automation-jobactivedate');
        const postedAt = postedTs ? new Date(Number(postedTs) * 1000) : new Date();
        if (criteria.postedWithinDays) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - criteria.postedWithinDays);
          if (postedAt < cutoff) continue;
        }

        const sourceUrl = href.startsWith('http') ? href : `https://www.bayt.com${href}`;

        yield {
          externalId: jobId || undefined,
          sourceChannel: 'bayt',
          sourceUrl,
          title,
          companyName,
          location: location || country,
          description: description.substring(0, 2000),
          postedAt,
          applyUrl: sourceUrl,
        } as RawJobListing;
      }
    }
  }

  async validate(job: RawJobListing): Promise<JobValidationResult> {
    try {
      const response = await fetch(job.sourceUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': BROWSER_UA },
      });
      return { isValid: response.ok, status: response.ok ? 'valid' : 'expired' };
    } catch {
      return { isValid: false, status: 'expired' };
    }
  }
}
