export interface IResumeService {
  listProfiles(userId: string): Promise<unknown[]>;
  getProfile(userId: string, profileId: string): Promise<unknown | null>;
  createProfile(userId: string, data: { name: string; contactInfo: Record<string, unknown>; isDefault?: boolean }): Promise<{ id: string }>;
  updateProfile(userId: string, profileId: string, data: Record<string, unknown>): Promise<void>;
  deleteProfile(userId: string, profileId: string): Promise<void>;
  scoreAts(profile: Record<string, unknown>, jobDescription?: string): unknown;

  // Section CRUD
  getSectionItems(userId: string, profileId: string, sectionType: string): Promise<unknown[]>;
  addSectionItem(userId: string, profileId: string, sectionType: string, item: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateSectionItem(userId: string, profileId: string, sectionType: string, itemId: string, item: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteSectionItem(userId: string, profileId: string, sectionType: string, itemId: string): Promise<void>;

  // Resume versions
  listResumeVersions(userId: string, profileId: string): Promise<unknown[]>;
  getResumeVersion(userId: string, profileId: string, versionId: string): Promise<unknown>;
  createResumeVersion(userId: string, profileId: string, data: Record<string, unknown>): Promise<{ id: string }>;
  deleteResumeVersion(userId: string, profileId: string, versionId: string): Promise<void>;
}
