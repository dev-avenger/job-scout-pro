import { describe, expect, it, vi } from 'vitest';
import { JobTailorAgent, type JobTailorResult } from './job-tailor.agent.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';

const SAMPLE: JobTailorResult = {
  jobInsights: {
    seniority: 'Senior',
    industry: 'Fintech',
    mustHaveSkills: ['Node.js', 'PostgreSQL'],
    niceToHaveSkills: ['Kubernetes'],
    softSkills: ['Ownership'],
    focus: 'Backend platform reliability',
  },
  tailoredSummary: 'Senior backend engineer...',
  tailoredExperience: [{ title: 'Engineer', company: 'Acme', bullets: ['Built X'] }],
  prioritizedSkills: [{ name: 'Node.js', category: 'Backend' }],
  sectionsToHide: ['publications'],
  coverLetterOutline: ['Open with platform reliability win'],
};

describe('JobTailorAgent.tailorForJob', () => {
  it('passes profile + JD + target to the LLM and returns the unified result', async () => {
    const generateStructured = vi.fn(async () => ({ data: SAMPLE, costCents: 7 }));
    const llm = { generateStructured } as unknown as ILLMService;
    const agent = new JobTailorAgent(llm);

    const { result, costCents } = await agent.tailorForJob(
      { name: 'Jane', experience: [] },
      'Senior backend engineer at a fintech.',
      { userId: 'u1' },
      { jobTitle: 'Senior Backend Engineer', companyName: 'Acme' },
    );

    expect(result).toEqual(SAMPLE);
    expect(costCents).toBe(7);

    const [taskType, payload, context] = generateStructured.mock.calls[0] as unknown as [
      string,
      { systemPrompt: string; userPrompt: string; schema: unknown },
      { userId: string },
    ];
    expect(taskType).toBe('resume_tailor');
    expect(context).toEqual({ userId: 'u1' });
    expect(payload.userPrompt).toContain('Senior Backend Engineer');
    expect(payload.userPrompt).toContain('Acme');
    expect(payload.userPrompt).toContain('Job Description');
    expect(payload.schema).toBeDefined();
  });

  it('tolerates missing job title/company', async () => {
    const generateStructured = vi.fn(async () => ({ data: SAMPLE, costCents: 1 }));
    const llm = { generateStructured } as unknown as ILLMService;
    const agent = new JobTailorAgent(llm);

    await agent.tailorForJob({ name: 'Jane' }, 'Some role', { userId: 'u2' });
    const [, payload] = generateStructured.mock.calls[0] as unknown as [
      string,
      { userPrompt: string },
    ];
    expect(payload.userPrompt).toContain('title/company not provided');
  });
});
