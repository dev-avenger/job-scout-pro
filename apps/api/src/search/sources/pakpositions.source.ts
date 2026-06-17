import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'pakpositions-source' });

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/**
 * PakPositions (pakpositions.com) — a free Pakistani job board. The
 * /search-jobs listing exposes job links in static HTML; parse and
 * keyword-filter by title.
 */
@Injectable()
export class PakPositionsSource implements IJobSource {
  readonly name = 'pakpositions';
  readonly channel = 'pakpositions';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    let html: string;
    try {
      // The home page lists current jobs as /jobs/<slug> links; /search-jobs is
      // just the search form.
      const res = await fetch('https://www.pakpositions.com/', {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, 'PakPositions request failed');
        return;
      }
      html = await res.text();
    } catch (err) {
      logger.error({ error: err }, 'PakPositions fetch failed');
      return;
    }

    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const locationPref = criteria.locations?.[0] || 'Pakistan';
    const results: RawJobListing[] = [];

    $('a[href*="/jobs/"]').each((_, el) => {
      const a = $(el);
      const href = a.attr('href') || '';
      const title = a.text().replace(/\s+/g, ' ').trim();
      if (!href || seen.has(href)) return;
      if (/^apply now$/i.test(title) || title.length < 4) return; // skip Apply buttons
      seen.add(href);
      if (!matchesKeywords(title.toLowerCase(), criteria.keywords)) return;

      const url = href.startsWith('http') ? href : `https://www.pakpositions.com${href}`;
      results.push({
        externalId: href.split('/').pop(),
        sourceChannel: 'pakpositions',
        sourceUrl: url,
        title,
        companyName: 'PakPositions',
        location: locationPref,
        postedAt: new Date(),
        applyUrl: url,
      } as RawJobListing);
    });

    logger.info({ count: results.length }, 'PakPositions jobs parsed');
    for (const r of results) yield r;
  }

  async validate(_job: RawJobListing): Promise<JobValidationResult> {
    return { isValid: true, status: 'valid' };
  }
}
