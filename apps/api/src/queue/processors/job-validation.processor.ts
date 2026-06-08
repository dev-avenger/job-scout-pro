import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'job-validation-processor' });

@Injectable()
@Processor('job-validation')
export class JobValidationProcessor extends WorkerHost {
  async process(job: Job): Promise<void> {
    logger.info({ jobId: job.id, data: job.data }, 'Processing job validation');
    // Job validation processor logic
  }
}
