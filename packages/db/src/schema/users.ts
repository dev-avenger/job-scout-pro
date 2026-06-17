import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  masterKeyHash: varchar('master_key_hash', { length: 255 }),
  autonomyMode: varchar('autonomy_mode', { length: 20 }).default('supervised').notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  guidedAppCount: integer('guided_app_count').default(0).notNull(),
  supervisedAppCount: integer('supervised_app_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  targetRoles: text('target_roles').array(),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  locations: text('locations').array(),
  remotePreference: varchar('remote_preference', { length: 20 }).default('any'),
  companyBlacklist: text('company_blacklist').array(),
  keywordBlacklist: text('keyword_blacklist').array(),
  dailyAppCap: integer('daily_app_cap').default(15),
  dailyLlmCapCents: integer('daily_llm_cap_cents').default(500),
  monthlyLlmCapCents: integer('monthly_llm_cap_cents').default(10000),
  stealthMode: boolean('stealth_mode').default(false),
  activityHours: jsonb('activity_hours'),
  notificationChannels: jsonb('notification_channels'),
  // Free-form bag for UI-level settings (LLM provider config, job source
  // toggles, notification prefs) that don't warrant dedicated columns.
  uiSettings: jsonb('ui_settings'),
});
