import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'indeed-source' });

@Injectable()
export class IndeedApiSource implements IJobSource {
  readonly name = 'indeed_api';
  readonly channel = 'indeed_api';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const query = criteria.keywords.join(' ');
    const location = criteria.locations?.[0] || '';

    // Build Indeed search URL
    const params = new URLSearchParams({
      q: query,
      l: location,
      sort: 'date',
      fromage: String(criteria.postedWithinDays || 7),
    });
    if (criteria.salaryMin) params.set('salary', String(criteria.salaryMin));

    const url = `https://www.indeed.com/jobs?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'Indeed fetch failed');
        return;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const jobCards = $('div.job_seen_beacon, div.jobsearch-ResultsList > div');

      for (let i = 0; i < jobCards.length; i++) {
        const card = jobCards.eq(i);
        const titleEl = card.find('h2.jobTitle a, a.jcs-JobTitle');
        const title = titleEl.text().trim();
        const href = titleEl.attr('href') || '';
        const companyName = card.find('span.companyName, [data-testid="company-name"]').text().trim();
        const jobLocation = card.find('div.companyLocation, [data-testid="text-location"]').text().trim();
        const snippet = card.find('div.job-snippet, td.resultContent div.heading6').text().trim();
        const externalId = card.attr('data-jk') || href.match(/jk=([a-f0-9]+)/)?.[1] || '';

        if (!title || !companyName) continue;
        if (criteria.excludeCompanies?.some(c => companyName.toLowerCase().includes(c.toLowerCase()))) continue;

        const sourceUrl = href.startsWith('http') ? href : `https://www.indeed.com${href}`;

        yield {
          externalId,
          sourceChannel: 'indeed_api',
          sourceUrl,
          title,
          companyName,
          location: jobLocation || undefined,
          description: snippet || undefined,
          postedAt: new Date(),
          applyUrl: sourceUrl,
        } as RawJobListing;
      }
    } catch (err) {
      logger.error({ error: err }, 'Indeed search error');
    }
  }

  async validate(job: RawJobListing): Promise<JobValidationResult> {
    try {
      const response = await fetch(job.sourceUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      return { isValid: response.ok, status: response.ok ? 'valid' : 'expired' };
    } catch {
      return { isValid: false, status: 'expired' };
    }
  }
}
