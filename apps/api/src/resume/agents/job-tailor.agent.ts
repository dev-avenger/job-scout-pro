import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const JobTailorSchema = z.object({
  /** What the JD actually asks for — parsed once, reused for every decision. */
  jobInsights: z.object({
    seniority: z.string(),
    industry: z.string(),
    mustHaveSkills: z.array(z.string()),
    niceToHaveSkills: z.array(z.string()),
    softSkills: z.array(z.string()),
    focus: z.string(),
  }),
  /** Rewritten summary aimed at this role. */
  tailoredSummary: z.string(),
  /** Experience with bullets rewritten to emphasize job-relevant impact. */
  tailoredExperience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  /** Skills reordered by relevance to the job. */
  prioritizedSkills: z.array(z.object({ name: z.string(), category: z.string().optional() })),
  /** Section ids to hide for this role (e.g. 'publications' for non-academic). */
  sectionsToHide: z.array(z.string()),
  /** Talking points that weave resume highlights into a cover letter. */
  coverLetterOutline: z.array(z.string()),
});

export type JobTailorResult = z.infer<typeof JobTailorSchema>;

const SYSTEM_PROMPT = `You are an expert resume strategist. In ONE pass you (a) parse a job description, then (b) tailor a candidate's resume to it.
- Parse the JD: seniority, industry, must-have vs nice-to-have hard skills, soft skills, and the role's core focus.
- Rewrite the summary and experience bullets to emphasize the evidence most relevant to THIS job. Never fabricate experience the candidate does not have — reframe and prioritize what is real.
- Reorder skills by relevance to the job.
- Recommend which resume sections to HIDE because they are irrelevant for this role (e.g. hide 'publications' or 'volunteer' for a hands-on engineering role). Only use these section ids: summary, skills, experience, education, projects, certifications, languages, publications, volunteer, references.
- Provide a short cover-letter outline (bullet talking points) that connects the candidate's real highlights to the job's needs.
Return only the requested JSON.`;

/**
 * Unified job→resume agent: a single LLM pass that parses the JD and produces
 * a tailored summary, rewritten experience, reprioritized skills, a list of
 * sections to hide, and a cover-letter outline. Replaces three disconnected
 * calls (tailor + cover letter + ad-hoc JD parsing) with one coherent result.
 */
@Injectable()
export class JobTailorAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'resume_tailor');
  }

  async tailorForJob(
    profile: Record<string, unknown>,
    jobDescription: string,
    context: AgentContext,
    meta?: { jobTitle?: string; companyName?: string },
  ): Promise<{ result: JobTailorResult; costCents: number }> {
    const target = [
      meta?.jobTitle ? `Title: ${meta.jobTitle}` : '',
      meta?.companyName ? `Company: ${meta.companyName}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const userPrompt = `## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Target Position
${target || '(title/company not provided)'}

## Job Description
${jobDescription}

Parse the job and tailor the resume. Return the JSON object.`;

    const res = await this.generateStructured(userPrompt, context, JobTailorSchema, SYSTEM_PROMPT);
    return { result: res.data, costCents: res.costCents };
  }
}
