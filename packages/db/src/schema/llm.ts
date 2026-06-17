import { doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { applications } from './applications.js';
import { jobs } from './jobs.js';
import { users } from './users.js';

export const llmRequests = pgTable('llm_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  agentName: varchar('agent_name', { length: 50 }).notNull(),
  taskType: varchar('task_type', { length: 50 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 30 }).notNull(),
  promptVersion: varchar('prompt_version', { length: 20 }),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  // Sub-cent costs are common (e.g. Gemini Flash), so store fractional cents.
  costCents: doublePrecision('cost_cents').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  status: varchar('status', { length: 20 }).default('success').notNull(),
  errorMessage: text('error_message'),
  applicationId: uuid('application_id').references(() => applications.id),
  jobId: uuid('job_id').references(() => jobs.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  dailyIdx: index('idx_llm_requests_daily').on(table.userId, table.createdAt),
}));

export const agentWorkLogs = pgTable('agent_work_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  module: varchar('module', { length: 30 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  reasoning: text('reasoning'),
  outcome: varchar('outcome', { length: 20 }),
  inputSummary: jsonb('input_summary'),
  outputSummary: jsonb('output_summary'),
  applicationId: uuid('application_id').references(() => applications.id),
  jobId: uuid('job_id').references(() => jobs.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const fineTuningData = pgTable('fine_tuning_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  agentName: varchar('agent_name', { length: 50 }).notNull(),
  originalOutput: text('original_output').notNull(),
  correctedOutput: text('corrected_output').notNull(),
  context: jsonb('context'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const fineTuningJobs = pgTable('fine_tuning_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 30 }).notNull(),
  baseModel: varchar('base_model', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  trainingDataCount: integer('training_data_count'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  resultModelId: varchar('result_model_id', { length: 255 }),
  validationMetrics: jsonb('validation_metrics'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
