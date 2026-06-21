import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const SkillGapSchema = z.object({
  gapScore: z.number().min(0).max(100).describe('0 = no gap (fully qualified), 100 = large gap'),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  transferableSkills: z.array(z.object({ have: z.string(), maps_to: z.string() })),
  recommendations: z.array(z.object({ skill: z.string(), why: z.string(), resource: z.string().optional() })),
  summary: z.string(),
});

export type SkillGapResult = z.infer<typeof SkillGapSchema>;

export interface SkillGapInput {
  jobTitle: string;
  jobDescription?: string;
  requiredSkills?: string[];
  profileSkills: string[];
  profileSummary?: string;
}

/**
 * Compares a candidate's skills against a target role and surfaces matched /
 * missing / transferable skills plus a learning plan. Pure LLM analysis over
 * the supplied profile + job text — no external data sources.
 */
@Injectable()
export class SkillGapAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'company_research');
  }

  async analyze(
    input: SkillGapInput,
    context: AgentContext,
  ): Promise<{ result: SkillGapResult; costCents: number }> {
    const systemPrompt =
      'You are a career coach performing a skills-gap analysis. Compare the candidate against the target ' +
      'role. Identify directly matched skills, genuinely missing skills, and transferable skills (where ' +
      'existing experience maps onto a requirement). Give a concrete, prioritised learning plan. Never ' +
      'invent skills the candidate does not have.';

    const userPrompt = `## Target role
Title: ${input.jobTitle}
Required skills: ${(input.requiredSkills ?? []).join(', ') || '(infer from description)'}
Description:
${input.jobDescription ?? '(none provided)'}

## Candidate
Skills: ${input.profileSkills.join(', ') || '(none provided)'}
Summary: ${input.profileSummary ?? '(none)'}

Return JSON with gapScore (0-100), matchedSkills, missingSkills, transferableSkills (have -> maps_to),
recommendations (skill, why, optional resource), and a short summary.`;

    const result = await this.generateStructured(userPrompt, context, SkillGapSchema, systemPrompt);
    return { result: result.data, costCents: result.costCents };
  }
}
