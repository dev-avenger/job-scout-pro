import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { jobs } from '@auto-job-apply/db';
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
    return { items, total };
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
