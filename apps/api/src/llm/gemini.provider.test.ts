/**
 * Unit tests for the Gemini LLM provider. global.fetch is stubbed — no network.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from './providers/gemini.provider.js';

const successPayload = {
  candidates: [
    { content: { role: 'model', parts: [{ text: 'Hello from Gemini' }] }, finishReason: 'STOP' },
  ],
  usageMetadata: { promptTokenCount: 42, candidatesTokenCount: 7, totalTokenCount: 49 },
};

function stubFetch(payload: unknown, ok = true, status = 200) {
  const mock = vi.fn(async () => ({ ok, status, json: async () => payload }) as unknown as Response);
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GeminiProvider', () => {
  it('calls the generateContent endpoint with model and key in the URL', async () => {
    const mock = stubFetch(successPayload);
    const provider = new GeminiProvider('test-key', 'gemini-2.0-flash');

    await provider.generateText({
      model: 'gemini-2.0-flash',
      systemPrompt: 'You are helpful.',
      userPrompt: 'Say hi',
    });

    expect(mock).toHaveBeenCalledTimes(1);
    const [url, init] = mock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=test-key',
    );
    expect(init.method).toBe('POST');
  });

  it('sends contents, systemInstruction and generationConfig in the body', async () => {
    const mock = stubFetch(successPayload);
    const provider = new GeminiProvider('test-key');

    await provider.generateText({
      model: 'gemini-2.0-flash',
      systemPrompt: 'You are helpful.',
      userPrompt: 'Say hi',
      temperature: 0.2,
      maxTokens: 1024,
    });

    const [, init] = mock.mock.calls[0]! as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Say hi' }] }]);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'You are helpful.' }] });
    expect(body.generationConfig).toEqual({ temperature: 0.2, maxOutputTokens: 1024 });
  });

  it('extracts response text and maps usage metadata', async () => {
    stubFetch(successPayload);
    const provider = new GeminiProvider('test-key');

    const response = await provider.generateText({
      model: 'gemini-2.0-flash',
      systemPrompt: 'sys',
      userPrompt: 'hi',
    });

    expect(response.text).toBe('Hello from Gemini');
    expect(response.usage).toEqual({ inputTokens: 42, outputTokens: 7 });
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('defaults the model to gemini-2.0-flash', () => {
    const previous = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    try {
      const provider = new GeminiProvider('test-key');
      expect(provider.models[0]!.id).toBe('gemini-2.0-flash');
    } finally {
      if (previous !== undefined) process.env.GEMINI_MODEL = previous;
    }
  });

  it('throws a mapped error on non-OK responses', async () => {
    stubFetch({ error: { code: 400, message: 'API key not valid' } }, false, 400);
    const provider = new GeminiProvider('bad-key');

    await expect(
      provider.generateText({ model: 'gemini-2.0-flash', systemPrompt: 's', userPrompt: 'u' }),
    ).rejects.toThrow('Gemini API error (400): API key not valid');
  });

  it('throws when the response has no candidates', async () => {
    stubFetch({ candidates: [] });
    const provider = new GeminiProvider('test-key');

    await expect(
      provider.generateText({ model: 'gemini-2.0-flash', systemPrompt: 's', userPrompt: 'u' }),
    ).rejects.toThrow('Gemini API returned no candidates');
  });

  it('estimates cost from the placeholder pricing table', () => {
    const provider = new GeminiProvider('test-key', 'gemini-2.0-flash');
    // $0.10/1M input + $0.40/1M output => 0.01 + 0.04 cents per 1k tokens
    const cost = provider.estimateCost('gemini-2.0-flash', 1000, 1000);
    expect(cost).toBeCloseTo(0.05, 6);
  });
});
