import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Prisma } from '@prisma/client'
import type { Account, AccountCurrency, AccountPermission, GameAccountIdentity } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import { GameAccountIdentityService } from '../game-account-identity/game-account-identity.service'
import { GameAccountProvisioningService } from '../game-account-identity/game-account-provisioning.service'
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
  PasswordRecoveryRequestRequest,
  PasswordRecoveryRequestResponse,
  PasswordRecoveryResetRequest,
  PasswordRecoveryResetResponse,
  RefreshRequest,
  RegisterRequest,
  RegisterResponse,
  SessionUser,
  StepUpRequest,
  StepUpResponse,
  TwoFactorDisableRequest,
  TwoFactorRecoveryCodesRegenerateRequest,
  TwoFactorRecoveryCodesRegenerateResponse,
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponse
} from './auth.contract'
import type { AccessTokenPayload, AuthenticatedUser } from './auth.types'
import { MailTransportService } from './mail-transport.service'
import { permissionsForAccount } from './permissions'
import { stepUpSecret, stepUpTokenTtlSeconds } from './step-up.util'
import { TwoFactorAttemptLimitService } from './two-factor-attempt-limit.service'
import { TwoFactorService } from './two-factor.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly twoFactor: TwoFactorService,
    private readonly mailTransport: MailTransportService,
    private readonly twoFactorAttempts: TwoFactorAttemptLimitService,
    private readonly gameAccountIdentity: GameAccountIdentityService,
    private readonly gameAccountProvisioning: GameAccountProvisioningService
  ) {}

  // Checks the per-account TOTP/recovery-code cooldown before a code is
  // verified, and records the outcome afterwards. Never reveals whether the
  // limiter or the code itself was the reason for failure -- both surface as
  // the same "invalid code" shape to the caller, except once actually
  // rate-limited, which is its own distinct (but still generic) error.
  private async guardTwoFactorAttempt<T>(accountId: string, actorUsername: string, verify: () => Promise<T> | T): Promise<T> {
    const gate = this.twoFactorAttempts.checkAllowed(accountId)
    if (!gate.allowed) {
      await this.audit.record({
        actorId: accountId,
        actorUsername,
        action: 'auth.2fa.rate_limited',
        targetType: 'Account',
        targetId: accountId,
        result: 'DENIED',
        severity: 'warning',
        metadata: { retryAfterSeconds: gate.retryAfterSeconds }
      })
      throw new HttpException(
        { code: 'TWO_FACTOR_RATE_LIMITED', message: 'Muitas tentativas invalidas. Aguarde antes de tentar novamente.' },
        429
      )
    }
    const ok = await verify()
    if (ok) this.twoFactorAttempts.recordSuccess(accountId)
    else this.twoFactorAttempts.recordFailure(accountId)
    return ok
  }

  async login(
    payload: LoginRequest,
    context: { ip: string | null; device: string | null }
  ): Promise<LoginResponse> {
    const login = payload.username?.trim().toLowerCase()
    if (!login || !payload.password) {
      throw new BadRequestException('Informe usuario ou e-mail e senha')
    }

    const account = await this.prisma.account.findFirst({
      where: {
        OR: [{ username: login }, { email: login }]
      },
      include: { currencies: true, permissions: true }
    })

    if (!account || account.status !== 'ACTIVE') {
      await this.recordFailedLogin(
        login,
        account?.id,
        account?.username,
        account ? 'inactive-account' : 'unknown-account',
        context
      )
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordMatches = await bcrypt.compare(payload.password, account.passwordHash)
    if (!passwordMatches) {
      await this.recordFailedLogin(login, account.id, account.username, 'invalid-password', context)
      throw new UnauthorizedException('Invalid credentials')
    }

    if (account.twoFactorEnabled) {
      const secret = account.twoFactorSecret ? this.twoFactor.decrypt(account.twoFactorSecret) : ''
      // The client's very first login call intentionally omits the code (it
      // does not yet know 2FA is required) -- that round-trip is not a
      // guessing attempt and must not consume the per-account attempt
      // budget. Only a call that actually submitted a code counts.
      const codeProvided = Boolean(payload.totpCode || payload.recoveryCode)
      const verified = codeProvided
        ? await this.guardTwoFactorAttempt(account.id, account.username, async () => {
            const totpOk = Boolean(secret) && (await this.twoFactor.isValid(secret, payload.totpCode))
            const recoveryOk = !totpOk && payload.recoveryCode
              ? await this.consumeRecoveryCode(account.id, payload.recoveryCode)
              : false
            return totpOk || recoveryOk
          })
        : false
      if (!verified) {
        await this.recordFailedLogin(
          login,
          account.id,
          account.username,
          'two-factor-required-or-invalid',
          context
        )
        throw new UnauthorizedException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Informe o codigo de autenticacao'
        })
      }
    }

    const sessionId = randomUUID()
    const expiresAt = new Date(Date.now() + this.sessionTtlMs(account.role))
    const sessionAccount = await this.prisma.$transaction(async (tx) => {
      await tx.accountSession.updateMany({
        where: { accountId: account.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'Substituida por um novo login' }
      })
      const updated = await tx.account.update({
        where: { id: account.id },
        data: { sessionVersion: { increment: 1 } },
        include: { currencies: true, permissions: true }
      })
      await tx.accountSession.create({
        data: {
          id: sessionId,
          accountId: account.id,
          ipAddress: context.ip,
          userAgent: context.device,
          expiresAt
        }
      })
      return updated
    })

    await this.audit.record({
      actorId: sessionAccount.id,
      actorUsername: sessionAccount.username,
      action: account.sessionVersion > 0 ? 'auth.session.replaced' : 'auth.session.started',
      targetType: 'Account',
      targetId: sessionAccount.id,
      severity: account.sessionVersion > 0 ? 'warning' : 'info',
      metadata: {
        previousSessionVersion: account.sessionVersion,
        sessionVersion: sessionAccount.sessionVersion,
        ip: context.ip,
        device: context.device
      }
    })

    return {
      accessToken: await this.signAccessToken(sessionAccount, sessionId),
      refreshToken: await this.signRefreshToken(sessionAccount, sessionId),
      user: this.toSessionUser(sessionAccount)
    }
  }

  async refresh(payload: RefreshRequest): Promise<LoginResponse> {
    const refreshToken = payload.refreshToken?.trim()
    if (!refreshToken) throw new UnauthorizedException('Invalid refresh token')

    try {
      const token = await this.jwt.verifyAsync<AccessTokenPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me'
      })
      if (token.type !== 'refresh') throw new UnauthorizedException('Invalid refresh token')

      const account = await this.prisma.account.findUnique({
        where: { id: token.sub },
        include: { currencies: true, permissions: true }
      })
      const session = token.sid
        ? await this.prisma.accountSession.findUnique({ where: { id: token.sid } })
        : null
      if (
        !account ||
        account.status !== 'ACTIVE' ||
        account.sessionVersion !== token.sessionVersion ||
        !session ||
        session.accountId !== account.id ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException('Session is no longer active')
      }

      await this.prisma.accountSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() }
      })

      return {
        accessToken: await this.signAccessToken(account, session.id),
        refreshToken: await this.signRefreshToken(account, session.id),
        user: this.toSessionUser(account)
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const name = payload.name?.trim()
    const username = payload.username?.trim().toLowerCase()
    const email = payload.email?.trim().toLowerCase()
    const password = payload.password || ''
    const personalId = payload.personalId?.trim()

    if (!name || !username || !email || !password || !personalId) {
      throw new BadRequestException('Required fields are missing')
    }

    if (username.length < 3 || username.length > 20 || !/^[a-z0-9_-]+$/.test(username)) {
      throw new BadRequestException('Invalid username')
    }

    if (password.length < 8 || password.length > 72) {
      throw new BadRequestException('Invalid password')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email')
    }

    const existing = await this.prisma.account.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    })

    if (existing) throw new ConflictException('Account cannot be created with these details')

    let account: Account & { gameIdentity: GameAccountIdentity | null }
    try {
      account = await this.prisma.account.create({
        data: {
          username,
          name,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          personalIdHash: await bcrypt.hash(personalId, 12),
          role: 'PLAYER',
          status: 'ACTIVE',
          currencies: {
            create: [
              { currency: 'WCOIN', balance: 0 },
              { currency: 'GOBLIN_POINT', balance: 0 },
              { currency: 'HUNT_POINT', balance: 0 }
            ]
          },
          // Phase 3B, feature-flagged, OFF by default. See
          // docs/game-data/game-account-provisioning-contract.md Part I and
          // docs/accounts/unified-account-implementation.md's activation
          // plan -- CREATE_GAME_ACCOUNT itself does not exist yet (Phase 3C),
          // so this only ever reaches PENDING, atomically with Account
          // creation via Prisma's nested-write (no separate transaction
          // needed). Never activated in production until Phase 3C ships.
          ...(process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER === 'true'
            ? { gameIdentity: { create: this.gameAccountIdentity.buildPendingCreateInput() } }
            : {})
        },
        // Part C -- Account + GameAccountIdentity(PENDING) are created by ONE
        // Prisma `create` call with a nested write; Prisma wraps a single
        // create's nested writes in one implicit transaction, so if the
        // identity row fails to insert, the Account insert rolls back too --
        // no separate $transaction wrapper needed for atomicity here.
        include: { gameIdentity: true }
      })
    } catch (error) {
      // Part Q/AM -- the findFirst check above is a plain read, not a lock:
      // two truly concurrent registrations for the same username/email can
      // both pass it before either commits, then race on the real DB unique
      // constraint here. Same P2002-to-409 pattern already used in
      // guilds.service.ts -- surfaced as the same clean Conflict the
      // pre-check already returns, never an unhandled 500 leaking a raw
      // Prisma error. Only one of the two ever reaches account.create's
      // nested GameAccountIdentity write, so no duplicate identity either.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Account cannot be created with these details')
      }
      throw error
    }

    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.account.registered',
      targetType: 'Account',
      targetId: account.id,
      metadata: {
        reference: payload.reference?.trim() || null
      }
    })

    // Part E/H -- dispatched AFTER commit (the create() above already
    // resolved), never awaited by the HTTP response. Errors are caught and
    // logged here, never thrown -- a Cloudflare/Agent/SQL outage must not
    // make registration fail, and a crash right here is exactly what the
    // reconciliation worker's PENDING scan (Part I/AK) exists to recover
    // from on its own next tick. Skipped entirely (not attempted) when the
    // command transport isn't configured -- dispatch() would otherwise
    // still generate a real credential and transition PENDING ->
    // PROVISIONING before failing at the network step, a premature side
    // effect this best-effort kick has no business causing when success is
    // already known to be impossible; the reconciliation worker (which only
    // ever runs where the transport IS expected to be configured) remains
    // the authoritative path either way.
    if (account.gameIdentity) {
      if (isProvisioningDispatchPossible()) {
        void this.gameAccountProvisioning.dispatch(account.id).catch((error) => {
          this.logger.warn(`Post-registration provisioning dispatch failed for ${account.id}: ${errorMessage(error)}`)
        })
      } else {
        // Not a silent success: the identity stays honestly PENDING (never
        // ACTIVE without a real transport-confirmed write -- that
        // invariant is enforced structurally by reconcile(), not by
        // anything here), and this WARN is the operational signal that a
        // registration happened with provisioning enabled but no attempt
        // was even possible. The reconciliation worker's PENDING scan
        // (docs/operations/provisioning-reconciliation.md) is what
        // actually recovers this account once the transport is configured
        // -- it re-checks every PENDING row unconditionally, so this
        // account is never permanently stuck as long as that worker runs.
        this.logger.warn(
          `Registered ${account.id} with provisioning enabled but the command transport is not configured -- ` +
            'no dispatch attempted; relying on the reconciliation worker.'
        )
      }
    }

    return {
      id: account.id,
      username: account.username,
      email: account.email,
      status: account.status,
      gameReady: GameAccountIdentityService.isGameReady(account.gameIdentity ?? null),
      provisioningStatus: account.gameIdentity?.provisioningStatus ?? 'NONE'
    }
  }

  async changePassword(
    payload: ChangePasswordRequest,
    user: AuthenticatedUser
  ): Promise<ChangePasswordResponse> {
    const currentPassword = payload.currentPassword || ''
    const personalId = payload.personalId?.trim()
    const newPassword = payload.newPassword || ''

    if (!currentPassword || !personalId || !newPassword) {
      throw new BadRequestException('Required fields are missing')
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      throw new BadRequestException('Invalid password')
    }

    const account = await this.prisma.account.findUnique({
      where: { id: user.id }
    })

    if (!account || account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordMatches = await bcrypt.compare(currentPassword, account.passwordHash)
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!account.personalIdHash) {
      throw new BadRequestException('Personal ID is not configured for this account')
    }

    const personalIdMatches = await bcrypt.compare(personalId, account.personalIdHash)
    if (!personalIdMatches) {
      throw new UnauthorizedException('Invalid personal ID')
    }

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: account.id },
        data: {
          passwordHash: await bcrypt.hash(newPassword, 12),
          sessionVersion: { increment: 1 }
        }
      }),
      this.prisma.accountSession.updateMany({
        where: { accountId: account.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'Senha alterada' }
      })
    ])

    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.password.changed',
      targetType: 'Account',
      targetId: account.id,
      metadata: {
        username: account.username
      }
    })

    return { ok: true }
  }

  async requestPasswordRecovery(
    payload: PasswordRecoveryRequestRequest,
    context: { ip: string | null; device: string | null }
  ): Promise<PasswordRecoveryRequestResponse> {
    const email = payload.email?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email')
    }

    const account = await this.prisma.account.findFirst({ where: { email } })

    if (account && account.status === 'ACTIVE') {
      const plainToken = randomBytes(32).toString('hex')
      const tokenHash = createHash('sha256').update(plainToken).digest('hex')
      const expiresAt = new Date(Date.now() + this.passwordResetTtlMs())

      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: { accountId: account.id, consumedAt: null },
          data: { consumedAt: new Date() }
        }),
        this.prisma.passwordResetToken.create({
          data: {
            accountId: account.id,
            tokenHash,
            expiresAt,
            requestIp: context.ip,
            requestAgent: context.device
          }
        })
      ])

      const resetUrl = `${this.webPublicUrl()}/redefinir-senha?token=${plainToken}`

      try {
        await this.mailTransport.send({
          to: account.email,
          subject: 'Redefinicao de senha - BloodMoon',
          text: `Recebemos uma solicitacao para redefinir a senha da sua conta. Se foi voce, use o link abaixo em ate ${this.passwordResetTtlMinutes()} minutos:\n\n${resetUrl}\n\nSe nao foi voce, ignore este e-mail.`
        })
        await this.audit.record({
          actorId: account.id,
          actorUsername: account.username,
          action: 'auth.password_recovery.requested',
          targetType: 'Account',
          targetId: account.id,
          ipAddress: context.ip,
          userAgent: context.device
        })
      } catch {
        await this.audit.record({
          actorId: account.id,
          actorUsername: account.username,
          action: 'auth.password_recovery.email_failed',
          targetType: 'Account',
          targetId: account.id,
          result: 'FAILURE',
          severity: 'error',
          ipAddress: context.ip,
          userAgent: context.device
        })
      }
    }

    return { ok: true }
  }

  async resetPassword(
    payload: PasswordRecoveryResetRequest,
    context: { ip: string | null; device: string | null }
  ): Promise<PasswordRecoveryResetResponse> {
    const token = payload.token?.trim()
    const newPassword = payload.newPassword || ''

    if (!token) throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Link invalido' })
    if (newPassword.length < 8 || newPassword.length > 72) {
      throw new BadRequestException({ code: 'PASSWORD_INVALID', message: 'Invalid password' })
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } })

    if (!record) {
      throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Link invalido' })
    }
    if (record.consumedAt) {
      throw new BadRequestException({ code: 'TOKEN_USED', message: 'Link ja utilizado' })
    }
    if (record.expiresAt <= new Date()) {
      throw new BadRequestException({ code: 'TOKEN_EXPIRED', message: 'Link expirado' })
    }

    const account = await this.prisma.account.findUnique({ where: { id: record.accountId } })
    if (!account || account.status !== 'ACTIVE') {
      throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Link invalido' })
    }

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: account.id },
        data: {
          passwordHash: await bcrypt.hash(newPassword, 12),
          sessionVersion: { increment: 1 }
        }
      }),
      this.prisma.accountSession.updateMany({
        where: { accountId: account.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'Senha redefinida via recuperacao de conta' }
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { accountId: account.id, consumedAt: null },
        data: { consumedAt: new Date() }
      })
    ])

    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.password_recovery.reset',
      targetType: 'Account',
      targetId: account.id,
      severity: 'warning',
      ipAddress: context.ip,
      userAgent: context.device
    })

    return { ok: true }
  }

  async logout(user: AuthenticatedUser) {
    const account = await this.prisma.$transaction(async (tx) => {
      if (user.sessionId) {
        await tx.accountSession.updateMany({
          where: { id: user.sessionId, accountId: user.id, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: 'Logout solicitado pelo usuario' }
        })
      }
      return tx.account.update({
        where: { id: user.id },
        data: { sessionVersion: { increment: 1 } }
      })
    })

    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.session.ended',
      targetType: 'Account',
      targetId: account.id,
      metadata: { sessionVersion: account.sessionVersion }
    })

    return { ok: true }
  }

  async setupTwoFactor(payload: TwoFactorSetupRequest, user: AuthenticatedUser): Promise<TwoFactorSetupResponse> {
    const account = await this.prisma.account.findUnique({ where: { id: user.id } })
    if (!account || !(await bcrypt.compare(payload.currentPassword || '', account.passwordHash))) {
      throw new UnauthorizedException('Senha atual invalida')
    }
    if (account.twoFactorEnabled)
      throw new BadRequestException('A autenticacao em duas etapas ja esta ativa')
    const secret = this.twoFactor.generateSecret()
    const uri = this.twoFactor.uri(account.username, secret)
    await this.prisma.account.update({
      where: { id: account.id },
      data: { twoFactorPending: this.twoFactor.encrypt(secret) }
    })
    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.2fa.setup.started',
      targetType: 'Account',
      targetId: account.id
    })
    return { secret, uri, qrCode: await this.twoFactor.qrCode(uri) }
  }

  async verifyTwoFactor(payload: TwoFactorVerifyRequest, user: AuthenticatedUser): Promise<TwoFactorVerifyResponse> {
    const account = await this.prisma.account.findUnique({ where: { id: user.id } })
    if (!account?.twoFactorPending)
      throw new BadRequestException('Inicie a configuracao do 2FA primeiro')
    const secret = this.twoFactor.decrypt(account.twoFactorPending)
    const verified = await this.guardTwoFactorAttempt(account.id, account.username, () =>
      this.twoFactor.isValid(secret, payload.code)
    )
    if (!verified) throw new BadRequestException('Codigo de autenticacao invalido')
    const recoveryCodes = this.twoFactor.generateRecoveryCodes()
    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: account.id },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: account.twoFactorPending,
          twoFactorPending: null
        }
      }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { accountId: account.id } }),
      ...(await this.recoveryCodeCreateArgs(account.id, recoveryCodes))
    ])
    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.2fa.enabled',
      targetType: 'Account',
      targetId: account.id,
      severity: 'warning'
    })
    return { ok: true, recoveryCodes }
  }

  async disableTwoFactor(payload: TwoFactorDisableRequest, user: AuthenticatedUser) {
    const account = await this.prisma.account.findUnique({ where: { id: user.id } })
    if (!account?.twoFactorEnabled || !account.twoFactorSecret)
      throw new BadRequestException('A autenticacao em duas etapas nao esta ativa')
    if (account.role !== 'PLAYER') {
      throw new ForbiddenException(
        '2FA obrigatorio para contas GM, ADM e Super ADM. Peca a um Super ADM o reset administrativo se perdeu o acesso.'
      )
    }
    if (!(await bcrypt.compare(payload.currentPassword || '', account.passwordHash))) {
      throw new UnauthorizedException('Senha atual invalida')
    }
    const secret = this.twoFactor.decrypt(account.twoFactorSecret)
    const verified = await this.guardTwoFactorAttempt(account.id, account.username, async () => {
      const totpOk = Boolean(payload.code) && (await this.twoFactor.isValid(secret, payload.code))
      const recoveryOk = !totpOk && payload.recoveryCode
        ? await this.consumeRecoveryCode(account.id, payload.recoveryCode)
        : false
      return totpOk || recoveryOk
    })
    if (!verified) {
      throw new BadRequestException('Codigo de autenticacao invalido')
    }
    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: account.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorPending: null,
          sessionVersion: { increment: 1 }
        }
      }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { accountId: account.id } }),
      this.prisma.accountSession.updateMany({
        where: { accountId: account.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: '2FA desativado' }
      })
    ])
    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.2fa.disabled',
      targetType: 'Account',
      targetId: account.id,
      severity: 'warning'
    })
    return { ok: true }
  }

  async regenerateRecoveryCodes(
    payload: TwoFactorRecoveryCodesRegenerateRequest,
    user: AuthenticatedUser
  ): Promise<TwoFactorRecoveryCodesRegenerateResponse> {
    const account = await this.prisma.account.findUnique({ where: { id: user.id } })
    if (!account?.twoFactorEnabled || !account.twoFactorSecret)
      throw new BadRequestException('A autenticacao em duas etapas nao esta ativa')
    if (!(await bcrypt.compare(payload.currentPassword || '', account.passwordHash))) {
      throw new UnauthorizedException('Senha atual invalida')
    }
    const secret = this.twoFactor.decrypt(account.twoFactorSecret)
    const verified = await this.guardTwoFactorAttempt(account.id, account.username, async () => {
      const totpOk = Boolean(payload.code) && (await this.twoFactor.isValid(secret, payload.code))
      const recoveryOk = !totpOk && payload.recoveryCode
        ? await this.consumeRecoveryCode(account.id, payload.recoveryCode)
        : false
      return totpOk || recoveryOk
    })
    if (!verified) {
      throw new BadRequestException('Codigo de autenticacao invalido')
    }
    const recoveryCodes = this.twoFactor.generateRecoveryCodes()
    await this.prisma.$transaction([
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { accountId: account.id } }),
      ...(await this.recoveryCodeCreateArgs(account.id, recoveryCodes))
    ])
    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.2fa.recovery_codes.regenerated',
      targetType: 'Account',
      targetId: account.id,
      severity: 'warning'
    })
    return { ok: true, recoveryCodes }
  }

  async stepUp(payload: StepUpRequest, user: AuthenticatedUser): Promise<StepUpResponse> {
    const account = await this.prisma.account.findUnique({ where: { id: user.id } })
    if (!account || !(await bcrypt.compare(payload.currentPassword || '', account.passwordHash))) {
      throw new UnauthorizedException('Senha atual invalida')
    }
    if (account.twoFactorEnabled) {
      const secret = account.twoFactorSecret ? this.twoFactor.decrypt(account.twoFactorSecret) : ''
      const verified = await this.guardTwoFactorAttempt(account.id, account.username, async () => {
        const totpOk = Boolean(secret) && Boolean(payload.code) && (await this.twoFactor.isValid(secret, payload.code))
        const recoveryOk = !totpOk && payload.recoveryCode
          ? await this.consumeRecoveryCode(account.id, payload.recoveryCode)
          : false
        return totpOk || recoveryOk
      })
      if (!verified) {
        throw new BadRequestException('Codigo de autenticacao invalido')
      }
    }
    const expiresAt = new Date(Date.now() + stepUpTokenTtlSeconds * 1000)
    const stepUpToken = await this.jwt.signAsync(
      { sub: account.id, sessionVersion: account.sessionVersion, sid: user.sessionId, type: 'step-up' },
      { secret: stepUpSecret(), expiresIn: stepUpTokenTtlSeconds }
    )
    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.step_up.issued',
      targetType: 'Account',
      targetId: account.id
    })
    return { stepUpToken, expiresAt: expiresAt.toISOString() }
  }

  private async consumeRecoveryCode(accountId: string, plainCode: string) {
    const normalized = plainCode.trim()
    if (!normalized) return false
    const candidates = await this.prisma.twoFactorRecoveryCode.findMany({
      where: { accountId, usedAt: null }
    })
    for (const candidate of candidates) {
      if (await this.twoFactor.compareRecoveryCode(normalized, candidate.codeHash)) {
        await this.prisma.twoFactorRecoveryCode.update({
          where: { id: candidate.id },
          data: { usedAt: new Date() }
        })
        return true
      }
    }
    return false
  }

  private async recoveryCodeCreateArgs(accountId: string, codes: string[]) {
    const hashed = await Promise.all(codes.map((code) => this.twoFactor.hashRecoveryCode(code)))
    return hashed.map((codeHash) =>
      this.prisma.twoFactorRecoveryCode.create({ data: { accountId, codeHash } })
    )
  }

  private recordFailedLogin(
    attemptedUsername: string,
    actorId?: string,
    actorUsername?: string,
    reason = 'invalid-credentials',
    context?: { ip: string | null; device: string | null }
  ) {
    return this.audit.record({
      actorId: actorId || null,
      actorUsername: actorUsername || 'anonymous',
      action: 'auth.login_failed',
      targetType: 'Account',
      targetId: actorId || null,
      severity: 'warning',
      metadata: {
        identifierHash: createHash('sha256').update(attemptedUsername).digest('hex').slice(0, 16),
        reason,
        result: 'denied'
      },
      ipAddress: context?.ip || null,
      userAgent: context?.device || null
    })
  }

  private async signAccessToken(account: Account, sessionId: string) {
    return this.jwt.signAsync(
      {
        sub: account.id,
        username: account.username,
        role: account.role,
        sessionVersion: account.sessionVersion,
        sid: sessionId
      },
      {
        expiresIn: process.env.JWT_ACCESS_TTL || '15m'
      }
    )
  }

  private async signRefreshToken(account: Account, sessionId: string) {
    return this.jwt.signAsync(
      {
        sub: account.id,
        username: account.username,
        role: account.role,
        sessionVersion: account.sessionVersion,
        sid: sessionId,
        type: 'refresh'
      },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
        expiresIn: process.env.JWT_REFRESH_TTL || '7d'
      }
    )
  }

  private toSessionUser(
    account: Account & { currencies?: AccountCurrency[]; permissions?: AccountPermission[] }
  ): SessionUser {
    return {
      id: account.id,
      username: account.username,
      name: account.name,
      role: account.role,
      permissions: permissionsForAccount(account.role, account.permissions),
      twoFactorEnabled: account.twoFactorEnabled,
      twoFactorRequired: account.role !== 'PLAYER',
      currencies: (account.currencies || []).map((currency) => ({
        currency: currency.currency,
        balance: currency.balance
      }))
    }
  }

  private sessionTtlMs(role: Account['role']) {
    const fallbackHours = role === 'PLAYER' ? 24 : 8
    const hours = Number(process.env.SESSION_TTL_HOURS || fallbackHours)
    return Math.max(1, Number.isFinite(hours) ? hours : fallbackHours) * 60 * 60 * 1000
  }

  private passwordResetTtlMinutes() {
    const minutes = Number(process.env.AUTH_PASSWORD_RESET_TTL_MINUTES || 30)
    return Math.max(1, Number.isFinite(minutes) ? minutes : 30)
  }

  private passwordResetTtlMs() {
    return this.passwordResetTtlMinutes() * 60 * 1000
  }

  private webPublicUrl() {
    const configured = process.env.WEB_PUBLIC_URL?.trim()
    if (configured) return configured.replace(/\/$/, '')
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WEB_PUBLIC_URL is required in production')
    }
    return 'http://localhost:3000'
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Mirrors GameCommandTransportClient's and GameCredentialEnvelopeService's
// own "not configured" guards (game-command-transport.client.ts,
// game-credential-envelope.service.ts) without importing/duplicating their
// internals -- a presence-only check on the same env vars they require,
// kept independently trivial rather than a shared abstraction across a
// module boundary this file must not modify. dispatch() checks credential
// generation before the network call, so either being unconfigured would
// otherwise still cost a wasted legacyLogin/credential-generation attempt
// for a call already known to be impossible.
function isProvisioningDispatchPossible(): boolean {
  const transportConfigured = Boolean(process.env.GAME_DATA_WORKER_URL?.trim() && process.env.GAME_COMMAND_PORTAL_SECRET?.trim())
  const keyringConfigured = Boolean(
    process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION?.trim() && process.env.GAME_CREDENTIAL_KEYS_JSON?.trim()
  )
  return transportConfigured && keyringConfigured
}
