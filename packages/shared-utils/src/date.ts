export type DateFormat = 'us' | 'uk' | 'eu' | 'iso';

const formatters: Record<DateFormat, Intl.DateTimeFormat> = {
  us: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
  uk: new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }),
  eu: new Intl.DateTimeFormat('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' }),
  iso: new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' }),
};

export function formatDate(date: Date, format: DateFormat = 'iso'): string {
  return formatters[format].format(date);
}

export function formatMonthYear(date: Date, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
}

export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function daysBetween(start: Date, end: Date): number {
  const diffMs = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isWithinBusinessHours(
  start: string,
  end: string,
  timezone: string,
): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  const currentTime = formatter.format(now);
  return currentTime >= start && currentTime <= end;
}
