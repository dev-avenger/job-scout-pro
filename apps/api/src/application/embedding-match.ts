/**
 * Pure vector helpers for semantic answer-bank lookup. Dependency-free so they
 * can be unit-tested without a DB or an embeddings provider.
 */

/** Cosine similarity of two equal-length vectors; 0 for mismatched/empty. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface EmbeddedCandidate {
  id: string;
  answerText: string;
  embedding: number[] | null;
}

/**
 * Best semantic match for a query embedding among candidates, above `threshold`.
 * Returns null when nothing is close enough or no candidate has an embedding.
 */
export function bestSemanticMatch(
  query: number[],
  candidates: EmbeddedCandidate[],
  threshold = 0.86,
): { id: string; answerText: string; score: number } | null {
  if (query.length === 0) return null;
  let best: { id: string; answerText: string; score: number } | null = null;
  for (const c of candidates) {
    if (!c.embedding || c.embedding.length === 0) continue;
    const score = cosineSimilarity(query, c.embedding);
    if (!best || score > best.score) best = { id: c.id, answerText: c.answerText, score };
  }
  return best && best.score >= threshold ? best : null;
}
