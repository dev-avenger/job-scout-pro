import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { notifications, alertRules, applications, llmRequests, users, userPreferences } from '@auto-job-apply/db';
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

  async create(data: Record<string, unknown>) {
    await this.db.insert(notifications).values(data as any);
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

  async listActiveAlertRules(userId: string) {
    return this.db.query.alertRules.findMany({
      where: and(eq(alertRules.userId, userId), eq(alertRules.isActive, true)),
    });
  }

  async createAlertRule(data: Record<string, unknown>) {
    await this.db.insert(alertRules).values(data as any);
  }

  async deleteAlertRule(ruleId: string) {
    await this.db.delete(alertRules).where(eq(alertRules.id, ruleId));
  }

  async markRuleTriggered(ruleId: string) {
    await this.db.update(alertRules)
      .set({ lastTriggeredAt: new Date() })
      .where(eq(alertRules.id, ruleId));
  }

  /** Application failure rate (0-1) over the last `hours`. */
  async getFailureRate(userId: string, hours = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const rows = (await this.db
      .select({
        total: sql<number>`count(*)`,
        failed: sql<number>`count(*) FILTER (WHERE ${applications.status} = 'failed')`,
      })
      .from(applications)
      .where(and(eq(applications.userId, userId), gte(applications.createdAt, since)))) as any[];
    const total = Number(rows[0]?.total ?? 0);
    const failed = Number(rows[0]?.failed ?? 0);
    return total > 0 ? failed / total : 0;
  }

  /** Total LLM spend (cents) since the start of today. */
  async getTodaySpendCents(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = (await this.db
      .select({ total: sql<number>`COALESCE(SUM(${llmRequests.costCents}), 0)` })
      .from(llmRequests)
      .where(and(eq(llmRequests.userId, userId), gte(llmRequests.createdAt, today)))) as any[];
    return Number(rows[0]?.total ?? 0);
  }

  /** The recipient email + SMTP config used to dispatch alert emails. */
  async getDispatchInfo(userId: string): Promise<{ email: string | null; smtpConfig: any | null }> {
    const user = (await this.db.query.users.findFirst({ where: eq(users.id, userId) })) as any;
    const prefs = (await this.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    })) as any;
    const channels = (prefs?.notificationChannels as Record<string, any> | null) ?? null;
    return { email: user?.email ?? null, smtpConfig: channels?.emailSmtpConfig ?? null };
  }
}
