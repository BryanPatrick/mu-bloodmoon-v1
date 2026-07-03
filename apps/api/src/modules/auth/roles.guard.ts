import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '@prisma/client'
import { rolesMetadataKey } from './roles.decorator'
import { roleHasAny } from './permissions'
import type { AuthenticatedUser } from './auth.types'

type RequestWithUser = {
  user?: AuthenticatedUser
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(rolesMetadataKey, [
      context.getHandler(),
      context.getClass()
    ])

    if (!requiredRoles?.length) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>()
    if (!roleHasAny(request.user?.role, requiredRoles)) {
      throw new ForbiddenException('Insufficient role')
    }

    return true
  }
}
