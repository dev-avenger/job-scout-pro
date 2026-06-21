import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext, Profile } from '@auto-job-apply/shared-types';

const TailoredResumeSchema = z.object({
  summary: z.string(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    bullets: z.array(z.string()),
  })),
  skills: z.array(z.object({
    name: z.string(),
    category: z.string().optional(),
  })),
  highlights: z.array(z.string()),
});

export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

export type ResumeVariant = 'A' | 'B';

// Two tailoring strategies we A/B test against real callback rate. Variant A is
// the established impact-narrative style; variant B leans into ATS keyword
// density. The chosen variant is recorded on the application so Analytics can
// compare which produces more interviews/offers.
const VARIANT_DIRECTIVES: Record<ResumeVariant, string> = {
  A: 'Optimise for a compelling impact narrative: lead each bullet with a strong outcome and a quantified result, and keep the summary story-driven.',
  B: 'Optimise for ATS keyword matching: mirror the exact terminology, tools, and skill phrases from the job description across the summary, bullets, and skills, prioritising coverage of the required keywords.',
};

@Injectable()
export class ResumeTailorAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'resume_tailor');
  }

  async tailorResume(
    profile: Record<string, unknown>,
    jobDescription: string,
    context: AgentContext,
    variant: ResumeVariant = 'A',
  ): Promise<{ tailored: TailoredResume; costCents: number }> {
    const systemPrompt = this.llmService.promptRegistry.getSystem('resume_tailor');
    const userPrompt = `## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Job Description
${jobDescription}

## Tailoring Strategy
${VARIANT_DIRECTIVES[variant]}

Tailor the resume to match this job. Return a JSON object with:
- summary: A tailored professional summary (2-3 sentences)
- experience: Array of {title, company, bullets} with rewritten bullets emphasizing relevant achievements
- skills: Array of {name, category} prioritized by relevance to the job
- highlights: Array of key talking points that match the job requirements`;

    const result = await this.generateStructured(userPrompt, context, TailoredResumeSchema, systemPrompt);
    return { tailored: result.data, costCents: result.costCents };
  }

  async improveBullet(
    profile: Record<string, unknown>,
    bullet: string,
    jobTitle?: string,
    jobDescription?: string,
    context?: AgentContext,
  ): Promise<{ improved: string; costCents: number }> {
    const systemPrompt = this.llmService.promptRegistry.getSystem('resume_tailor');
    const jobContext = jobTitle || jobDescription
      ? `\n\n## Target Role${jobTitle ? `\nTitle: ${jobTitle}` : ''}${jobDescription ? `\nDescription: ${jobDescription}` : ''}`
      : '';

    const userPrompt = `## Task
Improve the following resume bullet point. Make it more impactful by:
- Starting with a strong action verb
- Adding quantified results where possible
- Being specific about technologies and impact
- Keeping it concise (1-2 lines)

## Original Bullet
${bullet}${jobContext}

Return ONLY the improved bullet point text, nothing else.`;

    const result = await this.generate(userPrompt, context ?? { userId: 'system' }, systemPrompt);
    return { improved: result.text.trim(), costCents: result.costCents };
  }
}
