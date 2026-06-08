import { Injectable, Inject } from '@nestjs/common';
import { SETTINGS_REPOSITORY } from './settings.constants.js';
import type { ISettingsRepository } from './interfaces/settings-repository.interface.js';
import type { ISettingsService } from './interfaces/settings-service.interface.js';

@Injectable()
export class SettingsService implements ISettingsService {
  constructor(@Inject(SETTINGS_REPOSITORY) private readonly repo: ISettingsRepository) {}

  async getSettings(userId: string) {
    const [user, prefs] = await Promise.all([
      this.repo.getUser(userId),
      this.repo.getPreferences(userId),
    ]);

    return {
      autonomyMode: user?.autonomyMode,
      onboardingCompleted: user?.onboardingCompleted,
      preferences: prefs,
    };
  }

  async updateAutonomyMode(userId: string, mode: string) {
    await this.repo.updateAutonomyMode(userId, mode);
  }

  async updateLlmSettings(userId: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {};
    if (data.dailyCapCents !== undefined) updateData.dailyLlmCapCents = data.dailyCapCents;
    if (data.monthlyCapCents !== undefined) updateData.monthlyLlmCapCents = data.monthlyCapCents;

    if (Object.keys(updateData).length > 0) {
      await this.repo.updatePreferences(userId, updateData);
    }
  }

  async updateBlacklists(userId: string, data: { companyBlacklist?: string[]; keywordBlacklist?: string[] }) {
    const updateData: Record<string, unknown> = {};
    if (data.companyBlacklist) updateData.companyBlacklist = data.companyBlacklist;
    if (data.keywordBlacklist) updateData.keywordBlacklist = data.keywordBlacklist;

    await this.repo.updatePreferences(userId, updateData);
  }
}
