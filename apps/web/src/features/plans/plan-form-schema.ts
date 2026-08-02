import { z } from 'zod'

const blankToUndefined = (value: unknown) => (value === '' ? undefined : value)

export const planFormSchema = z.object({
  name: z.string().trim().min(2, 'Le nom est requis').max(120),
  description: z.preprocess(blankToUndefined, z.string().trim().max(1000).optional()),
  durationDays: z.coerce.number().int().positive('Doit être un nombre de jours positif'),
  price: z.coerce.number().nonnegative('Doit être positif ou nul'),
  allowsLinkedMembers: z.boolean(),
  maxLinkedMembers: z.coerce.number().int().positive(),
  isPopular: z.boolean(),
})
export type PlanFormValues = z.infer<typeof planFormSchema>
