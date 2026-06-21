import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const SalaryEstimateSchema = z.object({
  currency: z.string().describe('ISO currency code, e.g. USD, EUR, PKR'),
  periodicity: z.enum(['year', 'month', 'hour']),
  low: z.number(),
  mid: z.number(),
  high: z.number(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  notes: z.array(z.string()),
});

export type SalaryEstimateResult = z.infer<typeof SalaryEstimateSchema>;

export interface SalaryEstimateInput {
  title: string;
  company?: string;
  location?: string;
  locationType?: string;
  experienceLevel?: string;
  requiredSkills?: string[];
  description?: string;
}

/**
 * LLM-based salary benchmark. There is no external salary-data feed wired up,
 * so this produces a market-rate estimate from the model's prior knowledge of
 * the role, location and seniority. The `confidence` score reflects how much
 * the model trusts its own estimate; surface it in the UI.
 */
@Injectable()
export class SalaryEstimatorAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'company_research');
  }

  async estimate(
    input: SalaryEstimateInput,
    context: AgentContext,
  ): Promise<{ result: SalaryEstimateResult; costCents: number }> {
    const systemPrompt =
      'You are a compensation analyst. Estimate a realistic market salary range for the given role, ' +
      'calibrated to the location, seniority and skills. Return annual figures unless the role is clearly ' +
      'hourly/contract. Be honest about uncertainty via the confidence field.';

    const userPrompt = `## Role
${JSON.stringify(input, null, 2)}

Estimate the market salary range. Return JSON with: currency (ISO code matching the location),
periodicity, low/mid/high numbers, confidence (0-1), a short rationale, and any notes (e.g. equity-heavy,
location-adjusted, data-sparse).`;

    const result = await this.generateStructured(userPrompt, context, SalaryEstimateSchema, systemPrompt);
    return { result: result.data, costCents: result.costCents };
  }
}
