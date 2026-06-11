import type { CustomSection } from '@auto-job-apply/shared-types';

/**
 * Normalized data consumed by the renderer. Produced from a Profile (or
 * tailored resume version content) via `normalizeResumeData`.
 */
export interface ResumeRenderData {
  name: string;
  contactInfo: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
    github?: string;
  };
  photoUrl?: string;
  personalDetails: Array<{ label: string; value: string }>;
  summary?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    bullets: string[];
    description?: string;
  }>;
  education: Array<{
    degree: string;
    field?: string;
    institution: string;
    location?: string;
    date?: string;
    gpa?: string;
  }>;
  projects: Array<{ name: string; description?: string; url?: string; technologies?: string[] }>;
  certifications: Array<{ name: string; issuer?: string; date?: string }>;
  languages: Array<{ language: string; proficiency?: string }>;
  publications: Array<{ title: string; venue?: string; date?: string }>;
  volunteer: Array<{ role?: string; organization: string; description?: string }>;
  references: Array<{ name: string; title?: string; contact?: string }>;
  customSections: CustomSection[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Accepts a Profile, tailored content, or any loose resume-shaped object. */
export function normalizeResumeData(raw: any): ResumeRenderData {
  const contactInfo = raw?.contactInfo ?? {};

  const personalDetails: Array<{ label: string; value: string }> = [];
  const rf = raw?.regionFields ?? {};
  if (rf.dateOfBirth) personalDetails.push({ label: 'Date of birth', value: rf.dateOfBirth });
  if (rf.nationality) personalDetails.push({ label: 'Nationality', value: rf.nationality });
  if (rf.fathersName) personalDetails.push({ label: "Father's name", value: rf.fathersName });
  if (rf.cnic) personalDetails.push({ label: 'CNIC', value: rf.cnic });
  if (rf.maritalStatus) personalDetails.push({ label: 'Marital status', value: rf.maritalStatus });
  if (rf.domicile) personalDetails.push({ label: 'Domicile', value: rf.domicile });
  if (contactInfo.address) personalDetails.push({ label: 'Address', value: contactInfo.address });

  return {
    name: raw?.name ?? raw?.contactInfo?.name ?? '',
    contactInfo: {
      email: contactInfo.email,
      phone: contactInfo.phone,
      location: contactInfo.location ?? contactInfo.address,
      linkedin: contactInfo.linkedin,
      website: contactInfo.website,
      github: contactInfo.github,
    },
    photoUrl: rf.photoUrl,
    personalDetails,
    summary: raw?.summary || undefined,
    skills: asArray<any>(raw?.skills).map((s) => (typeof s === 'string' ? s : s?.name ?? '')).filter(Boolean),
    experience: asArray<any>(raw?.experience).map((e) => ({
      title: e?.title ?? '',
      company: e?.company ?? '',
      location: e?.location,
      startDate: e?.startDate,
      endDate: e?.endDate,
      current: e?.current,
      bullets: asArray<string>(e?.bullets),
      description: e?.description,
    })),
    education: asArray<any>(raw?.education).map((e) => ({
      degree: e?.degree ?? '',
      field: e?.field,
      institution: e?.institution ?? '',
      location: e?.location,
      date: e?.date ?? (e?.startDate && e?.endDate ? `${e.startDate} - ${e.endDate}` : e?.endDate ?? e?.startDate),
      gpa: e?.gpa,
    })),
    projects: asArray<any>(raw?.projects).map((p) => ({
      name: p?.name ?? '',
      description: p?.description,
      url: p?.url,
      technologies: asArray<string>(p?.technologies),
    })),
    certifications: asArray<any>(raw?.certifications).map((c) => ({
      name: c?.name ?? '',
      issuer: c?.issuer,
      date: c?.date,
    })),
    languages: asArray<any>(raw?.languages).map((l) => ({
      language: l?.language ?? '',
      proficiency: l?.proficiency,
    })),
    publications: asArray<any>(raw?.publications).map((p) => ({
      title: p?.title ?? '',
      venue: p?.venue ?? p?.publisher,
      date: p?.date,
    })),
    volunteer: asArray<any>(raw?.volunteer).map((v) => ({
      role: v?.role,
      organization: v?.organization ?? '',
      description: v?.description,
    })),
    references: asArray<any>(raw?.references).map((r) => ({
      name: r?.name ?? '',
      title: r?.title,
      contact: r?.contact,
    })),
    customSections: asArray<any>(raw?.customSections).map((cs) => ({
      id: cs?.id ?? '',
      title: cs?.title ?? 'Custom section',
      type: cs?.type ?? 'list',
      items: asArray<any>(cs?.items).map((it) => ({
        id: it?.id ?? '',
        fields: asArray<any>(it?.fields).map((f) => ({ label: f?.label ?? '', value: f?.value ?? '' })),
      })),
    })),
  };
}
