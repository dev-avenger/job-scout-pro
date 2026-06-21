import type { SalaryEstimateInput, SalaryEstimateResult } from '../agents/salary-estimator.agent.js';
import type { SkillGapInput, SkillGapResult } from '../agents/skill-gap.agent.js';
import type { InterviewPrepResult } from '../agents/interview-prep.agent.js';
import type { CompanyScoringResult } from '../agents/company-scoring.agent.js';

export interface IResearchService {
  getCompanyResearch(companyId: string): Promise<unknown | null>;
  triggerResearch(
    companyId: string,
    companyName: string,
    userId: string,
  ): Promise<{
    research: string;
    scores: {
      stabilityScore: number;
      culturalFitScore: number;
      glassdoorRating: number | null;
      techStack: string[];
      rtoPolicy: string;
    };
  }>;
  createCompany(data: { name: string; domain?: string; careersUrl?: string }): Promise<{ id: string }>;
  estimateSalary(userId: string, input: SalaryEstimateInput): Promise<SalaryEstimateResult & { costCents: number }>;
  analyzeSkillGap(userId: string, input: SkillGapInput): Promise<SkillGapResult & { costCents: number }>;
  analyzeSkillGapForApplication(userId: string, applicationId: string): Promise<SkillGapResult & { costCents: number }>;
  generateInterviewPrep(userId: string, applicationId: string): Promise<InterviewPrepResult & { costCents: number }>;
  analyzeCompanyForApplication(
    userId: string,
    applicationId: string,
  ): Promise<CompanyScoringResult & { costCents: number; persisted: boolean }>;
}
