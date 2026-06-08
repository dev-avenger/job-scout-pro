import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'inbox-scan-processor' });

@Injectable()
@Processor('inbox-scan')
export class InboxScanProcessor extends WorkerHost {
  async process(job: Job): Promise<void> {
    logger.info({ jobId: job.id, data: job.data }, 'Processing inbox scan');
    // Inbox scan processor logic
  }
}
