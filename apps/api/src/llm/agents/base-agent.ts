import type { AgentContext, TaskType } from '@auto-job-apply/shared-types';
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
}
