import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { stripHtml } from './html-utils.js';

const logger = createLogger({ name: 'jooble-source' });

interface JoobleJob {
  id?: number | string;
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
}

/**
 * Jooble aggregator (jooble.org) — strong coverage for Pakistan and 60+ other
 * countries. Requires a free API key: https://jooble.org/api/about
 * Set JOOBLE_API_KEY in the API .env; the source skips silently without it.
 */
@Injectable()
export class JoobleSource implements IJobSource {
  readonly name = 'jooble';
  readonly channel = 'jooble';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const apiKey = process.env.JOOBLE_API_KEY;
    if (!apiKey) {
      logger.debug('JOOBLE_API_KEY not set, skipping Jooble');
      return;
    }

    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];
    const location = criteria.locations?.[0] ?? 'Pakistan';
    const seen = new Set<string>();

    // Jooble takes one keyword phrase per request; query each role separately
    for (const keyword of criteria.keywords.slice(0, 4)) {
      let jobs: JoobleJob[];
      try {
        const response = await fetch(`https://jooble.org/api/${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: keyword, location, page: 1 }),
        });
        if (!response.ok) {
          logger.warn({ status: response.status }, 'Jooble API request failed');
          return;
        }
        const data = (await response.json()) as { jobs?: JoobleJob[] };
        jobs = data.jobs ?? [];
      } catch (err) {
        logger.error({ error: err }, 'Jooble API fetch failed');
        return;
      }

      logger.info({ keyword, location, count: jobs.length }, 'Fetched Jooble jobs');

      for (const job of jobs) {
        if (!job || !job.title || !job.link) continue;
        const id = job.id != null ? String(job.id) : job.link;
        if (seen.has(id)) continue;
        seen.add(id);

        const companyName = job.company?.trim() || job.source?.trim() || 'Unknown';
        if (excludeCompanies.some((c) => companyName.toLowerCase().includes(c))) continue;

        const postedAt = job.updated ? new Date(job.updated) : new Date();
        if (criteria.postedWithinDays) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - criteria.postedWithinDays);
          if (postedAt < cutoff) continue;
        }

        yield {
          externalId: id,
          sourceChannel: 'jooble',
          sourceUrl: job.link,
          title: job.title,
          companyName,
          location: job.location || location,
          description: stripHtml(job.snippet || '').substring(0, 2000),
          postedAt,
          applyUrl: job.link,
        } as RawJobListing;
      }
    }
  }

  async validate(_job: RawJobListing): Promise<JobValidationResult> {
    // Jooble links redirect through their tracker; HEAD checks are unreliable
    return { isValid: true, status: 'valid' };
  }
}
