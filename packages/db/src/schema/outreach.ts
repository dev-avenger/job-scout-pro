import { boolean, doublePrecision, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { applications } from './applications.js';
import { users } from './users.js';

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  title: varchar('title', { length: 255 }),
  company: varchar('company', { length: 255 }),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  relationshipType: varchar('relationship_type', { length: 50 }),
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  notes: text('notes'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const outreachMessages = pgTable('outreach_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  applicationId: uuid('application_id').references(() => applications.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  type: varchar('type', { length: 30 }),
  subject: varchar('subject', { length: 500 }),
  body: text('body'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  repliedAt: timestamp('replied_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const inboxEmails = pgTable('inbox_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  messageId: varchar('message_id', { length: 255 }).unique(),
  fromAddress: varchar('from_address', { length: 255 }),
  subject: varchar('subject', { length: 500 }),
  bodyPreview: text('body_preview'),
  classification: varchar('classification', { length: 30 }),
  classificationConfidence: doublePrecision('classification_confidence'),
  applicationId: uuid('application_id').references(() => applications.id),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  calendarEventCreated: boolean('calendar_event_created').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
