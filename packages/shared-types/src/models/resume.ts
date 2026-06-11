import { z } from 'zod';

import { TemplateRegion } from '../enums/index.js';

export const ContactInfoSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  linkedin: z.string().url().optional(),
  website: z.string().url().optional(),
  github: z.string().url().optional(),
  address: z.string().optional(),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const RegionFieldsSchema = z.object({
  photoUrl: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  fathersName: z.string().optional(),
  cnic: z.string().optional(),
  maritalStatus: z.string().optional(),
  domicile: z.string().optional(),
});
export type RegionFields = z.infer<typeof RegionFieldsSchema>;

export const SkillSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  bullets: z.array(z.string()),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  degree: z.string(),
  field: z.string().optional(),
  institution: z.string(),
  location: z.string().optional(),
  date: z.string(),
  gpa: z.string().optional(),
});
export type Education = z.infer<typeof EducationSchema>;

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().optional(),
  technologies: z.array(z.string()).optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  date: z.string().optional(),
  url: z.string().optional(),
});
export type Certification = z.infer<typeof CertificationSchema>;

export const CustomSectionFieldSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type CustomSectionField = z.infer<typeof CustomSectionFieldSchema>;

export const CustomSectionItemSchema = z.object({
  id: z.string(),
  fields: z.array(CustomSectionFieldSchema),
});
export type CustomSectionItem = z.infer<typeof CustomSectionItemSchema>;

export const CustomSectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  /** Render style: list of entries, label/value rows, or free paragraph */
  type: z.enum(['list', 'keyValue', 'paragraph']).default('list'),
  items: z.array(CustomSectionItemSchema).default([]),
});
export type CustomSection = z.infer<typeof CustomSectionSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  isDefault: z.boolean().default(false),
  contactInfo: ContactInfoSchema,
  regionFields: RegionFieldsSchema.optional(),
  summary: z.string().optional(),
  skills: z.array(SkillSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  languages: z.array(z.object({ language: z.string(), proficiency: z.string() })).default([]),
  publications: z.array(z.object({ title: z.string(), venue: z.string(), date: z.string(), url: z.string().optional() })).default([]),
  volunteer: z.array(z.object({ role: z.string(), organization: z.string(), description: z.string().optional() })).default([]),
  references: z.array(z.object({ name: z.string(), title: z.string(), contact: z.string() })).default([]),
  customSections: z.array(CustomSectionSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const ResumeVersionSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  templateRegion: TemplateRegion,
  templateLayout: z.string(),
  templateTheme: z.string(),
  tailoredContent: z.record(z.unknown()),
  atsScore: z.number().int().min(0).max(100).optional(),
  pdfUrl: z.string().optional(),
  docxUrl: z.string().optional(),
  coverLetter: z.string().optional(),
  abVariant: z.string().optional(),
  callbackReceived: z.boolean().default(false),
  createdAt: z.date(),
});
export type ResumeVersion = z.infer<typeof ResumeVersionSchema>;
