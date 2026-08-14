import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-account-sessions'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-account-sessions-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-account-sessions-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-account-sessions-two-factor-key-32-chars'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
  process.env.AUTH_MAIL_TEST_BYPASS = '1'
  process.env.AUTH_RATE_SENSITIVE_IP_LIMIT = '1000'
  process.env.AUTH_RATE_LOGIN_IP_LIMIT = '1000'

  execSync('npx prisma migrate deploy', {
    cwd: __dirname + '/..',
    env: process.env,
    stdio: 'pipe'
  })
}, 120000)

afterAll(() => {
  delete process.env.AUTH_RATE_SENSITIVE_IP_LIMIT
  delete process.env.AUTH_RATE_LOGIN_IP_LIMIT
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('Account sessions/devices (list, revoke-one, revoke-all)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactorService: import('../src/modules/auth/two-factor.service').TwoFactorService
  const suffix = Date.now().toString(36)

  const accountX = {
    name: 'Sessions E2E Account X',
    username: `sess_x_${suffix}`,
    password: 'sessions-account-x-password-1',
    personalId: '80101020301',
    email: `sessions-x-${suffix}@example.invalid`
  }
  const accountY = {
    name: 'Sessions E2E Account Y',
    username: `sess_y_${suffix}`,
    password: 'sessions-account-y-password-1',
    personalId: '80202030401',
    email: `sessions-y-${suffix}@example.invalid`
  }
  const superAdmin = {
    name: 'Sessions E2E Super Admin',
    username: `sess_s_${suffix}`,
    password: 'sessions-super-admin-password-1',
    personalId: '80303040501',
    email: `sessions-super-${suffix}@example.invalid`
  }

  const request = () => import('supertest').then((module) => module.default(httpServer))

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

  it('lists sessions with a masked IP, a truncated/labeled device, and the current-session flag', async () => {
    const registered = await (await request()).post('/api/auth/register').send(accountX)
    expect(registered.status).toBe(201)
    const login = await (
      await request()
    )
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.77')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36')
      .send({ username: accountX.username, password: accountX.password })
    expect(login.status).toBe(201)
    const token = login.body.accessToken as string

    const list = await (await request()).get('/api/account/sessions').set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body).toHaveLength(1)
    const session = list.body[0]
    expect(session.current).toBe(true)
    expect(session.active).toBe(true)
    expect(typeof session.label).toBe('string')
    expect(session.label.length).toBeGreaterThan(0)
    // Real IP is 203.0.113.77 -- must never be returned unmasked.
    expect(session.ipAddress).not.toBe('203.0.113.77')
    if (session.ipAddress) expect(session.ipAddress).toMatch(/\*\*\*/)
  })

  it('cannot revoke another account\'s session (404, no cross-account leak), and that other account stays fully active', async () => {
    const registered = await (await request()).post('/api/auth/register').send(accountY)
    expect(registered.status).toBe(201)
    const loginY = await (await request()).post('/api/auth/login').send({ username: accountY.username, password: accountY.password })
    const tokenY = loginY.body.accessToken as string
    const sessionsY = await (await request()).get('/api/account/sessions').set('Authorization', `Bearer ${tokenY}`)
    const sessionYId = sessionsY.body[0].id as string

    const loginX = await (await request()).post('/api/auth/login').send({ username: accountX.username, password: accountX.password })
    const tokenX = loginX.body.accessToken as string

    const crossAttempt = await (
      await request()
    )
      .patch(`/api/account/sessions/${sessionYId}/revoke`)
      .set('Authorization', `Bearer ${tokenX}`)
      .send({ reason: 'Tentando encerrar sessao de outra conta' })
    expect(crossAttempt.status).toBe(404)

    const stillActiveY = await (await request()).get('/api/account/profile').set('Authorization', `Bearer ${tokenY}`)
    expect(stillActiveY.status).toBe(200)
  })

  it('revokes exactly the targeted own session, invalidating it immediately', async () => {
    const login = await (await request()).post('/api/auth/login').send({ username: accountX.username, password: accountX.password })
    const token = login.body.accessToken as string
    const sessions = await (await request()).get('/api/account/sessions').set('Authorization', `Bearer ${token}`)
    const sessionId = sessions.body.find((item: { current: boolean }) => item.current).id as string

    const revoked = await (
      await request()
    )
      .patch(`/api/account/sessions/${sessionId}/revoke`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Encerrando este dispositivo' })
    expect(revoked.status).toBe(200)
    expect(revoked.body.ok).toBe(true)

    const afterRevoke = await (await request()).get('/api/account/profile').set('Authorization', `Bearer ${token}`)
    expect(afterRevoke.status).toBe(401)

    // Revoking again is a harmless no-op, not an error.
    const relogin = await (await request()).post('/api/auth/login').send({ username: accountX.username, password: accountX.password })
    const freshToken = relogin.body.accessToken as string
    const idempotent = await (
      await request()
    )
      .patch(`/api/account/sessions/${sessionId}/revoke`)
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ reason: 'Repetindo o encerramento' })
    expect(idempotent.status).toBe(200)
    // The still-current, still-active session must not have been touched by
    // that idempotent replay of an old session id.
    const stillGood = await (await request()).get('/api/account/profile').set('Authorization', `Bearer ${freshToken}`)
    expect(stillGood.status).toBe(200)
  })

  it('lets a PLAYER revoke-all without step-up (unchanged behavior)', async () => {
    const login = await (await request()).post('/api/auth/login').send({ username: accountX.username, password: accountX.password })
    const token = login.body.accessToken as string
    const result = await (
      await request()
    )
      .patch('/api/account/sessions/revoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Encerrando tudo pelo titular' })
    expect(result.status).toBe(200)
  })

  it('requires a fresh step-up for a SUPER_ADMIN to revoke-all, and accepts a valid one', async () => {
    const registered = await (await request()).post('/api/auth/register').send(superAdmin)
    expect(registered.status).toBe(201)
    const secret = generateSecret({ length: 20 })
    await prisma.account.update({
      where: { username: superAdmin.username },
      data: { role: 'SUPER_ADMIN', twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(secret) }
    })
    const login = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: superAdmin.username, password: superAdmin.password, totpCode: generateSync({ secret }) })
    const token = login.body.accessToken as string

    const withoutStepUp = await (
      await request()
    )
      .patch('/api/account/sessions/revoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Tentando encerrar tudo sem step-up' })
    expect(withoutStepUp.status).toBe(403)
    expect(withoutStepUp.body.code).toBe('STEP_UP_REQUIRED')

    const stepUp = await (
      await request()
    )
      .post('/api/auth/step-up')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: superAdmin.password, code: generateSync({ secret }) })
    expect(stepUp.status).toBe(201)

    const withStepUp = await (
      await request()
    )
      .patch('/api/account/sessions/revoke')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Step-Up-Token', stepUp.body.stepUpToken)
      .send({ reason: 'Encerrando tudo com step-up valido' })
    expect(withStepUp.status).toBe(200)

    const afterRevokeAll = await (await request()).get('/api/account/profile').set('Authorization', `Bearer ${token}`)
    expect(afterRevokeAll.status).toBe(401)
  })
})
