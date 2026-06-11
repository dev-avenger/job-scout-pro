import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const resumeTemplates = pgTable('resume_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** null = global/built-in template */
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 60 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  region: varchar('region', { length: 30 }).notNull().default('general'),
  description: text('description'),
  config: jsonb('config').notNull(),
  previewImageUrl: varchar('preview_image_url', { length: 500 }),
  isBuiltIn: boolean('is_built_in').default(false).notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
