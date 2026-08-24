import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuditModule } from '../audit/audit.module'
import { GameAccountIdentityModule } from '../game-account-identity/game-account-identity.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { RolesGuard } from './roles.guard'
import { PermissionsGuard } from './permissions.guard'
import { StepUpGuard } from './step-up.guard'
import { TwoFactorService } from './two-factor.service'
import { AuthAbuseGuard } from './auth-abuse.guard'
import { AuthRateLimitService } from './auth-rate-limit.service'
import { CaptchaService } from './captcha.service'
import { MailTransportService } from './mail-transport.service'
import { TwoFactorAttemptLimitService } from './two-factor-attempt-limit.service'

const accessSecret =
  process.env.JWT_ACCESS_SECRET ||
  (process.env.NODE_ENV === 'production' ? '' : 'dev-access-secret-change-me')
const refreshSecret =
  process.env.JWT_REFRESH_SECRET ||
  (process.env.NODE_ENV === 'production' ? '' : 'dev-refresh-secret-change-me')
if (!accessSecret || !refreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production')
}
if (process.env.NODE_ENV === 'production' && accessSecret === refreshSecret) {
  throw new Error('JWT access and refresh secrets must be different in production')
}

@Module({
  imports: [
    AuditModule,
    GameAccountIdentityModule,
    JwtModule.register({
      secret: accessSecret
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    AuthAbuseGuard,
    AuthRateLimitService,
    TwoFactorAttemptLimitService,
    CaptchaService,
    MailTransportService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    StepUpGuard
  ],
  exports: [AuthService, TwoFactorService, JwtAuthGuard, RolesGuard, PermissionsGuard, StepUpGuard, JwtModule]
})
export class AuthModule {}
