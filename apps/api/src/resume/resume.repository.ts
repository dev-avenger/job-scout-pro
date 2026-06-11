import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { profiles, resumeVersions } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { generateId } from '@auto-job-apply/shared-utils';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { IResumeRepository } from './interfaces/resume-repository.interface.js';

@Injectable()
export class ResumeRepository implements IResumeRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async listProfiles(userId: string) {
    return this.db.query.profiles.findMany({
      where: eq(profiles.userId, userId),
      orderBy: [desc(profiles.updatedAt)],
    });
  }

  async getProfile(userId: string, profileId: string) {
    return this.db.query.profiles.findFirst({
      where: and(eq(profiles.id, profileId), eq(profiles.userId, userId)),
    });
  }

  async createProfile(userId: string, data: Record<string, unknown>) {
    const id = generateId();

    if (data.isDefault) {
      await this.db.update(profiles)
        .set({ isDefault: false })
        .where(and(eq(profiles.userId, userId), eq(profiles.isDefault, true)));
    }

    await this.db.insert(profiles).values({
      id,
      userId,
      name: data.name as string,
      contactInfo: data.contactInfo as Record<string, unknown>,
      isDefault: (data.isDefault as boolean) ?? false,
    });

    return { id };
  }

  async updateProfile(userId: string, profileId: string, data: Record<string, unknown>) {
    if (data.isDefault) {
      await this.db.update(profiles)
        .set({ isDefault: false })
        .where(and(eq(profiles.userId, userId), eq(profiles.isDefault, true)));
    }

    await this.db.update(profiles)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(profiles.id, profileId));
  }

  async deleteProfile(_userId: string, profileId: string) {
    await this.db.delete(profiles).where(eq(profiles.id, profileId));
  }

  /* ---- Section CRUD (JSONB array columns) ---- */

  async getSectionItems(userId: string, profileId: string, sectionType: string): Promise<unknown[]> {
    const profile = await this.getProfile(userId, profileId) as Record<string, unknown> | null;
    if (!profile) return [];
    const items = (profile[sectionType] as unknown[]) ?? [];
    return items;
  }

  async upsertSectionColumn(userId: string, profileId: string, sectionType: string, items: unknown[]): Promise<void> {
    await this.db.update(profiles)
      .set({ [sectionType]: items, updatedAt: new Date() } as any)
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  }

  /* ---- Resume Versions ---- */

  async listResumeVersions(userId: string, profileId?: string) {
    if (profileId) {
      return this.db.query.resumeVersions.findMany({
        where: eq(resumeVersions.profileId, profileId),
        orderBy: [desc(resumeVersions.createdAt)],
      });
    }
    return this.db.query.resumeVersions.findMany({
      orderBy: [desc(resumeVersions.createdAt)],
    });
  }

  async getResumeVersion(userId: string, profileId: string, versionId: string) {
    const version = await this.db.query.resumeVersions.findFirst({
      where: and(eq(resumeVersions.id, versionId), eq(resumeVersions.profileId, profileId)),
    });
    return version ?? null;
  }

  async createResumeVersion(data: Record<string, unknown>) {
    const id = generateId();
    await this.db.insert(resumeVersions).values({ id, ...data } as any);
    return { id };
  }

  async deleteResumeVersion(userId: string, profileId: string, versionId: string) {
    await this.db.delete(resumeVersions)
      .where(and(eq(resumeVersions.id, versionId), eq(resumeVersions.profileId, profileId)));
  }
}
