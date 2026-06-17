import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

/** Structured shape we ask the model to return from raw resume text. */
export const ExtractedResumeSchema = z.object({
  name: z.string().optional(),
  contactInfo: z
    .object({
      email: z.string().optional(),
      phone: z.string().optional(),
      location: z.string().optional(),
      linkedin: z.string().optional(),
      github: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z
    .array(
      z.object({
        title: z.string().optional(),
        company: z.string().optional(),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  education: z
    .array(
      z.object({
        degree: z.string().optional(),
        institution: z.string().optional(),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        gpa: z.string().optional(),
      }),
    )
    .optional(),
  projects: z
    .array(
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional(),
        technologies: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  certifications: z
    .array(
      z.object({
        name: z.string().optional(),
        issuer: z.string().optional(),
        date: z.string().optional(),
      }),
    )
    .optional(),
  languages: z
    .array(
      z.object({
        language: z.string().optional(),
        proficiency: z.string().optional(),
      }),
    )
    .optional(),
  publications: z
    .array(
      z.object({
        title: z.string().optional(),
        publisher: z.string().optional(),
        date: z.string().optional(),
        url: z.string().optional(),
      }),
    )
    .optional(),
  volunteer: z
    .array(
      z.object({
        organization: z.string().optional(),
        role: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  references: z
    .array(
      z.object({
        name: z.string().optional(),
        company: z.string().optional(),
        title: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        relationship: z.string().optional(),
      }),
    )
    .optional(),
});

export type ExtractedResume = z.infer<typeof ExtractedResumeSchema>;

const SYSTEM_PROMPT = `You are a resume parser. You receive the raw text of a candidate's resume/CV and extract its content into structured JSON.

Rules:
- Extract ONLY information present in the text. Never invent employers, dates, degrees, or skills.
- For EVERY experience and education entry, you MUST split any date range into separate "startDate" and "endDate" fields. Copy them as written (e.g. "Jan 2021", "2019", "Present"). A range like "Jan 2021 - Present" becomes startDate:"Jan 2021", endDate:"Present". Do NOT leave dates inside the description, and do NOT put the date range in a single field.
- Put each role's bullet points / responsibilities into "description" (keep newlines between bullets). Do NOT include the company name, title, or dates in the description.
- "skills" is a flat de-duplicated list of individual skills/technologies.
- Also extract these sections when present:
  - "projects": {name, description, url, technologies[]}
  - "certifications": {name, issuer, date}
  - "languages": {language, proficiency} — spoken/written human languages, NOT programming languages (those go in skills).
  - "publications": {title, publisher, date, url}
  - "volunteer": {organization, role, startDate, endDate, description} — split date ranges like experience.
  - "references": {name, company, title, email, phone, relationship}
- Omit a field or section only if it is genuinely absent from the text; otherwise always populate it.
- Order experience, education, and volunteer most-recent first.

Example experience entry:
{"title":"Senior Engineer","company":"Acme Corp","startDate":"Mar 2020","endDate":"Present","description":"- Did X.\\n- Did Y."}`;

@Injectable()
export class ResumeExtractorAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    // Reuse the resume_tailor task type so it routes through an existing model tier.
    super(llmService, 'resume_tailor');
  }

  /**
   * Extract structured profile data from raw resume text.
   * Returns null if the LLM is unavailable/fails so callers can fall back to
   * the heuristic parser.
   */
  async extract(
    rawText: string,
    context: AgentContext,
  ): Promise<{ data: ExtractedResume; costCents: number; error?: undefined } | { data?: undefined; error: string }> {
    // Cap the text so a huge document can't blow up the prompt.
    const text = rawText.slice(0, 24000);
    const userPrompt = `Extract the structured profile from this resume text:\n\n---\n${text}\n---`;

    try {
      const result = await this.generateStructured(
        userPrompt,
        context,
        ExtractedResumeSchema,
        SYSTEM_PROMPT,
      );
      return { data: result.data, costCents: result.costCents };
    } catch (err) {
      // Return the reason so the import endpoint can tell the user why the
      // structured sections weren't populated (e.g. quota exceeded, no provider).
      return { error: err instanceof Error ? err.message : 'LLM extraction failed' };
    }
  }
}
