import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Kept in its own file/app instance deliberately: AuthRateLimitService's
// counters are process-local (see README.md), so this needs a fresh app
// bootstrap with an untouched limiter -- sharing one with two-factor.e2e-spec.ts's
// many other 'sensitive'-policy calls (setup/verify/disable/regenerate/step-up)
// would make either file flaky depending on run order.

const CONTAINER = 'bloodmoon-e2e-two-factor-rate-limit'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-two-factor-rl-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-two-factor-rl-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-two-factor-rl-encryption-key-32-chars'
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

describe('Rate limiting on 2FA verification', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  const suffix = Date.now().toString(36)
  const account = {
    name: '2FA Rate Limit E2E',
    username: `tfa_rl_${suffix}`,
    password: '2fa-rate-limit-password-1',
    personalId: '66677788811',
    email: `tfa-rate-limit-${suffix}@example.invalid`
  }

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
  }, 60000)

  afterAll(async () => app?.close())

  const request = () => import('supertest').then((module) => module.default(httpServer))

  it('throttles repeated wrong-code attempts against /2fa/verify', async () => {
    const registered = await (await request()).post('/api/auth/register').send(account)
    expect(registered.status).toBe(201)
    const loginResult = await (await request()).post('/api/auth/login').send({
      username: account.username,
      password: account.password
    })
    const token = loginResult.body.accessToken

    const setup = await (
      await request()
    )
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: account.password })
    expect(setup.status).toBe(201)

    let sawRateLimit = false
    for (let attempt = 0; attempt < 15; attempt++) {
      const result = await (
        await request()
      )
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '000000' })
      if (result.status === 429) {
        sawRateLimit = true
        break
      }
    }
    expect(sawRateLimit).toBe(true)
  })
})
