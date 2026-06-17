export interface ISettingsRepository {
  getUser(userId: string): Promise<any | null>;
  getPreferences(userId: string): Promise<any | null>;
  updateAutonomyMode(userId: string, mode: string): Promise<void>;
  updatePreferences(userId: string, data: Record<string, unknown>): Promise<void>;
  mergeUiSettings(userId: string, patch: Record<string, unknown>): Promise<void>;
  markOnboardingCompleted(userId: string): Promise<void>;
  hasProfile(userId: string): Promise<boolean>;
  createProfile(userId: string, data: Record<string, unknown>): Promise<void>;
  updateDefaultProfile(userId: string, data: Record<string, unknown>): Promise<boolean>;
}
