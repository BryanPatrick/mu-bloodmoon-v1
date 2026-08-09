import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-password-recovery'
const originalFetch = global.fetch

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-password-recovery-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-password-recovery-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-password-recovery-two-factor-key-32-characters'
  process.env.TURNSTILE_SECRET_KEY = 'e2e-turnstile-secret'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '0'
  process.env.AUTH_MAIL_TEST_BYPASS = '1'
  process.env.WEB_PUBLIC_URL = 'https://e2e.bloodmoon.invalid'
  process.env.AUTH_PASSWORD_RESET_TTL_MINUTES = '30'
  process.env.AUTH_RATE_RECOVERY_IP_LIMIT = '3'
  process.env.AUTH_RATE_RECOVERY_IP_WINDOW_MS = '80'
  process.env.AUTH_RATE_RECOVERY_SUBJECT_LIMIT = '3'
  process.env.AUTH_RATE_RECOVERY_SUBJECT_WINDOW_MS = '80'
  process.env.AUTH_RATE_LOGIN_IP_LIMIT = '50'
  process.env.AUTH_RATE_LOGIN_SUBJECT_LIMIT = '50'
  process.env.AUTH_RATE_REGISTER_IP_LIMIT = '50'
  process.env.AUTH_RATE_REGISTER_SUBJECT_LIMIT = '50'

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

