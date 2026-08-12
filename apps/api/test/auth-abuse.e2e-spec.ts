import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-auth-abuse'
const originalFetch = global.fetch

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-auth-abuse-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-auth-abuse-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-auth-abuse-two-factor-key-at-least-32-characters'
  process.env.TURNSTILE_SECRET_KEY = 'e2e-turnstile-secret'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '0'
  process.env.AUTH_RATE_LOGIN_IP_LIMIT = '3'
  process.env.AUTH_RATE_LOGIN_IP_WINDOW_MS = '5000'
  process.env.AUTH_RATE_LOGIN_SUBJECT_LIMIT = '3'
  process.env.AUTH_RATE_LOGIN_SUBJECT_WINDOW_MS = '5000'
  process.env.AUTH_RATE_REGISTER_IP_LIMIT = '3'
  process.env.AUTH_RATE_REGISTER_IP_WINDOW_MS = '80'
  process.env.AUTH_RATE_REGISTER_SUBJECT_LIMIT = '3'
  process.env.AUTH_RATE_REGISTER_SUBJECT_WINDOW_MS = '80'

  global.fetch = jest.fn(async (_input: string | URL | Request, init?: RequestInit) => {
    const body = init?.body as URLSearchParams
    const token = body?.get('response') || ''
    const action = token.startsWith('valid-') ? token.slice('valid-'.length) : ''
    return new Response(
      JSON.stringify({
        success: Boolean(action),
        action,
        hostname: 'localhost',
        ...(action ? {} : { 'error-codes': ['invalid-input-response'] })
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  }) as typeof fetch

  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => {
  global.fetch = originalFetch
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('Auth abuse protection', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let limiter: import('../src/modules/auth/auth-rate-limit.service').AuthRateLimitService
  const suffix = Date.now().toString(36)
  const user = {
    name: 'Auth Abuse E2E',
    username: `auth_abuse_${suffix}`,
    password: 'correct-horse-battery-staple',
    personalId: '99887766554',
    email: `auth-abuse-${suffix}@example.invalid`
  }

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { AuthRateLimitService } = await import('../src/modules/auth/auth-rate-limit.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    limiter = app.get(AuthRateLimitService)
  }, 60000)

  afterAll(async () => app?.close())
  beforeEach(() => limiter.reset())

  const request = () => import('supertest').then((module) => module.default(httpServer))

  it('rejects missing CAPTCHA on direct registration API calls', async () => {
    const result = await (await request()).post('/api/auth/register').send(user)
    expect(result.status).toBe(400)
  })

  it('rejects invalid CAPTCHA', async () => {
    const result = await (
      await request()
    )
      .post('/api/auth/register')
      .send({ ...user, captchaToken: 'invalid' })
    expect(result.status).toBe(400)
  })

  it('registers with a server-validated CAPTCHA', async () => {
    const result = await (
      await request()
    )
      .post('/api/auth/register')
      .send({ ...user, captchaToken: 'valid-register' })
    expect(result.status).toBe(201)
    expect(result.body.username).toBe(user.username)
  })

  it('uses a generic response for duplicate account identifiers', async () => {
    const result = await (
      await request()
    )
      .post('/api/auth/register')
      .send({ ...user, captchaToken: 'valid-register' })
    expect(result.status).toBe(409)
    expect(result.body.message).toBe('Account cannot be created with these details')
  })

  it('rejects direct login API calls without CAPTCHA', async () => {
    const result = await (await request()).post('/api/auth/login').send({
      username: user.username,
      password: user.password
    })
    expect(result.status).toBe(400)
  })

  it('rejects wrong credentials and accepts correct credentials', async () => {
    const wrong = await (await request()).post('/api/auth/login').send({
      username: user.username,
      password: 'wrong-password',
      captchaToken: 'valid-login'
    })
    expect(wrong.status).toBe(401)

    const correct = await (await request()).post('/api/auth/login').send({
      username: user.username,
      password: user.password,
      captchaToken: 'valid-login'
    })
    expect(correct.status).toBe(201)
    expect(typeof correct.body.accessToken).toBe('string')
  })

  it('rate limits login bursts and sends Retry-After', async () => {
    const req = await request()
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await req.post('/api/auth/login').send({
        username: `burst-${attempt}`,
        password: 'wrong-password',
        captchaToken: 'valid-login'
      })
      expect(result.status).toBe(401)
    }
    const blocked = await req.post('/api/auth/login').send({
      username: 'burst-final',
      password: 'wrong-password',
      captchaToken: 'valid-login'
    })
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('rate limits registration bursts before CAPTCHA validation', async () => {
    const req = await request()
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await req
        .post('/api/auth/register')
        .send({ ...user, email: `burst-${attempt}@example.invalid` })
    }
    const providerCallsBefore = (global.fetch as jest.Mock).mock.calls.length
    const blocked = await req
      .post('/api/auth/register')
      .send({ ...user, email: 'burst-final@example.invalid' })
    expect(blocked.status).toBe(429)
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(providerCallsBefore)
  })

  it('resets the fixed rate-limit window', async () => {
    const start = 1_000
    expect(limiter.consume('login', '127.0.0.1', 'window-user', start).allowed).toBe(true)
    expect(limiter.consume('login', '127.0.0.1', 'window-user', start + 1).allowed).toBe(true)
    expect(limiter.consume('login', '127.0.0.1', 'window-user', start + 2).allowed).toBe(true)
    expect(limiter.consume('login', '127.0.0.1', 'window-user', start + 3).allowed).toBe(false)
    expect(limiter.consume('login', '127.0.0.1', 'window-user', start + 5001).allowed).toBe(true)
  })
})
