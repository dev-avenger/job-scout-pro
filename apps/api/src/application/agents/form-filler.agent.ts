import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';
import type { FormField } from './dom-analyzer.agent.js';

const FieldAnswerSchema = z.object({
  selector: z.string(),
  label: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  source: z.enum(['profile', 'saved_answer', 'generated']),
});

const FormFillResultSchema = z.object({
  answers: z.array(FieldAnswerSchema),
  unansweredFields: z.array(z.string()),
});

export type FieldAnswer = z.infer<typeof FieldAnswerSchema>;
export type FormFillResult = z.infer<typeof FormFillResultSchema>;

@Injectable()
export class FormFillerAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'form_fill');
  }

  async mapFieldsToAnswers(
    fields: FormField[],
    profile: Record<string, unknown>,
    savedAnswers: Array<{ fieldLabel: string; answerText: string }>,
    context: AgentContext,
  ): Promise<{ result: FormFillResult; costCents: number }> {
    const systemPrompt = this.llmService.promptRegistry.getSystem('form_fill');
    const userPrompt = `## Form Fields
${JSON.stringify(fields, null, 2)}

## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Saved Answers
${JSON.stringify(savedAnswers, null, 2)}

For each form field, determine the best answer from the profile or saved answers.
Return a JSON object with:
- answers: Array of {selector, label, value, confidence (0-1), source (profile|saved_answer|generated)}
- unansweredFields: Array of field labels that couldn't be confidently answered`;

    const result = await this.generateStructured(userPrompt, context, FormFillResultSchema, systemPrompt);
    return { result: result.data, costCents: result.costCents };
  }
}
