import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'brightspyre-source' });

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/**
 * BrightSpyre (brightspyre.com) — a Pakistani job board. No public API; the
 * /jobs listing renders job links in static HTML, so we parse those and
 * keyword-filter by title. Company/location are not exposed per card, so the
 * user's location preference is used.
 */
@Injectable()
export class BrightSpyreSource implements IJobSource {
  readonly name = 'brightspyre';
  readonly channel = 'brightspyre';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    let html: string;
    try {
      const res = await fetch('https://www.brightspyre.com/jobs', {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, 'BrightSpyre request failed');
        return;
      }
      html = await res.text();
    } catch (err) {
      logger.error({ error: err }, 'BrightSpyre fetch failed');
      return;
    }

    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const locationPref = criteria.locations?.[0] || 'Pakistan';
    const results: RawJobListing[] = [];

    $('a[href*="/jobs/"]')
      .filter((_, e) => ($(e).attr('href') || '').split('/').filter(Boolean).length >= 2)
      .each((_, el) => {
        const a = $(el);
        const href = a.attr('href') || '';
        const title = a.text().replace(/\s+/g, ' ').trim();
        if (!href || seen.has(href)) return;
        if (/^apply now$/i.test(title) || title.length < 4) return; // skip Apply buttons
        seen.add(href);
        if (!matchesKeywords(title.toLowerCase(), criteria.keywords)) return;

        const url = href.startsWith('http') ? href : `https://www.brightspyre.com${href}`;
        results.push({
          externalId: href.split('/').pop(),
          sourceChannel: 'brightspyre',
          sourceUrl: url,
          title,
          companyName: 'BrightSpyre',
          location: locationPref,
          postedAt: new Date(),
          applyUrl: url,
        } as RawJobListing);
      });

    logger.info({ count: results.length }, 'BrightSpyre jobs parsed');
    for (const r of results) yield r;
  }

  async validate(_job: RawJobListing): Promise<JobValidationResult> {
    return { isValid: true, status: 'valid' };
  }
}
