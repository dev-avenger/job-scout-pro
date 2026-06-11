import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const InterviewQuestionSchema = z.object({
  question: z.string(),
  category: z.enum(['technical', 'behavioral', 'situational', 'culture_fit']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  suggestedAnswer: z.string(),
  tips: z.string().optional(),
});

const InterviewPrepSchema = z.object({
  technicalQuestions: z.array(InterviewQuestionSchema),
  behavioralQuestions: z.array(InterviewQuestionSchema),
  questionsToAsk: z.array(z.object({
    question: z.string(),
    purpose: z.string(),
  })),
  talkingPoints: z.array(z.string()),
  potentialConcerns: z.array(z.object({
    concern: z.string(),
    howToAddress: z.string(),
  })),
  companyInsights: z.array(z.string()),
});

export type InterviewPrepResult = z.infer<typeof InterviewPrepSchema>;

@Injectable()
export class InterviewPrepAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'interview_prep');
  }

  async generatePrepMaterials(
    job: Record<string, unknown>,
    company: Record<string, unknown> | null,
    profile: Record<string, unknown>,
    context: AgentContext,
  ): Promise<{ prep: InterviewPrepResult; costCents: number }> {
    const systemPrompt = this.llmService.promptRegistry.getSystem('interview_prep');
    const userPrompt = `## Job Details
${JSON.stringify(job, null, 2)}

## Company Research
${company ? JSON.stringify(company, null, 2) : 'No company research available.'}

## Candidate Profile
${JSON.stringify(profile, null, 2)}

Generate comprehensive interview preparation materials. Return a JSON object with:
- technicalQuestions: Array of technical questions with suggested answers
- behavioralQuestions: Array of behavioral questions with STAR-method frameworks
- questionsToAsk: Questions the candidate should ask, with purpose
- talkingPoints: Key points to emphasize during the interview
- potentialConcerns: Gaps or concerns with strategies to address them
- companyInsights: Key company facts to reference during the interview`;

    const result = await this.generateStructured(userPrompt, context, InterviewPrepSchema, systemPrompt);
    return { prep: result.data, costCents: result.costCents };
  }
}
