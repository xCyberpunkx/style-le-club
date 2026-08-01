import 'dotenv/config'
import { z } from 'zod'
import { createEnv } from '@style-le-club/shared'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),

  // Phase 3 (Auth). No defaults for the secrets — a missing secret should
  // fail loudly at boot, never silently fall back to something guessable.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
})

export const env = createEnv(envSchema)
export type Env = typeof env