describe('Password recovery', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let limiter: import('../src/modules/auth/auth-rate-limit.service').AuthRateLimitService
  let mailTransport: import('../src/modules/auth/mail-transport.service').MailTransportService
  let prisma: import('../src/database/prisma.service').PrismaService
  const suffix = Date.now().toString(36)
  const user = {
    name: 'Password Recovery E2E',
    username: `pw_recovery_${suffix}`,
    password: 'correct-horse-battery-staple',
    personalId: '99887766554',
    email: `pw-recovery-${suffix}@example.invalid`
  }

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { AuthRateLimitService } = await import('../src/modules/auth/auth-rate-limit.service')
    const { MailTransportService } = await import('../src/modules/auth/mail-transport.service')
    const { PrismaService } = await import('../src/database/prisma.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    limiter = app.get(AuthRateLimitService)
    mailTransport = app.get(MailTransportService)
    prisma = app.get(PrismaService)

    await (
      await request()
    )
      .post('/api/auth/register')
      .send({ ...user, captchaToken: 'valid-register' })
  }, 60000)

  afterAll(async () => app?.close())
  beforeEach(() => {
    limiter.reset()
    mailTransport.consumeLastSentForTest()
  })

  const request = () => import('supertest').then((module) => module.default(httpServer))

  const extractToken = (text: string) => {
    const match = text.match(/token=([a-f0-9]+)/)
    if (!match) throw new Error('reset token not found in captured email')
    return match[1]
  }

  it('returns a generic response for an existing account and sends a reset email', async () => {
    const result = await (
      await request()
    )
      .post('/api/auth/password-recovery/request')
      .send({ email: user.email, captchaToken: 'valid-recovery' })
    expect(result.status).toBe(201)
    expect(result.body).toEqual({ ok: true })

    const sent = mailTransport.consumeLastSentForTest()
    expect(sent?.to).toBe(user.email)
    expect(sent?.text).toContain('https://e2e.bloodmoon.invalid/redefinir-senha?token=')
  })

  it('returns the same generic response for a non-existing account and sends no email', async () => {
    const result = await (
      await request()
    )
      .post('/api/auth/password-recovery/request')
      .send({ email: 'nobody-here@example.invalid', captchaToken: 'valid-recovery' })
    expect(result.status).toBe(201)
    expect(result.body).toEqual({ ok: true })
    expect(mailTransport.consumeLastSentForTest()).toBeNull()
  })

  it('rejects an invalid email format', async () => {
    const result = await (
      await request()
    )
      .post('/api/auth/password-recovery/request')
      .send({ email: 'not-an-email', captchaToken: 'valid-recovery' })
    expect(result.status).toBe(400)
  })

  it('rejects a request without CAPTCHA', async () => {
    const result = await (
      await request()
    )
      .post('/api/auth/password-recovery/request')
      .send({ email: user.email })
    expect(result.status).toBe(400)
  })

  it('rate limits recovery request bursts and sends Retry-After', async () => {
    const req = await request()
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await req.post('/api/auth/password-recovery/request').send({
        email: `burst-${attempt}-${suffix}@example.invalid`,
        captchaToken: 'valid-recovery'
      })
      expect(result.status).toBe(201)
    }
    const blocked = await req.post('/api/auth/password-recovery/request').send({
      email: `burst-final-${suffix}@example.invalid`,
      captchaToken: 'valid-recovery'
    })
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('still returns a generic success when the mail transport fails', async () => {
    delete process.env.AUTH_MAIL_TEST_BYPASS
    try {
      const result = await (
        await request()
      )
        .post('/api/auth/password-recovery/request')
        .send({ email: user.email, captchaToken: 'valid-recovery' })
      expect(result.status).toBe(201)
      expect(result.body).toEqual({ ok: true })
    } finally {
      process.env.AUTH_MAIL_TEST_BYPASS = '1'
    }
  })

  it('rejects reset with a garbage token', async () => {
    const result = await (
      await request()
    )
      .post('/api/auth/password-recovery/reset')
      .send({ token: 'not-a-real-token', newPassword: 'brand-new-password-1' })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('TOKEN_INVALID')
  })

  it('rejects reset with a password outside the policy', async () => {
    await (
      await request()
    )
      .post('/api/auth/password-recovery/request')
      .send({ email: user.email, captchaToken: 'valid-recovery' })
    const sent = mailTransport.consumeLastSentForTest()
    const token = extractToken(sent!.text)

    const result = await (
      await request()
    )
      .post('/api/auth/password-recovery/reset')
      .send({ token, newPassword: 'short' })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('PASSWORD_INVALID')
  })

  it('rejects reset with an expired token', async () => {
    await (
      await request()
    )
      .post('/api/auth/password-recovery/request')
      .send({ email: user.email, captchaToken: 'valid-recovery' })
    const sent = mailTransport.consumeLastSentForTest()
    const token = extractToken(sent!.text)
    const tokenHash = createHash('sha256').update(token).digest('hex')

    await prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 1000) }
    })

    const result = await (
      await request()
    )
      .post('/api/auth/password-recovery/reset')
      .send({ token, newPassword: 'brand-new-password-1' })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('TOKEN_EXPIRED')
  })

  it('completes the full flow: request, reset, session revocation, reuse rejected', async () => {
    const loginBefore = await (await request()).post('/api/auth/login').send({
      username: user.username,
      password: user.password,
      captchaToken: 'valid-login'
    })
    expect(loginBefore.status).toBe(201)
    const oldAccessToken = loginBefore.body.accessToken as string

    await (
      await request()
    )
      .post('/api/auth/password-recovery/request')
      .send({ email: user.email, captchaToken: 'valid-recovery' })
    const sent = mailTransport.consumeLastSentForTest()
    const token = extractToken(sent!.text)

    const newPassword = 'a-brand-new-secure-password-1'
    const resetResult = await (
      await request()
    )
      .post('/api/auth/password-recovery/reset')
      .send({ token, newPassword })
    expect(resetResult.status).toBe(201)
    expect(resetResult.body).toEqual({ ok: true })

    const reused = await (
      await request()
    )
      .post('/api/auth/password-recovery/reset')
      .send({ token, newPassword: 'another-password-attempt-1' })
    expect(reused.status).toBe(400)
    expect(reused.body.code).toBe('TOKEN_USED')

    const refreshWithOldToken = await (
      await request()
    )
      .post('/api/auth/refresh')
      .send({ refreshToken: loginBefore.body.refreshToken })
    expect(refreshWithOldToken.status).toBe(401)

    const loginOldPassword = await (await request()).post('/api/auth/login').send({
      username: user.username,
      password: user.password,
      captchaToken: 'valid-login'
    })
    expect(loginOldPassword.status).toBe(401)

    const loginNewPassword = await (await request()).post('/api/auth/login').send({
      username: user.username,
      password: newPassword,
      captchaToken: 'valid-login'
    })
    expect(loginNewPassword.status).toBe(201)
    expect(typeof loginNewPassword.body.accessToken).toBe('string')
    expect(loginNewPassword.body.accessToken).not.toBe(oldAccessToken)
  })
})
