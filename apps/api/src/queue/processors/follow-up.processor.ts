import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { applications, jobs, users, outreachMessages, notifications } from '@auto-job-apply/db';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { OutreachWriterAgent } from '../../outreach/agents/outreach-writer.agent.js';
import { createLogger, generateId } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'follow-up-processor' });

const FOLLOW_UP_THRESHOLD_DAYS = 7;

@Injectable()
@Processor('follow-up')
export class FollowUpProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @InjectQueue('outreach') private readonly outreachQueue: Queue,
    private readonly writerAgent: OutreachWriterAgent,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    logger.info({ jobId: job.id }, 'Processing follow-ups');

    const threshold = new Date(Date.now() - FOLLOW_UP_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    // Submitted applications with no response and no follow-up sent yet.
    const candidates = (await (this.db
      .select({
        id: applications.id,
        userId: applications.userId,
        jobId: applications.jobId,
        submittedAt: applications.submittedAt,
        jobTitle: jobs.title,
        companyName: jobs.companyName,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(
        eq(applications.status, 'submitted'),
        lt(applications.submittedAt, threshold),
        isNull(applications.responseAt),
      ) as any) as any)) as any[];

    logger.info({ candidateCount: candidates.length }, 'Found follow-up candidates');

    for (const candidate of candidates) {
      try {
        await this.draftAndDispatch(candidate);
      } catch (err) {
        logger.error({ error: err, applicationId: candidate.id }, 'Failed to process follow-up');
      }
    }

    logger.info({ processed: candidates.length }, 'Follow-up processing complete');
  }

  private async draftAndDispatch(candidate: any): Promise<void> {
    // Skip if a follow-up message already exists for this application.
    const existing = (await (this.db
      .select({ id: outreachMessages.id })
      .from(outreachMessages)
      .where(and(
        eq(outreachMessages.applicationId, candidate.id),
        eq(outreachMessages.type, 'follow_up'),
      ) as any)
      .limit(1) as any)) as any[];
    if (existing.length > 0) {
      logger.debug({ applicationId: candidate.id }, 'Follow-up already exists, skipping');
      return;
    }

    const daysSinceApplied = candidate.submittedAt
      ? Math.floor((Date.now() - new Date(candidate.submittedAt).getTime()) / (24 * 60 * 60 * 1000))
      : FOLLOW_UP_THRESHOLD_DAYS;

    const draft = await this.writerAgent.draftFollowUp(
      {
        jobTitle: candidate.jobTitle ?? 'the role',
        companyName: candidate.companyName ?? 'the company',
        daysSinceApplied,
      },
      { userId: candidate.userId },
    );

    const messageId = generateId();
    await this.db.insert(outreachMessages).values({
      id: messageId,
      userId: candidate.userId,
      applicationId: candidate.id,
      type: 'follow_up',
      subject: draft.subject,
      body: draft.body,
      status: 'draft',
    } as any);

    // Honour autonomy: guided users review before anything is sent.
    const userRow = (await this.db.query.users.findFirst({ where: eq(users.id, candidate.userId) })) as any;
    const autonomy = userRow?.autonomyMode ?? 'supervised';

    if (autonomy === 'guided') {
      await this.db.insert(notifications).values({
        userId: candidate.userId,
        type: 'follow_up_ready',
        title: 'Follow-up ready to review',
        body: `A follow-up for "${candidate.jobTitle ?? 'your application'}" is drafted and waiting for your approval.`,
        priority: 'normal',
        actionUrl: '/networking',
        metadata: { applicationId: candidate.id, outreachId: messageId },
      } as any);
      logger.info({ applicationId: candidate.id, messageId }, 'Follow-up drafted (guided: awaiting approval)');
      return;
    }

    // Supervised / autonomous: queue for sending.
    await this.outreachQueue.add('send', {
      userId: candidate.userId,
      messageId,
      type: 'follow_up',
    });
    logger.info({ applicationId: candidate.id, messageId }, 'Follow-up drafted and queued to send');
  }
}
