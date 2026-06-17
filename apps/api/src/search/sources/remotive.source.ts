import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { stripHtml } from './html-utils.js';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'remotive-source' });

const REMOTIVE_API_URL = 'https://remotive.com/api/remote-jobs?limit=100';

interface RemotiveJob {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

/** Key-free source using Remotive's public remote-jobs API. */
@Injectable()
export class RemotiveSource implements IJobSource {
  readonly name = 'remotive';
  readonly channel = 'remotive';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const keywords = criteria.keywords.map((k) => k.toLowerCase());
    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];

    let jobs: RemotiveJob[];
    try {
      const response = await fetch(REMOTIVE_API_URL, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        logger.warn({ status: response.status }, 'Remotive API request failed');
        return;
      }
      const data = (await response.json()) as { jobs?: RemotiveJob[] };
      jobs = data.jobs ?? [];
    } catch (err) {
      logger.error({ error: err }, 'Remotive API fetch failed');
      return;
    }

    logger.info({ count: jobs.length }, 'Fetched Remotive jobs');

    for (const job of jobs) {
      if (!job || !job.title || !job.company_name) continue;

      const title = job.title;
      const description = stripHtml(job.description || '');
      const tags = (job.tags || []).map((t) => String(t).toLowerCase());
      const fullText = (title + ' ' + description + ' ' + tags.join(' ')).toLowerCase();

      if (!matchesKeywords(fullText, keywords)) continue;
      if (excludeCompanies.some((c) => job.company_name!.toLowerCase().includes(c))) continue;

      const postedAt = job.publication_date ? new Date(job.publication_date) : new Date();
      if (criteria.postedWithinDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - criteria.postedWithinDays);
        if (postedAt < cutoff) continue;
      }

      const url = job.url || REMOTIVE_API_URL;

      yield {
        externalId: job.id != null ? String(job.id) : undefined,
        sourceChannel: 'remotive',
        sourceUrl: url,
        title,
        companyName: job.company_name,
        location: job.candidate_required_location || 'Remote',
        locationType: 'remote',
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
