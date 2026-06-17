import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { stripHtml } from './html-utils.js';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'himalayas-source' });

const HIMALAYAS_API_URL = 'https://himalayas.app/jobs/api?limit=100';

interface HimalayasJob {
  title?: string;
  excerpt?: string;
  companyName?: string;
  employmentType?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  seniority?: string[] | string;
  locationRestrictions?: string[];
  categories?: string[];
  description?: string;
  pubDate?: number; // unix seconds
  expiryDate?: number;
  applicationLink?: string;
  guid?: string;
}

/** Key-free source using the public Himalayas remote-jobs API. */
@Injectable()
export class HimalayasSource implements IJobSource {
  readonly name = 'himalayas';
  readonly channel = 'himalayas';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const keywords = criteria.keywords.map((k) => k.toLowerCase());
    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];

    let jobs: HimalayasJob[];
    try {
      const response = await fetch(HIMALAYAS_API_URL, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        logger.warn({ status: response.status }, 'Himalayas API request failed');
        return;
      }
      const data = (await response.json()) as { jobs?: HimalayasJob[] };
      jobs = data.jobs ?? [];
    } catch (err) {
      logger.error({ error: err }, 'Himalayas API fetch failed');
      return;
    }

    logger.info({ count: jobs.length }, 'Fetched Himalayas jobs');

    for (const job of jobs) {
      if (!job || !job.title || !job.companyName) continue;

      const title = job.title;
      const description = stripHtml(job.description || job.excerpt || '');
      const categories = job.categories ?? [];
      const fullText = (title + ' ' + description + ' ' + categories.join(' ')).toLowerCase();

      if (!matchesKeywords(fullText, keywords)) continue;
      if (excludeCompanies.some((c) => job.companyName!.toLowerCase().includes(c))) continue;

      const postedAt = job.pubDate ? new Date(job.pubDate * 1000) : new Date();
      if (criteria.postedWithinDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - criteria.postedWithinDays);
        if (postedAt < cutoff) continue;
      }

      if (criteria.salaryMin && job.maxSalary && job.maxSalary < criteria.salaryMin) continue;

      const url = job.applicationLink || 'https://himalayas.app/jobs';
      const seniority = Array.isArray(job.seniority) ? job.seniority.join(', ') : job.seniority;

      yield {
        externalId: job.guid,
        sourceChannel: 'himalayas',
        sourceUrl: url,
        title,
        companyName: job.companyName,
        location: job.locationRestrictions?.join(', ') || 'Remote',
        locationType: 'remote',
        salaryMin: job.minSalary,
        salaryMax: job.maxSalary,
        salaryCurrency: job.currency,
        description: description.substring(0, 2000),
        requiredSkills: categories,
        experienceLevel: seniority,
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
