import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 3D-B. Covers the registration response's safe gameReady/
// provisioningStatus fields and the post-commit dispatch call being
// skipped (not attempted) when the command transport isn't configured --
// avoiding both a real credential/PROVISIONING side effect and a race
// against this test's own assertions. Kept to a handful of registrations
// (this suite's own `register` abuse-guard budget is 10/hour/IP, scoped to
// this file's own fresh in-memory limiter instance) -- see
// unified-registration-duplicate-safety.e2e-spec.ts,
// provisioning-reconciliation-worker.e2e-spec.ts, and
// game-provisioning-admin-rbac.e2e-spec.ts for the rest, split out for the
// same reason.
const CONTAINER = 'bloodmoon-e2e-unified-registration-activation'

describe('Unified registration activation (Phase 3D-B)', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
    // Deliberately left unset for this whole file -- proves the dispatch
    // skip-when-unconfigured guard, and keeps every test deterministic (no
    // background credential generation racing test assertions).
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
      name: 'Activation Test',
      username: `uregact${seed}`,
      email: `uregact-${seed}@example.test`,
      password: 'a-fine-password-1',
      personalId: '12345678900'
    }
  }

  describe('registration response', () => {
    afterEach(() => delete process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER)

    it('returns gameReady=false and provisioningStatus=NONE when the flag is off', async () => {
      const res = await (await request()).post('/api/auth/register').send(registerPayload())
      expect(res.status).toBe(201)
      expect(res.body.gameReady).toBe(false)
      expect(res.body.provisioningStatus).toBe('NONE')
    })

    it('returns gameReady=false and provisioningStatus=PENDING when the flag is on', async () => {
      process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER = 'true'
      const res = await (await request()).post('/api/auth/register').send(registerPayload())
      expect(res.status).toBe(201)
      expect(res.body.gameReady).toBe(false)
      expect(res.body.provisioningStatus).toBe('PENDING')
    })

    it('never exposes legacyLogin, membGuid, credential, or provisioningRequestId in the registration response', async () => {
      process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER = 'true'
      const res = await (await request()).post('/api/auth/register').send(registerPayload())
      const json = JSON.stringify(res.body)
      expect(json).not.toMatch(/legacyLogin/i)
      expect(json).not.toMatch(/membGuid/i)
      expect(json).not.toMatch(/provisioningRequestId/i)
      expect(json).not.toMatch(/ciphertext/i)
      expect(json).not.toMatch(/commandId/i)
    })
  })

  describe('dispatch is skipped, not attempted, when the transport is unconfigured', () => {
    it('the identity stays exactly PENDING immediately after registration -- no premature PROVISIONING side effect', async () => {
      process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER = 'true'
      try {
        const res = await (await request()).post('/api/auth/register').send(registerPayload())
        expect(res.status).toBe(201)

        // If dispatch() had actually been attempted despite being
        // unconfigured, it would still write a GameAccountCredential row
        // and flip the identity to PROVISIONING before failing at the
        // network call -- assert neither happened.
        const identity = await prisma.gameAccountIdentity.findUnique({ where: { accountId: res.body.id } })
        expect(identity!.provisioningStatus).toBe('PENDING')
        const credential = await prisma.gameAccountCredential.findUnique({ where: { accountId: res.body.id } })
        expect(credential).toBeNull()
      } finally {
        delete process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER
      }
    })
  })
})
