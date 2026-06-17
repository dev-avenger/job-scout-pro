/**
 * Date formatting for resume rendering. Resume dates are month/year granularity
 * and arrive in many shapes ("2021-03", "Mar 2021", "03/2021", "2021"). We
 * normalize them to the template's `dateFormat` (e.g. MM/YYYY, MM.YYYY,
 * DD/MM/YYYY) so a UK/Australia/Europass template actually reads correctly.
 *
 * Anything we can't confidently parse is passed through unchanged, so free-form
 * values like "Summer 2021" are never mangled.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const OPEN_ENDED = /^(present|current|now|ongoing|to date|date)$/i;

function parse(value: string): { year: number; month?: number } | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  m = v.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) return { year: Number(m[2]), month: Number(m[1]) };
  m = v.match(/^([a-z]+)\.?\s+(\d{4})$/i);
  if (m) {
    const month = MONTHS[m[1]!.toLowerCase()];
    if (month) return { year: Number(m[2]), month };
  }
  m = v.match(/^(\d{4})$/);
  if (m) return { year: Number(m[1]) };
  return null;
}

/** Format a single date token to the template's dateFormat (or pass through). */
export function formatDate(value: string | undefined, format?: string): string {
  if (!value) return '';
  const v = value.trim();
  if (OPEN_ENDED.test(v)) return 'Present';
  if (!format) return v;
  const parsed = parse(v);
  if (!parsed) return v;
  const { year, month } = parsed;
  if (!month) return String(year);
  const mm = String(month).padStart(2, '0');
  switch (format) {
    case 'MM.YYYY':
      return `${mm}.${year}`;
    case 'DD/MM/YYYY': // no day at resume granularity → month/year ordering
    case 'MM/YYYY':
      return `${mm}/${year}`;
    default:
      return v;
  }
}

/** "start - end" range, honoring `current`/open-ended end. */
export function formatDateRange(
  start?: string,
  end?: string,
  current?: boolean,
  format?: string,
): string {
  const s = formatDate(start, format);
  if (current) return s ? `${s} - Present` : 'Present';
  const e = formatDate(end, format);
  if (!s && !e) return '';
  if (!e) return s ? `${s} - Present` : '';
  return s ? `${s} - ${e}` : e;
}

/** Reformat an already-composed value that may be a single date or "a - b". */
export function formatComposedRange(value: string | undefined, format?: string): string {
  if (!value) return '';
  if (!format) return value;
  if (value.includes(' - ')) {
    const [a, b] = value.split(' - ');
    return [formatDate(a, format), formatDate(b, format)].filter(Boolean).join(' - ');
  }
  return formatDate(value, format);
}
