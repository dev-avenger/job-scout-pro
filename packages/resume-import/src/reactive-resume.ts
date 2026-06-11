/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BuilderLayoutStateV2 } from '@auto-job-apply/shared-types';
import { customSectionRef } from '@auto-job-apply/shared-types';
import { emptyImportedProfile, importId, type ImportedProfile } from './types.js';

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function arr(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

/** Strip basic HTML that Reactive Resume rich-text fields may contain. */
function plain(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || undefined;
}

/** Detect a Reactive Resume v4 export (https://rxresu.me). */
export function isReactiveResume(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const j = json as Record<string, unknown>;
  return 'sections' in j && 'basics' in j;
}

/** Map a Reactive Resume id to our built-in section ids. */
const RR_SECTION_MAP: Record<string, string> = {
  summary: 'summary',
  skills: 'skills',
  experience: 'experience',
  education: 'education',
  projects: 'projects',
  certifications: 'certifications',
  languages: 'languages',
  publications: 'publications',
  volunteering: 'volunteer',
  references: 'references',
};

/**
 * Map a Reactive Resume v4 JSON export to profile content.
 * Custom sections and the page layout (metadata.layout) carry over.
 */
export function mapReactiveResume(json: any): ImportedProfile {
  const out = emptyImportedProfile();
  const counter = { n: 0 };
  const basics = json?.basics ?? {};
  const sections = json?.sections ?? {};

  out.name = str(basics.name) ?? 'Imported resume';
  out.contactInfo = {
    name: str(basics.name),
    email: str(basics.email),
    phone: str(basics.phone),
    location: str(basics.location),
    website: str(basics.url?.href) ?? str(basics.url),
  };

  out.summary = plain(sections.summary?.content);

  out.skills = arr(sections.skills?.items)
    .map((s: any) => str(s?.name))
    .filter((s): s is string => Boolean(s));

  out.experience = arr(sections.experience?.items).map((e: any) => {
    const [startDate, endDate] = (str(e?.date) ?? '').split(/\s*[-–—]\s*/);
    return {
      title: str(e?.position) ?? '',
      company: str(e?.company) ?? '',
      location: str(e?.location),
      startDate: startDate ?? '',
      endDate: endDate || undefined,
      current: /present/i.test(endDate ?? ''),
      bullets: [],
      description: plain(e?.summary),
    };
  });

  out.education = arr(sections.education?.items).map((e: any) => ({
    degree: [str(e?.studyType), str(e?.area)].filter(Boolean).join(', ') || 'Degree',
    field: str(e?.area),
    institution: str(e?.institution) ?? '',
    date: str(e?.date),
    gpa: str(e?.score),
  }));

  out.projects = arr(sections.projects?.items).map((p: any) => ({
    name: str(p?.name) ?? '',
    description: plain(p?.summary) ?? plain(p?.description),
    url: str(p?.url?.href) ?? str(p?.url),
    technologies: arr(p?.keywords).map(str).filter((s): s is string => Boolean(s)),
  }));

  out.certifications = arr(sections.certifications?.items).map((c: any) => ({
    name: str(c?.name) ?? '',
    issuer: str(c?.issuer),
    date: str(c?.date),
  }));

  out.languages = arr(sections.languages?.items).map((l: any) => ({
    language: str(l?.name) ?? '',
    proficiency: str(l?.description) ?? str(l?.level),
  }));

  out.publications = arr(sections.publications?.items).map((p: any) => ({
    title: str(p?.name) ?? '',
    venue: str(p?.publisher),
    date: str(p?.date),
    url: str(p?.url?.href) ?? str(p?.url),
  }));

  out.volunteer = arr(sections.volunteering?.items ?? sections.volunteer?.items).map((v: any) => ({
    role: str(v?.position),
    organization: str(v?.organization) ?? '',
    description: plain(v?.summary),
  }));

  out.references = arr(sections.references?.items).map((r: any) => ({
    name: str(r?.name) ?? '',
    contact: plain(r?.summary) ?? str(r?.description),
  }));

  // Reactive Resume custom sections: sections.custom is a map of id -> section
  const rrCustomIdToOurs = new Map<string, string>();
  const custom = sections.custom && typeof sections.custom === 'object' ? sections.custom : {};
  for (const [rrId, sec] of Object.entries<any>(custom)) {
    const id = importId(counter);
    rrCustomIdToOurs.set(`custom.${rrId}`, id);
    out.customSections.push({
      id,
      title: str(sec?.name) ?? 'Custom section',
      type: 'list',
      items: arr(sec?.items).map((it: any) => ({
        id: importId(counter),
        fields: [
          { label: '', value: str(it?.name) ?? '' },
          ...(plain(it?.description) ? [{ label: '', value: plain(it.description)! }] : []),
          ...(plain(it?.summary) ? [{ label: '', value: plain(it.summary)! }] : []),
        ].filter((f) => f.value),
      })),
    });
  }

  // Layout: metadata.layout = pages -> columns -> RR section ids
  const layout = json?.metadata?.layout;
  if (Array.isArray(layout) && layout.length > 0) {
    const pages = layout.map((page: any) =>
      arr(page).map((column: any) =>
        arr(column)
          .map((rrId: any) => {
            const id = String(rrId);
            if (RR_SECTION_MAP[id]) return RR_SECTION_MAP[id];
            const mapped = rrCustomIdToOurs.get(id);
            return mapped ? customSectionRef(mapped) : null;
          })
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const layoutState: BuilderLayoutStateV2 = { version: 2, pages, hiddenSections: [] };
    if (pages.some((p) => p.some((c) => c.length > 0))) out.layoutState = layoutState;
  }

  return out;
}
