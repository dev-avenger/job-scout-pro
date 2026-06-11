import { Injectable, Inject } from '@nestjs/common';
import { LLM_SERVICE } from '../llm/llm.constants.js';
import type { ILLMService } from '../llm/interfaces/llm-service.interface.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'job-scorer' });

export interface JobScoreResult {
  relevanceScore: number;
  callbackProbability: number;
  techStackAlignment: number;
  remoteCompatibility: number;
  culturalFitScore: number;
  competitionLevel: string;
  breakdown: Record<string, number>;
}

@Injectable()
export class JobScorer {
  constructor(@Inject(LLM_SERVICE) private readonly llmService: ILLMService) {}

  async score(
    job: Record<string, unknown>,
    userPreferences: Record<string, unknown>,
  ): Promise<JobScoreResult> {
    const scores: Record<string, number> = {};

    // Skills overlap scoring
    const jobSkills = (job.requiredSkills as string[] || []).map(s => s.toLowerCase());
    const userSkills = (userPreferences.skills as string[] || []).map(s => s.toLowerCase());
    if (jobSkills.length > 0 && userSkills.length > 0) {
      const matches = jobSkills.filter(s => userSkills.some(us => us.includes(s) || s.includes(us)));
      scores.skillsOverlap = matches.length / jobSkills.length;
    } else {
      scores.skillsOverlap = 0.5;
    }

    // Salary fit scoring
    const salaryMin = job.salaryMin as number | undefined;
    const salaryMax = job.salaryMax as number | undefined;
    const prefSalaryMin = userPreferences.salaryMin as number | undefined;
    if (salaryMin && prefSalaryMin) {
      scores.salaryFit = salaryMin >= prefSalaryMin ? 1 : salaryMin / prefSalaryMin;
    } else {
      scores.salaryFit = 0.5;
    }

    // Location match scoring
    const jobLocationType = job.locationType as string | undefined;
    const prefRemote = userPreferences.remotePreference as string | undefined;
    if (jobLocationType && prefRemote) {
      if (prefRemote === 'remote' && jobLocationType === 'remote') scores.locationMatch = 1;
      else if (prefRemote === 'remote' && jobLocationType === 'hybrid') scores.locationMatch = 0.6;
      else if (prefRemote === 'remote' && jobLocationType === 'onsite') scores.locationMatch = 0.2;
      else if (prefRemote === 'any') scores.locationMatch = 1;
      else scores.locationMatch = 0.7;
    } else {
      scores.locationMatch = 0.5;
    }

    // Experience level scoring
    const jobLevel = (job.experienceLevel as string || '').toLowerCase();
    const prefLevel = (userPreferences.experienceLevel as string || '').toLowerCase();
    if (jobLevel && prefLevel) {
      const levels = ['intern', 'entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'staff', 'director'];
      const jobIdx = levels.findIndex(l => jobLevel.includes(l));
      const prefIdx = levels.findIndex(l => prefLevel.includes(l));
      if (jobIdx >= 0 && prefIdx >= 0) {
        const diff = Math.abs(jobIdx - prefIdx);
        scores.experienceMatch = diff === 0 ? 1 : diff === 1 ? 0.7 : diff === 2 ? 0.4 : 0.2;
      } else {
        scores.experienceMatch = 0.5;
      }
    } else {
      scores.experienceMatch = 0.5;
    }

    // Title relevance
    const jobTitle = (job.title as string || '').toLowerCase();
    const targetRoles = (userPreferences.targetRoles as string[] || []).map(r => r.toLowerCase());
    if (targetRoles.length > 0) {
      const titleMatch = targetRoles.some(role =>
        jobTitle.includes(role) || role.split(' ').every(word => jobTitle.includes(word)),
      );
      scores.titleRelevance = titleMatch ? 1 : 0.3;
    } else {
      scores.titleRelevance = 0.5;
    }

    // Composite scoring with weights
    const weights = {
      skillsOverlap: 0.30,
      salaryFit: 0.15,
      locationMatch: 0.15,
      experienceMatch: 0.20,
      titleRelevance: 0.20,
    };

    const relevanceScore = Object.entries(weights).reduce(
      (total, [key, weight]) => total + (scores[key] || 0.5) * weight,
      0,
    );

    // Estimate callback probability (based on competition + relevance)
    const applicantCount = job.applicantCount as number | undefined;
    let competitionFactor = 0.5;
    let competitionLevel = 'medium';
    if (applicantCount !== undefined) {
      if (applicantCount < 25) { competitionFactor = 0.8; competitionLevel = 'low'; }
      else if (applicantCount < 100) { competitionFactor = 0.5; competitionLevel = 'medium'; }
      else { competitionFactor = 0.2; competitionLevel = 'high'; }
    }

    const callbackProbability = Math.min(1, relevanceScore * 0.7 + competitionFactor * 0.3);

    logger.debug({ scores, relevanceScore, callbackProbability }, 'Job scored');

    return {
      relevanceScore: Math.round(relevanceScore * 100) / 100,
      callbackProbability: Math.round(callbackProbability * 100) / 100,
      techStackAlignment: scores.skillsOverlap,
      remoteCompatibility: scores.locationMatch,
      culturalFitScore: 0.5,
      competitionLevel,
      breakdown: scores,
    };
  }
}
