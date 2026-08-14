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

    // GM, ADMIN and SUPER_ADMIN all require 2FA to be active before they can
    // reach any role-gated (i.e. administrative) endpoint -- PLAYER's 2FA
    // stays optional. This is the backend enforcement of that policy: the
    // frontend redirect to the setup screen is UX only, not the source of
    // truth.
    if (request.user?.role !== 'PLAYER' && !request.user?.twoFactorEnabled) {
      throw new ForbiddenException({
        code: 'TWO_FACTOR_SETUP_REQUIRED',
        message: 'Ative a autenticacao em duas etapas para acessar esta area'
      })
    }

    return true
  }
}
