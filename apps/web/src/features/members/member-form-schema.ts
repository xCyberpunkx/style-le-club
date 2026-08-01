import { z } from 'zod'

// HTML inputs only ever produce strings (or an empty string when left
// blank). Rather than lean on createMemberSchema's z.coerce.date() /
// z.coerce.number() directly — which turns an empty string into an
// "Invalid Date" validation error even though the field is meant to be
// optional — this schema validates the raw string shape the form
// actually produces, with blank strings explicitly treated as "not
// provided." The page components turn the validated result into a
// properly-typed CreateMemberInput/UpdateMemberInput before calling the
// API, where the shared schema does the real, authoritative validation.
const blankToUndefined = (value: unknown) => (value === '' ? undefined : value)

export const memberFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Le nom complet est requis').max(120),
  phone: z.string().trim().min(6, 'Le numéro de téléphone est requis').max(30),
  email: z.preprocess(blankToUndefined, z.string().trim().email('Adresse e-mail invalide').optional()),
  dateOfBirth: z.preprocess(blankToUndefined, z.string().optional()),
  joinDate: z.preprocess(blankToUndefined, z.string().optional()),
  weightKg: z.preprocess(
    blankToUndefined,
    z.coerce.number().positive('Doit être positif').max(500).optional(),
  ),
  heightCm: z.preprocess(
    blankToUndefined,
    z.coerce.number().positive('Doit être positif').max(300).optional(),
  ),
  goal: z.preprocess(blankToUndefined, z.string().trim().max(500).optional()),
})
export type MemberFormValues = z.infer<typeof memberFormSchema>
