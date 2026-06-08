import { z } from 'zod';

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  domain: z.string().optional(),
  careersUrl: z.string().url().optional(),
  logoUrl: z.string().optional(),
  industry: z.string().optional(),
  sizeRange: z.string().optional(),
  stabilityScore: z.number().min(0).max(1).optional(),
  culturalFitScore: z.number().min(0).max(1).optional(),
  glassdoorRating: z.number().min(0).max(5).optional(),
  techStack: z.array(z.string()).default([]),
  rtoPolicy: z.string().optional(),
  isScam: z.boolean().default(false),
  researchData: z.record(z.unknown()).optional(),
  lastResearchedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Company = z.infer<typeof CompanySchema>;

export const ContactSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  relationshipType: z.string().optional(),
  lastContactAt: z.date().optional(),
  nextFollowUpAt: z.date().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.date(),
});
export type Contact = z.infer<typeof ContactSchema>;
