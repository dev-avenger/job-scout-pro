import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'research-processor' });

@Injectable()
@Processor('research')
export class ResearchProcessor extends WorkerHost {
  async process(job: Job): Promise<void> {
    logger.info({ jobId: job.id, data: job.data }, 'Processing research');
    // Research processor logic
  }
}
