import { z } from 'zod';

export const AutonomyMode = z.enum(['guided', 'supervised', 'autonomous']);
export type AutonomyMode = z.infer<typeof AutonomyMode>;

export const ApplicationStatus = z.enum([
  'queued',
  'in_progress',
  'pending_review',
  'needs_captcha',
  'submitted',
  'confirmed',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
  'failed',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

export const JobValidationStatus = z.enum(['pending', 'valid', 'expired', 'duplicate', 'scam']);
export type JobValidationStatus = z.infer<typeof JobValidationStatus>;

export const LocationType = z.enum(['remote', 'hybrid', 'onsite', 'any']);
export type LocationType = z.infer<typeof LocationType>;

export const SourceChannel = z.enum([
  'indeed_api',
  'linkedin',
  'adzuna_api',
  'playwright_crawl',
  'google_jobs',
  'rss_feed',
  'remoteok',
  'arbeitnow',
  'remotive',
  'jobicy',
  'himalayas',
  'themuse',
  'bayt',
  'jooble',
  'brightspyre',
  'pakpositions',
  'company_watchlist',
  'manual_url',
  'email_forward',
  'csv_import',
]);
export type SourceChannel = z.infer<typeof SourceChannel>;

export const ApplyMethod = z.enum(['direct_link', 'ats_portal', 'email']);
export type ApplyMethod = z.infer<typeof ApplyMethod>;

export const FailureType = z.enum(['retryable', 'terminal', 'degraded']);
export type FailureType = z.infer<typeof FailureType>;

export const EmailClassification = z.enum([
  'interview',
  'rejection',
  'acknowledgement',
  'recruiter',
  'spam',
  'unknown',
]);
export type EmailClassification = z.infer<typeof EmailClassification>;

export const OutreachType = z.enum([
  'initial_outreach',
  'follow_up',
  'thank_you',
  'referral_request',
]);
export type OutreachType = z.infer<typeof OutreachType>;

export const OutreachStatus = z.enum([
  'draft',
  'scheduled',
  'sent',
  'opened',
  'replied',
  'bounced',
]);
export type OutreachStatus = z.infer<typeof OutreachStatus>;

export const RelationshipType = z.enum([
  'recruiter',
  'hiring_manager',
  'referral',
  'alumni',
]);
export type RelationshipType = z.infer<typeof RelationshipType>;

export const ModelTier = z.enum(['premium', 'standard', 'economy', 'local']);
export type ModelTier = z.infer<typeof ModelTier>;

export const TaskType = z.enum([
  'resume_tailor',
  'cover_letter',
  'form_fill',
  'dom_analysis',
  'email_classify',
  'scam_detect',
  'company_research',
  'interview_prep',
]);
export type TaskType = z.infer<typeof TaskType>;

export const NotificationPriority = z.enum(['low', 'normal', 'high', 'urgent']);
export type NotificationPriority = z.infer<typeof NotificationPriority>;

export const AlertConditionType = z.enum([
  'failure_rate',
  'portal_down',
  'budget_threshold',
  'ban_detected',
]);
export type AlertConditionType = z.infer<typeof AlertConditionType>;

export const TemplateRegion = z.enum([
  'us_standard',
  'uk_standard',
  'eu_europass',
  'de_lebenslauf',
  'fr_cv',
  'au_standard',
  'ca_standard',
  'in_biodata',
  'pk_cv',
  'ae_cv',
  'general',
]);
export type TemplateRegion = z.infer<typeof TemplateRegion>;

export const CredentialMethod = z.enum(['extension', 'oauth', 'stored']);
export type CredentialMethod = z.infer<typeof CredentialMethod>;

export const FineTuningStatus = z.enum([
  'pending',
  'training',
  'validating',
  'complete',
  'failed',
]);
export type FineTuningStatus = z.infer<typeof FineTuningStatus>;
