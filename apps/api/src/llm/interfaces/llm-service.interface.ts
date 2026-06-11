import type { ZodSchema } from 'zod';
import type { AgentContext, ModelTier, TaskType } from '@auto-job-apply/shared-types';
import type { LLMGenerateParams, LLMResponse, LLMStructuredResponse } from './llm-provider.interface.js';
import type { PromptRegistry } from '../prompt-registry.js';

export interface ILLMService {
  readonly promptRegistry: PromptRegistry;
  generateText(
    taskType: TaskType,
    params: Omit<LLMGenerateParams, 'model'>,
    context: AgentContext,
    forceTier?: ModelTier,
  ): Promise<LLMResponse & { model: string; provider: string; costCents: number }>;

  generateStructured<T>(
    taskType: TaskType,
    params: Omit<LLMGenerateParams, 'model'> & { schema: ZodSchema<T> },
    context: AgentContext,
    forceTier?: ModelTier,
  ): Promise<LLMStructuredResponse<T> & { model: string; provider: string; costCents: number }>;

  getEmbedding(text: string, context: AgentContext): Promise<number[]>;
  getBudgetStatus(userId: string, dailyCapCents: number, monthlyCapCents: number): Promise<unknown>;
  getAvailableModels(): unknown[];
}
