import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { jobs, applications, llmRequests, agentWorkLogs } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { IAnalyticsRepository } from './interfaces/analytics-repository.interface.js';

@Injectable()
export class AnalyticsRepository implements IAnalyticsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async getOverview(userId: string) {
    const [totalJobs, totalApplications, pendingApplications, interviewCount, offerCount] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, userId)),
      this.db.select({ count: sql<number>`count(*)` }).from(applications).where(eq(applications.userId, userId)),
      this.db.select({ count: sql<number>`count(*)` }).from(applications).where(and(eq(applications.userId, userId), eq(applications.status, 'queued'))),
      this.db.select({ count: sql<number>`count(*)` }).from(applications).where(and(eq(applications.userId, userId), eq(applications.status, 'interview'))),
      this.db.select({ count: sql<number>`count(*)` }).from(applications).where(and(eq(applications.userId, userId), eq(applications.status, 'offer'))),
    ]);

    return {
      totalJobs: Number(totalJobs[0]?.count || 0),
      totalApplications: Number(totalApplications[0]?.count || 0),
      pendingApplications: Number(pendingApplications[0]?.count || 0),
      interviews: Number(interviewCount[0]?.count || 0),
      offers: Number(offerCount[0]?.count || 0),
    };
  }

  async getFunnel(userId: string) {
    const statuses = ['queued', 'in_progress', 'submitted', 'confirmed', 'interview', 'offer', 'rejected', 'withdrawn', 'failed'];
    const funnel: Record<string, number> = {};

    for (const status of statuses) {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(and(eq(applications.userId, userId), eq(applications.status, status)));
      funnel[status] = Number(result[0]?.count || 0);
    }

    return funnel;
  }

  async getDailySpend(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.db.select({ total: sql<number>`COALESCE(SUM(cost_cents), 0)` })
      .from(llmRequests)
      .where(and(eq(llmRequests.userId, userId), gte(llmRequests.createdAt, today)));

    return Number(result[0]?.total || 0);
  }

  async getMonthlySpend(userId: string) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const result = await this.db.select({ total: sql<number>`COALESCE(SUM(cost_cents), 0)` })
      .from(llmRequests)
      .where(and(eq(llmRequests.userId, userId), gte(llmRequests.createdAt, monthStart)));

    return Number(result[0]?.total || 0);
  }

  async getTotalSpend(userId: string) {
    const result = await this.db.select({ total: sql<number>`COALESCE(SUM(cost_cents), 0)` })
      .from(llmRequests)
      .where(eq(llmRequests.userId, userId));

    return Number(result[0]?.total || 0);
  }

  async getRecentLlmRequests(userId: string, limit = 100) {
    return this.db.query.llmRequests.findMany({
      where: eq(llmRequests.userId, userId),
      orderBy: [desc(llmRequests.createdAt)],
      limit,
    });
  }

  async getRecentAgentLogs(userId: string, limit = 100) {
    return this.db.query.agentWorkLogs.findMany({
      where: eq(agentWorkLogs.userId, userId),
      orderBy: [desc(agentWorkLogs.createdAt)],
      limit,
    });
  }
}
