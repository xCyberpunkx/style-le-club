import { z } from 'zod'

/**
 * Standard pagination query params — one pattern, reused by every list
 * endpoint from Phase 4 onward (blueprint section 6/development rules:
 * "every list endpoint supports pagination from day one"). Entity-specific
 * list schemas extend this rather than reinventing page/pageSize.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}
