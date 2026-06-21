import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'rate-limiter' });

const PLATFORM_LIMITS: Record<string, { maxPerDay: number; minIntervalMs: number }> = {
  linkedin: { maxPerDay: 5, minIntervalMs: 300000 },
  workday: { maxPerDay: 10, minIntervalMs: 120000 },
  greenhouse: { maxPerDay: 15, minIntervalMs: 60000 },
  lever: { maxPerDay: 15, minIntervalMs: 60000 },
  bamboohr: { maxPerDay: 15, minIntervalMs: 60000 },
  ashby: { maxPerDay: 15, minIntervalMs: 60000 },
  icims: { maxPerDay: 10, minIntervalMs: 120000 },
  taleo: { maxPerDay: 8, minIntervalMs: 180000 },
  default: { maxPerDay: 15, minIntervalMs: 60000 },
};

@Injectable()
export class RateLimiter {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async isAllowed(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    return current <= maxRequests;
  }

  async isAllowedForPlatform(userId: string, platform: string): Promise<{ allowed: boolean; reason?: string; retryAfterMs?: number }> {
    const normalizedPlatform = platform.toLowerCase().replace(/[^a-z]/g, '');
    const limits = PLATFORM_LIMITS[normalizedPlatform] ?? PLATFORM_LIMITS['default']!;

    // Check daily limit
    const dailyKey = `ratelimit:${userId}:${normalizedPlatform}:daily:${new Date().toISOString().slice(0, 10)}`;
    const dailyCount = parseInt(await this.redis.get(dailyKey) || '0', 10);
    if (dailyCount >= limits.maxPerDay) {
      logger.info({ userId, platform, dailyCount }, 'Daily rate limit reached');
      return { allowed: false, reason: `Daily limit of ${limits.maxPerDay} reached for ${platform}` };
    }

    // Check minimum interval
    const intervalKey = `ratelimit:${userId}:${normalizedPlatform}:last`;
    const lastTimestamp = await this.redis.get(intervalKey);
    if (lastTimestamp) {
      const elapsed = Date.now() - parseInt(lastTimestamp, 10);
      if (elapsed < limits.minIntervalMs) {
        const retryAfterMs = limits.minIntervalMs - elapsed;
        logger.debug({ userId, platform, retryAfterMs }, 'Rate limit interval not met');
        return { allowed: false, reason: 'Too soon since last request', retryAfterMs };
      }
    }

    return { allowed: true };
  }

  async recordPlatformUsage(userId: string, platform: string): Promise<void> {
    const normalizedPlatform = platform.toLowerCase().replace(/[^a-z]/g, '');
    const dailyKey = `ratelimit:${userId}:${normalizedPlatform}:daily:${new Date().toISOString().slice(0, 10)}`;
    const intervalKey = `ratelimit:${userId}:${normalizedPlatform}:last`;

    await Promise.all([
      this.redis.incr(dailyKey).then(() => this.redis.expire(dailyKey, 86400)),
      this.redis.set(intervalKey, Date.now().toString(), 'EX', 86400),
    ]);
  }

  async getDailyUsage(userId: string, platform: string): Promise<number> {
    const normalizedPlatform = platform.toLowerCase().replace(/[^a-z]/g, '');
    const dailyKey = `ratelimit:${userId}:${normalizedPlatform}:daily:${new Date().toISOString().slice(0, 10)}`;
    return parseInt(await this.redis.get(dailyKey) || '0', 10);
  }

  async isWithinDailyCap(userId: string, dailyCap: number): Promise<boolean> {
    const globalKey = `ratelimit:${userId}:global:daily:${new Date().toISOString().slice(0, 10)}`;
    const count = parseInt(await this.redis.get(globalKey) || '0', 10);
    return count < dailyCap;
  }

  async recordGlobalUsage(userId: string): Promise<void> {
    const globalKey = `ratelimit:${userId}:global:daily:${new Date().toISOString().slice(0, 10)}`;
    await this.redis.incr(globalKey);
    await this.redis.expire(globalKey, 86400);
  }
}
