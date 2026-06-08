import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  TWOCAPTCHA_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  IMAP_HOST: z.string().optional(),
  IMAP_PORT: z.coerce.number().optional(),
  IMAP_USER: z.string().optional(),
  IMAP_PASS: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function envValidation(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(`Invalid environment variables: ${JSON.stringify(formatted)}`);
  }
  return result.data;
}
