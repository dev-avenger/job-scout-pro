import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const portalMappings = pgTable('portal_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: varchar('domain', { length: 255 }).notNull(),
  pagePath: varchar('page_path', { length: 500 }).notNull(),
  formStructure: jsonb('form_structure').notNull(),
  selectorsVersion: integer('selectors_version').default(1).notNull(),
  successCount: integer('success_count').default(0).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  domainPathIdx: uniqueIndex('idx_portal_mappings_domain_path').on(table.domain, table.pagePath),
}));

export const portalSessions = pgTable('portal_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  portalDomain: varchar('portal_domain', { length: 255 }).notNull(),
  storageState: jsonb('storage_state').notNull(),
  credentialMethod: varchar('credential_method', { length: 20 }),
  encryptedCredentials: text('encrypted_credentials'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const savedAnswers = pgTable('saved_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fieldLabel: varchar('field_label', { length: 500 }).notNull(),
  fieldType: varchar('field_type', { length: 50 }),
  answerText: text('answer_text').notNull(),
  source: varchar('source', { length: 30 }),
  timesUsed: integer('times_used').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
