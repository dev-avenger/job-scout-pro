import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { generateId } from '@auto-job-apply/shared-utils';
import { RESEARCH_REPOSITORY } from './research.constants.js';
import { LLM_SERVICE } from '../llm/llm.constants.js';
import type { IResearchRepository } from './interfaces/research-repository.interface.js';
import type { IResearchService } from './interfaces/research-service.interface.js';
import type { ILLMService } from '../llm/interfaces/llm-service.interface.js';

@Injectable()
export class ResearchService implements IResearchService {
  constructor(
    @Inject(RESEARCH_REPOSITORY) private readonly repo: IResearchRepository,
    @Inject(LLM_SERVICE) private readonly llmService: ILLMService,
  ) {}

  async getCompanyResearch(companyId: string) {
    return this.repo.getCompany(companyId);
  }

  async triggerResearch(companyId: string, companyName: string, userId: string) {
    const result = await this.llmService.generateText(
      'company_research',
      {
        systemPrompt: 'You are a company research analyst. Generate a comprehensive research brief.',
        userPrompt: `Research the company: ${companyName}. Include overview, culture, tech stack, recent news, and interview tips.`,
      },
      { userId },
    );

    await this.repo.updateCompanyResearch(companyId, {
      researchData: { brief: result.text, generatedAt: new Date().toISOString() },
      lastResearchedAt: new Date(),
      updatedAt: new Date(),
    });

    return { research: result.text };
  }

  async createCompany(data: { name: string; domain?: string; careersUrl?: string }) {
    const id = generateId();
    await this.repo.createCompany({ id, ...data });
    return { id };
  }
}
