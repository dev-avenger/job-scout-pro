import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { stripHtml } from './html-utils.js';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'themuse-source' });

// Restrict to engineering-adjacent categories so we do not trawl the entire
// (mostly non-tech) Muse index. Two pages of 20 per category keeps it light.
const MUSE_CATEGORIES = ['Software Engineering', 'Data Science', 'IT'];
const MUSE_PAGES = 2;

interface MuseJob {
  id?: number;
  name?: string;
  contents?: string;
  publication_date?: string;
  locations?: Array<{ name?: string }>;
  categories?: Array<{ name?: string }>;
  levels?: Array<{ name?: string }>;
  refs?: { landing_page?: string };
  company?: { name?: string };
}

/** Key-free source using The Muse public jobs API. */
@Injectable()
export class TheMuseSource implements IJobSource {
  readonly name = 'themuse';
  readonly channel = 'themuse';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const keywords = criteria.keywords.map((k) => k.toLowerCase());
    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];
    const seen = new Set<number>();

    for (let page = 1; page <= MUSE_PAGES; page++) {
      let results: MuseJob[];
      try {
        const params = new URLSearchParams({ page: String(page) });
        for (const category of MUSE_CATEGORIES) params.append('category', category);
        const response = await fetch(`https://www.themuse.com/api/public/jobs?${params}`, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          logger.warn({ status: response.status, page }, 'The Muse API request failed');
          return;
        }
        const data = (await response.json()) as { results?: MuseJob[] };
        results = data.results ?? [];
      } catch (err) {
        logger.error({ error: err, page }, 'The Muse API fetch failed');
        return;
      }

      logger.info({ count: results.length, page }, 'Fetched The Muse jobs');

      for (const job of results) {
        if (!job || !job.name || !job.company?.name) continue;
        if (job.id != null) {
          if (seen.has(job.id)) continue;
          seen.add(job.id);
        }

        const title = job.name;
        const companyName = job.company.name;
        const description = stripHtml(job.contents || '');
        const categories = (job.categories ?? []).map((c) => c.name ?? '');
        const fullText = (title + ' ' + description + ' ' + categories.join(' ')).toLowerCase();

        if (!matchesKeywords(fullText, keywords)) continue;
        if (excludeCompanies.some((c) => companyName.toLowerCase().includes(c))) continue;

        const postedAt = job.publication_date ? new Date(job.publication_date) : new Date();
        if (criteria.postedWithinDays) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - criteria.postedWithinDays);
          if (postedAt < cutoff) continue;
        }

        const url = job.refs?.landing_page || 'https://www.themuse.com/search';
        const location = (job.locations ?? [])
          .map((l) => l.name)
          .filter(Boolean)
          .join(', ');

        yield {
          externalId: job.id != null ? String(job.id) : undefined,
          sourceChannel: 'themuse',
          sourceUrl: url,
          title,
          companyName,
          location: location || undefined,
          locationType: /remote|flexible/i.test(location) ? 'remote' : undefined,
          description: description.substring(0, 2000),
          requiredSkills: categories,
          experienceLevel: job.levels?.[0]?.name,
          postedAt,
          applyUrl: url,
        } as RawJobListing;
      }
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
