import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users, userPreferences } from '@auto-job-apply/db';
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
}
