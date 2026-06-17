import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql, ilike, inArray } from 'drizzle-orm';
import { jobs, applications } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import type { JobFilter } from '@auto-job-apply/shared-types';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { ISearchRepository } from './interfaces/search-repository.interface.js';

@Injectable()
export class SearchRepository implements ISearchRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findJobsByUser(userId: string, filters: JobFilter) {
    const conditions = [eq(jobs.userId, userId)];

    if (filters.status) {
      conditions.push(eq(jobs.validationStatus, filters.status));
    }
    if (filters.source) {
      conditions.push(eq(jobs.sourceChannel, filters.source));
    }
    // Country/location filter — substring match against the location text
    if (filters.location) {
      conditions.push(ilike(jobs.location, `%${filters.location}%`));
    }

    const offset = (filters.page - 1) * filters.limit;

    const [items, countResult] = await Promise.all([
      this.db.query.jobs.findMany({
        where: and(...conditions),
        orderBy: [desc(jobs.createdAt)],
        limit: filters.limit,
        offset,
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);

    // Attach the user's application status per job (if any) so the queue can
    // show which jobs have been applied to.
    const jobIds = items.map((j) => j.id);
    const statusByJob = new Map<string, { status: string; submittedAt: Date | null }>();
    if (jobIds.length > 0) {
      const apps = await this.db
        .select({ jobId: applications.jobId, status: applications.status, submittedAt: applications.submittedAt })
        .from(applications)
        .where(and(eq(applications.userId, userId), inArray(applications.jobId, jobIds)));
      for (const a of apps) {
        // Keep the most advanced application if a job somehow has several.
        const existing = statusByJob.get(a.jobId);
        if (!existing || this.appRank(a.status) > this.appRank(existing.status)) {
          statusByJob.set(a.jobId, { status: a.status, submittedAt: a.submittedAt });
        }
      }
    }

    const withStatus = items.map((j) => ({
      ...j,
      applicationStatus: statusByJob.get(j.id)?.status ?? null,
      appliedAt: statusByJob.get(j.id)?.submittedAt ?? null,
    }));

    return { items: withStatus, total };
  }

  /** Rough ordering so "submitted" wins over "queued" when picking a status. */
  private appRank(status: string): number {
    const order = ['queued', 'in_progress', 'needs_captcha', 'pending_review', 'submitted', 'interview', 'offer', 'rejected', 'failed'];
    const i = order.indexOf(status);
    return i === -1 ? 0 : i;
  }

  /** Distinct sources and countries across ALL of a user's jobs (for filters). */
  async getFacets(userId: string): Promise<{ sources: string[]; countries: string[] }> {
    const rows = await this.db
      .selectDistinct({ source: jobs.sourceChannel, location: jobs.location })
      .from(jobs)
      .where(eq(jobs.userId, userId));

    const sources = new Set<string>();
    const countries = new Set<string>();
    for (const r of rows) {
      if (r.source) sources.add(r.source);
      const loc = (r.location ?? '').trim();
      if (!loc) continue;
      const tail = loc.split(',').pop()!.trim();
      if (tail && tail.length <= 30 && !/^remote$/i.test(tail)) countries.add(tail);
    }
    return { sources: [...sources].sort(), countries: [...countries].sort() };
  }

  async findJobById(userId: string, jobId: string) {
    return this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.userId, userId)),
    });
  }

  async insertJob(data: Record<string, unknown>) {
    await this.db.insert(jobs).values(data as any);
  }

  async deleteJob(jobId: string) {
    await this.db.delete(jobs).where(eq(jobs.id, jobId));
  }
}
