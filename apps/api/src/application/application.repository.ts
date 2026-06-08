import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { applications, applicationEvents } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { IApplicationRepository } from './interfaces/application-repository.interface.js';

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async list(userId: string, params: { page: number; limit: number; status?: string }) {
    const conditions = [eq(applications.userId, userId)];
    if (params.status) {
      conditions.push(eq(applications.status, params.status));
    }

    const offset = (params.page - 1) * params.limit;

    const [items, countResult] = await Promise.all([
      this.db.query.applications.findMany({
        where: and(...conditions),
        orderBy: [desc(applications.createdAt)],
        limit: params.limit,
        offset,
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);
    return { items, total };
  }

  async getById(userId: string, applicationId: string) {
    return this.db.query.applications.findFirst({
      where: and(eq(applications.id, applicationId), eq(applications.userId, userId)),
    });
  }

  async findByIdempotencyKey(key: string) {
    return this.db.query.applications.findFirst({
      where: eq(applications.idempotencyKey, key),
    });
  }

  async create(data: Record<string, unknown>) {
    await this.db.insert(applications).values(data as any);
  }

  async updateStatus(applicationId: string, data: Record<string, unknown>) {
    await this.db.update(applications)
      .set(data as any)
      .where(eq(applications.id, applicationId));
  }

  async recordEvent(data: Record<string, unknown>) {
    await this.db.insert(applicationEvents).values(data as any);
  }

  async getReviewQueue(userId: string) {
    return this.db.query.applications.findMany({
      where: and(eq(applications.userId, userId), eq(applications.status, 'queued')),
      orderBy: [desc(applications.createdAt)],
    });
  }

  async getDeadLetter(userId: string) {
    return this.db.query.applications.findMany({
      where: and(eq(applications.userId, userId), eq(applications.status, 'failed')),
      orderBy: [desc(applications.updatedAt)],
    });
  }
}
