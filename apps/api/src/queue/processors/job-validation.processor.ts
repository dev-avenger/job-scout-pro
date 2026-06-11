import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { jobs } from '@auto-job-apply/db';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { EVENT_BUS } from '../../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../../core/event-bus/interfaces/event-bus.interface.js';
import { JobValidator } from '../../search/job-validator.js';
import { createLogger } from '@auto-job-apply/shared-utils';
import { randomUUID } from 'crypto';

const logger = createLogger({ name: 'job-validation-processor' });

@Injectable()
@Processor('job-validation')
export class JobValidationProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly jobValidator: JobValidator,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { userId, jobId } = job.data;
    logger.info({ jobId: job.id, userId, targetJobId: jobId }, 'Processing job validation');

    if (!jobId) {
      logger.warn('No jobId provided');
      return;
    }

    // Load the job
    const result = await (this.db.select().from(jobs).where(eq(jobs.id, jobId) as any).limit(1) as any);
    const targetJob = result[0];
    if (!targetJob) {
      logger.warn({ jobId }, 'Job not found');
      return;
    }

    // Run validation
    const context = userId ? { userId, jobId } : undefined;
    const validation = await this.jobValidator.validate(
      {
        title: targetJob.title,
        companyName: targetJob.companyName,
        sourceUrl: targetJob.sourceUrl,
        description: targetJob.description,
        expiresAt: targetJob.expiresAt,
        salaryMin: targetJob.salaryMin,
        salaryMax: targetJob.salaryMax,
      },
      context,
    );

    // Update job status
    await (this.db
      .update(jobs)
      .set({
        validationStatus: validation.status,
        scamScore: validation.scamScore,
        lastLivenessCheck: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(jobs.id, jobId) as any) as any);

    // Emit validation event
    await this.eventBus.emit({
      id: randomUUID(),
      timestamp: new Date(),
      userId: targetJob.userId,
      type: 'job.validated',
      data: { jobId, status: validation.status, reason: validation.reason },
    });

    logger.info({ jobId, status: validation.status }, 'Job validation complete');
  }
}
