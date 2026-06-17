import { describe, expect, it, vi } from 'vitest';
import { AtsAnalysisAgent, type AtsAnalysis } from './ats-analysis.agent.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';

const SAMPLE: AtsAnalysis = {
  semanticMatchScore: 82,
  matchedKeywords: ['node.js', 'postgres'],
  missingKeywords: [{ keyword: 'kubernetes', importance: 'preferred', suggestion: 'Add k8s exposure if any' }],
  hardSkillGaps: ['kubernetes'],
  parseSafetyIssues: [],
  prioritizedSuggestions: [{ priority: 'high', suggestion: 'Lead with backend impact metrics' }],
  verdict: 'Strong backend match, light on infra.',
};

describe('AtsAnalysisAgent.analyze', () => {
  it('routes through the LLM with the resume_tailor task and returns analysis + cost', async () => {
    const generateStructured = vi.fn(async () => ({ data: SAMPLE, costCents: 4 }));
    const llm = { generateStructured } as unknown as ILLMService;
    const agent = new AtsAnalysisAgent(llm);

    const res = await agent.analyze({ name: 'Jane' }, 'We need a Node.js backend engineer.', {
      userId: 'u1',
    });

    expect(res.analysis).toEqual(SAMPLE);
    expect(res.costCents).toBe(4);

    expect(generateStructured).toHaveBeenCalledTimes(1);
    const [taskType, payload, context] = generateStructured.mock.calls[0] as unknown as [
      string,
      { systemPrompt: string; userPrompt: string; schema: unknown },
      { userId: string },
    ];
    expect(taskType).toBe('resume_tailor');
    expect(context).toEqual({ userId: 'u1' });
    expect(payload.userPrompt).toContain('Job Description');
    expect(payload.userPrompt).toContain('Node.js backend');
    expect(payload.systemPrompt).toMatch(/ATS/i);
    expect(payload.schema).toBeDefined();
  });
});
