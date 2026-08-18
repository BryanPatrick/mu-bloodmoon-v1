import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-perm-escalation'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-perm-escalation-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-perm-escalation-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-perm-escalation-two-factor-key-32-chars'
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

// Regression coverage for a real privilege-escalation vulnerability found in
// PHASE 0 auditing (2026-08-18): PATCH /admin/accounts/:id/permissions only
// checked @RequirePermissions(admin.roles.manage) with no role/step-up
// barrier. Since delegableAdminPermissions includes admin.roles.manage
// itself, any ADMIN holding that one delegated permission could grant it
// (and every other admin.* permission) to any peer ADMIN account,
// indefinitely, without SUPER_ADMIN ever being involved again -- a lateral
// ADMIN-to-ADMIN escalation path. Fixed in accounts.service.ts's
// updateAccountPermissions: SUPER_ADMIN-only + fresh step-up token is now
// required whenever the TARGET account is ADMIN, mirroring the existing
// restriction updateAccount() already enforced for role transitions. GM
// targets (a small curated gm.events.* set) are untouched.
describe('Admin permission delegation -- privilege escalation regression', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  const suffix = Date.now().toString(36)

  const player = {
    name: 'Perm E2E Player', username: `perm_p_${suffix}`, password: 'perm-player-password-1',
    personalId: '11122233355', email: `perm-player-${suffix}@example.invalid`
  }
  const gm = {
    name: 'Perm E2E GM', username: `perm_g_${suffix}`, password: 'perm-gm-password-1',
    personalId: '22233344466', email: `perm-gm-${suffix}@example.invalid`
  }
  const adminA = {
    name: 'Perm E2E Admin A', username: `perm_aa_${suffix}`, password: 'perm-admin-a-password-1',
    personalId: '33344455577', email: `perm-admin-a-${suffix}@example.invalid`
  }
  const adminB = {
    name: 'Perm E2E Admin B', username: `perm_ab_${suffix}`, password: 'perm-admin-b-password-1',
    personalId: '55566677799', email: `perm-admin-b-${suffix}@example.invalid`
  }
  const superAdministrator = {
    name: 'Perm E2E Super Administrator', username: `perm_s_${suffix}`, password: 'perm-super-admin-password-1',
    personalId: '44455566688', email: `perm-super-${suffix}@example.invalid`
  }

  let playerToken = ''
  let gmToken = ''
  let adminAToken = ''
  let adminBToken = ''
  let superAdminToken = ''
  let adminAId = ''
  let adminBId = ''
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
    const result = await (await request())
      .post('/api/auth/login')
      .send({ username, password, ...(totpCode ? { totpCode } : {}) })
    expect(result.status).toBe(201)
    return result.body.accessToken as string
  }

  const enableRealTwoFactor = async (username: string) => {
    const secret = generateSecret({ length: 20 })
    totpSecrets.set(username, secret)
    await prisma.account.update({
      where: { username },
      data: { twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(secret) }
    })
  }

  const stepUpTokenFor = async (username: string, password: string, token: string) => {
    const result = await (await request())
      .post('/api/auth/step-up')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: password, code: generateSync({ secret: totpSecrets.get(username)! }) })
    expect(result.status).toBe(201)
    return result.body.stepUpToken as string
  }

  it('bootstraps player, gm, two admins and a super admin', async () => {
    const req = await request()
    for (const account of [player, gm, adminA, adminB, superAdministrator]) {
      const result = await req.post('/api/auth/register').send(account)
      expect(result.status).toBe(201)
    }
    await prisma.account.update({ where: { username: gm.username }, data: { role: 'GM' } })
    await prisma.account.update({ where: { username: adminA.username }, data: { role: 'ADMIN' } })
    await prisma.account.update({ where: { username: adminB.username }, data: { role: 'ADMIN' } })
    await prisma.account.update({ where: { username: superAdministrator.username }, data: { role: 'SUPER_ADMIN' } })

    adminAId = (await prisma.account.findUniqueOrThrow({ where: { username: adminA.username } })).id
    adminBId = (await prisma.account.findUniqueOrThrow({ where: { username: adminB.username } })).id

    playerToken = await login(player.username, player.password)
    await enableRealTwoFactor(gm.username)
    await enableRealTwoFactor(adminA.username)
    await enableRealTwoFactor(adminB.username)
    await enableRealTwoFactor(superAdministrator.username)
    gmToken = await login(gm.username, gm.password)
    adminAToken = await login(adminA.username, adminA.password)
    adminBToken = await login(adminB.username, adminB.password)
    superAdminToken = await login(superAdministrator.username, superAdministrator.password)
  })

  it('blocks PLAYER and GM from reaching the permissions endpoint at all', async () => {
    for (const token of [playerToken, gmToken]) {
      const result = await (await request())
        .patch(`/api/admin/accounts/${adminBId}/permissions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: [{ key: 'admin.roles.manage', granted: true }], reason: 'Tentativa de escalonamento por ator inferior' })
      expect(result.status).toBe(403)
    }
  })

  it('lets SUPER_ADMIN delegate admin.roles.manage to Admin A with a valid step-up token', async () => {
    const stepUp = await stepUpTokenFor(superAdministrator.username, superAdministrator.password, superAdminToken)
    const result = await (await request())
      .patch(`/api/admin/accounts/${adminAId}/permissions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('X-Step-Up-Token', stepUp)
      .send({ permissions: [{ key: 'admin.roles.manage', granted: true }], reason: 'Delegando gestao de permissoes para Admin A em teste e2e' })
    expect(result.status).toBe(200)
    expect(result.body.effective).toContain('admin.roles.manage')

    // Granting a permission bumps sessionVersion, invalidating the prior token
    adminAToken = await login(adminA.username, adminA.password)
  })

  it('denies SUPER_ADMIN the same delegation without a step-up token', async () => {
    const result = await (await request())
      .patch(`/api/admin/accounts/${adminBId}/permissions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ permissions: [{ key: 'admin.accounts.view', granted: true }], reason: 'Delegando sem step-up, deve falhar' })
    expect(result.status).toBe(403)
    expect(result.body.code).toBe('STEP_UP_REQUIRED')
  })

  it('CORE REGRESSION: denies Admin A (holding admin.roles.manage) from granting any admin.* permission to peer Admin B', async () => {
    const stepUp = await stepUpTokenFor(adminA.username, adminA.password, adminAToken)
    const result = await (await request())
      .patch(`/api/admin/accounts/${adminBId}/permissions`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .set('X-Step-Up-Token', stepUp)
      .send({ permissions: [{ key: 'admin.roles.manage', granted: true }], reason: 'ADM tentando promover outro ADM lateralmente' })
    expect(result.status).toBe(403)

    const stillNotDelegated = await (await request())
      .get(`/api/admin/accounts/${adminBId}/permissions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
    expect(stillNotDelegated.body.effective).not.toContain('admin.roles.manage')
  })

  it('CORE REGRESSION: denies Admin A even for a low-risk admin.* permission, not just admin.roles.manage', async () => {
    const stepUp = await stepUpTokenFor(adminA.username, adminA.password, adminAToken)
    const result = await (await request())
      .patch(`/api/admin/accounts/${adminBId}/permissions`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .set('X-Step-Up-Token', stepUp)
      .send({ permissions: [{ key: 'admin.accounts.view', granted: true }], reason: 'ADM tentando delegar qualquer admin.* para outro ADM' })
    expect(result.status).toBe(403)
  })

  it('blocks self-permission-change (auto-promotion) for SUPER_ADMIN and Admin A alike', async () => {
    const superAdminId = (await prisma.account.findUniqueOrThrow({ where: { username: superAdministrator.username } })).id
    const selfAsSuper = await (await request())
      .patch(`/api/admin/accounts/${superAdminId}/permissions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ permissions: [{ key: 'admin.system.manage', granted: true }], reason: 'Auto-alteracao, deve falhar' })
    expect(selfAsSuper.status).toBe(403)

    const selfAsAdminA = await (await request())
      .patch(`/api/admin/accounts/${adminAId}/permissions`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ permissions: [{ key: 'admin.accounts.view', granted: true }], reason: 'Auto-alteracao, deve falhar' })
    expect(selfAsAdminA.status).toBe(403)
  })

  it('still lets an ADMIN delegate the small curated GM permission set to a GM account (untouched path)', async () => {
    const gmId = (await prisma.account.findUniqueOrThrow({ where: { username: gm.username } })).id
    const result = await (await request())
      .patch(`/api/admin/accounts/${gmId}/permissions`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ permissions: [{ key: 'gm.events.execute', granted: true }], reason: 'Delegando permissao GM curada, nao deve exigir step-up' })
    expect(result.status).toBe(200)
  })

  it('lets SUPER_ADMIN revoke the delegated admin.roles.manage from Admin A with step-up, closing the loop', async () => {
    const stepUp = await stepUpTokenFor(superAdministrator.username, superAdministrator.password, superAdminToken)
    const result = await (await request())
      .patch(`/api/admin/accounts/${adminAId}/permissions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('X-Step-Up-Token', stepUp)
      .send({ permissions: [], reason: 'Revogando admin.roles.manage de Admin A em teste e2e' })
    expect(result.status).toBe(200)
    expect(result.body.effective).not.toContain('admin.roles.manage')
  })
})
