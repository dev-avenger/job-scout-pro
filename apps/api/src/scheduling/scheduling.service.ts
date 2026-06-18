import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { createLogger } from '@auto-job-apply/shared-utils';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';
import type { ISchedulingService } from './interfaces/scheduling-service.interface.js';

const logger = createLogger({ name: 'scheduling-service' });

@Injectable()
export class SchedulingService implements ISchedulingService, OnModuleInit {
  private queues: Map<string, Queue> = new Map();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleInit() {
    const queueNames = [
      'job-search', 'job-validation', 'application',
      'outreach', 'inbox-scan', 'research',
      'follow-up', 'maintenance',
    ];

    for (const name of queueNames) {
      // `as any`: bullmq and this service can resolve to different ioredis
      // minor versions in the workspace; the Redis client is compatible at runtime.
      this.queues.set(name, new Queue(name, { connection: this.redis as any }));
    }

    logger.info('Scheduling service initialized');
  }

  async enqueue(queueName: string, jobName: string, data: Record<string, unknown>, options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.add(jobName, data, {
      delay: options?.delay,
      priority: options?.priority,
      attempts: options?.attempts || 3,
      backoff: { type: 'exponential', delay: 30000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    });

    logger.info({ queue: queueName, jobName, jobId: job.id }, 'Job enqueued');
    return { jobId: job.id };
  }

  async getQueueStats() {
    const stats: Record<string, { waiting: number; active: number; completed: number; failed: number }> = {};

    for (const [name, queue] of this.queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      stats[name] = { waiting, active, completed, failed };
    }

    return stats;
  }
}
