import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from './auth.types'
import { requireStepUpMetadataKey } from './step-up.decorator'
import { verifyStepUpToken } from './step-up.util'

type RequestWithUser = {
  user?: AuthenticatedUser
  headers: { 'x-step-up-token'?: string }
}

// Runs after JwtAuthGuard: requires a short-lived step-up token (minted by
// POST /auth/step-up after re-checking password + TOTP/recovery code) that
// matches the *current* session, on top of the normal bearer session. A
// stale or missing step-up token is rejected even if the caller is
// otherwise fully authenticated and authorized by role/permission.
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<boolean>(requireStepUpMetadataKey, [
      context.getHandler(),
      context.getClass()
    ])
    if (!required) return true

    const request = context.switchToHttp().getRequest<RequestWithUser>()
    if (!request.user) {
      throw new ForbiddenException({ code: 'STEP_UP_REQUIRED', message: 'Confirme sua identidade novamente para continuar' })
    }
    const ok = await verifyStepUpToken(this.jwt, this.prisma, request.headers['x-step-up-token'], request.user)
    if (!ok) {
      throw new ForbiddenException({ code: 'STEP_UP_REQUIRED', message: 'Confirme sua identidade novamente para continuar' })
    }
    return true
  }
}
