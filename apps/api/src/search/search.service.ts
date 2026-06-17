import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { generateId } from '@auto-job-apply/shared-utils';
import { createLogger } from '@auto-job-apply/shared-utils';
import type { JobFilter, SearchCriteria } from '@auto-job-apply/shared-types';
import { SEARCH_REPOSITORY, JOB_SOURCES } from './search.constants.js';
import { EVENT_BUS } from '../core/event-bus/event-bus.constants.js';
import type { ISearchRepository } from './interfaces/search-repository.interface.js';
import type { ISearchService } from './interfaces/search-service.interface.js';
import type { IJobSource } from './interfaces/job-source.interface.js';
import type { IEventBus } from '../core/event-bus/interfaces/event-bus.interface.js';
import { DeduplicationEngine } from './deduplication-engine.js';
import { JobValidator } from './job-validator.js';

const logger = createLogger({ name: 'search-service' });

@Injectable()
export class SearchService implements ISearchService {
  constructor(
    @Inject(SEARCH_REPOSITORY) private readonly repo: ISearchRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(JOB_SOURCES) private readonly sources: IJobSource[],
    private readonly deduplicationEngine: DeduplicationEngine,
    private readonly jobValidator: JobValidator,
  ) {}

  async getFacets(userId: string) {
    return this.repo.getFacets(userId);
  }

  async listJobs(userId: string, filters: JobFilter) {
    const { items, total } = await this.repo.findJobsByUser(userId, filters);
    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async getJob(userId: string, jobId: string) {
    const job = await this.repo.findJobById(userId, jobId);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async addJobByUrl(userId: string, url: string) {
    const jobId = generateId();
    await this.repo.insertJob({
      id: jobId,
      userId,
      sourceChannel: 'manual_url',
      sourceUrl: url,
      title: 'Pending Analysis',
      companyName: 'Pending Analysis',
      validationStatus: 'pending',
    });
    return { id: jobId };
  }

  async deleteJob(userId: string, jobId: string) {
    const job = await this.repo.findJobById(userId, jobId);
    if (!job) throw new NotFoundException('Job not found');
    await this.repo.deleteJob(jobId);
  }

  /**
   * Preview search for the onboarding wizard: returns a small sample of
   * matching jobs without persisting anything or emitting events.
   */
  async dryRunSearch(
    _userId: string,
    criteria: SearchCriteria,
  ): Promise<Array<{ title: string; company: string; location: string; salary?: string }>> {
    const MAX_RESULTS = 10;
    const results: Array<{ title: string; company: string; location: string; salary?: string }> =
      [];
    const seen = new Set<string>();
    const disabled = new Set(criteria.disabledSources ?? []);

    for (const source of this.sources) {
      if (results.length >= MAX_RESULTS) break;
      if (disabled.has(source.name)) continue;
      try {
        for await (const rawJob of source.search(criteria)) {
          const key = `${rawJob.title}|${rawJob.companyName}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          // Same liveness/quality gate as the real search, so previews never
          // surface closed postings
          const validation = await this.jobValidator.validate(rawJob);
          if (!validation.isValid) continue;
          const salary =
            rawJob.salaryMin || rawJob.salaryMax
              ? [rawJob.salaryMin, rawJob.salaryMax]
                  .filter(Boolean)
                  .map((n) => `${rawJob.salaryCurrency ?? '$'}${Number(n).toLocaleString()}`)
                  .join(' – ')
              : undefined;

          results.push({
            title: rawJob.title,
            company: rawJob.companyName,
            location: rawJob.location ?? 'Not specified',
            salary,
          });

          if (results.length >= MAX_RESULTS) break;
        }
      } catch (err) {
        logger.error({ error: err, source: source.name }, 'Dry-run source search failed');
      }
    }

    return results;
  }

  async runSearch(userId: string, criteria: SearchCriteria): Promise<number> {
    let discoveredCount = 0;

    const disabled = new Set(criteria.disabledSources ?? []);
    const activeSources = this.sources.filter((s) => !disabled.has(s.name));

    await this.eventBus.emit({
      id: generateId(),
      timestamp: new Date(),
      userId,
      type: 'search.started',
      data: { keywords: criteria.keywords, sourceCount: activeSources.length },
    });

    for (const source of activeSources) {
      let sourceDiscovered = 0;
      await this.eventBus.emit({
        id: generateId(),
        timestamp: new Date(),
        userId,
        type: 'search.source.started',
        data: { source: source.name },
      });
      try {
        for await (const rawJob of source.search(criteria)) {
          const validation = await this.jobValidator.validate(rawJob);
          if (!validation.isValid) continue;

          const dupResult = await this.deduplicationEngine.isDuplicate(userId, rawJob);
          if (dupResult.isDuplicate) continue;

          const jobId = generateId();
          await this.repo.insertJob({
            id: jobId,
            userId,
            externalId: rawJob.externalId,
            sourceChannel: rawJob.sourceChannel,
            sourceUrl: rawJob.sourceUrl,
            title: rawJob.title,
            companyName: rawJob.companyName,
            location: rawJob.location,
            locationType: rawJob.locationType,
            description: rawJob.description,
            requiredSkills: rawJob.requiredSkills,
            experienceLevel: rawJob.experienceLevel,
            applyUrl: rawJob.applyUrl,
            applyMethod: rawJob.applyMethod,
            validationStatus: 'valid',
          });

          discoveredCount++;
          sourceDiscovered++;

          await this.eventBus.emit({
            id: generateId(),
            timestamp: new Date(),
            userId,
            type: 'job.discovered',
            data: { jobId, source: source.name, title: rawJob.title, company: rawJob.companyName },
          });
        }
        await this.eventBus.emit({
          id: generateId(),
          timestamp: new Date(),
          userId,
          type: 'search.source.completed',
          data: { source: source.name, discovered: sourceDiscovered },
        });
      } catch (err) {
        logger.error({ error: err, source: source.name }, 'Source search failed');
        await this.eventBus.emit({
          id: generateId(),
          timestamp: new Date(),
          userId,
          type: 'search.source.failed',
          data: { source: source.name, error: err instanceof Error ? err.message : 'Unknown error' },
        });
      }
    }

    await this.eventBus.emit({
      id: generateId(),
      timestamp: new Date(),
      userId,
      type: 'search.completed',
      data: { discovered: discoveredCount },
    });

    return discoveredCount;
  }
}
