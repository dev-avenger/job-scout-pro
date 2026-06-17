import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { jobs, userPreferences, agentWorkLogs } from '@auto-job-apply/db';
import { eq } from 'drizzle-orm';
import type { SearchCriteria } from '@auto-job-apply/shared-types';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { EVENT_BUS } from '../../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../../core/event-bus/interfaces/event-bus.interface.js';
import { SEARCH_SERVICE } from '../../search/search.constants.js';
import type { ISearchService } from '../../search/interfaces/search-service.interface.js';
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
    @Inject(SEARCH_SERVICE) private readonly searchService: ISearchService,
    private readonly deduplication: DeduplicationEngine,
    private readonly jobScorer: JobScorer,
    @InjectQueue('job-validation') private readonly validationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { userId, trigger } = job.data as { userId?: string; trigger?: string };
    logger.info({ jobId: job.id, userId, trigger }, 'Processing job search');

    // Cron-triggered searches carry no userId: fan out to every user with preferences
    let userIds: string[];
    if (userId) {
      userIds = [userId];
    } else {
      const rows = (await (this.db
        .select({ userId: userPreferences.userId })
        .from(userPreferences) as any)) as Array<{ userId: string }>;
      userIds = rows.map((r) => r.userId);
      if (userIds.length === 0) {
        logger.info('No users with preferences found, skipping scheduled search');
        return;
      }
    }

    for (const uid of userIds) {
      try {
        const discovered = await this.searchForUser(uid);
        logger.info({ userId: uid, discovered }, 'Job search complete');
        await this.writeWorkLog(uid, 'job_search', 'success', {
          trigger: trigger ?? 'scheduled',
          discovered,
        });
      } catch (err) {
        logger.error({ error: err, userId: uid }, 'Job search failed for user');
        await this.writeWorkLog(uid, 'job_search', 'failure', {
          trigger: trigger ?? 'scheduled',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  /** Record what the agent did so the Monitoring → Agent Logs tab has history. */
  private async writeWorkLog(
    userId: string,
    action: string,
    outcome: string,
    output: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.db.insert(agentWorkLogs).values({
        id: randomUUID(),
        userId,
        module: 'search',
        action,
        reasoning:
          action === 'job_search'
            ? 'Scanned all configured job sources against the user search criteria.'
            : null,
        outcome,
        outputSummary: output,
      } as any);
    } catch (err) {
      logger.warn({ error: err }, 'Failed to write agent work log');
    }
  }

  private async searchForUser(uid: string): Promise<number> {
    const prefRows = (await (this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, uid) as any)
      .limit(1) as any)) as Array<Record<string, unknown>>;
    const prefs = prefRows[0];

    const keywords = (prefs?.targetRoles as string[] | null | undefined) ?? [];
    if (keywords.length === 0) {
      logger.info({ userId: uid }, 'No target roles configured, skipping search');
      await this.writeWorkLog(uid, 'job_search_skipped', 'skipped', {
        reason: 'No target roles configured',
      });
      // Surface the skip in the live activity feed instead of failing silently
      await this.eventBus.emit({
        id: randomUUID(),
        timestamp: new Date(),
        userId: uid,
        type: 'search.skipped',
        data: {
          reason: 'No target roles configured — add them in the Setup Wizard or Settings.',
        },
      });
      return 0;
    }

    // Per-user source config saved by the Settings page (Job Sources tab)
    const uiSettings = (prefs?.uiSettings as Record<string, unknown> | null) ?? {};
    const sourceToggles = (uiSettings.jobSources as Record<string, boolean> | undefined) ?? {};
    const disabledSources = Object.entries(sourceToggles)
      .filter(([, enabled]) => enabled === false)
      .map(([name]) => name);

    const criteria: SearchCriteria = {
      keywords,
      userId: uid,
      locations: (prefs?.locations as string[] | null | undefined) ?? undefined,
      salaryMin: (prefs?.salaryMin as number | null | undefined) ?? undefined,
      excludeCompanies: (prefs?.companyBlacklist as string[] | null | undefined) ?? undefined,
      excludeKeywords: (prefs?.keywordBlacklist as string[] | null | undefined) ?? undefined,
      postedWithinDays: 7,
      rssFeedUrls: (uiSettings.rssFeedUrls as string[] | undefined) ?? undefined,
      disabledSources: disabledSources.length > 0 ? disabledSources : undefined,
      watchlist: (uiSettings.companyWatchlist as SearchCriteria['watchlist']) ?? undefined,
    };

    return this.searchService.runSearch(uid, criteria);
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
