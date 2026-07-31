import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { ACCESS_TOKEN_COOKIE } from '../../auth/cookie.constants'
import { env } from '../../config/env'
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>()
    const token: unknown = request.cookies?.[ACCESS_TOKEN_COOKIE]

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Not authenticated.')
    }

    try {
      const payload = this.jwt.verify<AuthenticatedUser>(token, { secret: env.JWT_ACCESS_SECRET })
      request.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired session.')
    }
  }
}
