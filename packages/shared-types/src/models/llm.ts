import { z } from 'zod';

import { ModelTier, TaskType } from '../enums/index.js';

export const ModelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  tier: ModelTier,
  contextWindow: z.number().int(),
  inputCostPer1k: z.number(),
  outputCostPer1k: z.number(),
  supportsStructured: z.boolean().default(true),
  supportsEmbedding: z.boolean().default(false),
});
export type ModelInfo = z.infer<typeof ModelInfoSchema>;

export const LLMOptionsSchema = z.object({
  model: z.string(),
  systemPrompt: z.string(),
  userPrompt: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().optional(),
});
export type LLMOptions = z.infer<typeof LLMOptionsSchema>;

export const LLMResponseSchema = z.object({
  text: z.string(),
  usage: z.object({
    inputTokens: z.number().int(),
    outputTokens: z.number().int(),
  }),
  latencyMs: z.number().int(),
});
export type LLMResponse = z.infer<typeof LLMResponseSchema>;

export const LLMRequestLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  agentName: z.string(),
  taskType: TaskType,
  model: z.string(),
  provider: z.string(),
  promptVersion: z.string().optional(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  costCents: z.number().int(),
  latencyMs: z.number().int(),
  status: z.enum(['success', 'error', 'timeout']).default('success'),
  errorMessage: z.string().optional(),
  applicationId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  createdAt: z.date(),
});
export type LLMRequestLog = z.infer<typeof LLMRequestLogSchema>;

export const AgentContextSchema = z.object({
  userId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
});
export type AgentContext = z.infer<typeof AgentContextSchema>;
