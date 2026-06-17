import { describe, expect, it } from 'vitest';
import { cosineSimilarity, bestSemanticMatch } from './embedding-match.js';

describe('cosineSimilarity', () => {
  it('is 1 for identical direction, 0 for orthogonal', () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it('guards empty / mismatched / zero vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('bestSemanticMatch', () => {
  const candidates = [
    { id: 'a', answerText: 'A', embedding: [1, 0, 0] },
    { id: 'b', answerText: 'B', embedding: [0, 1, 0] },
    { id: 'c', answerText: 'C', embedding: null },
  ];
  it('returns the closest candidate above threshold', () => {
    const m = bestSemanticMatch([0.9, 0.1, 0], candidates, 0.8);
    expect(m?.id).toBe('a');
  });
  it('returns null when nothing clears the threshold', () => {
    expect(bestSemanticMatch([0, 0, 1], candidates, 0.8)).toBeNull();
  });
  it('ignores candidates without embeddings and empty queries', () => {
    expect(bestSemanticMatch([], candidates, 0.8)).toBeNull();
    expect(bestSemanticMatch([1, 0, 0], [{ id: 'c', answerText: 'C', embedding: null }], 0.5)).toBeNull();
  });
});
