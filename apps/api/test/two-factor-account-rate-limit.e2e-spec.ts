import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Exercises TwoFactorAttemptLimitService -- the per-ACCOUNT cooldown on top
// of the pre-existing per-IP 'sensitive' policy limiter. Kept in its own
// file/app instance (fast, tiny thresholds via env vars) so it does not
// interfere with two-factor.e2e-spec.ts's many legitimate 'sensitive' calls,
// mirroring the existing two-factor-rate-limit.e2e-spec.ts isolation pattern.

const CONTAINER = 'bloodmoon-e2e-two-factor-account-rate-limit'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-tfa-acct-rl-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-tfa-acct-rl-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-tfa-acct-rl-encryption-key-32-chars'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
  process.env.AUTH_MAIL_TEST_BYPASS = '1'
  // The generic IP-wide 'sensitive' limiter would otherwise trip first and
  // mask what this file is actually testing -- give it plenty of headroom.
  process.env.AUTH_RATE_SENSITIVE_IP_LIMIT = '1000'
  process.env.AUTH_RATE_LOGIN_IP_LIMIT = '1000'
  // Small, fast, deterministic thresholds for the per-account limiter itself.
  process.env.AUTH_TWO_FACTOR_FREE_ATTEMPTS = '2'
  // Endpoints that also bcrypt-compare a password (disable/step-up/etc.) add
  // real per-request latency on top of the network round-trip -- keep this
  // comfortably above that so the lock window can't elapse mid-test.
  process.env.AUTH_TWO_FACTOR_BASE_COOLDOWN_MS = '2000'
  process.env.AUTH_TWO_FACTOR_MAX_COOLDOWN_MS = '5000'

  execSync('npx prisma migrate deploy', {
    cwd: __dirname + '/..',
    env: process.env,
    stdio: 'pipe'
  })
}, 120000)

