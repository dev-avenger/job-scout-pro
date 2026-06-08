const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_REGEX = /^https?:\/\/.+\..+/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return URL_REGEX.test(url);
  } catch {
    return false;
  }
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s()-]/g, '');
  return PHONE_REGEX.test(cleaned);
}

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|company|group|holdings)\b\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
