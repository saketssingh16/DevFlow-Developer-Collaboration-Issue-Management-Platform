import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('mysql://localhost:3306/devflow'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  MAX_ATTACHMENT_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  ALLOWED_ATTACHMENT_MIME_TYPES: z.string().default('image/png,image/jpeg,image/gif,application/pdf,text/plain,text/markdown,application/zip'),
  // z.coerce.boolean() treats the non-empty string "false" as true, so parse it explicitly.
  AI_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  AI_PROVIDER: z.enum(['openai']).default('openai'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini')
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && !value.JWT_ACCESS_SECRET) context.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_ACCESS_SECRET'], message: 'JWT_ACCESS_SECRET is required in production' });
  if (value.NODE_ENV === 'production' && !value.JWT_REFRESH_SECRET) context.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_REFRESH_SECRET'], message: 'JWT_REFRESH_SECRET is required in production' });
});

const parsed = envSchema.parse(process.env);
export const env = {
  ...parsed,
  JWT_ACCESS_SECRET: parsed.JWT_ACCESS_SECRET || 'development-access-secret-not-for-production-0001',
  JWT_REFRESH_SECRET: parsed.JWT_REFRESH_SECRET || 'development-refresh-secret-not-for-production-0001'
};
