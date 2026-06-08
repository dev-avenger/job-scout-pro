import type { ZodSchema } from 'zod';
import type { ModelInfo } from '@auto-job-apply/shared-types';

export interface LLMGenerateParams {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

export interface LLMStructuredResponse<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

export interface ILLMProvider {
  readonly name: string;
  readonly models: ModelInfo[];
  generateText(params: LLMGenerateParams): Promise<LLMResponse>;
  generateStructured<T>(params: LLMGenerateParams & { schema: ZodSchema<T> }): Promise<LLMStructuredResponse<T>>;
  getEmbedding(text: string, model?: string): Promise<number[]>;
  estimateCost(model: string, inputTokens: number, outputTokens: number): number;
}
