import type { ZodSchema } from 'zod';
import type { AgentContext, ModelTier, TaskType } from '@auto-job-apply/shared-types';
import type { ILLMService } from '../interfaces/llm-service.interface.js';

export abstract class BaseAgent {
  constructor(
    protected readonly llmService: ILLMService,
    protected readonly taskType: TaskType,
  ) {}

  protected async generate(prompt: string, context: AgentContext, systemPrompt?: string) {
    return this.llmService.generateText(
      this.taskType,
      { systemPrompt: systemPrompt || '', userPrompt: prompt },
      context,
    );
  }

  protected async generateStructured<T>(
    prompt: string,
    context: AgentContext,
    schema: ZodSchema<T>,
    systemPrompt?: string,
    forceTier?: ModelTier,
  ) {
    return this.llmService.generateStructured<T>(
      this.taskType,
      { systemPrompt: systemPrompt || '', userPrompt: prompt, schema },
      context,
      forceTier,
    );
  }
}
