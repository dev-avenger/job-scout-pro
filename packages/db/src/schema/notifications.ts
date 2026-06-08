import { boolean, doublePrecision, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  priority: varchar('priority', { length: 10 }).default('normal').notNull(),
  read: boolean('read').default(false).notNull(),
  actionUrl: varchar('action_url', { length: 500 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const alertRules = pgTable('alert_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  conditionType: varchar('condition_type', { length: 50 }).notNull(),
  threshold: doublePrecision('threshold'),
  channel: varchar('channel', { length: 20 }).notNull(),
  webhookUrl: varchar('webhook_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
