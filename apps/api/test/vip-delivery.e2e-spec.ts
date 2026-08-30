import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 14 Part C -- VIP GameBridge delivery worker. The only gateway that
// exists (UnconfiguredVipGameBridgeGateway) always reports "not configured"
// -- these tests exercise the real claim/backoff/ceiling/reconciliation
// state machine against that honest-failure gateway, not a fabricated
// success path. See vip-delivery.gateway.ts's header comment.
const CONTAINER = 'bloodmoon-e2e-vip-delivery'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => stopDisposableDatabase(CONTAINER))

jest.setTimeout(30000)

describe('VIP GameBridge delivery worker -- Phase 14 Part C', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let delivery: import('../src/modules/vip/vip-delivery.service').VipDeliveryService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { VipDeliveryService } = await import('../src/modules/vip/vip-delivery.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    delivery = app.get(VipDeliveryService)

    // Test-isolation hygiene: this suite's own repeated local runs leave
    // PENDING GRANT_VIP jobs behind (each failed-delivery retry bounces a
    // job back to PENDING rather than deleting it, by design -- see
    // vip-delivery.service.ts). Against the persistent local dev DB, those
    // accumulate across runs and can crowd a single runOnce() batch ahead
    // of the job a given test just created, which is exactly what caused a
    // real intermittent failure the first time this suite ran alongside
    // other files. Scoped narrowly to GRANT_VIP jobs only, on this
    // disposable local dev database only -- never run against a shared or
    // production database.
    await prisma.gameBridgeJob.deleteMany({ where: { operation: 'GRANT_VIP', status: { in: ['PENDING', 'FAILED'] } } })
  }, 60000)

  afterAll(async () => app?.close())

  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeAccount(label: string) {
    const s = suffix()
    return prisma.account.create({
      data: {
        username: `${label}_${s}`.slice(0, 20),
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE'
      }
    })
  }

  async function makeGrantVipJob(accountId: string, idempotencyKey: string) {
    return prisma.gameBridgeJob.create({
      data: {
        accountId,
        operation: 'GRANT_VIP',
        idempotencyKey,
        payload: { accountId, tier: 'BRONZE', expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() }
      }
    })
  }

  test('VIP_DELIVERY_UNCONFIGURED_GATEWAY_RETRIES_NOT_FALSELY_SUCCEEDS', async () => {
    const account = await makeAccount('vipdlv')
    const job = await makeGrantVipJob(account.id, `vip-bridge:${suffix()}`)

    const result = await delivery.runOnce()
    expect(result.scanned).toBeGreaterThanOrEqual(1)
    expect(result.retried).toBeGreaterThanOrEqual(1)
    expect(result.delivered).toBe(0)

    const updated = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(updated.status).toBe('PENDING')
    expect(updated.attempts).toBe(1)
    expect(updated.error).toBe('GAME_BRIDGE_NOT_CONFIGURED')
    expect(updated.availableAt.getTime()).toBeGreaterThan(Date.now() - 1000)
  })

  test('VIP_DELIVERY_MAX_ATTEMPTS_TERMINATES_TO_FAILED_NEVER_SILENTLY_DROPPED', async () => {
    const account = await makeAccount('vipdlvfail')
    const job = await makeGrantVipJob(account.id, `vip-bridge:${suffix()}`)

    // Force the job to just below the ceiling, then let one more real tick
    // push it over -- avoids 8 real backoff-respecting ticks in a test.
    await prisma.gameBridgeJob.update({ where: { id: job.id }, data: { attempts: 7, availableAt: new Date() } })

    await delivery.runOnce()

    const updated = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(updated.status).toBe('FAILED')
    expect(updated.attempts).toBe(8)
    expect(updated.processedAt).not.toBeNull()
    expect(updated.error).toBe('GAME_BRIDGE_NOT_CONFIGURED')
  })

  test('VIP_DELIVERY_CONCURRENT_CLAIM_EXACTLY_ONE_WINS', async () => {
    const account = await makeAccount('vipdlvrace')
    const job = await makeGrantVipJob(account.id, `vip-bridge:${suffix()}`)

    // Two concurrent ticks racing on the same single PENDING row -- the
    // atomic updateMany({where:{id,status:'PENDING'}}) claim means at most
    // one should actually process it in this pass.
    const [a, b] = await Promise.all([delivery.runOnce(), delivery.runOnce()])
    const totalActedOnThisJob = a.retried + a.delivered + a.failedFinal + (b.retried + b.delivered + b.failedFinal)

    const updated = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    // Exactly one attempt was recorded against this job across both ticks,
    // even though both ticks scanned it as a PENDING candidate.
    expect(updated.attempts).toBe(1)
    expect(totalActedOnThisJob).toBeGreaterThanOrEqual(1)
  })

  test('VIP_DELIVERY_STALE_PROCESSING_RECOVERED_NEXT_TICK', async () => {
    const account = await makeAccount('vipdlvstale')
    const job = await makeGrantVipJob(account.id, `vip-bridge:${suffix()}`)

    // Simulate a crash mid-delivery: PROCESSING with an old updatedAt.
    await prisma.$executeRawUnsafe(
      `UPDATE GameBridgeJob SET status='PROCESSING', attempts=1, updatedAt=DATE_SUB(NOW(), INTERVAL 10 MINUTE) WHERE id=?`,
      job.id
    )

    await delivery.runOnce()

    const updated = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    // Recovered back into the retry cycle (not stuck in PROCESSING forever),
    // and the attempt count from before the crash is preserved.
    expect(updated.status).toBe('PENDING')
    expect(updated.attempts).toBe(2)
  })

  test('VIP_DELIVERY_MANUAL_RETRY_IGNORES_BACKOFF_SAME_HONEST_OUTCOME', async () => {
    const account = await makeAccount('vipdlvmanual')
    const job = await makeGrantVipJob(account.id, `vip-bridge:${suffix()}`)
    // Push far into the future so an automatic tick would skip it.
    await prisma.gameBridgeJob.update({ where: { id: job.id }, data: { availableAt: new Date(Date.now() + 3_600_000) } })

    const skippedByAutoTick = await delivery.runOnce()
    const beforeManual = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(beforeManual.attempts).toBe(0)
    void skippedByAutoTick

    const manual = await delivery.manualRetry(job.id)
    expect(manual.status).toBe('PENDING')

    const afterManual = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(afterManual.attempts).toBe(1)
  })

  test('VIP_DELIVERY_RECONCILIATION_FLAGS_ACTIVE_ENTITLEMENT_WITH_UNSYNCED_GRANT', async () => {
    const account = await makeAccount('vipdriftflag')
    const grantKey = `drift-${suffix()}`

    const entitlement = await prisma.vipEntitlement.create({
      data: {
        accountId: account.id,
        tier: 'BRONZE',
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        totalDaysGranted: 7,
        status: 'ACTIVE',
        grants: {
          create: {
            accountId: account.id,
            tier: 'BRONZE',
            durationDays: 7,
            sourceType: 'VipProductConfig',
            sourceId: 'test-product',
            idempotencyKey: grantKey,
            newExpiresAt: new Date(Date.now() + 7 * 86_400_000)
          }
        }
      }
    })

    // No GameBridgeJob row exists at all for this grant's bridge key --
    // the "MISSING" case (e.g. a job whose creation itself never
    // committed).
    const drift = await delivery.reconcileEntitlements()
    const row = drift.find((d) => d.accountId === account.id)
    expect(row).toBeDefined()
    expect(row?.bridgeJobStatus).toBe('MISSING')
    expect(row?.grantIdempotencyKey).toBe(grantKey)
    void entitlement
  })

  test('VIP_DELIVERY_RECONCILIATION_DOES_NOT_FLAG_COMPLETED_SYNC', async () => {
    const account = await makeAccount('vipdriftok')
    const grantKey = `synced-${suffix()}`

    await prisma.vipEntitlement.create({
      data: {
        accountId: account.id,
        tier: 'GOLD',
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        totalDaysGranted: 30,
        status: 'ACTIVE',
        grants: {
          create: {
            accountId: account.id,
            tier: 'GOLD',
            durationDays: 30,
            sourceType: 'VipProductConfig',
            sourceId: 'test-product',
            idempotencyKey: grantKey,
            newExpiresAt: new Date(Date.now() + 30 * 86_400_000)
          }
        }
      }
    })
    await prisma.gameBridgeJob.create({
      data: {
        accountId: account.id,
        operation: 'GRANT_VIP',
        idempotencyKey: `vip-bridge:${grantKey}`,
        status: 'COMPLETED',
        processedAt: new Date(),
        payload: { accountId: account.id, tier: 'GOLD', expiresAt: new Date().toISOString() }
      }
    })

    const drift = await delivery.reconcileEntitlements()
    expect(drift.find((d) => d.accountId === account.id)).toBeUndefined()
  })
})
