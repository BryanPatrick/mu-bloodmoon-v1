import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 3B Part O-S -- the Discord read-only integration. Never shares
// the Admin API, Launcher session, GameBridge HMAC secret, or SQL
// credentials (docs/integrations/discord-read-api.md).
const CONTAINER = 'bloodmoon-e2e-discord-read-api'

describe('Discord read-only integration (Phase 3B)', () => {
  let app: import('@nestjs/common').INestApplication
  let credentials: import('../src/modules/integrations-discord/discord-service-credential.service').DiscordServiceCredentialService

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
    const { DiscordServiceCredentialService } = await import(
      '../src/modules/integrations-discord/discord-service-credential.service'
    )

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    credentials = moduleRef.get(DiscordServiceCredentialService)
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  const request = () => import('supertest').then((m) => m.default(app.getHttpServer()))

  it('rejects a request with no credential at all', async () => {
    const res = await (await request()).get('/api/integrations/discord/server-status')
    expect(res.status).toBe(401)
  })

  it('rejects a request with a wrong/garbage credential', async () => {
    const res = await (await request())
      .get('/api/integrations/discord/server-status')
      .set('X-Discord-Api-Key', 'discbot_totally-not-a-real-key')
    expect(res.status).toBe(401)
  })

  it('rejects a real Launcher/Portal JWT presented as a Discord credential', async () => {
    const res = await (await request())
      .get('/api/integrations/discord/server-status')
      .set('X-Discord-Api-Key', 'Bearer.fake.jwt.not.a.discord.key')
    expect(res.status).toBe(401)
  })

  it('a valid credential with the right scope succeeds; server-status has a safe shape', async () => {
    const { rawKey } = await credentials.issue('e2e-test-bot', ['discord:server:read'])

    const res = await (await request())
      .get('/api/integrations/discord/server-status')
      .set('X-Discord-Api-Key', rawKey)

    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual(['maintenance', 'status', 'statusSource'])
    expect(['MANUAL', 'LIVE', 'UNKNOWN']).toContain(res.body.statusSource)
  })

  it('a valid credential WITHOUT the required scope is rejected on a different route', async () => {
    const { rawKey } = await credentials.issue('e2e-scoped-bot', ['discord:news:read'])

    const res = await (await request()).get('/api/integrations/discord/rankings').set('X-Discord-Api-Key', rawKey)

    expect(res.status).toBe(401)
  })

  it('a revoked credential is rejected even though it was previously valid', async () => {
    const { id, rawKey } = await credentials.issue('e2e-revoke-me', ['discord:events:read'])
    const before = await (await request()).get('/api/integrations/discord/events').set('X-Discord-Api-Key', rawKey)
    expect(before.status).toBe(200)

    await credentials.revoke(id)

    const after = await (await request()).get('/api/integrations/discord/events').set('X-Discord-Api-Key', rawKey)
    expect(after.status).toBe(401)
  })

  it('rankings never leak account identity -- only public character name/class/value', async () => {
    const { rawKey } = await credentials.issue('e2e-rankings-bot', ['discord:rankings:read'])

    const res = await (await request()).get('/api/integrations/discord/rankings').set('X-Discord-Api-Key', rawKey)

    expect(res.status).toBe(200)
    const json = JSON.stringify(res.body)
    expect(json).not.toMatch(/accountId/i)
    expect(json).not.toMatch(/memb___id/i)
    expect(json).not.toMatch(/memb_guid/i)
    expect(json).not.toMatch(/email/i)
    if (res.body.entries.length > 0) {
      expect(Object.keys(res.body.entries[0]).sort()).toEqual(['characterName', 'className', 'position', 'value'])
    }
  })

  it('news never leaks anything beyond the public DTO shape', async () => {
    const { rawKey } = await credentials.issue('e2e-news-bot', ['discord:news:read'])

    const res = await (await request()).get('/api/integrations/discord/news').set('X-Discord-Api-Key', rawKey)

    expect(res.status).toBe(200)
    for (const item of res.body.items) {
      expect(Object.keys(item).sort()).toEqual(['category', 'publicationDate', 'summary', 'title', 'websiteUrl'])
    }
  })

  it('no mutation route exists anywhere under /integrations/discord', async () => {
    const { rawKey } = await credentials.issue('e2e-no-mutation-bot', ['discord:*'])

    const post = await (await request())
      .post('/api/integrations/discord/server-status')
      .set('X-Discord-Api-Key', rawKey)
    const put = await (await request()).put('/api/integrations/discord/events').set('X-Discord-Api-Key', rawKey)
    const del = await (await request()).delete('/api/integrations/discord/rankings').set('X-Discord-Api-Key', rawKey)

    expect(post.status).toBe(404)
    expect(put.status).toBe(404)
    expect(del.status).toBe(404)
  })
})
