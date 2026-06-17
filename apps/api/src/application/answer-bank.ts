import { Injectable, Inject, Optional } from '@nestjs/common';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import type { Database } from '@auto-job-apply/db';
import { savedAnswers } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { LLM_SERVICE } from '../llm/llm.constants.js';
import type { ILLMService } from '../llm/interfaces/llm-service.interface.js';
import { createLogger } from '@auto-job-apply/shared-utils';
import { bestSemanticMatch } from './embedding-match.js';

const logger = createLogger({ name: 'answer-bank' });

@Injectable()
export class AnswerBank {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Optional() @Inject(LLM_SERVICE) private readonly llm?: ILLMService,
  ) {}

  /** Best-effort embedding of a question label; null if no provider or it fails. */
  private async embed(text: string, userId: string): Promise<number[] | null> {
    if (!this.llm) return null;
    try {
      const vec = await this.llm.getEmbedding(text, { userId });
      return Array.isArray(vec) && vec.length > 0 ? vec : null;
    } catch (err) {
      logger.debug({ err }, 'Embedding unavailable — skipping semantic match');
      return null;
    }
  }

  /**
   * Find a previously-answered question that is SEMANTICALLY close to this one
   * (e.g. "Why this role?" ≈ "Why are you interested in this position?") so the
   * cached answer is reused instead of paying the LLM again. Degrades to null
   * when no embeddings provider is configured.
   */
  async findSemantic(
    userId: string,
    fieldLabel: string,
    threshold = 0.86,
  ): Promise<{ id: string; answerText: string } | null> {
    const query = await this.embed(fieldLabel, userId);
    if (!query) return null;

    const rows = (await (this.db
      .select({
        id: savedAnswers.id,
        answerText: savedAnswers.answerText,
        embedding: savedAnswers.questionEmbedding,
      })
      .from(savedAnswers)
      .where(eq(savedAnswers.userId, userId) as any) as any)) as Array<{
      id: string;
      answerText: string;
      embedding: unknown;
    }>;

    const candidates = rows.map((r) => ({
      id: r.id,
      answerText: r.answerText,
      embedding: Array.isArray(r.embedding) ? (r.embedding as number[]) : null,
    }));

    const match = bestSemanticMatch(query, candidates, threshold);
    return match ? { id: match.id, answerText: match.answerText } : null;
  }

  async findByLabel(userId: string, fieldLabel: string): Promise<{ id: string; fieldLabel: string; answerText: string; source: string | null; timesUsed: number } | null> {
    const results = await (this.db
      .select()
      .from(savedAnswers)
      .where(and(eq(savedAnswers.userId, userId), ilike(savedAnswers.fieldLabel, fieldLabel)) as any)
      .limit(1) as any);
    return results[0] || null;
  }

  async save(userId: string, fieldLabel: string, answerText: string, fieldType?: string, source: string = 'learned'): Promise<string> {
    const embedding = await this.embed(fieldLabel, userId);
    const existing = await this.findByLabel(userId, fieldLabel);
    if (existing) {
      await (this.db
        .update(savedAnswers)
        .set({ answerText, source, lastUsedAt: new Date(), ...(embedding ? { questionEmbedding: embedding } : {}) })
        .where(eq(savedAnswers.id, existing.id) as any) as any);
      logger.debug({ fieldLabel }, 'Updated existing answer');
      return existing.id;
    }

    const result = await this.db
      .insert(savedAnswers)
      .values({ userId, fieldLabel, fieldType, answerText, source, timesUsed: 0, ...(embedding ? { questionEmbedding: embedding } : {}) } as any)
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
