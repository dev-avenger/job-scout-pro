import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { applications, jobs } from '@auto-job-apply/db';
import { eq, and, lt, isNull, sql } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'follow-up-processor' });

const FOLLOW_UP_THRESHOLD_DAYS = 7;

@Injectable()
@Processor('follow-up')
export class FollowUpProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @InjectQueue('outreach') private readonly outreachQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    logger.info({ jobId: job.id }, 'Processing follow-ups');

    const threshold = new Date(Date.now() - FOLLOW_UP_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    // Find applications that were submitted but haven't received a response
    const candidates = await (this.db
      .select({
        id: applications.id,
        userId: applications.userId,
        jobId: applications.jobId,
        submittedAt: applications.submittedAt,
      })
      .from(applications)
      .where(and(
        eq(applications.status, 'submitted'),
        lt(applications.submittedAt, threshold),
        isNull(applications.responseAt),
      ) as any) as any) as any[];

    logger.info({ candidateCount: candidates.length }, 'Found follow-up candidates');

    for (const candidate of candidates) {
      try {
        await this.outreachQueue.add('follow-up', {
          userId: candidate.userId,
          applicationId: candidate.id,
          jobId: candidate.jobId,
          type: 'follow_up',
        });
        logger.debug({ applicationId: candidate.id }, 'Follow-up queued');
      } catch (err) {
        logger.error({ error: err, applicationId: candidate.id }, 'Failed to queue follow-up');
      }
    }

    logger.info({ processed: candidates.length }, 'Follow-up processing complete');
  }
}