afterAll(() => {
  delete process.env.AUTH_RATE_SENSITIVE_IP_LIMIT
  delete process.env.AUTH_RATE_LOGIN_IP_LIMIT
  delete process.env.AUTH_TWO_FACTOR_FREE_ATTEMPTS
  delete process.env.AUTH_TWO_FACTOR_BASE_COOLDOWN_MS
  delete process.env.AUTH_TWO_FACTOR_MAX_COOLDOWN_MS
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('Per-account 2FA attempt rate limiting', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  const suffix = Date.now().toString(36)
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const makeAccount = (tag: string) => ({
    name: `2FA Account RL ${tag}`,
    username: `tfa_arl_${tag}_${suffix}`,
    password: `2fa-account-rl-${tag}-password-1`,
    personalId: `7${tag}788811`.padEnd(11, '0').slice(0, 11),
    email: `tfa-account-rl-${tag}-${suffix}@example.invalid`
  })

  const accountA = makeAccount('a')
  const accountB = makeAccount('b')
  const accountC = makeAccount('c')
  const accountD = makeAccount('d')
  const accountE = makeAccount('e')
  const accountF = makeAccount('f')

  const request = () => import('supertest').then((module) => module.default(httpServer))

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    // Needed for the "same account, different apparent IPs" scenario below.
    app.getHttpAdapter().getInstance().set('trust proxy', 1)
    await app.init()
    httpServer = app.getHttpServer()
  }, 60000)

  afterAll(async () => app?.close())

  const registerAndStartSetup = async (account: ReturnType<typeof makeAccount>) => {
    const registered = await (await request()).post('/api/auth/register').send(account)
    expect(registered.status).toBe(201)
    const login = await (await request()).post('/api/auth/login').send({ username: account.username, password: account.password })
    const token = login.body.accessToken as string
    const setup = await (await request()).post('/api/auth/2fa/setup').set('Authorization', `Bearer ${token}`).send({ currentPassword: account.password })
    expect(setup.status).toBe(201)
    return { token, secret: setup.body.secret as string }
  }

  it('locks the account that keeps failing, but never touches a second account sharing the same IP', async () => {
    const a = await registerAndStartSetup(accountA)
    const b = await registerAndStartSetup(accountB)

    // 2 free failures (env threshold) plus the one that actually trips the
    // lock (its own response is still a normal 400) -- the NEXT call after
    // that is the one that comes back blocked.
    for (let i = 0; i < 3; i++) {
      const result = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${a.token}`).send({ code: '000000' })
      expect(result.status).toBe(400)
    }
    const locked = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${a.token}`).send({ code: '000000' })
    expect(locked.status).toBe(429)
    expect(locked.body.code).toBe('TWO_FACTOR_RATE_LIMITED')

    // Account A is fully locked even with the *correct* code now.
    const correctButLocked = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${a.token}`).send({ code: generateSync({ secret: a.secret }) })
    expect(correctButLocked.status).toBe(429)

    // Account B, same test process/IP, is completely unaffected.
    const bAttempt = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${b.token}`).send({ code: '000000' })
    expect(bAttempt.status).toBe(400)
  })

  it('locks the same account regardless of which IP the requests appear to come from', async () => {
    const c = await registerAndStartSetup(accountC)

    const fromIp1 = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${c.token}`).set('X-Forwarded-For', '203.0.113.10').send({ code: '000000' })
    expect(fromIp1.status).toBe(400)
    const fromIp2 = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${c.token}`).set('X-Forwarded-For', '198.51.100.20').send({ code: '000000' })
    expect(fromIp2.status).toBe(400)
    const fromIp3 = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${c.token}`).set('X-Forwarded-For', '192.0.2.30').send({ code: '000000' })
    expect(fromIp3.status).toBe(400)
    // 4th failure, from yet another apparent IP -- still locked, because the
    // limiter tracks the account, not the request's source address.
    const fromIp4 = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${c.token}`).set('X-Forwarded-For', '192.0.2.99').send({ code: '000000' })
    expect(fromIp4.status).toBe(429)
  })

  it('applies the same lock to a wrong recovery code, not just a wrong TOTP code', async () => {
    const d = await registerAndStartSetup(accountD)
    const activated = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${d.token}`).send({ code: generateSync({ secret: d.secret }) })
    expect(activated.status).toBe(201)
    const freshToken = (await (await request()).post('/api/auth/login').send({ username: accountD.username, password: accountD.password, totpCode: generateSync({ secret: d.secret }) })).body.accessToken

    for (let i = 0; i < 3; i++) {
      const result = await (
        await request()
      )
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ currentPassword: accountD.password, recoveryCode: 'not-a-real-recovery-code' })
      expect(result.status).toBe(400)
    }
    const locked = await (
      await request()
    )
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ currentPassword: accountD.password, recoveryCode: 'not-a-real-recovery-code' })
    expect(locked.status).toBe(429)
    expect(locked.body.code).toBe('TWO_FACTOR_RATE_LIMITED')
  })

  it('resets the failure streak on a successful code, so a later mistake does not inherit the old count', async () => {
    const e = await registerAndStartSetup(accountE)

    // Exactly at the free-attempt boundary -- still not locked.
    for (let i = 0; i < 2; i++) {
      const result = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${e.token}`).send({ code: '000000' })
      expect(result.status).toBe(400)
    }
    // A success (real activation) must clear the streak.
    const success = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${e.token}`).send({ code: generateSync({ secret: e.secret }) })
    expect(success.status).toBe(201)

    const freshToken = (await (await request()).post('/api/auth/login').send({ username: accountE.username, password: accountE.password, totpCode: generateSync({ secret: e.secret }) })).body.accessToken

    // If the streak had NOT been reset, this single failure would already be
    // the 3rd cumulative one and would come back locked. It must not.
    const postResetFailure = await (
      await request()
    )
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ currentPassword: accountE.password, code: '000000' })
    expect(postResetFailure.status).toBe(400)
  })

  it('never locks an account permanently -- the cooldown expires and a correct code is accepted again', async () => {
    const f = await registerAndStartSetup(accountF)

    for (let i = 0; i < 3; i++) {
      const result = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${f.token}`).send({ code: '000000' })
      expect(result.status).toBe(400)
    }
    const locked = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${f.token}`).send({ code: '000000' })
    expect(locked.status).toBe(429)

    // AUTH_TWO_FACTOR_BASE_COOLDOWN_MS=2000 for this file -- wait it out.
    await sleep(2200)

    const afterCooldown = await (await request()).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${f.token}`).send({ code: generateSync({ secret: f.secret }) })
    expect(afterCooldown.status).toBe(201)
  })
})
