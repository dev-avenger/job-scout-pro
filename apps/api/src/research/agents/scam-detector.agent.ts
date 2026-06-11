import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const ScamDetectionSchema = z.object({
  scamScore: z.number().min(0).max(1),
  redFlags: z.array(z.string()),
  greenFlags: z.array(z.string()),
  verdict: z.enum(['legitimate', 'suspicious', 'likely_scam']),
  reasoning: z.string(),
});

export type ScamDetectionResult = z.infer<typeof ScamDetectionSchema>;

@Injectable()
export class ScamDetectorAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'scam_detect');
  }

  async detectScam(
    job: Record<string, unknown>,
    context: AgentContext,
  ): Promise<{ result: ScamDetectionResult; costCents: number }> {
    const systemPrompt = this.llmService.promptRegistry.getSystem('scam_detect');
    const userPrompt = `## Job Posting
${JSON.stringify(job, null, 2)}

Analyze this job posting for potential scam indicators. Return a JSON object with:
- scamScore: 0-1 where 1 = definitely a scam
- redFlags: Array of concerning indicators found
- greenFlags: Array of legitimacy indicators found
- verdict: one of legitimate, suspicious, likely_scam
- reasoning: brief explanation of the assessment`;

    const result = await this.generateStructured(userPrompt, context, ScamDetectionSchema, systemPrompt);
    return { result: result.data, costCents: result.costCents };
  }
}
