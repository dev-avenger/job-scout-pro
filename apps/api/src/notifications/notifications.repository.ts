import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { notifications, alertRules } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { INotificationsRepository } from './interfaces/notifications-repository.interface.js';

@Injectable()
export class NotificationsRepository implements INotificationsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async list(userId: string, limit = 50) {
    return this.db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit,
    });
  }

  async markAsRead(notificationId: string) {
    await this.db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllAsRead(userId: string) {
    await this.db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  async listAlertRules(userId: string) {
    return this.db.query.alertRules.findMany({
      where: eq(alertRules.userId, userId),
    });
  }

  async createAlertRule(data: Record<string, unknown>) {
    await this.db.insert(alertRules).values(data as any);
  }

  async deleteAlertRule(ruleId: string) {
    await this.db.delete(alertRules).where(eq(alertRules.id, ruleId));
  }
}
