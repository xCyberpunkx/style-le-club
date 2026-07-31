import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator'
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    )

    // No @RequirePermission() on this route — being authenticated (checked
    // by JwtAuthGuard, which always runs first) is sufficient.
    if (!requiredPermission) return true

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>()
    const user = request.user

    if (!user || !user.permissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermission}`)
    }

    return true
  }
}
