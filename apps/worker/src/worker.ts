import 'reflect-metadata';
import { Worker, Queue, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';

import { createLogger } from '@auto-job-apply/shared-utils';

import { setupQueues } from './processors/index.js';
import { setupSchedules } from './schedules/index.js';

const logger = createLogger({ name: 'worker' });

async function main() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  logger.info('Starting worker...');

  const workers = setupQueues(connection);
  setupSchedules(connection);

  logger.info(`Started ${workers.length} queue processors`);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down workers...');
    await Promise.all(workers.map((w) => w.close()));
    await connection.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error({ error: err }, 'Worker failed to start');
  process.exit(1);
});
