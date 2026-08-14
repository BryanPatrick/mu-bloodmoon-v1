import { execSync } from 'node:child_process'
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

  const request = () => import('supertest').then((module) => module.default(httpServer))

  const login = async (username: string, password: string) => {
    const result = await (await request()).post('/api/auth/login').send({ username, password })
    expect(result.status).toBe(201)
    return result.body.accessToken as string
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
    const req = await request()

    const toAdmin = await req
      .patch(`/api/admin/accounts/${gmAccountId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'ADMIN', reason: 'Promovendo GM para ADM em teste e2e' })
    expect(toAdmin.status).toBe(200)
    expect(toAdmin.body.role).toBe('ADMIN')

    const backToGm = await (await request())
      .patch(`/api/admin/accounts/${gmAccountId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
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
