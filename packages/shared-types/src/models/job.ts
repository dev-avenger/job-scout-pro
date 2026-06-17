import { z } from 'zod';

import {
  ApplyMethod,
  JobValidationStatus,
  LocationType,
  SourceChannel,
} from '../enums/index.js';

export const JobSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  externalId: z.string().optional(),
  sourceChannel: SourceChannel,
  sourceUrl: z.string().url(),
  title: z.string().min(1).max(500),
  companyName: z.string().min(1).max(255),
  companyId: z.string().uuid().optional(),
  location: z.string().optional(),
  locationType: LocationType.optional(),
  salaryMin: z.number().int().optional(),
  salaryMax: z.number().int().optional(),
  salaryCurrency: z.string().length(3).optional(),
  description: z.string().optional(),
  requiredSkills: z.array(z.string()).default([]),
  experienceLevel: z.string().optional(),
  postedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  applyUrl: z.string().url().optional(),
  applyMethod: ApplyMethod.optional(),
  applicantCount: z.number().int().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  callbackProbability: z.number().min(0).max(1).optional(),
  competitionLevel: z.string().optional(),
  atsScore: z.number().int().min(0).max(100).optional(),
  scamScore: z.number().min(0).max(1).optional(),
  techStackAlignment: z.number().min(0).max(1).optional(),
  culturalFitScore: z.number().min(0).max(1).optional(),
  remoteCompatibility: z.number().min(0).max(1).optional(),
  validationStatus: JobValidationStatus.default('pending'),
  duplicateOfId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  lastLivenessCheck: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Job = z.infer<typeof JobSchema>;

export const RawJobListingSchema = z.object({
  externalId: z.string().optional(),
  sourceChannel: SourceChannel,
  sourceUrl: z.string().url(),
  title: z.string(),
  companyName: z.string(),
  location: z.string().optional(),
  locationType: LocationType.optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  description: z.string().optional(),
  requiredSkills: z.array(z.string()).optional(),
  experienceLevel: z.string().optional(),
  postedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  applyUrl: z.string().optional(),
  applyMethod: ApplyMethod.optional(),
  applicantCount: z.number().optional(),
});
export type RawJobListing = z.infer<typeof RawJobListingSchema>;

export const JobValidationResultSchema = z.object({
  isValid: z.boolean(),
  status: JobValidationStatus,
  reason: z.string().optional(),
  duplicateOfId: z.string().uuid().optional(),
});
export type JobValidationResult = z.infer<typeof JobValidationResultSchema>;

export const SearchCriteriaSchema = z.object({
  keywords: z.array(z.string()),
  locations: z.array(z.string()).optional(),
  remoteOnly: z.boolean().optional(),
  salaryMin: z.number().optional(),
  experienceLevel: z.string().optional(),
  postedWithinDays: z.number().optional(),
  excludeCompanies: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  /** Custom RSS feed URLs configured by the user (Settings → Job Sources). */
  rssFeedUrls: z.array(z.string()).optional(),
  /** Source names the user has switched off. */
  disabledSources: z.array(z.string()).optional(),
  /** Owning user — lets browser-based sources reuse the user's trusted profile. */
  userId: z.string().optional(),
  /** Specific companies whose career pages should be polled. */
  watchlist: z
    .array(
      z.object({
        company: z.string(),
        adapter: z.enum(['workable', 'greenhouse', 'lever', 'html', 'successfactors']),
        /** ATS account slug, or full careers-page URL for the html adapter. */
        ref: z.string(),
        city: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .optional(),
});
export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;
