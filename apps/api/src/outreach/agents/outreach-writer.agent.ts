import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const SuggestedContactsSchema = z.object({
  contacts: z.array(
    z.object({
      role: z.string().describe('e.g. "Engineering Manager", "Technical Recruiter"'),
      title: z.string().optional(),
      likelyEmailPattern: z.string().optional().describe('e.g. first.last@acme.com'),
      rationale: z.string(),
    }),
  ),
  draft: z.object({ subject: z.string(), body: z.string() }),
});

export type SuggestedContactsResult = z.infer<typeof SuggestedContactsSchema>;

/**
 * LLM-assisted outreach. Note: this does NOT scrape LinkedIn or a contact
 * provider — it infers the *kinds* of people worth contacting at a company for
 * a given role, a plausible corporate email pattern, and drafts an outreach
 * message. The user confirms/edits before anything is sent.
 */
@Injectable()
export class OutreachWriterAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'cover_letter');
  }

  async suggest(
    input: { companyName: string; jobTitle: string; candidateName?: string; candidateSummary?: string },
    context: AgentContext,
  ): Promise<{ result: SuggestedContactsResult; costCents: number }> {
    const systemPrompt =
      'You are a job-search networking assistant. For the given company and role, suggest the most useful ' +
      'people to reach out to (by role, not by inventing real names), a plausible corporate email pattern, ' +
      'and draft a concise, specific, non-generic outreach email the candidate could send. Keep it under ' +
      '150 words, warm and professional, no clichés.';

    const userPrompt = `Company: ${input.companyName}
Role applied for: ${input.jobTitle}
Candidate: ${input.candidateName ?? '(the applicant)'}
Candidate background: ${input.candidateSummary ?? '(not provided)'}

Return JSON: contacts[] (role, title, likelyEmailPattern, rationale) and a draft (subject, body).`;

    const result = await this.generateStructured(userPrompt, context, SuggestedContactsSchema, systemPrompt);
    return { result: result.data, costCents: result.costCents };
  }

  /** Draft a follow-up email for an application that has had no response. */
  async draftFollowUp(
    input: { jobTitle: string; companyName: string; daysSinceApplied: number; candidateName?: string },
    context: AgentContext,
  ): Promise<{ subject: string; body: string; costCents: number }> {
    const systemPrompt =
      'You write brief, polite job-application follow-up emails. Reaffirm interest, add one specific value ' +
      'point, and ask about timeline. Under 120 words. No clichés, no desperation.';
    const userPrompt = `Write a follow-up email.
Role: ${input.jobTitle}
Company: ${input.companyName}
Days since applying: ${input.daysSinceApplied}
Candidate name: ${input.candidateName ?? '(the applicant)'}

Return JSON: subject, body.`;

    const schema = z.object({ subject: z.string(), body: z.string() });
    const result = await this.generateStructured(userPrompt, context, schema, systemPrompt);
    return { ...result.data, costCents: result.costCents };
  }
}
