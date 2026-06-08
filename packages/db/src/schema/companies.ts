import { boolean, doublePrecision, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }),
  careersUrl: varchar('careers_url', { length: 500 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  industry: varchar('industry', { length: 100 }),
  sizeRange: varchar('size_range', { length: 30 }),
  stabilityScore: doublePrecision('stability_score'),
  culturalFitScore: doublePrecision('cultural_fit_score'),
  glassdoorRating: doublePrecision('glassdoor_rating'),
  techStack: text('tech_stack').array(),
  rtoPolicy: varchar('rto_policy', { length: 50 }),
  isScam: boolean('is_scam').default(false).notNull(),
  researchData: jsonb('research_data'),
  lastResearchedAt: timestamp('last_researched_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
