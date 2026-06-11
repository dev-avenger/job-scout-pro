import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import type { Database } from '@auto-job-apply/db';
import { savedAnswers } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'answer-bank' });

@Injectable()
export class AnswerBank {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findByLabel(userId: string, fieldLabel: string): Promise<{ id: string; fieldLabel: string; answerText: string; source: string | null; timesUsed: number } | null> {
    const results = await (this.db
      .select()
      .from(savedAnswers)
      .where(and(eq(savedAnswers.userId, userId), ilike(savedAnswers.fieldLabel, fieldLabel)) as any)
      .limit(1) as any);
    return results[0] || null;
  }

  async save(userId: string, fieldLabel: string, answerText: string, fieldType?: string, source: string = 'learned'): Promise<string> {
    const existing = await this.findByLabel(userId, fieldLabel);
    if (existing) {
      await (this.db
        .update(savedAnswers)
        .set({ answerText, source, lastUsedAt: new Date() })
        .where(eq(savedAnswers.id, existing.id) as any) as any);
      logger.debug({ fieldLabel }, 'Updated existing answer');
      return existing.id;
    }

    const result = await this.db
      .insert(savedAnswers)
      .values({ userId, fieldLabel, fieldType, answerText, source, timesUsed: 0 } as any)
      .returning({ id: savedAnswers.id });
    const inserted = result[0];
    logger.debug({ fieldLabel, id: inserted?.id }, 'Saved new answer');
    return inserted?.id ?? '';
  }

  async incrementUsage(answerId: string): Promise<void> {
    await (this.db
      .update(savedAnswers)
      .set({
        timesUsed: sql`${savedAnswers.timesUsed} + 1` as any,
        lastUsedAt: new Date(),
      })
      .where(eq(savedAnswers.id, answerId) as any) as any);
  }

  async listAll(userId: string): Promise<Array<{ id: string; fieldLabel: string; fieldType: string | null; answerText: string; source: string | null; timesUsed: number }>> {
    return (this.db
      .select()
      .from(savedAnswers)
      .where(eq(savedAnswers.userId, userId) as any)
      .orderBy(desc(savedAnswers.timesUsed) as any) as any);
  }

  async delete(answerId: string): Promise<void> {
    await (this.db.delete(savedAnswers).where(eq(savedAnswers.id, answerId) as any) as any);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await (this.db.delete(savedAnswers).where(eq(savedAnswers.userId, userId) as any) as any);
  }
}
