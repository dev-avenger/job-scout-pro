import { Injectable } from '@nestjs/common';
import type { ModelInfo } from '@auto-job-apply/shared-types';
import type { ILLMProvider, LLMGenerateParams, LLMResponse, LLMStructuredResponse } from '../interfaces/llm-provider.interface.js';

@Injectable()
export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai';
  readonly models: ModelInfo[] = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', tier: 'premium', contextWindow: 128000, inputCostPer1k: 0.5, outputCostPer1k: 1.5, supportsStructured: true, supportsEmbedding: false },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', tier: 'standard', contextWindow: 128000, inputCostPer1k: 0.015, outputCostPer1k: 0.06, supportsStructured: true, supportsEmbedding: false },
    { id: 'text-embedding-3-small', name: 'Embedding Small', provider: 'openai', tier: 'economy', contextWindow: 8191, inputCostPer1k: 0.002, outputCostPer1k: 0, supportsStructured: false, supportsEmbedding: true },
  ];

  constructor(private readonly apiKey: string) {}

  async generateText(params: LLMGenerateParams): Promise<LLMResponse> {
    const start = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
      }),
    });

    const data = await response.json() as any;
    return {
      text: data.choices[0].message.content,
      usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens },
      latencyMs: Date.now() - start,
    };
  }

  async generateStructured<T>(params: LLMGenerateParams & { schema: any }): Promise<LLMStructuredResponse<T>> {
    const response = await this.generateText(params);
    const parsed = params.schema.parse(JSON.parse(response.text));
    return { data: parsed, usage: response.usage, latencyMs: response.latencyMs };
  }

  async getEmbedding(text: string, model = 'text-embedding-3-small'): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model, input: text }),
    });
    const data = await response.json() as any;
    return data.data[0].embedding;
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = this.models.find((m) => m.id === model);
    if (!modelInfo) return 0;
    return (inputTokens / 1000) * modelInfo.inputCostPer1k + (outputTokens / 1000) * modelInfo.outputCostPer1k;
  }
}
