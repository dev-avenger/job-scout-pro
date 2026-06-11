import { Injectable, Inject } from '@nestjs/common';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

@Injectable()
export class CoverLetterAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'cover_letter');
  }

  async generateCoverLetter(
    profile: Record<string, unknown>,
    jobTitle: string,
    companyName: string,
    jobDescription: string,
    context: AgentContext,
  ): Promise<{ coverLetter: string; costCents: number }> {
    const systemPrompt = this.llmService.promptRegistry.getSystem('cover_letter');
    const userPrompt = `## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Target Position
Title: ${jobTitle}
Company: ${companyName}

## Job Description
${jobDescription}

Write a personalized cover letter for this position. Keep it under 400 words, authentic, and specific to this role.`;

    const result = await this.generate(userPrompt, context, systemPrompt);
    return { coverLetter: result.text.trim(), costCents: result.costCents };
  }
}
