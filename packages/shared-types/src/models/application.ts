import { z } from 'zod';

import { ApplicationStatus, AutonomyMode, FailureType } from '../enums/index.js';

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  jobId: z.string().uuid(),
  resumeVersionId: z.string().uuid().optional(),
  status: ApplicationStatus.default('queued'),
  idempotencyKey: z.string().optional(),
  autonomyMode: AutonomyMode.optional(),
  portalName: z.string().optional(),
  submittedAt: z.date().optional(),
  confirmedAt: z.date().optional(),
  responseAt: z.date().optional(),
  responseType: z.string().optional(),
  daysToResponse: z.number().int().optional(),
  coverLetter: z.string().optional(),
  formAnswers: z.record(z.string()).optional(),
  llmCostCents: z.number().int().default(0),
  failureReason: z.string().optional(),
  failureType: FailureType.optional(),
  failureScreenshotUrl: z.string().optional(),
  retryCount: z.number().int().default(0),
  templateRegion: z.string().optional(),
  templateLayout: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Application = z.infer<typeof ApplicationSchema>;

export const ApplicationEventSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  eventType: z.string(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});
export type ApplicationEvent = z.infer<typeof ApplicationEventSchema>;

export const FormFieldSchema = z.object({
  label: z.string(),
  selector: z.string(),
  type: z.enum(['text', 'email', 'tel', 'number', 'textarea', 'select', 'radio', 'checkbox', 'file', 'date', 'url']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FormResultSchema = z.object({
  success: z.boolean(),
  fieldsCompleted: z.number().int(),
  fieldsFailed: z.number().int(),
  errors: z.array(z.object({
    field: z.string(),
    error: z.string(),
  })).default([]),
});
export type FormResult = z.infer<typeof FormResultSchema>;

export const PortalMappingSchema = z.object({
  id: z.string().uuid(),
  domain: z.string(),
  pagePath: z.string(),
  formStructure: z.object({
    fields: z.array(FormFieldSchema),
    pages: z.array(z.object({
      url: z.string(),
      fields: z.array(FormFieldSchema),
    })).optional(),
    submitButton: z.string().optional(),
  }),
  selectorsVersion: z.number().int().default(1),
  successCount: z.number().int().default(0),
  failureCount: z.number().int().default(0),
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PortalMapping = z.infer<typeof PortalMappingSchema>;
