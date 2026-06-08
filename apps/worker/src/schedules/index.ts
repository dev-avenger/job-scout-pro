import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'scheduler' });

export function setupSchedules(connection: Redis) {
  const jobSearchQueue = new Queue('job-search', { connection });
  const inboxScanQueue = new Queue('inbox-scan', { connection });
  const maintenanceQueue = new Queue('maintenance', { connection });
  const jobValidationQueue = new Queue('job-validation', { connection });

  // Job search: every 6 hours
  jobSearchQueue.upsertJobScheduler('scheduled-search', {
    every: 6 * 60 * 60 * 1000,
  }, {
    name: 'scheduled-search',
    data: { trigger: 'cron' },
  }).catch((err) => logger.error({ error: err }, 'Failed to setup job search schedule'));

  // Inbox scan: every 15 minutes
  inboxScanQueue.upsertJobScheduler('scheduled-inbox-scan', {
    every: 15 * 60 * 1000,
  }, {
    name: 'scheduled-inbox-scan',
    data: { trigger: 'cron' },
  }).catch((err) => logger.error({ error: err }, 'Failed to setup inbox scan schedule'));

  // Maintenance: daily at 3am
  maintenanceQueue.upsertJobScheduler('daily-maintenance', {
    pattern: '0 3 * * *',
  }, {
    name: 'daily-maintenance',
    data: { trigger: 'cron' },
  }).catch((err) => logger.error({ error: err }, 'Failed to setup maintenance schedule'));

  // Job liveness check: every 24 hours
  jobValidationQueue.upsertJobScheduler('liveness-check', {
    every: 24 * 60 * 60 * 1000,
  }, {
    name: 'liveness-check',
    data: { trigger: 'cron' },
  }).catch((err) => logger.error({ error: err }, 'Failed to setup liveness check schedule'));

  logger.info('Scheduled jobs configured');
}
