import { Injectable } from '@nestjs/common';
import type { ModelInfo } from '@auto-job-apply/shared-types';
import type { ILLMProvider, LLMGenerateParams, LLMResponse, LLMStructuredResponse } from '../interfaces/llm-provider.interface.js';

@Injectable()
export class OllamaProvider implements ILLMProvider {
  readonly name = 'ollama';
  readonly models: ModelInfo[] = [
    { id: 'llama3.1:8b', name: 'Llama 3.1 8B', provider: 'ollama', tier: 'local', contextWindow: 128000, inputCostPer1k: 0, outputCostPer1k: 0, supportsStructured: true, supportsEmbedding: false },
    { id: 'nomic-embed-text', name: 'Nomic Embed', provider: 'ollama', tier: 'local', contextWindow: 8192, inputCostPer1k: 0, outputCostPer1k: 0, supportsStructured: false, supportsEmbedding: true },
  ];

  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 'http://localhost:11434';
  }

  async generateText(params: LLMGenerateParams): Promise<LLMResponse> {
    const start = Date.now();
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        stream: false,
        options: { temperature: params.temperature ?? 0.7 },
      }),
    });

    const data = await response.json() as any;
    return {
      text: data.message.content,
      usage: { inputTokens: data.prompt_eval_count || 0, outputTokens: data.eval_count || 0 },
      latencyMs: Date.now() - start,
    };
  }

  async generateStructured<T>(params: LLMGenerateParams & { schema: any }): Promise<LLMStructuredResponse<T>> {
    const response = await this.generateText(params);
    const parsed = params.schema.parse(JSON.parse(response.text));
    return { data: parsed, usage: response.usage, latencyMs: response.latencyMs };
  }

  async getEmbedding(text: string, model = 'nomic-embed-text'): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });
    const data = await response.json() as any;
    return data.embedding;
  }

  estimateCost(): number {
    return 0; // Local models are free
  }
}
