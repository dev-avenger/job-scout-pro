import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'adzuna-source' });

interface AdzunaResult {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  created: string;
  category?: { label: string };
}

@Injectable()
export class AdzunaApiSource implements IJobSource {
  readonly name = 'adzuna_api';
  readonly channel = 'adzuna_api';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    const country = process.env.ADZUNA_COUNTRY || 'us';

    if (!appId || !appKey) {
      logger.warn('Adzuna API credentials not configured');
      return;
    }

    const query = criteria.keywords.join(' ');
    const location = criteria.locations?.[0] || '';

    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: query,
      where: location,
      results_per_page: '50',
      sort_by: 'date',
      max_days_old: String(criteria.postedWithinDays || 7),
    });
    if (criteria.salaryMin) params.set('salary_min', String(criteria.salaryMin));

    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        logger.warn({ status: response.status }, 'Adzuna API request failed');
        return;
      }

      const data = await response.json() as { results: AdzunaResult[] };

      for (const result of data.results || []) {
        if (criteria.excludeCompanies?.some(c =>
          result.company.display_name.toLowerCase().includes(c.toLowerCase())
        )) continue;

        yield {
          externalId: String(result.id),
          sourceChannel: 'adzuna_api',
          sourceUrl: result.redirect_url,
          title: result.title,
          companyName: result.company.display_name,
          location: result.location.display_name || result.location.area?.join(', '),
          description: result.description,
          salaryMin: result.salary_min,
          salaryMax: result.salary_max,
          salaryCurrency: 'USD',
          postedAt: new Date(result.created),
          applyUrl: result.redirect_url,
        } as RawJobListing;
      }
    } catch (err) {
      logger.error({ error: err }, 'Adzuna search error');
    }
  }

  async validate(job: RawJobListing): Promise<JobValidationResult> {
    try {
      const response = await fetch(job.sourceUrl, { method: 'HEAD' });
      return { isValid: response.ok, status: response.ok ? 'valid' : 'expired' };
    } catch {
      return { isValid: false, status: 'expired' };
    }
  }
}
