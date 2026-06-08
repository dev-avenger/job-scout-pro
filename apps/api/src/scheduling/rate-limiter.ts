import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';

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
}
