import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { generateId } from '@auto-job-apply/shared-utils';
import { RESUME_REPOSITORY } from './resume.constants.js';
import type { IResumeRepository } from './interfaces/resume-repository.interface.js';
import type { IResumeService } from './interfaces/resume-service.interface.js';
import { AtsScorer } from './ats-scorer.js';

@Injectable()
export class ResumeService implements IResumeService {
  constructor(
    @Inject(RESUME_REPOSITORY) private readonly repo: IResumeRepository,
    private readonly atsScorer: AtsScorer,
  ) {}

  async listProfiles(userId: string) {
    return this.repo.listProfiles(userId);
  }

  async getProfile(userId: string, profileId: string) {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async createProfile(userId: string, data: { name: string; contactInfo: Record<string, unknown>; isDefault?: boolean }) {
    return this.repo.createProfile(userId, data);
  }

  async updateProfile(userId: string, profileId: string, data: Record<string, unknown>) {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');
    await this.repo.updateProfile(userId, profileId, data);
  }

  async deleteProfile(userId: string, profileId: string) {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');
    await this.repo.deleteProfile(userId, profileId);
  }

  scoreAts(profile: Record<string, unknown>, jobDescription?: string) {
    return this.atsScorer.score(profile, jobDescription);
  }

  /* ---- Section CRUD ---- */

  async getSectionItems(userId: string, profileId: string, sectionType: string): Promise<unknown[]> {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');

    const items = await this.repo.getSectionItems(userId, profileId, sectionType);

    // Backfill missing IDs on read
    let dirty = false;
    const backfilled = (items as Record<string, unknown>[]).map((item) => {
      if (!item.id) {
        dirty = true;
        return { ...item, id: generateId() };
      }
      return item;
    });

    if (dirty) {
      await this.repo.upsertSectionColumn(userId, profileId, sectionType, backfilled);
    }

    return backfilled;
  }

  async addSectionItem(userId: string, profileId: string, sectionType: string, item: Record<string, unknown>): Promise<Record<string, unknown>> {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');

    const items = await this.repo.getSectionItems(userId, profileId, sectionType) as Record<string, unknown>[];
    const newItem = { ...item, id: generateId() };
    items.push(newItem);
    await this.repo.upsertSectionColumn(userId, profileId, sectionType, items);
    return newItem;
  }

  async updateSectionItem(userId: string, profileId: string, sectionType: string, itemId: string, updates: Record<string, unknown>): Promise<Record<string, unknown>> {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');

    const items = await this.repo.getSectionItems(userId, profileId, sectionType) as Record<string, unknown>[];
    const idx = items.findIndex((it) => it.id === itemId);
    if (idx === -1) throw new NotFoundException('Section item not found');

    const updated = { ...items[idx], ...updates, id: itemId };
    items[idx] = updated;
    await this.repo.upsertSectionColumn(userId, profileId, sectionType, items);
    return updated;
  }

  async deleteSectionItem(userId: string, profileId: string, sectionType: string, itemId: string): Promise<void> {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');

    const items = await this.repo.getSectionItems(userId, profileId, sectionType) as Record<string, unknown>[];
    const filtered = items.filter((it) => it.id !== itemId);
    if (filtered.length === items.length) throw new NotFoundException('Section item not found');
    await this.repo.upsertSectionColumn(userId, profileId, sectionType, filtered);
  }

  /* ---- Resume Versions ---- */

  async listResumeVersions(userId: string, profileId: string) {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');
    return this.repo.listResumeVersions(userId, profileId);
  }

  async getResumeVersion(userId: string, profileId: string, versionId: string) {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');
    const version = await this.repo.getResumeVersion(userId, profileId, versionId);
    if (!version) throw new NotFoundException('Resume version not found');
    return version;
  }

  async createResumeVersion(userId: string, profileId: string, data: Record<string, unknown>) {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');
    return this.repo.createResumeVersion({ ...data, profileId });
  }

  async deleteResumeVersion(userId: string, profileId: string, versionId: string) {
    const profile = await this.repo.getProfile(userId, profileId);
    if (!profile) throw new NotFoundException('Profile not found');
    const version = await this.repo.getResumeVersion(userId, profileId, versionId);
    if (!version) throw new NotFoundException('Resume version not found');
    await this.repo.deleteResumeVersion(userId, profileId, versionId);
  }
}
