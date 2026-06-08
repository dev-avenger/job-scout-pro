import { Injectable, Inject, NotFoundException } from '@nestjs/common';
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
}
