import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { companies } from '@auto-job-apply/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'research-processor' });

const CompanyResearchSchema = z.object({
  industry: z.string().optional(),
  sizeRange: z.string().optional(),
  stabilityScore: z.number().min(0).max(1).optional(),
  culturalFitScore: z.number().min(0).max(1).optional(),
  glassdoorRating: z.number().min(0).max(5).optional(),
  techStack: z.array(z.string()).optional(),
  rtoPolicy: z.string().optional(),
  overview: z.string().optional(),
  recentNews: z.array(z.string()).optional(),
  interviewTopics: z.array(z.string()).optional(),
});

@Injectable()
@Processor('research')
export class ResearchProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(LLM_SERVICE) private readonly llmService: ILLMService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { userId, companyId, companyName } = job.data;
    logger.info({ jobId: job.id, companyName }, 'Processing company research');

    if (!companyName && !companyId) {
      logger.warn('No companyName or companyId provided');
      return;
    }

    const context = { userId: userId || 'system' };

    try {
      const systemPrompt = this.llmService.promptRegistry.getSystem('company_research');
      const result = await this.llmService.generateStructured(
        'company_research',
        {
          systemPrompt,
          userPrompt: `Research the company "${companyName}". Return structured data about the company including industry, size, stability, culture, tech stack, and recent developments.`,
          schema: CompanyResearchSchema,
        },
        context,
      );

      const data = result.data;

      if (companyId) {
        await (this.db.update(companies).set({
          industry: data.industry,
          sizeRange: data.sizeRange,
          stabilityScore: data.stabilityScore,
          culturalFitScore: data.culturalFitScore,
          glassdoorRating: data.glassdoorRating,
          techStack: data.techStack,
          rtoPolicy: data.rtoPolicy,
          researchData: data as any,
          lastResearchedAt: new Date(),
          updatedAt: new Date(),
        } as any).where(eq(companies.id, companyId) as any) as any);
      } else {
        await this.db.insert(companies).values({
          name: companyName,
          industry: data.industry,
          sizeRange: data.sizeRange,
          stabilityScore: data.stabilityScore,
          culturalFitScore: data.culturalFitScore,
          glassdoorRating: data.glassdoorRating,
          techStack: data.techStack,
          rtoPolicy: data.rtoPolicy,
          researchData: data as any,
          lastResearchedAt: new Date(),
        } as any);
      }

      logger.info({ companyName, costCents: result.costCents }, 'Company research complete');
    } catch (err) {
      logger.error({ error: err, companyName }, 'Company research failed');
      throw err;
    }
  }
}
