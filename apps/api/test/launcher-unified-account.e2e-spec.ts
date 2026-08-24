import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 3B Part J-N -- the new /launcher/me and /launcher/me/characters
// routes (Unified Blood Moon Account status), distinct from the existing
// /launcher/account route (Portal-local profile/display data, unchanged
// by this phase, see launcher-status-source.e2e-spec.ts for its own
// coverage).
const CONTAINER = 'bloodmoon-e2e-launcher-unified-account'

describe('Launcher /me (Phase 3B)', () => {
  let app: import('@nestjs/common').INestApplication

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'

    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  const request = () => import('supertest').then((m) => m.default(app.getHttpServer()))

  async function registerAndLogin() {
    const seed = Math.random().toString(36).slice(2, 10)
    const payload = {
      name: 'Launcher Me Test',
      username: `lchme${seed}`,
      email: `lchme-${seed}@example.test`,
      password: 'a-fine-password-1',
      personalId: '12345678900'
    }
    const registerRes = await (await request()).post('/api/auth/register').send(payload)
    expect(registerRes.status).toBe(201)
    const loginRes = await (await request())
      .post('/api/auth/login')
      .send({ username: payload.username, password: payload.password })
    expect(loginRes.status).toBe(201)
    return { accountId: registerRes.body.id, accessToken: loginRes.body.accessToken as string }
  }

  it('rejects /launcher/me without authentication', async () => {
    const res = await (await request()).get('/api/launcher/me')
    expect(res.status).toBe(401)
  })

  it('rejects /launcher/me/characters without authentication', async () => {
    const res = await (await request()).get('/api/launcher/me/characters')
    expect(res.status).toBe(401)
  })

  it('an authenticated account with no GameAccountIdentity yet gets a safe NONE/not-ready shape', async () => {
    const { accountId, accessToken } = await registerAndLogin()

    const meRes = await (await request()).get('/api/launcher/me').set('Authorization', `Bearer ${accessToken}`)
    expect(meRes.status).toBe(200)
    expect(meRes.body).toEqual({
      accountId,
      username: expect.any(String),
      role: 'PLAYER',
      gameReady: false,
      provisioningStatus: 'NONE'
    })

    const charsRes = await (await request())
      .get('/api/launcher/me/characters')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(charsRes.status).toBe(200)
    expect(charsRes.body).toEqual({ gameReady: false, characters: [] })
  })

  it('never leaks memb___id, memb_guid, password, or 2FA fields through /launcher/me', async () => {
    const { accessToken } = await registerAndLogin()

    const res = await (await request()).get('/api/launcher/me').set('Authorization', `Bearer ${accessToken}`)

    const json = JSON.stringify(res.body)
    expect(json).not.toMatch(/memb___id/i)
    expect(json).not.toMatch(/memb_guid/i)
    expect(json).not.toMatch(/passwordHash/i)
    expect(json).not.toMatch(/twoFactorSecret/i)
    expect(Object.keys(res.body).sort()).toEqual(['accountId', 'gameReady', 'provisioningStatus', 'role', 'username'])
  })

  it('two different accounts each only ever see their own accountId in /launcher/me', async () => {
    const accountA = await registerAndLogin()
    const accountB = await registerAndLogin()

    const meA = await (await request()).get('/api/launcher/me').set('Authorization', `Bearer ${accountA.accessToken}`)
    const meB = await (await request()).get('/api/launcher/me').set('Authorization', `Bearer ${accountB.accessToken}`)

    expect(meA.body.accountId).toBe(accountA.accountId)
    expect(meB.body.accountId).toBe(accountB.accountId)
    expect(meA.body.accountId).not.toBe(meB.body.accountId)
  })
})
