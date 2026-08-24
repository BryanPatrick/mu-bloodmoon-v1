import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 3D-B Part Q/AM. A true concurrent double-registration is a real
// race: the pre-check in AuthService.register() (a findFirst before the
// insert) is a plain read, not a lock, so both requests can pass it before
// either commits. This proves the actual safety net is the database's own
// unique constraint on Account.email/username, surfaced as a clean 409 (a
// fix landed this phase -- it previously leaked an unhandled 500 with a
// raw Prisma error under this exact race, same P2002-to-409 pattern
// already used in guilds.service.ts), and that at most one
// GameAccountIdentity is ever created either way.
const CONTAINER = 'bloodmoon-e2e-unified-registration-duplicate-safety'

describe('Unified registration duplicate/concurrent safety (Phase 3D-B)', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService

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

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    prisma = moduleRef.get(PrismaService)
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  const request = () => import('supertest').then((m) => m.default(app.getHttpServer()))

  function registerPayload() {
    const seed = randomUUID().slice(0, 8)
    return {
      name: 'Duplicate Safety Test',
      username: `uregdup${seed}`,
      email: `uregdup-${seed}@example.test`,
      password: 'a-fine-password-1',
      personalId: '12345678900'
    }
  }

  it('a second sequential registration with the same email is rejected (409) and creates no second GameAccountIdentity', async () => {
    process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER = 'true'
    try {
      const payload = registerPayload()
      const first = await (await request()).post('/api/auth/register').send(payload)
      expect(first.status).toBe(201)

      const second = await (await request()).post('/api/auth/register').send({ ...payload, username: `${payload.username}b` })
      expect(second.status).toBe(409)

      const identities = await prisma.gameAccountIdentity.findMany({ where: { accountId: first.body.id } })
      expect(identities.length).toBe(1)
    } finally {
      delete process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER
    }
  })

  it('two truly concurrent requests with the same email create at most one Account and one GameAccountIdentity, and never a raw 500', async () => {
    process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER = 'true'
    try {
      const payload = registerPayload()
      const [a, b] = await Promise.all([
        (await request()).post('/api/auth/register').send(payload),
        (await request()).post('/api/auth/register').send({ ...payload, username: `${payload.username}b` })
      ])
      const statuses = [a.status, b.status].sort()
      // Exactly one succeeds (201), the other loses the race -- surfaced as
      // a clean 409, never an unhandled 500 leaking a raw Prisma error.
      expect(statuses).toEqual([201, 409])

      const accounts = await prisma.account.findMany({ where: { email: payload.email.toLowerCase() } })
      expect(accounts.length).toBe(1)
      const identities = await prisma.gameAccountIdentity.findMany({ where: { accountId: accounts[0].id } })
      expect(identities.length).toBe(1)
    } finally {
      delete process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER
    }
  })
})
