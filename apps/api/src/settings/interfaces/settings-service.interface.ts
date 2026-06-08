export interface ISettingsService {
  getSettings(userId: string): Promise<unknown>;
  updateAutonomyMode(userId: string, mode: string): Promise<void>;
  updateLlmSettings(userId: string, data: Record<string, unknown>): Promise<void>;
  updateBlacklists(userId: string, data: { companyBlacklist?: string[]; keywordBlacklist?: string[] }): Promise<void>;
}
