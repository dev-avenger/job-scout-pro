/**
 * Fuzzy keyword matching for job listings.
 *
 * A plain substring test fails on common phrasing differences:
 *   "Fullstack Developer"    vs a posting that says "Full Stack Developer"
 *   "Nodejs Developer"       vs "Node.js Developer"
 *   "Asp.Net Core developer" vs "ASP.NET Core Developer"
 *
 * A keyword matches when any of these hold against the listing text:
 *   1. exact phrase substring
 *   2. squashed comparison (all non-alphanumerics stripped from both sides) —
 *      catches spacing/punctuation variants of the SAME phrase
 *   3. every token of the keyword appears as a whole word in the text
 */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesKeywords(fullText: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;

  const text = fullText.toLowerCase();
  const squashedText = text.replace(/[^a-z0-9]+/g, '');

  return keywords.some((keyword) => {
    const phrase = keyword.toLowerCase().trim();
    if (!phrase) return false;

    if (text.includes(phrase)) return true;

    const squashedPhrase = phrase.replace(/[^a-z0-9]+/g, '');
    if (squashedPhrase.length > 4 && squashedText.includes(squashedPhrase)) return true;

    // Whole-word token match: every meaningful token must appear as its own
    // word, so "asp" can never match inside "grasp".
    const tokens = phrase.split(/[^a-z0-9+#.]+/).filter((t) => t.length > 2);
    if (tokens.length === 0) return false;
    return tokens.every((t) => new RegExp(`\\b${escapeRegex(t)}\\b`).test(text));
  });
}
