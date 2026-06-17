import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { stripHtml } from './html-utils.js';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'remoteok-source' });

const REMOTEOK_API_URL = 'https://remoteok.com/api';

interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  apply_url?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  date?: string;
  epoch?: number;
  // The first array element is a legal notice / metadata object with this key.
  legal?: string;
}

/**
 * Key-free job source scraping the public RemoteOK JSON API.
 * No credentials required; all listings are remote by definition.
 */
@Injectable()
export class RemoteOkSource implements IJobSource {
  readonly name = 'remoteok';
  readonly channel = 'remoteok';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const keywords = criteria.keywords.map((k) => k.toLowerCase());
    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];

    let jobs: RemoteOkJob[];
    try {
      const response = await fetch(REMOTEOK_API_URL, {
        headers: { Accept: 'application/json', 'User-Agent': 'auto-job-apply' },
      });
      if (!response.ok) {
        logger.warn({ status: response.status }, 'RemoteOK API request failed');
        return;
      }
      jobs = (await response.json()) as RemoteOkJob[];
    } catch (err) {
      logger.error({ error: err }, 'RemoteOK search error');
      return;
    }

    if (!Array.isArray(jobs)) return;
    logger.info({ itemCount: jobs.length }, 'Fetched RemoteOK listings');

    for (const job of jobs) {
      // First element is a metadata/legal notice object, not a job.
      if (!job || job.legal !== undefined || !job.position || !job.company) continue;

      const title = job.position;
      const description = stripHtml(job.description || '');
      const tags = (job.tags || []).map((t) => String(t).toLowerCase());
      const fullText = (title + ' ' + description + ' ' + tags.join(' ')).toLowerCase();

      // Filter by keywords if provided (same heuristic as the RSS source)
      if (!matchesKeywords(fullText, keywords)) continue;

      if (excludeCompanies.some((c) => job.company!.toLowerCase().includes(c))) continue;

      const postedAt = job.epoch
        ? new Date(job.epoch * 1000)
        : job.date
          ? new Date(job.date)
          : new Date();
      if (criteria.postedWithinDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - criteria.postedWithinDays);
        if (postedAt < cutoff) continue;
      }

      const url = job.url || (job.slug ? `https://remoteok.com/remote-jobs/${job.slug}` : REMOTEOK_API_URL);

      yield {
        externalId: job.id !== undefined ? String(job.id) : undefined,
        sourceChannel: 'remoteok',
        sourceUrl: url,
        title,
        companyName: job.company,
        location: job.location || 'Remote',
        locationType: 'remote',
        description: description.substring(0, 2000),
        requiredSkills: job.tags || [],
        salaryMin: job.salary_min || undefined,
        salaryMax: job.salary_max || undefined,
        salaryCurrency: 'USD',
        postedAt,
        applyUrl: job.apply_url || url,
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
