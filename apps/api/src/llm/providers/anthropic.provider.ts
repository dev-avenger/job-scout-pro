import { Injectable } from '@nestjs/common';
import type { ModelInfo } from '@auto-job-apply/shared-types';
import type { ILLMProvider, LLMGenerateParams, LLMResponse, LLMStructuredResponse } from '../interfaces/llm-provider.interface.js';

@Injectable()
export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic';
  readonly models: ModelInfo[] = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', tier: 'premium', contextWindow: 200000, inputCostPer1k: 0.3, outputCostPer1k: 1.5, supportsStructured: true, supportsEmbedding: false },
    { id: 'claude-haiku-3-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', tier: 'economy', contextWindow: 200000, inputCostPer1k: 0.025, outputCostPer1k: 0.125, supportsStructured: true, supportsEmbedding: false },
  ];

  constructor(private readonly apiKey: string) {}

  async generateText(params: LLMGenerateParams): Promise<LLMResponse> {
    const start = Date.now();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: params.model,
        system: params.systemPrompt,
        messages: [{ role: 'user', content: params.userPrompt }],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens || 4096,
      }),
    });

    const data = await response.json() as any;
    return {
      text: data.content[0].text,
      usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens },
      latencyMs: Date.now() - start,
    };
  }

  async generateStructured<T>(params: LLMGenerateParams & { schema: any }): Promise<LLMStructuredResponse<T>> {
    const response = await this.generateText(params);
    const parsed = params.schema.parse(JSON.parse(response.text));
    return { data: parsed, usage: response.usage, latencyMs: response.latencyMs };
  }

  async getEmbedding(_text: string): Promise<number[]> {
    throw new Error('Anthropic does not support embeddings directly');
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = this.models.find((m) => m.id === model);
    if (!modelInfo) return 0;
    return (inputTokens / 1000) * modelInfo.inputCostPer1k + (outputTokens / 1000) * modelInfo.outputCostPer1k;
  }
}
