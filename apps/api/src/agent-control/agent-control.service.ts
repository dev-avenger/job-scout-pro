import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '@auto-job-apply/db';
import { applications, applicationEvents } from '@auto-job-apply/db';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { createLogger } from '@auto-job-apply/shared-utils';
import type { IAgentControlService } from './interfaces/agent-control-service.interface.js';

const logger = createLogger({ name: 'agent-control-service' });

// Applications that have not yet been irreversibly submitted can be withdrawn locally.
const WITHDRAWABLE_STATUSES = [
  'queued',
  'in_progress',
  'form_filling',
  'pending_review',
  'needs_captcha',
  'needs_login',
];

@Injectable()
export class AgentControlService implements IAgentControlService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
  ) {}

  async getStatus(userId: string) {
    const pausedKey = `agent:paused:${userId}`;
    const isPaused = await this.redis.get(pausedKey);
    return {
      status: isPaused ? 'paused' : 'active',
      pausedAt: isPaused || null,
    };
  }

  async pause(userId: string) {
    const pausedKey = `agent:paused:${userId}`;
    await this.redis.set(pausedKey, new Date().toISOString());
    return { status: 'paused' };
  }

  async resume(userId: string) {
    const pausedKey = `agent:paused:${userId}`;
    await this.redis.del(pausedKey);
    return { status: 'active' };
  }

  async kill(userId: string) {
    const pausedKey = `agent:paused:${userId}`;
    await this.redis.set(pausedKey, new Date().toISOString());

    // Withdraw every application that hasn't been irreversibly submitted yet.
    const toWithdraw = (await this.db
      .select({ id: applications.id, status: applications.status })
      .from(applications)
      .where(and(
        eq(applications.userId, userId),
        inArray(applications.status, WITHDRAWABLE_STATUSES),
      ))) as Array<{ id: string; status: string }>;

    let withdrawn = 0;
    for (const app of toWithdraw) {
      await this.db
        .update(applications)
        .set({ status: 'withdrawn', updatedAt: new Date() })
        .where(eq(applications.id, app.id));
      await this.db.insert(applicationEvents).values({
        applicationId: app.id,
        eventType: 'withdrawn',
        oldValue: app.status,
        newValue: 'withdrawn',
        metadata: { reason: 'kill_switch' },
      } as any);
      withdrawn++;
    }

    logger.warn({ userId, withdrawn }, 'Kill switch activated');

    return {
      status: 'killed',
      message:
        `All agent activity halted. ${withdrawn} pending application(s) withdrawn. ` +
        `Applications already submitted to external portals are not auto-withdrawn (most ATSes don't support it).`,
    };
  }

  async getQueueStats(_userId: string) {
    const queueNames = [
      'job-search',
      'job-validation',
      'application',
      'outreach',
      'inbox-scan',
      'research',
      'follow-up',
      'maintenance',
    ];

    const stats: Record<
      string,
      { waiting: number; active: number; completed: number; failed: number }
    > = {};

    await Promise.all(
      queueNames.map(async (name) => {
        const [wait, paused, active, completed, failed] = await Promise.all([
          this.redis.llen(`bull:${name}:wait`),
          this.redis.llen(`bull:${name}:paused`),
          this.redis.llen(`bull:${name}:active`),
          this.redis.zcard(`bull:${name}:completed`),
          this.redis.zcard(`bull:${name}:failed`),
        ]);
        stats[name] = { waiting: wait + paused, active, completed, failed };
      }),
    );

    return stats;
  }
}
