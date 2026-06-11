/* eslint-disable @typescript-eslint/no-explicit-any */
import { emptyImportedProfile, importId, type ImportedProfile } from './types.js';

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function arr(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

/** Detect the open JSON Resume format (https://jsonresume.org). */
export function isJsonResume(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const j = json as Record<string, unknown>;
  if ('basics' in j && typeof j.basics === 'object' && !('sections' in j)) return true;
  return ['work', 'education', 'skills'].some((k) => Array.isArray(j[k]));
}

/**
 * Map a JSON Resume document to profile content.
 * Sections without a native equivalent (awards, interests) become custom sections.
 */
export function mapJsonResume(json: any): ImportedProfile {
  const out = emptyImportedProfile();
  const counter = { n: 0 };
  const basics = json?.basics ?? {};

  out.name = str(basics.name) ?? 'Imported resume';
  out.contactInfo = {
    name: str(basics.name),
    email: str(basics.email),
    phone: str(basics.phone),
    location:
      str(basics.location?.city) && str(basics.location?.region)
        ? `${basics.location.city}, ${basics.location.region}`
        : str(basics.location?.city) ?? str(basics.location?.region),
    website: str(basics.url),
  };
  for (const p of arr(basics.profiles)) {
    const network = str(p?.network)?.toLowerCase();
    if (network === 'linkedin') out.contactInfo.linkedin = str(p.url) ?? str(p.username);
    if (network === 'github') out.contactInfo.github = str(p.url) ?? str(p.username);
  }
  out.summary = str(basics.summary);

  out.skills = arr(json?.skills)
    .flatMap((s: any) => [str(s?.name), ...arr(s?.keywords).map(str)])
    .filter((s): s is string => Boolean(s));

  out.experience = arr(json?.work).map((w: any) => ({
    title: str(w?.position) ?? '',
    company: str(w?.name) ?? str(w?.company) ?? '',
    location: str(w?.location),
    startDate: str(w?.startDate) ?? '',
    endDate: str(w?.endDate),
    current: !str(w?.endDate),
    bullets: arr(w?.highlights).map(str).filter((s): s is string => Boolean(s)),
    description: str(w?.summary),
  }));

  out.education = arr(json?.education).map((e: any) => ({
    degree: [str(e?.studyType), str(e?.area)].filter(Boolean).join(', ') || 'Degree',
    field: str(e?.area),
    institution: str(e?.institution) ?? '',
    date: [str(e?.startDate), str(e?.endDate)].filter(Boolean).join(' - ') || undefined,
    gpa: str(e?.score),
  }));

  out.projects = arr(json?.projects).map((p: any) => ({
    name: str(p?.name) ?? '',
    description: str(p?.description) ?? str(p?.summary),
    url: str(p?.url),
    technologies: arr(p?.keywords).map(str).filter((s): s is string => Boolean(s)),
  }));

  out.certifications = arr(json?.certificates).map((c: any) => ({
    name: str(c?.name) ?? '',
    issuer: str(c?.issuer),
    date: str(c?.date),
  }));

  out.languages = arr(json?.languages).map((l: any) => ({
    language: str(l?.language) ?? '',
    proficiency: str(l?.fluency),
  }));

  out.publications = arr(json?.publications).map((p: any) => ({
    title: str(p?.name) ?? '',
    venue: str(p?.publisher),
    date: str(p?.releaseDate),
    url: str(p?.url),
  }));

  out.volunteer = arr(json?.volunteer).map((v: any) => ({
    role: str(v?.position),
    organization: str(v?.organization) ?? '',
    description: str(v?.summary),
  }));

  out.references = arr(json?.references).map((r: any) => ({
    name: str(r?.name) ?? '',
    contact: str(r?.reference),
  }));

  // Awards -> custom section
  const awards = arr(json?.awards);
  if (awards.length > 0) {
    out.customSections.push({
      id: importId(counter),
      title: 'Awards',
      type: 'list',
      items: awards.map((a: any) => ({
        id: importId(counter),
        fields: [
          { label: '', value: str(a?.title) ?? '' },
          ...(str(a?.awarder) ? [{ label: 'Awarded by', value: a.awarder.trim() }] : []),
          ...(str(a?.date) ? [{ label: 'Date', value: a.date.trim() }] : []),
          ...(str(a?.summary) ? [{ label: '', value: a.summary.trim() }] : []),
        ],
      })),
    });
  }

  // Interests -> custom section
  const interests = arr(json?.interests);
  if (interests.length > 0) {
    out.customSections.push({
      id: importId(counter),
      title: 'Interests',
      type: 'paragraph',
      items: [
        {
          id: importId(counter),
          fields: [
            {
              label: '',
              value: interests
                .map((i: any) => [str(i?.name), ...arr(i?.keywords).map(str).filter(Boolean)].filter(Boolean).join(': '))
                .filter(Boolean)
                .join('; '),
            },
          ],
        },
      ],
    });
  }

  return out;
}
