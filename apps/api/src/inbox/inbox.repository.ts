import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { inboxEmails, applications, jobs } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { IInboxRepository } from './interfaces/inbox-repository.interface.js';

@Injectable()
export class InboxRepository implements IInboxRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async list(userId: string) {
    return this.db.query.inboxEmails.findMany({
      where: eq(inboxEmails.userId, userId),
      orderBy: [desc(inboxEmails.createdAt)],
    });
  }

  /** Company names of jobs this user has applied to through the portal. */
  async getAppliedCompanyNames(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ companyName: jobs.companyName })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.userId, userId))
      .groupBy(jobs.companyName);
    return rows.map((r) => r.companyName).filter(Boolean) as string[];
  }

  async create(data: Record<string, unknown>) {
    await this.db.insert(inboxEmails).values(data as any);
  }
}
