import { Injectable } from '@nestjs/common';
import type { ModelInfo } from '@auto-job-apply/shared-types';
import type { ILLMProvider, LLMGenerateParams, LLMResponse, LLMStructuredResponse } from '../interfaces/llm-provider.interface.js';

// gemini-2.5-flash is the current free-tier model. (gemini-2.0-flash now has a
// 0-quota free tier, returning 429 RESOURCE_EXHAUSTED for free-tier keys.)
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Safety net for JSON parsing: even with responseMimeType=application/json,
 * strip any ```json ... ``` fences and isolate the outermost JSON object/array.
 */
function stripJsonFences(text: string): string {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) t = fence[1]!.trim();
  // Fall back to the first { … } / [ … ] span if there is leading/trailing prose.
  if (!(t.startsWith('{') || t.startsWith('['))) {
    const firstObj = t.indexOf('{');
    const firstArr = t.indexOf('[');
    const start = firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
    const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (start !== -1 && end > start) t = t.slice(start, end + 1);
  }
  return t;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
}

@Injectable()
export class GeminiProvider implements ILLMProvider {
  readonly name = 'gemini';
  readonly models: ModelInfo[];

  private readonly defaultModel: string;

  constructor(private readonly apiKey: string, model?: string) {
    this.defaultModel = model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
    this.models = [
      // Pricing placeholder: $0.10/1M input, $0.40/1M output for gemini-2.0-flash
      // expressed in the same unit as the other providers (cents per 1k tokens).
      {
        id: this.defaultModel,
        name: 'Gemini',
        provider: 'gemini',
        tier: 'standard',
        contextWindow: 1000000,
        inputCostPer1k: 0.01,
        outputCostPer1k: 0.04,
        supportsStructured: true,
        supportsEmbedding: false,
      },
    ];
  }

  async generateText(params: LLMGenerateParams): Promise<LLMResponse> {
    return this.call(params, false);
  }

  /** Shared request path. When `json` is true, forces JSON output. */
  private async call(params: LLMGenerateParams, json: boolean): Promise<LLMResponse> {
    const start = Date.now();
    const model = params.model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const generationConfig: Record<string, unknown> = {
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxTokens || 4096,
    };
    // Force valid JSON output for structured calls so we don't have to parse
    // around markdown code fences / prose.
    if (json) generationConfig.responseMimeType = 'application/json';

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
      generationConfig,
    };
    if (params.systemPrompt) {
      body.systemInstruction = { parts: [{ text: params.systemPrompt }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      throw new Error(`Gemini API error (${response.status}): ${data.error?.message || 'Unknown error'}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text === undefined) {
      throw new Error('Gemini API returned no candidates');
    }

    return {
      text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      },
      latencyMs: Date.now() - start,
    };
  }

  async generateStructured<T>(params: LLMGenerateParams & { schema: any }): Promise<LLMStructuredResponse<T>> {
    const response = await this.call(params, true);
    const parsed = params.schema.parse(JSON.parse(stripJsonFences(response.text)));
    return { data: parsed, usage: response.usage, latencyMs: response.latencyMs };
  }

  async getEmbedding(_text: string): Promise<number[]> {
    throw new Error('Gemini embeddings are not supported by this provider');
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = this.models.find((m) => m.id === model);
    if (!modelInfo) return 0;
    return (inputTokens / 1000) * modelInfo.inputCostPer1k + (outputTokens / 1000) * modelInfo.outputCostPer1k;
  }
}
