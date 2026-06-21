import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const CompanyScoringSchema = z.object({
  stabilityScore: z.number().min(0).max(100).describe('Financial/employment stability, 0-100'),
  culturalFitScore: z.number().min(0).max(100).describe('General workplace/culture quality, 0-100'),
  glassdoorRating: z
    .number()
    .min(0)
    .max(5)
    .nullable()
    .describe('Approximate Glassdoor rating 0-5, or null if unknown'),
  techStack: z.array(z.string()).describe('Notable technologies the company is known to use'),
  rtoPolicy: z
    .enum(['remote', 'hybrid', 'onsite', 'unknown'])
    .describe('Return-to-office stance'),
  summary: z.string().describe('2-3 sentence read on the company as an employer'),
  signals: z.array(z.string()).describe('The public signals these scores are based on'),
});

export type CompanyScoringResult = z.infer<typeof CompanyScoringSchema>;

export interface CompanyScoringInput {
  name: string;
  domain?: string;
  industry?: string;
  sizeRange?: string;
}

/**
 * LLM-based company scoring. There is no Glassdoor/Levels feed wired up, so the
 * stability, culture, RTO and tech-stack signals come from the model's prior
 * public knowledge of the company. Scores are deliberately conservative (near
 * 50) and ratings null when the model lacks signal — be honest, don't invent.
 */
@Injectable()
export class CompanyScoringAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'company_research');
  }

  async score(
    input: CompanyScoringInput,
    context: AgentContext,
  ): Promise<{ result: CompanyScoringResult; costCents: number }> {
    const systemPrompt =
      'You are a company-research analyst. From public knowledge of the company, estimate workplace ' +
      'signals for a job seeker. Be honest about uncertainty: use null for glassdoorRating and "unknown" ' +
      'for rtoPolicy when you do not know, and keep scores near 50 when signals are thin. Never fabricate ' +
      'specifics you are not confident about.';

    const userPrompt = `## Company
${JSON.stringify(input, null, 2)}

Return JSON with: stabilityScore (0-100), culturalFitScore (0-100), glassdoorRating (0-5 or null),
techStack (array of technologies), rtoPolicy (remote|hybrid|onsite|unknown), a short summary, and
signals (the concrete public facts you based the scores on).`;

    const result = await this.generateStructured(userPrompt, context, CompanyScoringSchema, systemPrompt);
    return { result: result.data, costCents: result.costCents };
  }
}
