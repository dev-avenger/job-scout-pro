import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { createLogger } from '@auto-job-apply/shared-utils';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';
import { EVENT_BUS } from '../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../core/event-bus/interfaces/event-bus.interface.js';

const logger = createLogger({ name: 'cost-tracker' });

@Injectable()
export class CostTracker {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async recordCost(userId: string, costCents: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    const dailyKey = `budget:${userId}:daily:${today}`;
    const monthlyKey = `budget:${userId}:monthly:${month}`;

    await Promise.all([
      this.redis.incrbyfloat(dailyKey, costCents),
      this.redis.expire(dailyKey, 86400 * 2),
      this.redis.incrbyfloat(monthlyKey, costCents),
      this.redis.expire(monthlyKey, 86400 * 35),
    ]);
  }

  async getBudgetStatus(userId: string, dailyCapCents: number, monthlyCapCents: number) {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    const [dailySpent, monthlySpent] = await Promise.all([
      this.redis.get(`budget:${userId}:daily:${today}`),
      this.redis.get(`budget:${userId}:monthly:${month}`),
    ]);

    return {
      daily: {
        spent: parseFloat(dailySpent || '0'),
        cap: dailyCapCents,
        remaining: dailyCapCents - parseFloat(dailySpent || '0'),
      },
      monthly: {
        spent: parseFloat(monthlySpent || '0'),
        cap: monthlyCapCents,
        remaining: monthlyCapCents - parseFloat(monthlySpent || '0'),
      },
    };
  }
}
