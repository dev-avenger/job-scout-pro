import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { stripHtml } from './html-utils.js';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'jobicy-source' });

const JOBICY_API_URL = 'https://jobicy.com/api/v2/remote-jobs?count=50';

interface JobicyJob {
  id?: number | string;
  url?: string;
  jobSlug?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string[] | string;
  jobType?: string[] | string;
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
}

/** Key-free source using Jobicy's public remote-jobs API. */
@Injectable()
export class JobicySource implements IJobSource {
  readonly name = 'jobicy';
  readonly channel = 'jobicy';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const keywords = criteria.keywords.map((k) => k.toLowerCase());
    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];

    let jobs: JobicyJob[];
    try {
      const response = await fetch(JOBICY_API_URL, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        logger.warn({ status: response.status }, 'Jobicy API request failed');
        return;
      }
      const data = (await response.json()) as { jobs?: JobicyJob[] };
      jobs = data.jobs ?? [];
    } catch (err) {
      logger.error({ error: err }, 'Jobicy API fetch failed');
      return;
    }

    logger.info({ count: jobs.length }, 'Fetched Jobicy jobs');

    for (const job of jobs) {
      if (!job || !job.jobTitle || !job.companyName) continue;

      const title = job.jobTitle;
      const description = stripHtml(job.jobDescription || job.jobExcerpt || '');
      const industries = Array.isArray(job.jobIndustry)
        ? job.jobIndustry
        : job.jobIndustry
          ? [job.jobIndustry]
          : [];
      const fullText = (title + ' ' + description + ' ' + industries.join(' ')).toLowerCase();

      if (!matchesKeywords(fullText, keywords)) continue;
      if (excludeCompanies.some((c) => job.companyName!.toLowerCase().includes(c))) continue;

      const postedAt = job.pubDate ? new Date(job.pubDate) : new Date();
      if (criteria.postedWithinDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - criteria.postedWithinDays);
        if (postedAt < cutoff) continue;
      }

      const url = job.url || `https://jobicy.com/jobs/${job.jobSlug ?? ''}`;

      yield {
        externalId: job.id != null ? String(job.id) : undefined,
        sourceChannel: 'jobicy',
        sourceUrl: url,
        title,
        companyName: job.companyName,
        location: job.jobGeo || 'Remote',
        locationType: 'remote',
        description: description.substring(0, 2000),
        requiredSkills: industries,
        experienceLevel: job.jobLevel,
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
