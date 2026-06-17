import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const AtsAnalysisSchema = z.object({
  /** Semantic match of the resume to the job, 0-100 (not a substring count). */
  semanticMatchScore: z.number().min(0).max(100),
  /** Job keywords/skills genuinely evidenced in the resume. */
  matchedKeywords: z.array(z.string()),
  /** Job keywords/skills missing, with how important and how to address. */
  missingKeywords: z.array(
    z.object({
      keyword: z.string(),
      importance: z.enum(['critical', 'preferred']),
      suggestion: z.string(),
    }),
  ),
  /** Required hard skills the candidate appears to lack evidence for. */
  hardSkillGaps: z.array(z.string()),
  /** Formatting/structure issues that hurt machine parsing of the resume. */
  parseSafetyIssues: z.array(z.string()),
  /** Concrete, ranked edits — most impactful first. */
  prioritizedSuggestions: z.array(
    z.object({
      priority: z.enum(['high', 'medium', 'low']),
      suggestion: z.string(),
    }),
  ),
  /** One-line recruiter-style verdict. */
  verdict: z.string(),
});

export type AtsAnalysis = z.infer<typeof AtsAnalysisSchema>;

const SYSTEM_PROMPT = `You are a hybrid of an ATS (applicant tracking system) parser and a senior technical recruiter.
Given a candidate's structured resume profile and a job description, judge how well the resume matches THIS specific job.
- Judge keywords SEMANTICALLY: "built REST APIs in Node" satisfies "backend/Express experience"; do not require exact string matches.
- Only list a keyword as matched if the resume gives real evidence for it.
- Rate missing items by importance to this role (critical vs preferred) and say specifically how to address each.
- Flag parse-safety problems an ATS would choke on (tables/columns for critical data, images-as-text, non-standard section names, missing dates).
- Make suggestions concrete and tied to this job, ranked by impact. Never invent experience the candidate doesn't have.
Return only the requested JSON.`;

/**
 * LLM-backed ATS analysis. Complements the fast heuristic AtsScorer with
 * job-scoped semantic judgement, real keyword reasoning, parse-safety checks,
 * and actionable suggestions. Job description is required (this is always
 * job-specific). Uses the resume_tailor task tier for model routing.
 */
@Injectable()
export class AtsAnalysisAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'resume_tailor');
  }

  async analyze(
    profile: Record<string, unknown>,
    jobDescription: string,
    context: AgentContext,
  ): Promise<{ analysis: AtsAnalysis; costCents: number }> {
    const userPrompt = `## Candidate Resume Profile
${JSON.stringify(profile, null, 2)}

## Job Description
${jobDescription}

Analyze the resume against this job and return the JSON object.`;

    const result = await this.generateStructured(
      userPrompt,
      context,
      AtsAnalysisSchema,
      SYSTEM_PROMPT,
    );
    return { analysis: result.data, costCents: result.costCents };
  }
}
