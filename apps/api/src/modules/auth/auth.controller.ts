import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import type {
  ChangePasswordRequest,
  LoginRequest,
  PasswordRecoveryRequestRequest,
  PasswordRecoveryResetRequest,
  RefreshRequest,
  RegisterRequest,
  StepUpRequest,
  TwoFactorDisableRequest,
  TwoFactorRecoveryCodesRegenerateRequest,
  TwoFactorSetupRequest,
  TwoFactorVerifyRequest
} from './auth.contract'
import type { AuthenticatedUser } from './auth.types'
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'
import { AuthAbuseProtection } from './auth-abuse.decorator'
import { AuthAbuseGuard } from './auth-abuse.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @AuthAbuseProtection({ policy: 'login', captchaAction: 'login', subjectField: 'username' })
  @UseGuards(AuthAbuseGuard)
  login(
    @Body() payload: LoginRequest,
    @Req()
    request: {
      ip?: string
      socket: { remoteAddress?: string }
      get(name: string): string | undefined
    }
  ) {
    return this.authService.login(payload, {
      ip: request.ip || request.socket.remoteAddress || null,
      device: request.get('user-agent')?.slice(0, 240) || null
    })
  }

  @Post('register')
  @AuthAbuseProtection({ policy: 'register', captchaAction: 'register', subjectField: 'email' })
  @UseGuards(AuthAbuseGuard)
  register(@Body() payload: RegisterRequest) {
    return this.authService.register(payload)
  }

  @Post('password-recovery/request')
  @AuthAbuseProtection({ policy: 'recovery', captchaAction: 'recovery', subjectField: 'email' })
  @UseGuards(AuthAbuseGuard)
  requestPasswordRecovery(
    @Body() payload: PasswordRecoveryRequestRequest,
    @Req()
    request: {
      ip?: string
      socket: { remoteAddress?: string }
      get(name: string): string | undefined
    }
  ) {
    return this.authService.requestPasswordRecovery(payload, {
      ip: request.ip || request.socket.remoteAddress || null,
      device: request.get('user-agent')?.slice(0, 240) || null
    })
  }

  @Post('password-recovery/reset')
  @AuthAbuseProtection({ policy: 'recovery' })
  @UseGuards(AuthAbuseGuard)
  resetPassword(
    @Body() payload: PasswordRecoveryResetRequest,
    @Req()
    request: {
      ip?: string
      socket: { remoteAddress?: string }
      get(name: string): string | undefined
    }
  ) {
    return this.authService.resetPassword(payload, {
      ip: request.ip || request.socket.remoteAddress || null,
      device: request.get('user-agent')?.slice(0, 240) || null
    })
  }

  @Post('refresh')
  @AuthAbuseProtection({ policy: 'refresh' })
  @UseGuards(AuthAbuseGuard)
  refresh(@Body() payload: RefreshRequest) {
    return this.authService.refresh(payload)
  }

  @Post('change-password')
  @AuthAbuseProtection({ policy: 'sensitive' })
  @UseGuards(AuthAbuseGuard, JwtAuthGuard)
  changePassword(@Body() payload: ChangePasswordRequest, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.changePassword(payload, user)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user)
  }

  @Post('2fa/setup')
  @AuthAbuseProtection({ policy: 'sensitive' })
  @UseGuards(AuthAbuseGuard, JwtAuthGuard)
  setupTwoFactor(@Body() payload: TwoFactorSetupRequest, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.setupTwoFactor(payload, user)
  }

  @Post('2fa/verify')
  @AuthAbuseProtection({ policy: 'sensitive' })
  @UseGuards(AuthAbuseGuard, JwtAuthGuard)
  verifyTwoFactor(@Body() payload: TwoFactorVerifyRequest, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.verifyTwoFactor(payload, user)
  }

  @Post('2fa/disable')
  @AuthAbuseProtection({ policy: 'sensitive' })
  @UseGuards(AuthAbuseGuard, JwtAuthGuard)
  disableTwoFactor(
    @Body() payload: TwoFactorDisableRequest,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.authService.disableTwoFactor(payload, user)
  }

  @Post('2fa/recovery-codes/regenerate')
  @AuthAbuseProtection({ policy: 'sensitive' })
  @UseGuards(AuthAbuseGuard, JwtAuthGuard)
  regenerateRecoveryCodes(
    @Body() payload: TwoFactorRecoveryCodesRegenerateRequest,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.authService.regenerateRecoveryCodes(payload, user)
  }

  @Post('step-up')
  @AuthAbuseProtection({ policy: 'sensitive' })
  @UseGuards(AuthAbuseGuard, JwtAuthGuard)
  stepUp(@Body() payload: StepUpRequest, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.stepUp(payload, user)
  }
}
