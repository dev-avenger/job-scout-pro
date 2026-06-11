export interface IResumeRepository {
  listProfiles(userId: string): Promise<unknown[]>;
  getProfile(userId: string, profileId: string): Promise<unknown | null>;
  createProfile(userId: string, data: Record<string, unknown>): Promise<{ id: string }>;
  updateProfile(userId: string, profileId: string, data: Record<string, unknown>): Promise<void>;
  deleteProfile(userId: string, profileId: string): Promise<void>;

  // Section CRUD (JSONB array columns)
  getSectionItems(userId: string, profileId: string, sectionType: string): Promise<unknown[]>;
  upsertSectionColumn(userId: string, profileId: string, sectionType: string, items: unknown[]): Promise<void>;

  // Resume versions
  listResumeVersions(userId: string, profileId?: string): Promise<unknown[]>;
  getResumeVersion(userId: string, profileId: string, versionId: string): Promise<unknown | null>;
  createResumeVersion(data: Record<string, unknown>): Promise<{ id: string }>;
  deleteResumeVersion(userId: string, profileId: string, versionId: string): Promise<void>;
}
