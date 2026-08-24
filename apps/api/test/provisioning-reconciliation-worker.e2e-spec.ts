import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 3D-B Part I/J/K/L. GameProvisioningReconciliationService.runOnce()/
// manualRetry()/listNeedingAttention() -- built only on Phase 3D-A's
// already-exported dispatch()/reconcile(), never touching any file inside
// game-account-identity/. The transport is left unconfigured for this
// whole file (no GAME_DATA_WORKER_URL/GAME_COMMAND_PORTAL_SECRET), so every
// dispatch attempt here deterministically fails at the same, safe,
// structured error -- proving the worker logs an attempt and backs off
// without needing a real Cloudflare/Agent/SQL round trip.
const CONTAINER = 'bloodmoon-e2e-provisioning-reconciliation-worker'

describe('Provisioning reconciliation worker (Phase 3D-B)', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let reconciliation: import('../src/modules/game-provisioning-reconciliation/game-provisioning-reconciliation.service').GameProvisioningReconciliationService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
    delete process.env.GAME_DATA_WORKER_URL
    delete process.env.GAME_COMMAND_PORTAL_SECRET
    // The background setInterval loop stays off (env-gated, matching
    // production default) -- every test drives runOnce()/manualRetry()
    // directly, so timing is deterministic.
    delete process.env.GAME_PROVISIONING_RECONCILIATION_ENABLED

    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { GameProvisioningReconciliationService } = await import(
      '../src/modules/game-provisioning-reconciliation/game-provisioning-reconciliation.service'
    )

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    prisma = moduleRef.get(PrismaService)
    reconciliation = moduleRef.get(GameProvisioningReconciliationService)
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  const request = () => import('supertest').then((m) => m.default(app.getHttpServer()))

  function registerPayload() {
    const seed = randomUUID().slice(0, 8)
    return {
      name: 'Reconciliation Test',
      username: `uregrec${seed}`,
      email: `uregrec-${seed}@example.test`,
      password: 'a-fine-password-1',
      personalId: '12345678900'
    }
  }

  async function registerPending() {
    process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER = 'true'
    try {
      return await (await request()).post('/api/auth/register').send(registerPayload())
    } finally {
      delete process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER
    }
  }

  it('runOnce() finds a PENDING identity and attempts to dispatch it, logging the outcome', async () => {
    const res = await registerPending()

    const result = await reconciliation.runOnce()
    expect(result.scanned).toBeGreaterThan(0)
    expect(result.errors).toBeGreaterThan(0) // transport unconfigured -> dispatch() throws, logged as ERROR

    const attempts = await prisma.gameProvisioningAttempt.findMany({ where: { accountId: res.body.id } })
    expect(attempts.length).toBe(1)
    expect(attempts[0].outcome).toBe('ERROR')
    expect(attempts[0].attemptNumber).toBe(1)
  })

  it('a second immediate runOnce() does not retry the same identity yet -- backoff, not immediate re-attempt', async () => {
    const res = await registerPending()

    await reconciliation.runOnce()
    const afterFirst = await prisma.gameProvisioningAttempt.count({ where: { accountId: res.body.id } })
    await reconciliation.runOnce()
    const afterSecond = await prisma.gameProvisioningAttempt.count({ where: { accountId: res.body.id } })

    expect(afterFirst).toBe(1)
    expect(afterSecond).toBe(1) // still within backoff window, not re-attempted
  })

  it('manualRetry() bypasses backoff, logs the failure, and still reuses the same provisioningRequestId even when it throws', async () => {
    const res = await registerPending()

    const before = await prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId: res.body.id } })
    // Neither the transport nor the credential keyring is configured in
    // this suite -- manualRetry() is expected to fail here (dispatch()
    // reaches credential generation before any network call), but it must
    // still log the attempt and never touch provisioningRequestId.
    await expect(reconciliation.manualRetry(res.body.id)).rejects.toThrow()
    const after = await prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId: res.body.id } })

    expect(after.provisioningRequestId).toBe(before.provisioningRequestId)
    const attempts = await prisma.gameProvisioningAttempt.findMany({
      where: { provisioningRequestId: before.provisioningRequestId }
    })
    expect(attempts.length).toBe(1)
    expect(attempts[0].outcome).toBe('ERROR')
  })

  it('listNeedingAttention() never includes credential, ciphertext, or legacyLogin fields', async () => {
    await registerPending()

    const list = await reconciliation.listNeedingAttention()
    const json = JSON.stringify(list)
    expect(json).not.toMatch(/ciphertext/i)
    expect(json).not.toMatch(/legacyLogin/i)
    expect(json).not.toMatch(/nonce/i)
    expect(json).not.toMatch(/\btag\b/i)
  })
})
