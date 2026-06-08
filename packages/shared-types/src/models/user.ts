import { z } from 'zod';

import { AutonomyMode } from '../enums/index.js';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  autonomyMode: AutonomyMode.default('supervised'),
  onboardingCompleted: z.boolean().default(false),
  guidedAppCount: z.number().int().default(0),
  supervisedAppCount: z.number().int().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const ActivityHoursSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string(),
});
export type ActivityHours = z.infer<typeof ActivityHoursSchema>;

export const UserPreferencesSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  targetRoles: z.array(z.string()),
  salaryMin: z.number().int().optional(),
  salaryMax: z.number().int().optional(),
  locations: z.array(z.string()),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite', 'any']).default('any'),
  companyBlacklist: z.array(z.string()).default([]),
  keywordBlacklist: z.array(z.string()).default([]),
  dailyAppCap: z.number().int().default(15),
  dailyLlmCapCents: z.number().int().default(500),
  monthlyLlmCapCents: z.number().int().default(10000),
  stealthMode: z.boolean().default(false),
  activityHours: ActivityHoursSchema.optional(),
  notificationChannels: z.record(z.boolean()).optional(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
