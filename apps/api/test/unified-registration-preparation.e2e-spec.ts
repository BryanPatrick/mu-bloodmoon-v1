import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 3B Part I -- proves the GAME_ACCOUNT_PROVISIONING_ON_REGISTER
// feature flag genuinely gates real MU provisioning preparation: OFF
// (the production default, unset) leaves register() byte-for-byte
// unchanged from before this phase; ON (never activated in production
// yet -- see docs/accounts/unified-account-implementation.md) creates
// the GameAccountIdentity(PENDING) row atomically with the Account, via
// Prisma's nested-write, no separate transaction needed. No
// CREATE_GAME_ACCOUNT command exists -- this never reaches PROVISIONING
// or ACTIVE on its own.
const CONTAINER = 'bloodmoon-e2e-unified-registration-prep'

describe('Unified registration preparation (Phase 3B Part I)', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService

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
      name: 'Unified Prep Test',
      username: `uregprep${seed}`,
      email: `uregprep-${seed}@example.test`,
      password: 'a-fine-password-1',
      personalId: '12345678900'
    }
  }

  it('by default (flag unset), registration does NOT create a GameAccountIdentity -- unchanged behavior', async () => {
    delete process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER
    const payload = registerPayload()

    const res = await (await request()).post('/api/auth/register').send(payload)
    expect(res.status).toBe(201)

    const identity = await prisma.gameAccountIdentity.findUnique({ where: { accountId: res.body.id } })
    expect(identity).toBeNull()
  })

  it('with the flag explicitly enabled, registration atomically creates a PENDING GameAccountIdentity', async () => {
    process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER = 'true'
    try {
      const payload = registerPayload()

      const res = await (await request()).post('/api/auth/register').send(payload)
      expect(res.status).toBe(201)

      const identity = await prisma.gameAccountIdentity.findUnique({ where: { accountId: res.body.id } })
      expect(identity).not.toBeNull()
      expect(identity!.provisioningStatus).toBe('PENDING')
      expect(identity!.membGuid).toBeNull()
      expect(identity!.provisioningRequestId).toEqual(expect.any(String))
    } finally {
      delete process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER
    }
  })
})
