/* -------------------------------------------------------------------------- */
/*  Resume Types                                                              */
/* -------------------------------------------------------------------------- */

export interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
}

export interface Profile {
  id: string;
  name: string;
  contactInfo: ContactInfo;
  isDefault: boolean;
  createdAt: string;
  summary?: string;
  skills?: string[] | Array<{ name: string; category?: string; proficiency?: string }>;
  experience?: Array<{ title: string; company: string; startDate: string; endDate?: string; description?: string }>;
  education?: Array<{ degree: string; institution: string; date?: string; startDate?: string; endDate?: string; gpa?: string }>;
  projects?: Array<{ name: string; description?: string; url?: string; technologies?: string[] }>;
  certifications?: Array<{ name: string; issuer?: string; date?: string }>;
  languages?: Array<{ language: string; proficiency?: string }>;
  publications?: Array<{ title: string; venue?: string; publisher?: string; date?: string }>;
  volunteer?: Array<{ role?: string; organization: string; description?: string; startDate?: string; endDate?: string }>;
  references?: Array<{ name: string; title?: string; contact?: string }>;
  sectionOrder?: Array<{ id: string; label: string; visible: boolean }>;
}

export interface TemplateRegion {
  id: string;
  name: string;
  description: string;
}

export interface TemplatesData {
  regions: TemplateRegion[];
  layouts: string[];
  themes: string[];
}

export type View = 'list' | 'create' | 'detail' | 'edit';

/* -------------------------------------------------------------------------- */
/*  Section Types                                                             */
/* -------------------------------------------------------------------------- */

export interface ExperienceEntry {
  id?: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationEntry {
  id?: string;
  degree: string;
  institution: string;
  startDate: string;
  endDate: string;
  gpa: string;
}

export interface ProjectEntry {
  id?: string;
  name: string;
  description: string;
  url: string;
  technologies: string[];
}

export interface CertificationEntry {
  id?: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate: string;
  credentialUrl: string;
}

export interface LanguageEntry {
  id?: string;
  language: string;
  proficiency: 'native' | 'fluent' | 'intermediate' | 'basic';
}

export interface PublicationEntry {
  id?: string;
  title: string;
  publisher: string;
  date: string;
  url: string;
}

export interface VolunteerEntry {
  id?: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ReferenceEntry {
  id?: string;
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  relationship: string;
}

export type SectionType =
  | 'experience'
  | 'education'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'publications'
  | 'volunteer'
  | 'references';

export type SectionEntry =
  | ExperienceEntry
  | EducationEntry
  | ProjectEntry
  | CertificationEntry
  | LanguageEntry
  | PublicationEntry
  | VolunteerEntry
  | ReferenceEntry;
