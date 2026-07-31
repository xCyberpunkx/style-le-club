import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Marks a route as not requiring a valid access token. Used sparingly —
 * login, refresh, and health check are the only routes that should ever
 * carry this.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
