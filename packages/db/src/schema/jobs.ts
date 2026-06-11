import { boolean, doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { companies } from './companies.js';
import { users } from './users.js';

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  externalId: varchar('external_id', { length: 255 }),
  sourceChannel: varchar('source_channel', { length: 50 }).notNull(),
  sourceUrl: varchar('source_url', { length: 2000 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  location: varchar('location', { length: 255 }),
  locationType: varchar('location_type', { length: 20 }),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: varchar('salary_currency', { length: 3 }),
  description: text('description'),
  requiredSkills: text('required_skills').array(),
  experienceLevel: varchar('experience_level', { length: 30 }),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  applyUrl: varchar('apply_url', { length: 2000 }),
  applyMethod: varchar('apply_method', { length: 20 }),
  applicantCount: integer('applicant_count'),
  relevanceScore: doublePrecision('relevance_score'),
  callbackProbability: doublePrecision('callback_probability'),
  competitionLevel: varchar('competition_level', { length: 10 }),
  atsScore: integer('ats_score'),
  scamScore: doublePrecision('scam_score'),
  techStackAlignment: doublePrecision('tech_stack_alignment'),
  culturalFitScore: doublePrecision('cultural_fit_score'),
  remoteCompatibility: doublePrecision('remote_compatibility'),
  validationStatus: varchar('validation_status', { length: 20 }).default('pending').notNull(),
  duplicateOfId: uuid('duplicate_of_id'),
  isActive: boolean('is_active').default(true).notNull(),
  lastLivenessCheck: timestamp('last_liveness_check', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userStatusIdx: index('idx_jobs_user_status').on(table.userId, table.validationStatus),
  sourceIdx: index('idx_jobs_source').on(table.sourceChannel),
}));

export const jobSources = pgTable('job_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sourceType: varchar('source_type', { length: 30 }).notNull(),
  config: jsonb('config').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  successCount: integer('success_count').default(0).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const targetCompanies = pgTable('target_companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  careersUrl: varchar('careers_url', { length: 500 }),
  crawlFrequency: varchar('crawl_frequency', { length: 20 }).default('daily'),
  jobsFound: integer('jobs_found').default(0).notNull(),
  lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
