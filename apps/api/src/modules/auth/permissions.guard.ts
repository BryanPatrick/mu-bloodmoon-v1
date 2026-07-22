import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { permissionsMetadataKey } from './permissions.decorator'
import type { PermissionKey } from './permissions'
import type { AuthenticatedUser } from './auth.types'

type RequestWithUser = { user?: AuthenticatedUser }

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(permissionsMetadataKey, [
      context.getHandler(),
      context.getClass()
    ])

    if (!required?.length) {
      return true
    }

    const user = context.switchToHttp().getRequest<RequestWithUser>().user
    if (!user || (!user.permissions.includes('*') && !required.every((permission) => user.permissions.includes(permission)))) {
      throw new ForbiddenException('Access denied')
    }

    return true
  }
}
