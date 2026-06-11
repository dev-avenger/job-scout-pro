import type { BuilderLayoutStateV2, CustomSection } from '@auto-job-apply/shared-types';

/**
 * Profile content produced by an importer — the shape accepted by
 * PUT /api/v1/profiles/:id (plus name/contactInfo for profile creation).
 */
export interface ImportedProfile {
  name: string;
  contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
    github?: string;
  };
  summary?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    bullets: string[];
    description?: string;
  }>;
  education: Array<{
    degree: string;
    field?: string;
    institution: string;
    date?: string;
    gpa?: string;
  }>;
  projects: Array<{ name: string; description?: string; url?: string; technologies?: string[] }>;
  certifications: Array<{ name: string; issuer?: string; date?: string }>;
  languages: Array<{ language: string; proficiency?: string }>;
  publications: Array<{ title: string; venue?: string; date?: string; url?: string }>;
  volunteer: Array<{ role?: string; organization: string; description?: string }>;
  references: Array<{ name: string; title?: string; contact?: string }>;
  customSections: CustomSection[];
  /** present when the source format carries layout information (Reactive Resume); v2 shape, migrated server-side */
  layoutState?: BuilderLayoutStateV2;
}

export function emptyImportedProfile(): ImportedProfile {
  return {
    name: '',
    contactInfo: {},
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    languages: [],
    publications: [],
    volunteer: [],
    references: [],
    customSections: [],
  };
}

/** Tiny deterministic uuid-v4-shaped id generator (no crypto dependency). */
export function importId(seedCounter: { n: number }): string {
  const hex = (len: number) =>
    Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  seedCounter.n += 1;
  return `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
}
