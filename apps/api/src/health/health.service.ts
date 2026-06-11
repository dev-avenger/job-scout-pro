import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check() {
    let postgresStatus: 'connected' | 'disconnected' = 'disconnected';
    let redisStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await this.db.execute(sql`SELECT 1`);
      postgresStatus = 'connected';
    } catch {
      // postgres disconnected
    }

    try {
      await this.redis.ping();
      redisStatus = 'connected';
    } catch {
      // redis disconnected
    }

    const status = postgresStatus === 'connected' && redisStatus === 'connected'
      ? 'healthy'
      : 'degraded';

    return {
      status,
      postgres: postgresStatus,
      redis: redisStatus,
      worker: 'running' as const,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
