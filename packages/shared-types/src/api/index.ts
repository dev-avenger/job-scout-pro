import { z } from 'zod';

// Auth
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    autonomyMode: z.string(),
    onboardingCompleted: z.boolean(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// Pagination
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  });

// Jobs
export const CreateJobFromUrlSchema = z.object({
  url: z.string().url(),
});
export type CreateJobFromUrl = z.infer<typeof CreateJobFromUrlSchema>;

export const JobFilterSchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  location: z.string().optional(),
  locationType: z.string().optional(),
  minSalary: z.coerce.number().optional(),
  maxSalary: z.coerce.number().optional(),
  search: z.string().optional(),
  postedAfter: z.string().optional(),
}).merge(PaginationParamsSchema);
export type JobFilter = z.infer<typeof JobFilterSchema>;

// Applications
export const ApplicationFilterSchema = z.object({
  status: z.string().optional(),
  portal: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
}).merge(PaginationParamsSchema);
export type ApplicationFilter = z.infer<typeof ApplicationFilterSchema>;

// Settings
export const UpdateAutonomySchema = z.object({
  mode: z.enum(['guided', 'supervised', 'autonomous']),
});
export type UpdateAutonomy = z.infer<typeof UpdateAutonomySchema>;

export const UpdateLLMSettingsSchema = z.object({
  dailyCapCents: z.number().int().min(0).optional(),
  monthlyCapCents: z.number().int().min(0).optional(),
  preferredProvider: z.string().optional(),
  ollamaFallbackEnabled: z.boolean().optional(),
  ollamaBaseUrl: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  ollamaUrl: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});
export type UpdateLLMSettings = z.infer<typeof UpdateLLMSettingsSchema>;

// WebSocket
export const WSMessageSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
});
export type WSMessage = z.infer<typeof WSMessageSchema>;

export const WSSubscribeSchema = z.object({
  type: z.literal('subscribe'),
  channels: z.array(z.string()),
});
export type WSSubscribe = z.infer<typeof WSSubscribeSchema>;

// Health
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  postgres: z.enum(['connected', 'disconnected']),
  redis: z.enum(['connected', 'disconnected']),
  worker: z.enum(['running', 'stopped']),
  uptime: z.number(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Error
export const ApiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
