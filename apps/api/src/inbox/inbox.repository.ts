import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { inboxEmails } from '@auto-job-apply/db';
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

  async create(data: Record<string, unknown>) {
    await this.db.insert(inboxEmails).values(data as any);
  }
}
