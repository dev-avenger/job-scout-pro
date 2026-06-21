import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { generateId } from '@auto-job-apply/shared-utils';
import { applications, jobs, companies, profiles } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { RESEARCH_REPOSITORY } from './research.constants.js';
import { LLM_SERVICE } from '../llm/llm.constants.js';
import type { IResearchRepository } from './interfaces/research-repository.interface.js';
import type { IResearchService } from './interfaces/research-service.interface.js';
import type { ILLMService } from '../llm/interfaces/llm-service.interface.js';
import { SalaryEstimatorAgent, type SalaryEstimateInput } from './agents/salary-estimator.agent.js';
import { SkillGapAgent, type SkillGapInput } from './agents/skill-gap.agent.js';
import { InterviewPrepAgent } from './agents/interview-prep.agent.js';
import { CompanyScoringAgent, type CompanyScoringInput } from './agents/company-scoring.agent.js';

/** Coerce a profile's `skills` jsonb (string[] | {name}[]) into a flat string[]. */
function skillNames(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((s) => (typeof s === 'string' ? s : (s as Record<string, unknown>)?.name))
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
}

@Injectable()
export class ResearchService implements IResearchService {
  constructor(
    @Inject(RESEARCH_REPOSITORY) private readonly repo: IResearchRepository,
    @Inject(LLM_SERVICE) private readonly llmService: ILLMService,
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    private readonly salaryEstimator: SalaryEstimatorAgent,
    private readonly skillGapAgent: SkillGapAgent,
    private readonly interviewPrepAgent: InterviewPrepAgent,
    private readonly companyScoringAgent: CompanyScoringAgent,
  ) {}

  async estimateSalary(userId: string, input: SalaryEstimateInput) {
    const { result, costCents } = await this.salaryEstimator.estimate(input, { userId });
    return { ...result, costCents };
  }

  async analyzeSkillGap(userId: string, input: SkillGapInput) {
    const { result, costCents } = await this.skillGapAgent.analyze(input, { userId });
    return { ...result, costCents };
  }

  /**
   * Resolve an application into the rich objects the research agents want:
   * the job, its company (if linked), and the user's default profile.
   */
  private async loadApplicationContext(userId: string, applicationId: string) {
    const appRows = (await this.db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1)) as any[];
    const app = appRows[0];
    if (!app) throw new NotFoundException('Application not found');

    const jobRows = (await this.db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1)) as any[];
    const job = jobRows[0] ?? null;
    if (!job) throw new NotFoundException('Job not found for application');

    let company: any = null;
    if (job.companyId) {
      const companyRows = (await this.db
        .select()
        .from(companies)
        .where(eq(companies.id, job.companyId))
        .limit(1)) as any[];
      company = companyRows[0] ?? null;
    }

    const profileRows = (await this.db.query.profiles.findMany({
      where: eq(profiles.userId, userId),
      orderBy: [desc(profiles.isDefault), desc(profiles.createdAt)],
      limit: 1,
    })) as any[];
    const profile = profileRows[0] ?? null;
    if (!profile) throw new NotFoundException('No resume profile found — create one first');

    return { job, company, profile };
  }

  async analyzeSkillGapForApplication(userId: string, applicationId: string) {
    const { job, profile } = await this.loadApplicationContext(userId, applicationId);
    const input: SkillGapInput = {
      jobTitle: job.title ?? 'the role',
      jobDescription: job.description ?? undefined,
      requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills : undefined,
      profileSkills: skillNames(profile.skills),
      profileSummary: profile.summary ?? undefined,
    };
    return this.analyzeSkillGap(userId, input);
  }

  async generateInterviewPrep(userId: string, applicationId: string) {
    const { job, company, profile } = await this.loadApplicationContext(userId, applicationId);
    const { prep, costCents } = await this.interviewPrepAgent.generatePrepMaterials(
      job,
      company,
      profile,
      { userId },
    );
    return { ...prep, costCents };
  }

  async getCompanyResearch(companyId: string) {
    return this.repo.getCompany(companyId);
  }

  /**
   * Score a company on stability/culture/RTO/tech-stack via the LLM and persist
   * the structured fields onto the `companies` row when the company is known.
   * Falls back to scoring by name (ephemeral, no persist) for jobs whose company
   * isn't linked yet.
   */
  private async scoreAndPersistCompany(
    company: { id?: string; name?: string; domain?: string; industry?: string; sizeRange?: string } | null,
    fallbackName: string,
    userId: string,
  ) {
    const input: CompanyScoringInput = {
      name: company?.name ?? fallbackName,
      domain: company?.domain ?? undefined,
      industry: company?.industry ?? undefined,
      sizeRange: company?.sizeRange ?? undefined,
    };

    const { result, costCents } = await this.companyScoringAgent.score(input, { userId });

    if (company?.id) {
      await this.repo.updateCompanyResearch(company.id, {
        stabilityScore: result.stabilityScore,
        culturalFitScore: result.culturalFitScore,
        glassdoorRating: result.glassdoorRating,
        techStack: result.techStack,
        rtoPolicy: result.rtoPolicy,
        lastResearchedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { ...result, costCents, persisted: Boolean(company?.id) };
  }

  async analyzeCompanyForApplication(userId: string, applicationId: string) {
    const { job, company } = await this.loadApplicationContext(userId, applicationId);
    return this.scoreAndPersistCompany(company, job.companyName ?? 'the company', userId);
  }

  async triggerResearch(companyId: string, companyName: string, userId: string) {
    const company = (await this.repo.getCompany(companyId)) as any;

    const result = await this.llmService.generateText(
      'company_research',
      {
        systemPrompt: 'You are a company research analyst. Generate a comprehensive research brief.',
        userPrompt: `Research the company: ${companyName}. Include overview, culture, tech stack, recent news, and interview tips.`,
      },
      { userId },
    );

    // Also populate the structured score fields (stability/culture/RTO/etc.).
    const scoring = await this.scoreAndPersistCompany(
      company ?? { id: companyId, name: companyName },
      companyName,
      userId,
    );

    await this.repo.updateCompanyResearch(companyId, {
      researchData: {
        brief: result.text,
        scoring: { summary: scoring.summary, signals: scoring.signals },
        generatedAt: new Date().toISOString(),
      },
      lastResearchedAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      research: result.text,
      scores: {
        stabilityScore: scoring.stabilityScore,
        culturalFitScore: scoring.culturalFitScore,
        glassdoorRating: scoring.glassdoorRating,
        techStack: scoring.techStack,
        rtoPolicy: scoring.rtoPolicy,
      },
    };
  }

  async createCompany(data: { name: string; domain?: string; careersUrl?: string }) {
    const id = generateId();
    await this.repo.createCompany({ id, ...data });
    return { id };
  }
}
