import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobs } from './jobs.js';
import { resumeVersions } from './profiles.js';
import { users } from './users.js';

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  jobId: uuid('job_id').references(() => jobs.id).notNull(),
  resumeVersionId: uuid('resume_version_id').references(() => resumeVersions.id),
  status: varchar('status', { length: 30 }).default('queued').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  autonomyMode: varchar('autonomy_mode', { length: 20 }),
  portalName: varchar('portal_name', { length: 100 }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  responseAt: timestamp('response_at', { withTimezone: true }),
  responseType: varchar('response_type', { length: 30 }),
  daysToResponse: integer('days_to_response'),
  coverLetter: text('cover_letter'),
  formAnswers: jsonb('form_answers'),
  llmCostCents: integer('llm_cost_cents').default(0).notNull(),
  failureReason: text('failure_reason'),
  failureType: varchar('failure_type', { length: 20 }),
  failureScreenshotUrl: varchar('failure_screenshot_url', { length: 500 }),
  retryCount: integer('retry_count').default(0).notNull(),
  templateRegion: varchar('template_region', { length: 30 }),
  templateLayout: varchar('template_layout', { length: 30 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const applicationEvents = pgTable('application_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  oldValue: varchar('old_value', { length: 100 }),
  newValue: varchar('new_value', { length: 100 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
