import { Injectable, Inject } from '@nestjs/common';
import { eq, and, lt, sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import type { Database } from '@auto-job-apply/db';
import { portalMappings } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'portal-mapping-cache' });

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const CACHE_PREFIX = 'portal:mapping:';

@Injectable()
export class PortalMappingCache {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async get(domain: string, pagePath: string): Promise<Record<string, unknown> | null> {
    const cacheKey = `${CACHE_PREFIX}${domain}:${pagePath}`;

    // Try Redis first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      logger.debug({ domain, pagePath }, 'Portal mapping cache hit (Redis)');
      return JSON.parse(cached);
    }

    // Fallback to DB
    const results = await (this.db
      .select()
      .from(portalMappings)
      .where(and(eq(portalMappings.domain, domain), eq(portalMappings.pagePath, pagePath)) as any)
      .limit(1) as any);

    if (results.length === 0) return null;

    const mapping = results[0];
    if (mapping.expiresAt < new Date()) {
      logger.debug({ domain, pagePath }, 'Portal mapping expired');
      return null;
    }

    // Warm Redis cache
    await this.redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(mapping.formStructure));
    logger.debug({ domain, pagePath }, 'Portal mapping cache hit (DB)');
    return mapping.formStructure as Record<string, unknown>;
  }

  async set(domain: string, pagePath: string, formStructure: Record<string, unknown>): Promise<void> {
    const cacheKey = `${CACHE_PREFIX}${domain}:${pagePath}`;
    const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);

    // Upsert to DB
    const existing = await (this.db
      .select({ id: portalMappings.id })
      .from(portalMappings)
      .where(and(eq(portalMappings.domain, domain), eq(portalMappings.pagePath, pagePath)) as any)
      .limit(1) as any);

    if (existing.length > 0) {
      await (this.db
        .update(portalMappings)
        .set({ formStructure, expiresAt, updatedAt: new Date() } as any)
        .where(eq(portalMappings.id, existing[0].id) as any) as any);
    } else {
      await this.db.insert(portalMappings).values({ domain, pagePath, formStructure, expiresAt } as any);
    }

    // Set Redis cache
    await this.redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(formStructure));
    logger.debug({ domain, pagePath }, 'Portal mapping cached');
  }

  async recordSuccess(domain: string, pagePath: string): Promise<void> {
    await (this.db
      .update(portalMappings)
      .set({
        successCount: sql`${portalMappings.successCount} + 1` as any,
        lastSuccessAt: new Date(),
      })
      .where(and(eq(portalMappings.domain, domain), eq(portalMappings.pagePath, pagePath)) as any) as any);
  }

  async recordFailure(domain: string, pagePath: string): Promise<void> {
    await (this.db
      .update(portalMappings)
      .set({
        failureCount: sql`${portalMappings.failureCount} + 1` as any,
        lastFailureAt: new Date(),
      })
      .where(and(eq(portalMappings.domain, domain), eq(portalMappings.pagePath, pagePath)) as any) as any);
  }

  async purgeExpired(): Promise<number> {
    const result = await (this.db
      .delete(portalMappings)
      .where(lt(portalMappings.expiresAt, new Date()) as any)
      .returning({ id: portalMappings.id }) as any);
    logger.info({ count: result.length }, 'Purged expired portal mappings');
    return result.length;
  }
}
