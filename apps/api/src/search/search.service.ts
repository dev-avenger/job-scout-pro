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

  async runSearch(userId: string, criteria: SearchCriteria): Promise<number> {
    let discoveredCount = 0;

    for (const source of this.sources) {
      try {
        for await (const rawJob of source.search(criteria)) {
          const validation = await this.jobValidator.validate(rawJob);
          if (!validation.isValid) continue;

          const isDuplicate = await this.deduplicationEngine.isDuplicate(userId, rawJob);
          if (isDuplicate) continue;

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

          await this.eventBus.emit({
            id: generateId(),
            timestamp: new Date(),
            userId,
            type: 'job.discovered',
            data: { jobId, source: source.name, title: rawJob.title, company: rawJob.companyName },
          });
        }
      } catch (err) {
        logger.error({ error: err, source: source.name }, 'Source search failed');
      }
    }

    return discoveredCount;
  }
}
