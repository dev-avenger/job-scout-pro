import 'reflect-metadata';
// NOTE: QueueScheduler was removed in BullMQ v2+; importing it from bullmq v5 fails at load time.
import Redis from 'ioredis';

import { createLogger } from '@auto-job-apply/shared-utils';

import { setupQueues } from './processors/index.js';
import { setupSchedules } from './schedules/index.js';

const logger = createLogger({ name: 'worker' });

async function main() {
  // Queue processing now lives inside the API (apps/api/src/queue via @nestjs/bullmq).
  // The processors in this app are no-op stubs; if they attach to the shared queues they
  // CONSUME real jobs and silently discard them. Only start them when explicitly requested.
  if (process.env.WORKER_STANDALONE !== 'true') {
    logger.warn(
      'apps/worker is a stub: queue processors run inside the API (QueueModule). ' +
        'Not attaching to queues. Set WORKER_STANDALONE=true to force-start the stubs.',
    );
    // Idle forever instead of exiting so container/k8s deployments do not restart-loop
    await new Promise(() => undefined);
    return;
  }

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
