import { z } from 'zod'

/**
 * Parses process.env against a Zod schema and throws a single, clear error
 * listing every missing/invalid variable if validation fails — instead of
 * the app failing confusingly at first use of an undefined env var, three
 * hours into a shift.
 *
 * Each app defines its OWN concrete schema (apps/api needs DATABASE_URL and
 * JWT secrets, apps/web needs the API base URL, etc.) and calls this once
 * at boot.
 */
export function createEnv<T extends z.ZodRawShape>(schema: z.ZodObject<T>): z.infer<z.ZodObject<T>> {
  const result = schema.safeParse(process.env)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n\nCheck your .env against .env.example.`,
    )
  }

  return result.data
}
