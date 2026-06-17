/**
 * Pure helpers for matching prepared answers onto real form fields.
 *
 * These are intentionally dependency-free and deterministic so they can be
 * unit-tested without a browser or network. They are used both when preparing
 * ATS answers (snapping a free-text answer onto an allowed dropdown option) and
 * by the browser automation when filling selects/date fields.
 */

/** Lowercase, trim, collapse whitespace, drop surrounding punctuation. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’'`]/g, '') // drop apostrophes so "master's" == "masters"
    .replace(/[^a-z0-9+#./ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

/** Similarity in [0,1] based on normalized edit distance. */
export function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}

/**
 * Snap a free-text value onto the closest allowed option.
 *  1. exact (normalized) match
 *  2. containment (one fully contains the other)
 *  3. fuzzy match above `threshold`
 * Returns the ORIGINAL option string (not normalized), or null if nothing fits.
 */
export function bestOptionMatch(
  value: string,
  options: string[],
  threshold = 0.6,
): string | null {
  if (!value || options.length === 0) return null;
  const nv = normalizeText(value);
  if (!nv) return null;

  // 1. exact normalized
  for (const opt of options) {
    if (normalizeText(opt) === nv) return opt;
  }
  // 2. containment (prefer the shortest containing option)
  const contained = options
    .filter((opt) => {
      const no = normalizeText(opt);
      return no.length > 1 && (no.includes(nv) || nv.includes(no));
    })
    .sort((a, b) => a.length - b.length);
  if (contained[0]) return contained[0];

  // 3. fuzzy
  let best: { opt: string; score: number } | null = null;
  for (const opt of options) {
    const score = similarity(value, opt);
    if (!best || score > best.score) best = { opt, score };
  }
  return best && best.score >= threshold ? best.opt : null;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

/**
 * Best-effort parse of a date string from a resume/profile into a normalized
 * "YYYY-MM" (or "YYYY" when no month is known). Returns null for empty or
 * open-ended values like "Present"/"Current".
 *
 * Handles: "2021-03", "2021/03", "03/2021", "Mar 2021", "March 2021", "2021".
 */
export function parseYearMonth(value: string): string | null {
  if (!value) return null;
  const v = value.trim();
  if (/^(present|current|now|ongoing)$/i.test(v)) return null;

  // ISO-ish: 2021-03 / 2021/03 / 2021.03
  let m = v.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}`;

  // 03/2021 or 3-2021
  m = v.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[2]}-${String(Number(m[1])).padStart(2, '0')}`;

  // Month name + year
  m = v.match(/^([a-z]+)\.?\s+(\d{4})$/i);
  if (m) {
    const month = MONTHS[m[1]!.toLowerCase()];
    if (month) return `${m[2]}-${String(month).padStart(2, '0')}`;
  }

  // Bare year
  m = v.match(/^(\d{4})$/);
  if (m) return m[1]!;

  return null;
}

const CONSENT_PATTERNS = [
  /\bi (agree|consent|accept|certify|acknowledge|authori[sz]e|confirm)\b/i,
  /\b(terms|privacy policy|data processing|gdpr|t&cs?|conditions)\b/i,
  /\bopt[- ]?in\b/i,
];

/**
 * True when a (typically checkbox) field is a consent/agreement gate that is
 * safe to auto-check. The legal responsibility still rests with the user; this
 * only avoids leaving an obviously-required "I agree to the terms" box blank.
 */
export function isConsentField(label: string): boolean {
  if (!label) return false;
  return CONSENT_PATTERNS.some((re) => re.test(label));
}
