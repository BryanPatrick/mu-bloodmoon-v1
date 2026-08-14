import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-gm-role'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-gm-role-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-gm-role-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-gm-role-two-factor-key-32-characters'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
  process.env.AUTH_MAIL_TEST_BYPASS = '1'

  execSync('npx prisma migrate deploy', {
    cwd: __dirname + '/..',
    env: process.env,
    stdio: 'pipe'
  })
}, 120000)

afterAll(() => stopDisposableDatabase(CONTAINER))

jest.setTimeout(30000)

describe('GM role RBAC foundation', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  const suffix = Date.now().toString(36)

  const player = {
    name: 'GM E2E Player',
    username: `gm_p_${suffix}`,
    password: 'gm-player-password-1',
    personalId: '11122233355',
    email: `gm-player-${suffix}@example.invalid`
  }
  const gm = {
    name: 'GM E2E Game Master',
    username: `gm_g_${suffix}`,
    password: 'gm-master-password-1',
    personalId: '22233344466',
    email: `gm-master-${suffix}@example.invalid`
  }
  const administrator = {
    name: 'GM E2E Administrator',
    username: `gm_a_${suffix}`,
    password: 'gm-admin-password-1',
    personalId: '33344455577',
    email: `gm-admin-${suffix}@example.invalid`
  }
  const superAdministrator = {
    name: 'GM E2E Super Administrator',
    username: `gm_s_${suffix}`,
    password: 'gm-super-admin-password-1',
    personalId: '44455566688',
    email: `gm-super-${suffix}@example.invalid`
  }

  let playerToken = ''
  let gmToken = ''
  let adminToken = ''
  let superAdminToken = ''
  let gmAccountId = ''
  let twoFactorService: import('../src/modules/auth/two-factor.service').TwoFactorService
  const totpSecrets = new Map<string, string>()

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { TwoFactorService } = await import('../src/modules/auth/two-factor.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    twoFactorService = app.get(TwoFactorService)
  }, 60000)

  afterAll(async () => app?.close())

  const request = () => import('supertest').then((module) => module.default(httpServer))

  const login = async (username: string, password: string) => {
    const totpCode = totpSecrets.has(username) ? generateSync({ secret: totpSecrets.get(username)! }) : undefined
    const result = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username, password, ...(totpCode ? { totpCode } : {}) })
    expect(result.status).toBe(201)
    return result.body.accessToken as string
  }

  // 2FA is mandatory for any non-PLAYER role reaching a role-gated route
  // (roles.guard.ts) -- give the account a real TOTP secret (not just the
  // twoFactorEnabled flag) so every subsequent login() call in this file
  // can supply a valid code, exactly like a real GM/ADMIN/SUPER_ADMIN would.
  const enableRealTwoFactor = async (username: string) => {
    const secret = generateSecret({ length: 20 })
    totpSecrets.set(username, secret)
    await prisma.account.update({
      where: { username },
      data: { twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(secret) }
    })
  }

  it('registers all four accounts as PLAYER by default via public registration', async () => {
    const req = await request()
    for (const account of [player, gm, administrator, superAdministrator]) {
      const result = await req.post('/api/auth/register').send(account)
      expect(result.status).toBe(201)
      expect(result.body.username).toBe(account.username)
    }

    const registered = await prisma.account.findMany({
      where: { username: { in: [player.username, gm.username, administrator.username, superAdministrator.username] } }
    })
    expect(registered.every((account) => account.role === 'PLAYER')).toBe(true)

    await prisma.account.update({ where: { username: gm.username }, data: { role: 'GM' } })
    await prisma.account.update({ where: { username: administrator.username }, data: { role: 'ADMIN' } })
    await prisma.account.update({ where: { username: superAdministrator.username }, data: { role: 'SUPER_ADMIN' } })

    const gmAccount = await prisma.account.findUniqueOrThrow({ where: { username: gm.username } })
    gmAccountId = gmAccount.id
  })

  it('logs in with each role', async () => {
    playerToken = await login(player.username, player.password)
    // GM doesn't strictly need 2FA today (no existing @Roles('GM', ...)
    // endpoint to reach), but is included for parity with the real policy.
    await enableRealTwoFactor(gm.username)
    await enableRealTwoFactor(administrator.username)
    await enableRealTwoFactor(superAdministrator.username)
    gmToken = await login(gm.username, gm.password)
    adminToken = await login(administrator.username, administrator.password)
    superAdminToken = await login(superAdministrator.username, superAdministrator.password)
  })

  it('reflects the GM role on the authenticated profile, not a silent downgrade to PLAYER', async () => {
    const result = await (
      await request()
    )
      .get('/api/account/profile')
      .set('Authorization', `Bearer ${gmToken}`)
    expect(result.status).toBe(200)
    expect(result.body.role).toBe('GM')
  })

  it('lets a GM view all characters, not only their own', async () => {
    const result = await (
      await request()
    )
      .get('/api/characters')
      .set('Authorization', `Bearer ${gmToken}`)
    expect(result.status).toBe(200)
    expect(Array.isArray(result.body.data)).toBe(true)
  })

  it('restricts a PLAYER to only their own characters', async () => {
    const result = await (
      await request()
    )
      .get('/api/characters')
      .set('Authorization', `Bearer ${playerToken}`)
    expect(result.status).toBe(200)
    expect(result.body.data.every((character: { ownerUsername: string }) => character.ownerUsername === player.username)).toBe(true)
  })

  it('blocks a GM from ADMIN-only account management endpoints', async () => {
    const result = await (
      await request()
    )
      .get('/api/admin/accounts')
      .set('Authorization', `Bearer ${gmToken}`)
    expect(result.status).toBe(403)
  })

  it('blocks a GM from changing its own or any other account role', async () => {
    const result = await (
      await request()
    )
      .patch(`/api/admin/accounts/${gmAccountId}`)
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ role: 'ADMIN', reason: 'GM tentando se auto-promover' })
    expect(result.status).toBe(403)
  })

  it('keeps ADMIN able to read account management endpoints once SUPER_ADMIN delegates the permission', async () => {
    // ADMIN's role baseline carries no admin.* permission by default -- those
    // are delegated per-account via AccountPermission overrides, so this
    // exercises the real delegation flow rather than assuming a bare ADMIN
    // role grants access on its own.
    const adminAccount = await prisma.account.findUniqueOrThrow({ where: { username: administrator.username } })
    const grant = await (
      await request()
    )
      .patch(`/api/admin/accounts/${adminAccount.id}/permissions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ permissions: [{ key: 'admin.accounts.view', granted: true }], reason: 'Delegando leitura de contas em teste e2e' })
    expect(grant.status).toBe(200)

    // Granting a permission bumps the account's sessionVersion, which
    // invalidates tokens issued before the grant -- log in again to get a
    // token that reflects the new permission set.
    adminToken = await login(administrator.username, administrator.password)

    const result = await (
      await request()
    )
      .get('/api/admin/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(result.status).toBe(200)
  })

  it('blocks ADMIN from changing account roles, since only SUPER_ADMIN may change roles', async () => {
    const result = await (
      await request()
    )
      .patch(`/api/admin/accounts/${gmAccountId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ADMIN', reason: 'ADM tentando promover um GM' })
    expect(result.status).toBe(403)
  })

  it('lets SUPER_ADMIN promote and demote through PLAYER, GM and ADMIN', async () => {
    // Role changes require a fresh step-up token (see step-up.guard.ts /
    // accounts.service.ts), on top of the normal bearer session.
    const stepUpToken = async () => {
      const result = await (
        await request()
      )
        .post('/api/auth/step-up')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          currentPassword: superAdministrator.password,
          code: generateSync({ secret: totpSecrets.get(superAdministrator.username)! })
        })
      expect(result.status).toBe(201)
      return result.body.stepUpToken as string
    }

    const toAdmin = await (
      await request()
    )
      .patch(`/api/admin/accounts/${gmAccountId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('X-Step-Up-Token', await stepUpToken())
      .send({ role: 'ADMIN', reason: 'Promovendo GM para ADM em teste e2e' })
    expect(toAdmin.status).toBe(200)
    expect(toAdmin.body.role).toBe('ADMIN')

    const backToGm = await (
      await request()
    )
      .patch(`/api/admin/accounts/${gmAccountId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('X-Step-Up-Token', await stepUpToken())
      .send({ role: 'GM', reason: 'Rebaixando de volta para GM em teste e2e' })
    expect(backToGm.status).toBe(200)
    expect(backToGm.body.role).toBe('GM')
  })

  it('retains full SUPER_ADMIN access to administrative endpoints', async () => {
    const result = await (
      await request()
    )
      .get('/api/admin/accounts')
      .set('Authorization', `Bearer ${superAdminToken}`)
    expect(result.status).toBe(200)
  })
})
