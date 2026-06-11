import { Injectable, Inject } from '@nestjs/common';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { resumeTemplates } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { generateId } from '@auto-job-apply/shared-utils';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';

export interface CreateTemplateData {
  slug: string;
  name: string;
  region: string;
  description?: string;
  config: Record<string, unknown>;
  previewImageUrl?: string;
}

@Injectable()
export class TemplatesRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  /** User templates + any DB-stored global templates */
  async list(userId: string) {
    return this.db
      .select()
      .from(resumeTemplates)
      .where(or(eq(resumeTemplates.userId, userId), isNull(resumeTemplates.userId)))
      .orderBy(desc(resumeTemplates.updatedAt));
  }

  async get(userId: string, id: string) {
    const rows = await this.db
      .select()
      .from(resumeTemplates)
      .where(
        and(
          eq(resumeTemplates.id, id),
          or(eq(resumeTemplates.userId, userId), isNull(resumeTemplates.userId)),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async create(userId: string, data: CreateTemplateData) {
    const id = generateId();
    await this.db.insert(resumeTemplates).values({
      id,
      userId,
      slug: data.slug,
      name: data.name,
      region: data.region,
      description: data.description,
      config: data.config,
      previewImageUrl: data.previewImageUrl,
      isBuiltIn: false,
    });
    return { id };
  }

  async update(userId: string, id: string, data: Partial<CreateTemplateData>) {
    await this.db
      .update(resumeTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(resumeTemplates.id, id), eq(resumeTemplates.userId, userId)));
  }

  async delete(userId: string, id: string) {
    await this.db
      .delete(resumeTemplates)
      .where(and(eq(resumeTemplates.id, id), eq(resumeTemplates.userId, userId)));
  }
}
