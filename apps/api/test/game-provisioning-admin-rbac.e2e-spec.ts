import { randomUUID } from 'node:crypto'
import { generate as generateTotp } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 3D-B Part AN. RBAC for GET/POST /admin/game-provisioning* --
// ADMIN/SUPER_ADMIN only (RolesGuard), and even ADMIN needs the delegated
// admin.game-provisioning.view/manage permission (PermissionsGuard) --
// ADMIN's base role array does not auto-include every admin.* permission
// (same delegation pattern as the existing admin.game-data.view). GM must
// not inherit any of this despite baselining on playerPermissions.
const CONTAINER = 'bloodmoon-e2e-game-provisioning-admin-rbac'

describe('Game provisioning admin endpoints RBAC (Phase 3D-B)', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactor: import('../src/modules/auth/two-factor.service').TwoFactorService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
    delete process.env.GAME_DATA_WORKER_URL
    delete process.env.GAME_COMMAND_PORTAL_SECRET

    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { TwoFactorService } = await import('../src/modules/auth/two-factor.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    prisma = moduleRef.get(PrismaService)
    twoFactor = moduleRef.get(TwoFactorService)
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  const request = () => import('supertest').then((m) => m.default(app.getHttpServer()))

  function registerPayload() {
    const seed = randomUUID().slice(0, 8)
    return {
      name: 'RBAC Test',
      username: `uregrbac${seed}`,
      email: `uregrbac-${seed}@example.test`,
      password: 'a-fine-password-1',
      personalId: '12345678900'
    }
  }

  // GM/ADMIN/SUPER_ADMIN all require mandatory 2FA (roles.guard.ts) --
  // without it every non-PLAYER role gets blocked before RolesGuard/
  // PermissionsGuard are even reached, which would make every RBAC
  // assertion below pass for the wrong reason. Same
  // generateSecret()+encrypt()+generateTotp() setup test-personas.service.ts
  // already uses for its own GM/ADMIN personas.
  async function registerLoginAs(role: 'PLAYER' | 'GM' | 'ADMIN' | 'SUPER_ADMIN', grantPermissions = false) {
    const payload = registerPayload()
    const registered = await (await request()).post('/api/auth/register').send(payload)
    expect(registered.status).toBe(201)

    let totpCode: string | undefined
    if (role !== 'PLAYER') {
      const secret = twoFactor.generateSecret()
      await prisma.account.update({
        where: { id: registered.body.id },
        data: { role, twoFactorEnabled: true, twoFactorSecret: twoFactor.encrypt(secret) }
      })
      totpCode = await generateTotp({ secret })
    }
    if (grantPermissions) {
      await prisma.accountPermission.createMany({
        data: [
          { accountId: registered.body.id, key: 'admin.game-provisioning.view', granted: true },
          { accountId: registered.body.id, key: 'admin.game-provisioning.manage', granted: true }
        ]
      })
    }
    const login = await (await request())
      .post('/api/auth/login')
      .send({ username: payload.username, password: payload.password, totpCode })
    expect(login.status).toBe(201)
    return { accountId: registered.body.id as string, accessToken: login.body.accessToken as string }
  }

  it('rejects an unauthenticated caller', async () => {
    const list = await (await request()).get('/api/admin/game-provisioning')
    expect(list.status).toBe(401)
    const retry = await (await request()).post('/api/admin/game-provisioning/some-account-id/retry')
    expect(retry.status).toBe(401)
  })

  it('PLAYER is denied by role', async () => {
    const { accessToken } = await registerLoginAs('PLAYER')
    const res = await (await request()).get('/api/admin/game-provisioning').set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(403)
  })

  it('GM is denied by role -- does not inherit admin.* access', async () => {
    const { accessToken } = await registerLoginAs('GM')
    const res = await (await request()).get('/api/admin/game-provisioning').set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(403)
  })

  it('ADMIN without the delegated permission is denied', async () => {
    const { accessToken } = await registerLoginAs('ADMIN', false)
    const res = await (await request()).get('/api/admin/game-provisioning').set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(403)
  })

  it('ADMIN with the delegated permission can list and retry, always reusing the same provisioningRequestId, never a credential field', async () => {
    const { accessToken } = await registerLoginAs('ADMIN', true)
    process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER = 'true'
    const target = await (await request()).post('/api/auth/register').send(registerPayload())
    delete process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER
    expect(target.status).toBe(201)

    const list = await (await request()).get('/api/admin/game-provisioning').set('Authorization', `Bearer ${accessToken}`)
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body)).toBe(true)

    const before = await prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId: target.body.id } })
    const retry = await (await request())
      .post(`/api/admin/game-provisioning/${target.body.id}/retry`)
      .set('Authorization', `Bearer ${accessToken}`)
    // Neither the transport nor the credential keyring is configured in
    // this suite, so the underlying dispatch() genuinely cannot succeed --
    // the controller converts that into a clean 400, never a raw 500. The
    // access-control question this test exists to answer (permission
    // granted -> request reaches the handler at all) is already proven by
    // getting past RolesGuard/PermissionsGuard to a safe application-level
    // failure instead of a 403.
    expect(retry.status).toBe(400)
    const after = await prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId: target.body.id } })
    expect(after.provisioningRequestId).toBe(before.provisioningRequestId)
    const attempt = await prisma.gameProvisioningAttempt.findFirst({
      where: { provisioningRequestId: before.provisioningRequestId }
    })
    expect(attempt?.outcome).toBe('ERROR')

    const json = JSON.stringify(retry.body)
    expect(json).not.toMatch(/ciphertext/i)
    expect(json).not.toMatch(/legacyLogin/i)
  })

  it('SUPER_ADMIN can access without explicit delegation (wildcard permission)', async () => {
    const { accessToken } = await registerLoginAs('SUPER_ADMIN', false)
    const res = await (await request()).get('/api/admin/game-provisioning').set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
  })
})
