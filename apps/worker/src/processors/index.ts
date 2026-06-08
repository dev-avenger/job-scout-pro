import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';

import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'processors' });

export interface QueueConfig {
  name: string;
  concurrency: number;
  priority: number;
}

const QUEUE_CONFIGS: QueueConfig[] = [
  { name: 'job-search', concurrency: 2, priority: 3 },
  { name: 'job-validation', concurrency: 5, priority: 2 },
  { name: 'application', concurrency: 1, priority: 1 },
  { name: 'outreach', concurrency: 2, priority: 4 },
  { name: 'inbox-scan', concurrency: 1, priority: 2 },
  { name: 'research', concurrency: 3, priority: 5 },
  { name: 'follow-up', concurrency: 2, priority: 4 },
  { name: 'maintenance', concurrency: 1, priority: 6 },
];

export function setupQueues(connection: Redis): Worker[] {
  const workers: Worker[] = [];

  for (const config of QUEUE_CONFIGS) {
    const worker = new Worker(
      config.name,
      async (job) => {
        logger.info({ queue: config.name, jobId: job.id, data: job.name }, 'Processing job');

        // Route to appropriate processor based on job name
        switch (config.name) {
          case 'job-search':
            await processJobSearch(job);
            break;
          case 'job-validation':
            await processJobValidation(job);
            break;
          case 'application':
            await processApplication(job);
            break;
          case 'outreach':
            await processOutreach(job);
            break;
          case 'inbox-scan':
            await processInboxScan(job);
            break;
          case 'research':
            await processResearch(job);
            break;
          case 'follow-up':
            await processFollowUp(job);
            break;
          case 'maintenance':
            await processMaintenance(job);
            break;
        }
      },
      {
        connection,
        concurrency: config.concurrency,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );

    worker.on('failed', (job, err) => {
      logger.error({ queue: config.name, jobId: job?.id, error: err }, 'Job failed');
    });

    worker.on('completed', (job) => {
      logger.info({ queue: config.name, jobId: job.id }, 'Job completed');
    });

    workers.push(worker);
  }

  return workers;
}

// Processor stubs - will be filled in by domain modules
async function processJobSearch(job: any) {
  logger.info({ data: job.data }, 'Job search processor');
}

async function processJobValidation(job: any) {
  logger.info({ data: job.data }, 'Job validation processor');
}

async function processApplication(job: any) {
  logger.info({ data: job.data }, 'Application processor');
}

async function processOutreach(job: any) {
  logger.info({ data: job.data }, 'Outreach processor');
}

async function processInboxScan(job: any) {
  logger.info({ data: job.data }, 'Inbox scan processor');
}

async function processResearch(job: any) {
  logger.info({ data: job.data }, 'Research processor');
}

async function processFollowUp(job: any) {
  logger.info({ data: job.data }, 'Follow-up processor');
}

async function processMaintenance(job: any) {
  logger.info({ data: job.data }, 'Maintenance processor');
}
