export interface IResumeService {
  listProfiles(userId: string): Promise<unknown[]>;
  getProfile(userId: string, profileId: string): Promise<unknown | null>;
  createProfile(userId: string, data: { name: string; contactInfo: Record<string, unknown>; isDefault?: boolean }): Promise<{ id: string }>;
  updateProfile(userId: string, profileId: string, data: Record<string, unknown>): Promise<void>;
  deleteProfile(userId: string, profileId: string): Promise<void>;
  scoreAts(profile: Record<string, unknown>, jobDescription?: string): unknown;
}
