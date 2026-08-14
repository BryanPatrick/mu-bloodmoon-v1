import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-portal-critical'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-portal-critical-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-portal-critical-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-portal-critical-two-factor-key-32-characters'
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

describe('Portal critical baseline outside Community', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  const suffix = Date.now().toString(36)
  const player = {
    name: 'Portal E2E Player',
    username: `portal_p_${suffix}`,
    password: 'portal-player-password-1',
    personalId: '11122233344',
    email: `portal-player-${suffix}@example.invalid`
  }
  const administrator = {
    name: 'Portal E2E Administrator',
    username: `portal_a_${suffix}`,
    password: 'portal-admin-password-1',
    personalId: '55566677788',
    email: `portal-admin-${suffix}@example.invalid`
  }
  let playerToken = ''
  let adminToken = ''

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

  it('serves safe public API entry points', async () => {
    const req = await request()
    const [health, wiki, roadmap, launcher] = await Promise.all([
      req.get('/api'),
      req.get('/api/wiki/summary'),
      req.get('/api/roadmap'),
      req.get('/api/launcher/bootstrap')
    ])

    expect(health.status).toBe(200)
    expect(health.body.status).toBe('online')
    expect(wiki.status).toBe(200)
    expect(roadmap.status).toBe(200)
    expect(launcher.status).toBe(200)
  })

  it('returns coherent validation and not-found errors', async () => {
    const invalid = await (await request()).post('/api/auth/register').send({ username: 'x' })
    expect(invalid.status).toBe(400)
    expect(invalid.body.statusCode).toBe(400)
    expect(typeof invalid.body.requestId).toBe('string')

    const missing = await (await request()).get('/api/definitely-not-a-real-route')
    expect(missing.status).toBe(404)
    expect(missing.body.statusCode).toBe(404)
    expect(typeof missing.body.requestId).toBe('string')
  })

  it('registers synthetic player and administrator accounts', async () => {
    const req = await request()
    for (const account of [player, administrator]) {
      const result = await req.post('/api/auth/register').send(account)
      expect(result.status).toBe(201)
      expect(result.body.username).toBe(account.username)
    }

    await prisma.account.update({
      where: { username: administrator.username },
      data: { role: 'SUPER_ADMIN' }
    })
  })

  it('rejects invalid credentials and accepts valid credentials', async () => {
    const wrong = await (await request()).post('/api/auth/login').send({
      username: player.username,
      password: 'wrong-password'
    })
    expect(wrong.status).toBe(401)

    const correct = await (await request()).post('/api/auth/login').send({
      username: player.username,
      password: player.password
    })
    expect(correct.status).toBe(201)
    expect(typeof correct.body.accessToken).toBe('string')
    playerToken = correct.body.accessToken

    const adminLogin = await (await request()).post('/api/auth/login').send({
      username: administrator.username,
      password: administrator.password
    })
    expect(adminLogin.status).toBe(201)
    adminToken = adminLogin.body.accessToken
    // 2FA is mandatory for any non-PLAYER role reaching a role-gated route.
    // Flip it on after login so the already-issued token keeps working.
    await prisma.account.update({ where: { username: administrator.username }, data: { twoFactorEnabled: true } })
  })

  it('protects authenticated routes from anonymous requests', async () => {
    const result = await (await request()).get('/api/account/profile')
    expect(result.status).toBe(401)
  })

  it('allows a player to read only their own account profile', async () => {
    const result = await (
      await request()
    )
      .get('/api/account/profile')
      .set('Authorization', `Bearer ${playerToken}`)
    expect(result.status).toBe(200)
    expect(result.body.username).toBe(player.username)
    expect(result.body.role).toBe('PLAYER')
  })

  it('forbids a player from an administrative endpoint', async () => {
    const result = await (
      await request()
    )
      .get('/api/admin/dashboard/operational')
      .set('Authorization', `Bearer ${playerToken}`)
    expect(result.status).toBe(403)
  })

  it('allows an authorized administrator to read the operational dashboard', async () => {
    const result = await (
      await request()
    )
      .get('/api/admin/dashboard/operational')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(result.status).toBe(200)
    expect(result.body.metrics).toBeDefined()
  })

  it('creates and lists a support ticket owned by the authenticated player', async () => {
    const created = await (
      await request()
    )
      .post('/api/account/tickets')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        subject: 'Ajuda com acesso',
        category: 'account',
        message: 'Mensagem sintetica para validar o fluxo seguro de suporte.'
      })
    expect(created.status).toBe(201)
    expect(created.body.accountId).toBeDefined()

    const listed = await (
      await request()
    )
      .get('/api/account/tickets')
      .set('Authorization', `Bearer ${playerToken}`)
    expect(listed.status).toBe(200)
    expect(listed.body).toHaveLength(1)
    expect(listed.body[0].subject).toBe('Ajuda com acesso')
  })

  it('revokes the current session on logout', async () => {
    const logout = await (
      await request()
    )
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${playerToken}`)
    expect(logout.status).toBe(201)
    expect(logout.body).toEqual({ ok: true })

    const afterLogout = await (
      await request()
    )
      .get('/api/account/profile')
      .set('Authorization', `Bearer ${playerToken}`)
    expect(afterLogout.status).toBe(401)
  })
})
