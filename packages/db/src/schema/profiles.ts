import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  contactInfo: jsonb('contact_info').notNull(),
  regionFields: jsonb('region_fields'),
  summary: text('summary'),
  skills: jsonb('skills'),
  experience: jsonb('experience'),
  education: jsonb('education'),
  projects: jsonb('projects'),
  certifications: jsonb('certifications'),
  languages: jsonb('languages'),
  publications: jsonb('publications'),
  volunteer: jsonb('volunteer'),
  references: jsonb('references'),
  sectionOrder: jsonb('section_order'),
  customSections: jsonb('custom_sections'),
  rawImport: jsonb('raw_import'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const resumeVersions = pgTable('resume_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  jobId: uuid('job_id'),
  templateRegion: varchar('template_region', { length: 30 }).notNull(),
  templateLayout: varchar('template_layout', { length: 30 }).notNull(),
  templateTheme: varchar('template_theme', { length: 30 }).notNull(),
  tailoredContent: jsonb('tailored_content').notNull(),
  atsScore: integer('ats_score'),
  pdfUrl: varchar('pdf_url', { length: 500 }),
  docxUrl: varchar('docx_url', { length: 500 }),
  coverLetter: text('cover_letter'),
  abVariant: varchar('ab_variant', { length: 10 }),
  callbackReceived: boolean('callback_received').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
