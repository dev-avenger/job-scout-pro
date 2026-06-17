import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { stripHtml } from './html-utils.js';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'arbeitnow-source' });

const ARBEITNOW_API_URL = 'https://www.arbeitnow.com/api/job-board-api';

interface ArbeitnowJob {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number; // unix seconds
}

/**
 * Key-free job source scraping the public Arbeitnow job board API.
 * No credentials required.
 */
@Injectable()
export class ArbeitnowSource implements IJobSource {
  readonly name = 'arbeitnow';
  readonly channel = 'arbeitnow';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const keywords = criteria.keywords.map((k) => k.toLowerCase());
    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];

    let jobs: ArbeitnowJob[];
    try {
      const response = await fetch(ARBEITNOW_API_URL, {
        headers: { Accept: 'application/json', 'User-Agent': 'auto-job-apply' },
      });
      if (!response.ok) {
        logger.warn({ status: response.status }, 'Arbeitnow API request failed');
        return;
      }
      const payload = (await response.json()) as { data?: ArbeitnowJob[] };
      jobs = payload.data || [];
    } catch (err) {
      logger.error({ error: err }, 'Arbeitnow search error');
      return;
    }

    logger.info({ itemCount: jobs.length }, 'Fetched Arbeitnow listings');

    for (const job of jobs) {
      if (!job || !job.title || !job.company_name) continue;

      // Respect remote-only preference (Arbeitnow flags remote explicitly)
      if (criteria.remoteOnly && !job.remote) continue;

      const title = job.title;
      const description = stripHtml(job.description || '');
      const tags = (job.tags || []).map((t) => String(t).toLowerCase());
      const fullText = (title + ' ' + description + ' ' + tags.join(' ')).toLowerCase();

      // Filter by keywords if provided (same heuristic as the RSS source)
      if (!matchesKeywords(fullText, keywords)) continue;

      if (excludeCompanies.some((c) => job.company_name!.toLowerCase().includes(c))) continue;

      const postedAt = job.created_at ? new Date(job.created_at * 1000) : new Date();
      if (criteria.postedWithinDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - criteria.postedWithinDays);
        if (postedAt < cutoff) continue;
      }

      const url = job.url || (job.slug ? `https://www.arbeitnow.com/jobs/${job.slug}` : ARBEITNOW_API_URL);

      yield {
        externalId: job.slug,
        sourceChannel: 'arbeitnow',
        sourceUrl: url,
        title,
        companyName: job.company_name,
        location: job.location || (job.remote ? 'Remote' : undefined),
        locationType: job.remote ? 'remote' : undefined,
        description: description.substring(0, 2000),
        requiredSkills: job.tags || [],
        postedAt,
        applyUrl: url,
      } as RawJobListing;
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
