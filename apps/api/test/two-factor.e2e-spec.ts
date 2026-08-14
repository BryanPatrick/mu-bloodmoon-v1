import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-two-factor'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-two-factor-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-two-factor-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-two-factor-encryption-key-32-characters'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
  process.env.AUTH_MAIL_TEST_BYPASS = '1'
  // This file makes many legitimate calls to 'sensitive'-policy endpoints
  // (setup/verify/disable/regenerate/step-up) across its scenarios, sharing
  // one process-local rate limiter. Raise the limit here so those calls
  // don't trip 429s meant to be exercised deliberately elsewhere, in the
  // isolated two-factor-rate-limit.e2e-spec.ts (own app instance, default limit).
  process.env.AUTH_RATE_SENSITIVE_IP_LIMIT = '1000'

  execSync('npx prisma migrate deploy', {
    cwd: __dirname + '/..',
    env: process.env,
    stdio: 'pipe'
  })
}, 120000)

afterAll(() => {
  delete process.env.AUTH_RATE_SENSITIVE_IP_LIMIT
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('Two-factor authentication (TOTP + recovery codes)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  const suffix = Date.now().toString(36)

  const player = {
    name: '2FA E2E Player',
    username: `tfa_p_${suffix}`,
    password: '2fa-player-password-1',
    personalId: '11122233366',
    email: `tfa-player-${suffix}@example.invalid`
  }
  const admin = {
    name: '2FA E2E Admin',
    username: `tfa_a_${suffix}`,
    password: '2fa-admin-password-1',
    personalId: '22233344477',
    email: `tfa-admin-${suffix}@example.invalid`
  }
  const bareSuperAdmin = {
    name: '2FA E2E Bare Super Admin',
    username: `tfa_bs_${suffix}`,
    password: '2fa-bare-super-password-1',
    personalId: '33344455588',
    email: `tfa-bare-super-${suffix}@example.invalid`
  }
  const superAdmin = {
    name: '2FA E2E Super Admin',
    username: `tfa_s_${suffix}`,
    password: '2fa-super-password-1',
    personalId: '44455566699',
    email: `tfa-super-${suffix}@example.invalid`
  }
  const roleTarget = {
    name: '2FA E2E Role Target',
    username: `tfa_rt_${suffix}`,
    password: '2fa-role-target-password-1',
    personalId: '55566677700',
    email: `tfa-role-target-${suffix}@example.invalid`
  }

  let playerToken = ''
  let playerSecret = ''
  let playerRecoveryCodes: string[] = []
  let adminSecret = ''
  let superAdminToken = ''
  let superAdminSecret = ''
  let roleTargetAccountId = ''

  const request = () => import('supertest').then((module) => module.default(httpServer))

  const login = async (username: string, password: string, extra: Record<string, string> = {}) => {
    const result = await (await request()).post('/api/auth/login').send({ username, password, ...extra })
    return result
  }

  const totpFor = (secret: string) => generateSync({ secret })

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
  }, 60000)

  afterAll(async () => app?.close())

  it('registers the test accounts and promotes admin/super-admin roles for setup', async () => {
    const req = await request()
    for (const account of [player, admin, bareSuperAdmin, superAdmin, roleTarget]) {
      const result = await req.post('/api/auth/register').send(account)
      expect(result.status).toBe(201)
    }
    await prisma.account.update({ where: { username: admin.username }, data: { role: 'ADMIN' } })
    await prisma.account.update({ where: { username: bareSuperAdmin.username }, data: { role: 'SUPER_ADMIN' } })
    await prisma.account.update({ where: { username: superAdmin.username }, data: { role: 'SUPER_ADMIN' } })
    const target = await prisma.account.update({ where: { username: roleTarget.username }, data: { role: 'PLAYER' } })
    roleTargetAccountId = target.id
  })

  describe('setup and activation', () => {
    it('requires the correct current password to start setup', async () => {
      playerToken = (await login(player.username, player.password)).body.accessToken
      const result = await (
        await request()
      )
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ currentPassword: 'definitely-wrong' })
      expect(result.status).toBe(401)
    })

    it('starts setup and returns a secret, otpauth URI and QR code', async () => {
      const result = await (
        await request()
      )
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ currentPassword: player.password })
      expect(result.status).toBe(201)
      expect(typeof result.body.secret).toBe('string')
      expect(result.body.uri).toMatch(/^otpauth:\/\//)
      expect(result.body.qrCode).toMatch(/^data:image\/png;base64,/)
      playerSecret = result.body.secret

      const stored = await prisma.account.findUniqueOrThrow({ where: { username: player.username } })
      expect(stored.twoFactorEnabled).toBe(false)
      expect(stored.twoFactorPending).toBeTruthy()
    })

    it('rejects an invalid code and does not activate 2FA', async () => {
      const result = await (
        await request()
      )
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ code: '000000' })
      expect(result.status).toBe(400)

      const stored = await prisma.account.findUniqueOrThrow({ where: { username: player.username } })
      expect(stored.twoFactorEnabled).toBe(false)
    })

    it('activates 2FA only after a valid first code, and returns 10 recovery codes shown once', async () => {
      const result = await (
        await request()
      )
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ code: totpFor(playerSecret) })
      expect(result.status).toBe(201)
      expect(Array.isArray(result.body.recoveryCodes)).toBe(true)
      expect(result.body.recoveryCodes).toHaveLength(10)
      playerRecoveryCodes = result.body.recoveryCodes

      const stored = await prisma.account.findUniqueOrThrow({ where: { username: player.username } })
      expect(stored.twoFactorEnabled).toBe(true)
      expect(stored.twoFactorPending).toBeNull()
      const codes = await prisma.twoFactorRecoveryCode.findMany({ where: { accountId: stored.id } })
      expect(codes).toHaveLength(10)
      expect(codes.every((code) => code.usedAt === null)).toBe(true)
    })
  })

  describe('login with 2FA', () => {
    it('requires a code once 2FA is enabled', async () => {
      const result = await login(player.username, player.password)
      expect(result.status).toBe(401)
      expect(result.body.code).toBe('TWO_FACTOR_REQUIRED')
    })

    it('rejects an invalid TOTP code at login', async () => {
      const result = await login(player.username, player.password, { totpCode: '000000' })
      expect(result.status).toBe(401)
    })

    it('logs in successfully with a valid TOTP code', async () => {
      const result = await login(player.username, player.password, { totpCode: totpFor(playerSecret) })
      expect(result.status).toBe(201)
      expect(typeof result.body.accessToken).toBe('string')
    })

    it('logs in with a recovery code instead of TOTP, consuming it as single-use', async () => {
      const code = playerRecoveryCodes[0]
      const first = await login(player.username, player.password, { recoveryCode: code })
      expect(first.status).toBe(201)

      const second = await login(player.username, player.password, { recoveryCode: code })
      expect(second.status).toBe(401)
      expect(second.body.code).toBe('TWO_FACTOR_REQUIRED')
    })
  })

  describe('recovery codes', () => {
    it('regenerates recovery codes and invalidates the previous set', async () => {
      playerToken = (await login(player.username, player.password, { totpCode: totpFor(playerSecret) })).body.accessToken
      const staleCode = playerRecoveryCodes[1]

      const result = await (
        await request()
      )
        .post('/api/auth/2fa/recovery-codes/regenerate')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ currentPassword: player.password, code: totpFor(playerSecret) })
      expect(result.status).toBe(201)
      expect(result.body.recoveryCodes).toHaveLength(10)
      expect(result.body.recoveryCodes).not.toContain(staleCode)

      const staleAttempt = await login(player.username, player.password, { recoveryCode: staleCode })
      expect(staleAttempt.status).toBe(401)

      const freshAttempt = await login(player.username, player.password, { recoveryCode: result.body.recoveryCodes[0] })
      expect(freshAttempt.status).toBe(201)
    })
  })

  describe('PLAYER can self-disable, GM/ADMIN/SUPER_ADMIN cannot', () => {
    it('lets a PLAYER disable their own 2FA with password + TOTP', async () => {
      playerToken = (await login(player.username, player.password, { totpCode: totpFor(playerSecret) })).body.accessToken
      const result = await (
        await request()
      )
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ currentPassword: player.password, code: totpFor(playerSecret) })
      expect(result.status).toBe(201)

      const stored = await prisma.account.findUniqueOrThrow({ where: { username: player.username } })
      expect(stored.twoFactorEnabled).toBe(false)

      // Disabling revokes sessions -- the token used to disable is now stale.
      const afterDisable = await (
        await request()
      )
        .get('/api/account/profile')
        .set('Authorization', `Bearer ${playerToken}`)
      expect(afterDisable.status).toBe(401)
    })

    it('blocks an ADMIN from disabling their own 2FA once active', async () => {
      const adminLogin = await login(admin.username, admin.password)
      const adminToken = adminLogin.body.accessToken
      const setup = await (
        await request()
      )
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ currentPassword: admin.password })
      adminSecret = setup.body.secret
      const verify = await (
        await request()
      )
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: totpFor(adminSecret) })
      expect(verify.status).toBe(201)

      const freshAdminToken = (await login(admin.username, admin.password, { totpCode: totpFor(adminSecret) })).body.accessToken
      const disable = await (
        await request()
      )
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${freshAdminToken}`)
        .send({ currentPassword: admin.password, code: totpFor(adminSecret) })
      expect(disable.status).toBe(403)

      const stored = await prisma.account.findUniqueOrThrow({ where: { username: admin.username } })
      expect(stored.twoFactorEnabled).toBe(true)
    })
  })

  describe('mandatory 2FA for role-gated (non-PLAYER) endpoints', () => {
    it('blocks a bare SUPER_ADMIN without 2FA from a role-gated admin endpoint', async () => {
      const bareToken = (await login(bareSuperAdmin.username, bareSuperAdmin.password)).body.accessToken
      const result = await (
        await request()
      )
        .get('/api/admin/accounts')
        .set('Authorization', `Bearer ${bareToken}`)
      expect(result.status).toBe(403)
      expect(result.body.code).toBe('TWO_FACTOR_SETUP_REQUIRED')
    })

    // The same role-agnostic check in roles.guard.ts (role !== 'PLAYER' &&
    // !twoFactorEnabled) will cover GM automatically once GM gets its own
    // @Roles('GM', ...) endpoints (planned for the GM panel work) -- there is
    // no existing GM-gated endpoint to exercise this against yet.
    it('lets a SUPER_ADMIN with active 2FA reach a role-gated admin endpoint', async () => {
      const setupToken = (await login(superAdmin.username, superAdmin.password)).body.accessToken
      const setup = await (
        await request()
      )
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${setupToken}`)
        .send({ currentPassword: superAdmin.password })
      superAdminSecret = setup.body.secret
      const verify = await (
        await request()
      )
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${setupToken}`)
        .send({ code: totpFor(superAdminSecret) })
      expect(verify.status).toBe(201)

      superAdminToken = (await login(superAdmin.username, superAdmin.password, { totpCode: totpFor(superAdminSecret) })).body.accessToken
      const result = await (
        await request()
      )
        .get('/api/admin/accounts')
        .set('Authorization', `Bearer ${superAdminToken}`)
      expect(result.status).toBe(200)
    })
  })

  describe('step-up authentication for role changes and admin 2FA reset', () => {
    it('blocks a role change without a step-up token', async () => {
      const result = await (
        await request()
      )
        .patch(`/api/admin/accounts/${roleTargetAccountId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'GM', reason: 'Tentando promover sem step-up' })
      expect(result.status).toBe(403)
      expect(result.body.code).toBe('STEP_UP_REQUIRED')
    })

    it('allows a role change once a valid step-up token is presented', async () => {
      const stepUp = await (
        await request()
      )
        .post('/api/auth/step-up')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ currentPassword: superAdmin.password, code: totpFor(superAdminSecret) })
      expect(stepUp.status).toBe(201)
      expect(typeof stepUp.body.stepUpToken).toBe('string')

      const result = await (
        await request()
      )
        .patch(`/api/admin/accounts/${roleTargetAccountId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Step-Up-Token', stepUp.body.stepUpToken)
        .send({ role: 'GM', reason: 'Promovendo com step-up valido' })
      expect(result.status).toBe(200)
      expect(result.body.role).toBe('GM')
    })

    it('requires SUPER_ADMIN plus step-up to reset another account 2FA, and revokes its sessions', async () => {
      const targetToken = (await login(admin.username, admin.password, { totpCode: totpFor(adminSecret) })).body.accessToken
      const targetAccount = await prisma.account.findUniqueOrThrow({ where: { username: admin.username } })

      const withoutStepUp = await (
        await request()
      )
        .patch(`/api/admin/accounts/${targetAccount.id}/2fa/reset`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Tentando resetar sem step-up' })
      expect(withoutStepUp.status).toBe(403)

      const stepUp = await (
        await request()
      )
        .post('/api/auth/step-up')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ currentPassword: superAdmin.password, code: totpFor(superAdminSecret) })

      const result = await (
        await request()
      )
        .patch(`/api/admin/accounts/${targetAccount.id}/2fa/reset`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Step-Up-Token', stepUp.body.stepUpToken)
        .send({ reason: 'Conta perdeu acesso ao autenticador, reset administrativo' })
      expect(result.status).toBe(200)

      const stored = await prisma.account.findUniqueOrThrow({ where: { username: admin.username } })
      expect(stored.twoFactorEnabled).toBe(false)

      const staleTarget = await (
        await request()
      )
        .get('/api/account/profile')
        .set('Authorization', `Bearer ${targetToken}`)
      expect(staleTarget.status).toBe(401)
    })
  })
})
