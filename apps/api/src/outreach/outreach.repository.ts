import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { outreachMessages, contacts } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { IOutreachRepository } from './interfaces/outreach-repository.interface.js';

@Injectable()
export class OutreachRepository implements IOutreachRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async listMessages(userId: string) {
    return this.db.query.outreachMessages.findMany({
      where: eq(outreachMessages.userId, userId),
      orderBy: [desc(outreachMessages.createdAt)],
    });
  }

  async createMessage(data: Record<string, unknown>) {
    await this.db.insert(outreachMessages).values(data as any);
  }

  async updateMessageStatus(messageId: string, data: Record<string, unknown>) {
    await this.db.update(outreachMessages)
      .set(data as any)
      .where(eq(outreachMessages.id, messageId));
  }

  async listContacts(userId: string) {
    return this.db.query.contacts.findMany({
      where: eq(contacts.userId, userId),
      orderBy: [desc(contacts.createdAt)],
    });
  }

  async createContact(data: Record<string, unknown>) {
    await this.db.insert(contacts).values(data as any);
  }
}
