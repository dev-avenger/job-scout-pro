import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { notifications, jobs, users } from '@auto-job-apply/db';
import { lt } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { PortalMappingCache } from '../../application/portal-mapping-cache.js';
import { NOTIFICATIONS_SERVICE } from '../../notifications/notifications.constants.js';
import type { INotificationsService } from '../../notifications/interfaces/notifications-service.interface.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'maintenance-processor' });

@Injectable()
@Processor('maintenance')
export class MaintenanceProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    private readonly portalMappingCache: PortalMappingCache,
    @Inject(NOTIFICATIONS_SERVICE) private readonly notificationsService: INotificationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    logger.info({ jobId: job.id }, 'Processing maintenance');

    // 1. Purge expired portal mappings
    const purgedMappings = await this.portalMappingCache.purgeExpired();
    logger.info({ purgedMappings }, 'Purged expired portal mappings');

    // 2. Clean old read notifications (30+ days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cleanedNotifs = await (this.db
      .delete(notifications)
      .where(lt(notifications.createdAt, thirtyDaysAgo) as any)
      .returning({ id: notifications.id }) as any);
    logger.info({ count: (cleanedNotifs as any[]).length }, 'Cleaned old notifications');

    // 3. Mark expired jobs
    const now = new Date();
    await (this.db
      .update(jobs)
      .set({ validationStatus: 'expired', isActive: false, updatedAt: now } as any)
      .where(lt(jobs.expiresAt, now) as any) as any);

    // 4. Evaluate alert rules for every user (failure rate, budget thresholds).
    try {
      const allUsers = (await this.db.select({ id: users.id }).from(users)) as any[];
      let totalFired = 0;
      for (const u of allUsers) {
        totalFired += await this.notificationsService.evaluateAlertRules(u.id);
      }
      logger.info({ users: allUsers.length, alertsFired: totalFired }, 'Alert rules evaluated');
    } catch (err) {
      logger.error({ error: err }, 'Alert-rule evaluation failed');
    }

    logger.info('Maintenance complete');
  }
}
