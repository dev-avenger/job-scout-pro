export interface IResumeRepository {
  listProfiles(userId: string): Promise<unknown[]>;
  getProfile(userId: string, profileId: string): Promise<unknown | null>;
  createProfile(userId: string, data: Record<string, unknown>): Promise<{ id: string }>;
  updateProfile(userId: string, profileId: string, data: Record<string, unknown>): Promise<void>;
  deleteProfile(userId: string, profileId: string): Promise<void>;
  listResumeVersions(userId: string, profileId?: string): Promise<unknown[]>;
  createResumeVersion(data: Record<string, unknown>): Promise<{ id: string }>;
}
