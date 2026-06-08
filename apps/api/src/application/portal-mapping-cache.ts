import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';

@Injectable()
export class PortalMappingCache {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}
}
