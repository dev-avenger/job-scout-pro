export interface ISettingsRepository {
  getUser(userId: string): Promise<any | null>;
  getPreferences(userId: string): Promise<any | null>;
  updateAutonomyMode(userId: string, mode: string): Promise<void>;
  updatePreferences(userId: string, data: Record<string, unknown>): Promise<void>;
}
