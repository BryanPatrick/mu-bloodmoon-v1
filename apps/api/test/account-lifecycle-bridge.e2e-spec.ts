import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// decision C + Bryan's 2026-08-30 follow-up. Real sender for the
// ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT GameBridgeJob rows that
// account-deletion.service.ts already queues but never delivered before
// this round. Two test groups: the honest-unconfigured-transport path
// (real GameCommandTransportClient, mirrors vip-delivery.e2e-spec.ts's own
// top test) and the full dispatch/reconcile/ceiling/audit state machine
// (a FakeTransport override, since that machinery cannot be exercised
// without at least a working transport.create()).
const CONTAINER = 'bloodmoon-e2e-account-lifecycle-bridge'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  delete process.env.GAME_DATA_WORKER_URL
  delete process.env.GAME_COMMAND_PORTAL_SECRET
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => stopDisposableDatabase(CONTAINER))

jest.setTimeout(30000)

const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

describe('Account lifecycle GameBridge sender -- unconfigured transport (real client)', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let bridge: import('../src/modules/accounts/account-lifecycle-bridge.service').AccountLifecycleBridgeService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { AccountLifecycleBridgeService } = await import('../src/modules/accounts/account-lifecycle-bridge.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    bridge = app.get(AccountLifecycleBridgeService)

    // Test-isolation hygiene (same root cause as vip-delivery.e2e-spec.ts's
    // own GRANT_VIP cleanup): every test in this describe block deliberately
    // leaves its job PENDING forever (that's the whole point -- proving an
    // unconfigured transport doesn't falsely complete a retry), so against
    // the persistent local dev DB these accumulate across every run of this
    // file, ever. Once that backlog exceeds runOnceWithLock()'s batchSize
    // (default 20, ordered by availableAt asc), a freshly-created job in
    // THIS run is always newer than the backlog and never enters the
    // take(batchSize) window -- confirmed via direct query: 48 leftover
    // PENDING rows for these 2 operations before this fix. Scoped narrowly
    // to the 2 operations this file's sender handles, on the local dev DB
    // only -- never run against a shared or production database.
    await prisma.gameBridgeJob.deleteMany({
      where: { operation: { in: ['ANONYMIZE_GAME_ACCOUNT', 'PURGE_GAME_ACCOUNT'] }, status: { in: ['PENDING', 'FAILED'] } }
    })
  }, 60000)

  afterAll(async () => app?.close())

  async function makeAccount(label: string) {
    const s = suffix()
    return prisma.account.create({
      data: {
        username: `${label}_${s}`, name: `${label} ${s}`, email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash', personalIdHash: 'not-a-real-hash', role: 'PLAYER', status: 'ACTIVE'
      }
    })
  }

  test('LIFECYCLE_BRIDGE_UNCONFIGURED_TRANSPORT_ANONYMIZE_RETRIES_NOT_FALSELY_COMPLETED', async () => {
    const account = await makeAccount('lifecycleanon')
    const job = await prisma.gameBridgeJob.create({
      data: {
        accountId: account.id, operation: 'ANONYMIZE_GAME_ACCOUNT',
        idempotencyKey: `test-anon:${suffix()}`,
        payload: { accountId: account.id, legacyLogin: `u${suffix()}`.slice(0, 10) }
      }
    })

    const result = await bridge.runOnce()
    expect(result.errors).toBe(0) // a failed dispatch is handled, not an uncaught error
    expect(result.dispatched).toBe(0)

    const updated = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(updated.status).toBe('PENDING')
    expect(updated.attempts).toBe(1)
    expect(updated.error).toBe('GAME_COMMAND_TRANSPORT_NOT_CONFIGURED')
    expect(updated.result).toBeNull()
  })

  test('LIFECYCLE_BRIDGE_UNCONFIGURED_TRANSPORT_PURGE_RETRIES_NOT_FALSELY_COMPLETED', async () => {
    const account = await makeAccount('lifecyclepurge')
    const job = await prisma.gameBridgeJob.create({
      data: {
        accountId: account.id, operation: 'PURGE_GAME_ACCOUNT',
        idempotencyKey: `test-purge:${suffix()}`,
        payload: { accountId: account.id, legacyLogin: `u${suffix()}`.slice(0, 10), betaCycleId: 'cycle-test-1' }
      }
    })

    await bridge.runOnce()
    const updated = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(updated.status).toBe('PENDING')
    expect(updated.error).toBe('GAME_COMMAND_TRANSPORT_NOT_CONFIGURED')
  })

  test('LIFECYCLE_BRIDGE_PURGE_REJECTS_MISSING_BETA_CYCLE_ID_WITHOUT_SENDING', async () => {
    const account = await makeAccount('lifecyclenobatch')
    const job = await prisma.gameBridgeJob.create({
      data: {
        accountId: account.id, operation: 'PURGE_GAME_ACCOUNT',
        idempotencyKey: `test-purge-nobatch:${suffix()}`,
        payload: { accountId: account.id, legacyLogin: `u${suffix()}`.slice(0, 10) } // no betaCycleId
      }
    })

    await bridge.runOnce()
    const updated = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(updated.status).toBe('PENDING')
    expect(updated.error).toBe('BETA_CYCLE_ID_REQUIRED')
  })
})

