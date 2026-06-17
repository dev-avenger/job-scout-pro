import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { users, userPreferences, profiles } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { ISettingsRepository } from './interfaces/settings-repository.interface.js';

@Injectable()
export class SettingsRepository implements ISettingsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async getUser(userId: string) {
    return this.db.query.users.findFirst({ where: eq(users.id, userId) });
  }

  async getPreferences(userId: string) {
    return this.db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) });
  }

  async updateAutonomyMode(userId: string, mode: string) {
    await this.db.update(users)
      .set({ autonomyMode: mode, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updatePreferences(userId: string, data: Record<string, unknown>) {
    await this.db.update(userPreferences)
      .set(data as any)
      .where(eq(userPreferences.userId, userId));
  }

  async mergeUiSettings(userId: string, patch: Record<string, unknown>) {
    const current = await this.getPreferences(userId);
    const merged = { ...((current?.uiSettings as Record<string, unknown>) ?? {}), ...patch };
    await this.db.update(userPreferences)
      .set({ uiSettings: merged })
      .where(eq(userPreferences.userId, userId));
  }

  async hasProfile(userId: string): Promise<boolean> {
    const existing = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    return Boolean(existing);
  }

  async createProfile(userId: string, data: Record<string, unknown>) {
    await this.db.insert(profiles).values({ userId, ...data } as any);
  }

  /** Update the user's default profile (or their first one). Returns false if none. */
  async updateDefaultProfile(userId: string, data: Record<string, unknown>): Promise<boolean> {
    const existing =
      (await this.db.query.profiles.findFirst({
        where: and(eq(profiles.userId, userId), eq(profiles.isDefault, true)),
      })) ??
      (await this.db.query.profiles.findFirst({ where: eq(profiles.userId, userId) }));
    if (!existing) return false;
    await this.db
      .update(profiles)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(profiles.id, (existing as any).id));
    return true;
  }

  async markOnboardingCompleted(userId: string) {
    await this.db.update(users)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
