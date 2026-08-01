import { z } from 'zod'

const apiUrlSchema = z.string().url()

const result = apiUrlSchema.safeParse(process.env.NEXT_PUBLIC_API_URL)

if (!result.success) {
  throw new Error(
    'Invalid or missing NEXT_PUBLIC_API_URL — check apps/web/.env.local against .env.example.',
  )
}

export const env = {
  NEXT_PUBLIC_API_URL: result.data,
}
