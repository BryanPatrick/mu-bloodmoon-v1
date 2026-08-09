import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuditService } from '../audit/audit.service'
import { AUTH_ABUSE_OPTIONS, type AuthAbuseOptions } from './auth-abuse.decorator'
import { AuthRateLimitService } from './auth-rate-limit.service'
import { CaptchaService } from './captcha.service'

type AuthRequest = {
  ip?: string
  socket?: { remoteAddress?: string }
  body?: Record<string, unknown>
  res?: { setHeader(name: string, value: string): void }
}

@Injectable()
export class AuthAbuseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: AuthRateLimitService,
    private readonly captcha: CaptchaService,
    private readonly audit: AuditService
  ) {}

  async canActivate(context: ExecutionContext) {
    const options = this.reflector.getAllAndOverride<AuthAbuseOptions>(AUTH_ABUSE_OPTIONS, [
      context.getHandler(),
      context.getClass()
    ])
    if (!options) return true

    const request = context.switchToHttp().getRequest<AuthRequest>()
    const ip = request.ip || request.socket?.remoteAddress || null
    const subject = options.subjectField ? request.body?.[options.subjectField] : undefined
    const result = this.limiter.consume(options.policy, ip, subject)
    if (!result.allowed) {
      request.res?.setHeader('Retry-After', String(result.retryAfterSeconds))
      await this.audit.record({
        action: 'auth.rate_limited',
        targetType: 'Authentication',
        result: 'DENIED',
        severity: 'warning',
        ipAddress: ip,
        metadata: {
          policy: options.policy,
          tracker: result.tracker,
          retryAfterSeconds: result.retryAfterSeconds
        }
      })
      throw new HttpException('Muitas tentativas. Aguarde e tente novamente.', 429)
    }

    if (options.captchaAction) {
      await this.captcha.verify(request.body?.captchaToken, options.captchaAction, ip)
    }
    return true
  }
}
