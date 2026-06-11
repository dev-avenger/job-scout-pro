import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { applications, jobs, profiles } from '@auto-job-apply/db';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { EVENT_BUS } from '../../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../../core/event-bus/interfaces/event-bus.interface.js';
import { ResumeTailorAgent } from '../../resume/agents/resume-tailor.agent.js';
import { CoverLetterAgent } from '../../resume/agents/cover-letter.agent.js';
import { RateLimiter } from '../../scheduling/rate-limiter.js';
import { createLogger } from '@auto-job-apply/shared-utils';
import { randomUUID } from 'crypto';

const logger = createLogger({ name: 'application-processor' });

@Injectable()
@Processor('application')
export class ApplicationProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly resumeTailorAgent: ResumeTailorAgent,
    private readonly coverLetterAgent: CoverLetterAgent,
    private readonly rateLimiter: RateLimiter,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { userId, applicationId, jobId } = job.data;
    logger.info({ jobId: job.id, applicationId }, 'Processing application');

    if (!applicationId || !userId) {
      logger.warn('Missing applicationId or userId');
      return;
    }

    try {
      // Load application
      const appResult = await (this.db.select().from(applications).where(eq(applications.id, applicationId) as any).limit(1) as any);
      const app = appResult[0];
      if (!app) {
        logger.warn({ applicationId }, 'Application not found');
        return;
      }

      // Load job
      const jobResult = await (this.db.select().from(jobs).where(eq(jobs.id, app.jobId || jobId) as any).limit(1) as any);
      const targetJob = jobResult[0];
      if (!targetJob) {
        logger.warn({ jobId: app.jobId }, 'Target job not found');
        return;
      }

      // Rate limit check
      const portalName = targetJob.applyUrl ? new URL(targetJob.applyUrl).hostname : 'default';
      const rateCheck = await this.rateLimiter.isAllowedForPlatform(userId, portalName);
      if (!rateCheck.allowed) {
        logger.info({ reason: rateCheck.reason, retryAfterMs: rateCheck.retryAfterMs }, 'Rate limited');
        // Re-queue with delay
        if (rateCheck.retryAfterMs) {
          throw new Error(`Rate limited: ${rateCheck.reason}`);
        }
        return;
      }

      // Update status to in_progress
      await (this.db.update(applications).set({ status: 'in_progress', updatedAt: new Date() } as any).where(eq(applications.id, applicationId) as any) as any);

      // Emit started event
      await this.eventBus.emit({
        id: randomUUID(),
        timestamp: new Date(),
        userId,
        type: 'application.started',
        data: { applicationId },
      });

      // Load user profile
      const profileResult = await (this.db.select().from(profiles).where(and(eq(profiles.userId, userId), eq(profiles.isDefault, true)) as any).limit(1) as any);
      const profile = profileResult[0];

      let totalCost = 0;

      // Tailor resume
      if (profile && targetJob.description) {
        try {
          const context = { userId, applicationId, jobId: targetJob.id };
          const { tailored, costCents } = await this.resumeTailorAgent.tailorResume(
            profile as Record<string, unknown>,
            targetJob.description,
            context,
          );
          totalCost += costCents;
          logger.info({ applicationId, costCents }, 'Resume tailored');

          // Generate cover letter
          const coverResult = await this.coverLetterAgent.generateCoverLetter(
            profile as Record<string, unknown>,
            targetJob.title,
            targetJob.companyName,
            targetJob.description,
            context,
          );
          totalCost += coverResult.costCents;

          // Update application with tailored content
          await (this.db.update(applications).set({
            coverLetter: coverResult.coverLetter,
            llmCostCents: totalCost,
            portalName,
            updatedAt: new Date(),
          } as any).where(eq(applications.id, applicationId) as any) as any);
        } catch (err) {
          logger.error({ error: err, applicationId }, 'LLM processing failed');
        }
      }

      // Mark as submitted (actual form filling would happen via browser extension)
      await (this.db.update(applications).set({
        status: 'submitted',
        submittedAt: new Date(),
        llmCostCents: totalCost,
        updatedAt: new Date(),
      } as any).where(eq(applications.id, applicationId) as any) as any);

      await this.rateLimiter.recordPlatformUsage(userId, portalName);
      await this.rateLimiter.recordGlobalUsage(userId);

      // Emit submitted event
      await this.eventBus.emit({
        id: randomUUID(),
        timestamp: new Date(),
        userId,
        type: 'application.submitted',
        data: { applicationId, portal: portalName },
      });

      logger.info({ applicationId, totalCost, portalName }, 'Application submitted');
    } catch (err) {
      logger.error({ error: err, applicationId }, 'Application processing failed');

      // Update failure
      const retryCount = (job.attemptsMade || 0);
      const failureType = retryCount >= 2 ? 'terminal' : 'retryable';
      await (this.db.update(applications).set({
        status: 'failed',
        failureReason: err instanceof Error ? err.message : 'Unknown error',
        failureType,
        retryCount,
        updatedAt: new Date(),
      } as any).where(eq(applications.id, applicationId) as any) as any);

      await this.eventBus.emit({
        id: randomUUID(),
        timestamp: new Date(),
        userId,
        type: 'application.failed',
        data: { applicationId, failureType, reason: err instanceof Error ? err.message : 'Unknown error' },
      });

      throw err; // Let BullMQ handle retries
    }
  }
}
