import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'google-jobs-source' });

interface SerpApiJob {
  job_id: string;
  title: string;
  company_name: string;
  location: string;
  description: string;
  detected_extensions?: {
    posted_at?: string;
    salary?: string;
    schedule_type?: string;
  };
  apply_options?: Array<{ link: string; title: string }>;
  via?: string;
}

@Injectable()
export class GoogleJobsSource implements IJobSource {
  readonly name = 'google_jobs';
  readonly channel = 'google_jobs';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      logger.warn('SerpAPI key not configured for Google Jobs');
      return;
    }

    const query = criteria.keywords.join(' ') + (criteria.locations?.[0] ? ` in ${criteria.locations[0]}` : '');

    const params = new URLSearchParams({
      engine: 'google_jobs',
      q: query,
      api_key: apiKey,
    });
    if (criteria.postedWithinDays && criteria.postedWithinDays <= 1) {
      params.set('chips', 'date_posted:today');
    } else if (criteria.postedWithinDays && criteria.postedWithinDays <= 3) {
      params.set('chips', 'date_posted:3days');
    } else if (criteria.postedWithinDays && criteria.postedWithinDays <= 7) {
      params.set('chips', 'date_posted:week');
    }

    const url = `https://serpapi.com/search.json?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        logger.warn({ status: response.status }, 'SerpAPI request failed');
        return;
      }

      const data = await response.json() as { jobs_results?: SerpApiJob[] };

      for (const job of data.jobs_results || []) {
        if (criteria.excludeCompanies?.some(c =>
          job.company_name.toLowerCase().includes(c.toLowerCase())
        )) continue;

        const applyUrl = job.apply_options?.[0]?.link || '';

        yield {
          externalId: job.job_id,
          sourceChannel: 'google_jobs',
          sourceUrl: applyUrl || `https://www.google.com/search?q=${encodeURIComponent(job.title + ' ' + job.company_name)}`,
          title: job.title,
          companyName: job.company_name,
          location: job.location || undefined,
          description: job.description,
          postedAt: new Date(),
          applyUrl: applyUrl || undefined,
        } as RawJobListing;
      }
    } catch (err) {
      logger.error({ error: err }, 'Google Jobs search error');
    }
  }

  async validate(): Promise<JobValidationResult> {
    return { isValid: true, status: 'valid' };
  }
}
