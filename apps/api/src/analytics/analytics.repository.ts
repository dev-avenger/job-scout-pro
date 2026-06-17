import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, sql, desc, inArray } from 'drizzle-orm';
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
      this.db.select({ count: sql<number>`count(*)` }).from(applications).where(and(eq(applications.userId, userId), inArray(applications.status, ['pending_review', 'needs_captcha', 'needs_login', 'queued']))),
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
    const statuses = ['queued', 'in_progress', 'pending_review', 'needs_captcha', 'needs_login', 'submitted', 'confirmed', 'interview', 'offer', 'rejected', 'withdrawn', 'failed'];
    const funnel: Record<string, number> = {};

    for (const status of statuses) {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(and(eq(applications.userId, userId), eq(applications.status, status)));
      funnel[status] = Number(result[0]?.count || 0);
    }

    return funnel;
  }

  async getVolume(userId: string, days: number): Promise<{ date: string; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const rows = await this.db
      .select({
        date: sql<string>`TO_CHAR(created_at::date, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
      })
      .from(applications)
      .where(and(eq(applications.userId, userId), gte(applications.createdAt, startDate)))
      .groupBy(sql`created_at::date`)
      .orderBy(sql`created_at::date`);

    // Fill in missing dates with count 0
    const result: { date: string; count: number }[] = [];
    const dateMap = new Map(rows.map((r) => [r.date, Number(r.count)]));
    const cursor = new Date(startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      result.push({ date: key, count: dateMap.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
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

  async getResponseRate(userId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.db
      .select({
        date: sql<string>`TO_CHAR(created_at::date, 'YYYY-MM-DD')`,
        total: sql<number>`count(*)`,
        responses: sql<number>`count(*) FILTER (WHERE status IN ('interview', 'offer'))`,
      })
      .from(applications)
      .where(and(eq(applications.userId, userId), gte(applications.createdAt, since)))
      .groupBy(sql`created_at::date`)
      .orderBy(sql`created_at::date`);

    return rows.map((r) => ({
      date: r.date,
      rate: Number(r.total) > 0 ? Math.round((Number(r.responses) / Number(r.total)) * 100) : 0,
    }));
  }

  async getSourceEffectiveness(userId: string) {
    const rows = await this.db
      .select({
        source: sql<string>`COALESCE(${jobs.sourceChannel}, 'unknown')`,
        applications: sql<number>`count(*)`,
        interviews: sql<number>`count(*) FILTER (WHERE ${applications.status} = 'interview')`,
        offers: sql<number>`count(*) FILTER (WHERE ${applications.status} = 'offer')`,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.userId, userId))
      .groupBy(sql`COALESCE(${jobs.sourceChannel}, 'unknown')`);

    return rows.map((r) => ({
      source: r.source,
      applications: Number(r.applications),
      interviews: Number(r.interviews),
      offers: Number(r.offers),
    }));
  }

  async getCostTrends(userId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.db
      .select({
        date: sql<string>`TO_CHAR(created_at::date, 'YYYY-MM-DD')`,
        costCents: sql<number>`COALESCE(SUM(cost_cents), 0)`,
      })
      .from(llmRequests)
      .where(and(eq(llmRequests.userId, userId), gte(llmRequests.createdAt, since)))
      .groupBy(sql`created_at::date`)
      .orderBy(sql`created_at::date`);

    return rows.map((r) => ({ date: r.date, costCents: Number(r.costCents) }));
  }
}
