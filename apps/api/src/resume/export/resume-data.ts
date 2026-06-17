import type { ResumeData } from './pdf-generator.js';

export interface TailoredResume {
  summary?: string;
  experience?: Array<{ title?: string; company?: string; bullets?: string[] }>;
  skills?: Array<{ name?: string; category?: string }>;
  highlights?: string[];
}

/**
 * Build the ResumeData fed to the PDF generator from a profile, optionally
 * overlaying job-tailored content (tailored summary, rewritten experience
 * bullets, reprioritised skills). Contact info and education always come from
 * the base profile; dates are preserved by matching tailored roles back to the
 * profile's experience entries.
 */
export function buildResumeData(
  profile: Record<string, any>,
  tailored?: TailoredResume | null,
): ResumeData {
  const c = (profile.contactInfo ?? {}) as Record<string, unknown>;
  const baseExp = (profile.experience as Array<Record<string, any>> | undefined) ?? [];

  const data: ResumeData = {
    name: (c.name as string) ?? profile.name ?? '',
    contactInfo: {
      email: c.email as string | undefined,
      phone: c.phone as string | undefined,
      location: c.location as string | undefined,
      linkedin: c.linkedin as string | undefined,
    },
    summary: profile.summary,
    skills: profile.skills,
    experience: profile.experience,
    education: profile.education,
    projects: profile.projects,
    certifications: profile.certifications,
    languages: profile.languages,
  };

  if (tailored) {
    if (tailored.summary) data.summary = tailored.summary;

    if (tailored.experience?.length) {
      data.experience = tailored.experience.map((te) => {
        // Preserve dates/location from the matching base entry where possible.
        const match =
          baseExp.find(
            (e) =>
              (e.company ?? '').toLowerCase() === (te.company ?? '').toLowerCase() &&
              (e.title ?? '').toLowerCase() === (te.title ?? '').toLowerCase(),
          ) ??
          baseExp.find((e) => (e.company ?? '').toLowerCase() === (te.company ?? '').toLowerCase()) ??
          {};
        return {
          title: te.title ?? match.title,
          company: te.company ?? match.company,
          startDate: match.startDate,
          endDate: match.endDate,
          location: match.location,
          description: (te.bullets ?? []).join('\n'),
        };
      });
    }

    if (tailored.skills?.length) {
      data.skills = tailored.skills.map((s) => s.name).filter(Boolean) as string[];
    }
  }

  return data;
}
