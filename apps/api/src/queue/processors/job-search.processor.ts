import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { jobs, jobSources, userPreferences } from '@auto-job-apply/db';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { EVENT_BUS } from '../../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../../core/event-bus/interfaces/event-bus.interface.js';
import { DeduplicationEngine } from '../../search/deduplication-engine.js';
import { JobScorer, type JobScoreResult } from '../../search/job-scorer.js';
import { createLogger } from '@auto-job-apply/shared-utils';
import { randomUUID } from 'crypto';

const logger = createLogger({ name: 'job-search-processor' });

@Injectable()
@Processor('job-search')
export class JobSearchProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly deduplication: DeduplicationEngine,
    private readonly jobScorer: JobScorer,
    @InjectQueue('job-validation') private readonly validationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { userId, trigger } = job.data;
    logger.info({ jobId: job.id, userId, trigger }, 'Processing job search');

    if (!userId) {
      logger.warn('No userId provided, skipping');
      return;
    }

    // Load user preferences
    const prefs = await (this.db.select().from(userPreferences).where(eq(userPreferences.userId, userId) as any).limit(1) as any);
    const userPrefs = prefs[0] || {};

    // Load active job sources for this user
    const sources = await (this.db.select().from(jobSources).where(eq(jobSources.userId, userId) as any) as any);
    const activeSources = (sources as any[]).filter((s: any) => s.isActive);

    logger.info({ sourceCount: activeSources.length }, 'Found active sources');

    let totalDiscovered = 0;
    let totalDuplicates = 0;

    // For each active source, we would call the source adapter
    // For now, log and skip if no source adapters are configured
    for (const source of activeSources) {
      try {
        logger.info({ sourceType: source.sourceType, sourceId: source.id }, 'Searching source');
        // Source-specific search would happen here via IJobSource adapters
        // Results would be deduplicated, scored, and inserted
      } catch (err) {
        logger.error({ error: err, sourceId: source.id }, 'Source search failed');
      }
    }

    logger.info({ totalDiscovered, totalDuplicates, userId }, 'Job search complete');
  }

  async processDiscoveredJob(
    userId: string,
    rawJob: Record<string, unknown>,
    userPrefs: Record<string, unknown>,
  ): Promise<boolean> {
    const title = rawJob.title as string;
    const companyName = rawJob.companyName as string;

    // Deduplication check
    const dupResult = await this.deduplication.isDuplicate(userId, {
      externalId: rawJob.externalId as string | undefined,
      sourceUrl: rawJob.sourceUrl as string | undefined,
      title,
      companyName,
    });

    if (dupResult.isDuplicate) {
      return false;
    }

    // Score the job
    const scores = await this.jobScorer.score(rawJob, userPrefs);

    // Insert to DB
    const jobId = randomUUID();
    await this.db.insert(jobs).values({
      id: jobId,
      userId,
      ...rawJob,
      relevanceScore: scores.relevanceScore,
      callbackProbability: scores.callbackProbability,
      techStackAlignment: scores.techStackAlignment,
      remoteCompatibility: scores.remoteCompatibility,
      culturalFitScore: scores.culturalFitScore,
      competitionLevel: scores.competitionLevel,
      validationStatus: 'pending',
    } as any);

    // Emit job.discovered event
    await this.eventBus.emit({
      id: randomUUID(),
      timestamp: new Date(),
      userId,
      type: 'job.discovered',
      data: { jobId, source: rawJob.sourceChannel as string, title, company: companyName },
    });

    // Queue for validation
    await this.validationQueue.add('validate', { userId, jobId });

    return true;
  }
}