describe('Account lifecycle GameBridge sender -- full state machine (fake transport)', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let bridge: import('../src/modules/accounts/account-lifecycle-bridge.service').AccountLifecycleBridgeService
  let auditModel: import('../src/database/prisma.service').PrismaService['auditEvent']

  class FakeTransport {
    nextGetStatus: 'SUCCEEDED' | 'FAILED_FINAL' | 'EXPIRED' | 'CLAIMED' = 'SUCCEEDED'
    createCalls: Array<{ commandId: string; commandType: string }> = []
    async create(command: { commandId: string; commandType: string }): Promise<void> {
      this.createCalls.push({ commandId: command.commandId, commandType: command.commandType })
    }
    async get(commandId: string) {
      return {
        commandId, provisioningRequestId: 'unused', status: this.nextGetStatus,
        resultCode: this.nextGetStatus === 'SUCCEEDED' ? 'SUCCEEDED' : 'MU_TRANSACTION_FAILED',
        membGuid: null, detailJson: this.nextGetStatus === 'SUCCEEDED' ? '{"character":1}' : null,
        completedAt: new Date().toISOString(), attemptCount: 1, expiresAt: new Date(Date.now() + 3600_000).toISOString()
      }
    }
    async retry(): Promise<void> { /* not used by AccountLifecycleBridgeService */ }
  }
  let fakeTransport: FakeTransport

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { AccountLifecycleBridgeService } = await import('../src/modules/accounts/account-lifecycle-bridge.service')
    const { GameCommandTransportClient } = await import('../src/modules/game-account-identity/game-command-transport.client')

    fakeTransport = new FakeTransport()
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GameCommandTransportClient).useValue(fakeTransport)
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    bridge = app.get(AccountLifecycleBridgeService)
    auditModel = prisma.auditEvent

    // Same test-isolation hygiene as the describe block above -- this
    // block's own jobs normally reach a terminal state via the fake
    // transport, but a large leftover PENDING backlog from the previous
    // block (or earlier runs) can still crowd a freshly-created job out of
    // runOnceWithLock()'s take(batchSize) window before this block's tests
    // ever get to exercise their own dispatch/reconcile logic.
    await prisma.gameBridgeJob.deleteMany({
      where: { operation: { in: ['ANONYMIZE_GAME_ACCOUNT', 'PURGE_GAME_ACCOUNT'] }, status: { in: ['PENDING', 'FAILED'] } }
    })
  }, 60000)

  afterAll(async () => app?.close())

  async function makeAccount(label: string) {
    const s = suffix()
    return prisma.account.create({
      data: {
        username: `${label}_${s}`, name: `${label} ${s}`, email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash', personalIdHash: 'not-a-real-hash', role: 'PLAYER', status: 'ACTIVE'
      }
    })
  }

  test('LIFECYCLE_BRIDGE_ANONYMIZE_DISPATCH_THEN_SUCCEEDED_COMPLETES_JOB_AND_AUDITS_BOTH_ENDS', async () => {
    fakeTransport.nextGetStatus = 'SUCCEEDED'
    const account = await makeAccount('anondispatch')
    const legacyLogin = `u${suffix()}`.slice(0, 10)
    const job = await prisma.gameBridgeJob.create({
      data: { accountId: account.id, operation: 'ANONYMIZE_GAME_ACCOUNT', idempotencyKey: `anon-ok:${suffix()}`, payload: { accountId: account.id, legacyLogin } }
    })

    const dispatchTick = await bridge.runOnce()
    expect(dispatchTick.dispatched).toBe(1)
    const afterDispatch = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(afterDispatch.status).toBe('PROCESSING')
    const dispatchResult = afterDispatch.result as unknown as { commandId: string }
    expect(dispatchResult.commandId).toBeTruthy()

    const sentAudit = await auditModel.findFirst({ where: { action: 'gamebridge.anonymize.sent', targetId: account.id } })
    expect(sentAudit?.correlationId).toBe(dispatchResult.commandId)

    const reconcileTick = await bridge.runOnce()
    expect(reconcileTick.completed).toBe(1)
    const afterReconcile = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(afterReconcile.status).toBe('COMPLETED')
    expect(afterReconcile.processedAt).not.toBeNull()

    const completedAudit = await auditModel.findFirst({ where: { action: 'gamebridge.anonymize.completed', targetId: account.id } })
    expect(completedAudit?.correlationId).toBe(dispatchResult.commandId)
  })

  test('LIFECYCLE_BRIDGE_PURGE_DISPATCH_THEN_SUCCEEDED_COMPLETES_AND_APPEARS_IN_BATCH_REPORT', async () => {
    fakeTransport.nextGetStatus = 'SUCCEEDED'
    const account = await makeAccount('purgedispatch')
    const legacyLogin = `u${suffix()}`.slice(0, 10)
    const betaCycleId = `cycle-${suffix()}`
    await prisma.gameBridgeJob.create({
      data: { accountId: account.id, operation: 'PURGE_GAME_ACCOUNT', idempotencyKey: `purge-ok:${suffix()}`, payload: { accountId: account.id, legacyLogin, betaCycleId } }
    })

    await bridge.runOnce()
    await bridge.runOnce()

    const report = await bridge.purgeBatchReport(betaCycleId)
    expect(report).toHaveLength(1)
    expect(report[0]).toMatchObject({ accountId: account.id, status: 'COMPLETED', resultCode: 'SUCCEEDED' })
  })

  test('LIFECYCLE_BRIDGE_MAX_ATTEMPTS_TERMINATES_TO_FAILED_AND_AUDITS_FAILURE', async () => {
    fakeTransport.nextGetStatus = 'FAILED_FINAL'
    const account = await makeAccount('anonceiling')
    const legacyLogin = `u${suffix()}`.slice(0, 10)
    const job = await prisma.gameBridgeJob.create({
      data: {
        accountId: account.id, operation: 'ANONYMIZE_GAME_ACCOUNT', idempotencyKey: `anon-ceiling:${suffix()}`,
        payload: { accountId: account.id, legacyLogin }, attempts: 8 // already at MAX_ATTEMPTS
      }
    })

    await bridge.runOnce() // dispatch (attempts -> 9, but claim already recorded 8 before this)
    await bridge.runOnce() // reconcile sees FAILED_FINAL with attempts >= ceiling -> FAILED

    const updated = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(updated.status).toBe('FAILED')
    expect(updated.processedAt).not.toBeNull()

    const failedAudit = await auditModel.findFirst({ where: { action: 'gamebridge.anonymize.failed', targetId: account.id } })
    expect(failedAudit).toBeTruthy()
    expect(failedAudit?.result).toBe('FAILURE')
  })

  test('LIFECYCLE_BRIDGE_RETRIES_BELOW_CEILING_WITH_FRESH_COMMAND_ID', async () => {
    fakeTransport.nextGetStatus = 'EXPIRED'
    const account = await makeAccount('anonretry')
    const legacyLogin = `u${suffix()}`.slice(0, 10)
    const job = await prisma.gameBridgeJob.create({
      data: { accountId: account.id, operation: 'ANONYMIZE_GAME_ACCOUNT', idempotencyKey: `anon-retry:${suffix()}`, payload: { accountId: account.id, legacyLogin } }
    })

    await bridge.runOnce() // dispatch
    const firstDispatch = (await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })).result as unknown as { commandId: string }

    await bridge.runOnce() // reconcile sees EXPIRED, attempts (1) < ceiling -> back to PENDING
    const afterFirstReconcile = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(afterFirstReconcile.status).toBe('PENDING')
    // Real backoff (attempts=1 -> ~30s) would otherwise skip this job on the
    // very next tick -- clear it to simulate time passing, same technique
    // vip-delivery.e2e-spec.ts uses for its own ceiling test.
    await prisma.gameBridgeJob.update({ where: { id: job.id }, data: { availableAt: new Date() } })

    fakeTransport.nextGetStatus = 'SUCCEEDED'
    await bridge.runOnce() // dispatches again with a FRESH commandId
    const secondDispatch = (await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })).result as unknown as { commandId: string }
    expect(secondDispatch.commandId).not.toBe(firstDispatch.commandId)

    await bridge.runOnce() // reconciles the new command as SUCCEEDED
    const final = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(final.status).toBe('COMPLETED')
  })
})
