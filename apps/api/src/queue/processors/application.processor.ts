import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { applications, jobs, profiles, userPreferences } from '@auto-job-apply/db';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { EVENT_BUS } from '../../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../../core/event-bus/interfaces/event-bus.interface.js';
import { ResumeTailorAgent } from '../../resume/agents/resume-tailor.agent.js';
import { CoverLetterAgent } from '../../resume/agents/cover-letter.agent.js';
import { AtsApplyService } from '../../application/ats-apply.service.js';
import { BrowserApplyService } from '../../application/browser-apply.service.js';
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
    private readonly atsApplyService: AtsApplyService,
    private readonly browserApplyService: BrowserApplyService,
    private readonly rateLimiter: RateLimiter,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { userId, applicationId, jobId } = job.data;
    logger.info({ jobId: job.id, applicationId, jobName: job.name }, 'Processing application');

    if (!applicationId || !userId) {
      logger.warn('Missing applicationId or userId');
      return;
    }

    if (job.name === 'submit-assisted') {
      await this.submitAssisted(userId, applicationId);
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

      // Tailor resume + cover letter. Many watchlist/aggregator jobs arrive
      // without a full description, so fall back to title + company rather than
      // skipping generation entirely.
      if (profile) {
        try {
          const context = { userId, applicationId, jobId: targetJob.id };
          const jobDescription =
            targetJob.description || `${targetJob.title} at ${targetJob.companyName}`;

          // A/B test the tailoring strategy: bucket each application round-robin
          // (count already-assigned applications for the user and alternate) so
          // the two variants stay balanced. Analytics compares callback rate per
          // variant. Defaults to 'A' if the count lookup fails.
          let abVariant: 'A' | 'B' = 'A';
          try {
            const assigned = await (this.db
              .select({ count: sql<number>`count(*)` })
              .from(applications)
              .where(and(eq(applications.userId, userId), isNotNull(applications.abVariant)) as any) as any);
            abVariant = Number(assigned[0]?.count ?? 0) % 2 === 0 ? 'A' : 'B';
          } catch (err) {
            logger.warn({ error: err, applicationId }, 'A/B variant lookup failed; defaulting to A');
          }

          const { tailored, costCents } = await this.resumeTailorAgent.tailorResume(
            profile as Record<string, unknown>,
            jobDescription,
            context,
            abVariant,
          );
          totalCost += costCents;
          logger.info({ applicationId, costCents, abVariant }, 'Resume tailored');

          // Generate cover letter
          const coverResult = await this.coverLetterAgent.generateCoverLetter(
            profile as Record<string, unknown>,
            targetJob.title,
            targetJob.companyName,
            jobDescription,
            context,
          );
          totalCost += coverResult.costCents;

          // Update application with tailored content (resume + cover letter)
          await (this.db.update(applications).set({
            tailoredResume: tailored,
            coverLetter: coverResult.coverLetter,
            llmCostCents: totalCost,
            portalName,
            abVariant,
            updatedAt: new Date(),
          } as any).where(eq(applications.id, applicationId) as any) as any);
        } catch (err) {
          logger.error({ error: err, applicationId }, 'LLM processing failed');
        }
      }

      // Fill the application form: ATS form schemas come from free public
      // JSON APIs; answers map from the profile (free), the answer bank
      // (free), and the LLM only for brand-new custom questions.
      const applyUrl = targetJob.applyUrl as string | undefined;
      const ctx = { userId, applicationId, jobId: targetJob.id };
      let prepared: any = null;
      let browserOutcome: any = null;
      let nextStatus = 'pending_review';

      const ats = applyUrl ? this.atsApplyService.detectAts(applyUrl) : { type: 'unknown' };

      if (applyUrl && profile && ats.type !== 'unknown') {
        // Clean ATS form API path (Workable/Greenhouse/Lever) — no browser
        try {
          prepared = await this.atsApplyService.prepare(applyUrl, profile as Record<string, unknown>, userId, ctx);
          if (prepared) totalCost += prepared.llmCostCents;
        } catch (err) {
          logger.error({ error: err, applicationId }, 'ATS form preparation failed');
        }
      } else if (applyUrl && profile) {
        // Browser path for Indeed / login-walled portals, using the user's
        // saved credentials and autonomy mode.
        try {
          const prefs = await (this.db
            .select()
            .from(userPreferences)
            .where(eq(userPreferences.userId, userId) as any)
            .limit(1) as any);
          const ui = (prefs?.[0]?.uiSettings as Record<string, unknown> | null) ?? {};
          const creds = (ui.portalCredentials as Array<{ siteName: string; username: string; password: string }>) ?? [];
          const host = (() => { try { return new URL(applyUrl).hostname; } catch { return ''; } })();
          const credential = creds.find((c) => host.includes(c.siteName.toLowerCase()) || c.siteName.toLowerCase().includes('indeed'));
          const autonomyMode = (app.autonomyMode as 'guided' | 'supervised' | 'autonomous') ?? 'supervised';

          browserOutcome = await this.browserApplyService.apply({
            jobUrl: applyUrl,
            profile: profile as Record<string, unknown>,
            userId,
            autonomyMode,
            credential,
            context: ctx,
            headful: Boolean(ui.indeedHeadful),
          });

          if (browserOutcome.status === 'submitted') nextStatus = 'submitted';
          else if (browserOutcome.status === 'needs_captcha') nextStatus = 'needs_captcha';
          else nextStatus = 'pending_review';
        } catch (err) {
          logger.error({ error: err, applicationId }, 'Browser apply failed');
        }
      }

      await (this.db.update(applications).set({
        status: nextStatus,
        formAnswers: prepared ?? (browserOutcome ? { browser: browserOutcome } : undefined),
        llmCostCents: totalCost,
        submittedAt: nextStatus === 'submitted' ? new Date() : undefined,
        updatedAt: new Date(),
      } as any).where(eq(applications.id, applicationId) as any) as any);

      await this.rateLimiter.recordPlatformUsage(userId, portalName);
      await this.rateLimiter.recordGlobalUsage(userId);

      await this.eventBus.emit({
        id: randomUUID(),
        timestamp: new Date(),
        userId,
        type: 'application.status_changed',
        data: { applicationId, from: 'in_progress', to: 'pending_review' },
      });

      logger.info(
        {
          applicationId,
          totalCost,
          portalName,
          atsType: prepared?.atsType ?? 'unknown',
          answered: prepared ? prepared.answers.filter((a: { value: unknown }) => a.value).length : 0,
          unanswered: prepared?.unanswered.length ?? 0,
        },
        'Application prepared and awaiting review',
      );
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

  /**
   * Browser-assisted submission: drive the real ATS apply form (Workable/
   * Greenhouse/Lever) in a Chrome window using the already-prepared answers +
   * a resume PDF generated from the profile.
   */
  private async submitAssisted(userId: string, applicationId: string): Promise<void> {
    const appRows = await (this.db.select().from(applications).where(eq(applications.id, applicationId) as any).limit(1) as any);
    const app = appRows[0];
    if (!app) return;
    const jobRows = await (this.db.select().from(jobs).where(eq(jobs.id, app.jobId) as any).limit(1) as any);
    const targetJob = jobRows[0];
    const profileRows = await (this.db.select().from(profiles).where(and(eq(profiles.userId, userId), eq(profiles.isDefault, true)) as any).limit(1) as any);
    const profile = profileRows[0];
    const applyUrl = targetJob?.applyUrl as string | undefined;
    if (!applyUrl || !profile) {
      logger.warn({ applicationId }, 'submit-assisted: missing applyUrl or profile');
      return;
    }

    const prepared = (app.formAnswers as { answers?: Array<{ fieldId: string; value: unknown; type?: string }> } | null) ?? {};
    await (this.db.update(applications).set({ status: 'in_progress', updatedAt: new Date() } as any).where(eq(applications.id, applicationId) as any) as any);

    const outcome = await this.browserApplyService.apply({
      jobUrl: applyUrl,
      profile: profile as Record<string, unknown>,
      userId,
      autonomyMode: (app.autonomyMode as 'guided' | 'supervised' | 'autonomous') ?? 'supervised',
      context: { userId, applicationId, jobId: targetJob.id },
      headful: true, // a visible window so the user can solve Workable's Turnstile
      answers: prepared.answers ?? [],
      tailored: (app.tailoredResume as Record<string, unknown> | null) ?? null,
    });

    const nextStatus =
      outcome.status === 'submitted' ? 'submitted'
      : outcome.status === 'needs_captcha' ? 'needs_captcha'
      : outcome.status === 'failed' ? 'failed'
      : 'pending_review';

    await (this.db.update(applications).set({
      status: nextStatus,
      failureReason: outcome.status === 'failed' ? outcome.detail : null,
      submittedAt: nextStatus === 'submitted' ? new Date() : app.submittedAt,
      updatedAt: new Date(),
    } as any).where(eq(applications.id, applicationId) as any) as any);

    await this.eventBus.emit({
      id: randomUUID(),
      timestamp: new Date(),
      userId,
      type: 'application.status_changed',
      data: { applicationId, from: 'in_progress', to: nextStatus },
    });
    logger.info({ applicationId, outcome: outcome.status, detail: outcome.detail }, 'submit-assisted complete');
  }
}
