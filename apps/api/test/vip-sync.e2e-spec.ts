import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// Part 3B, decision E. GAME_DATA_WORKER_URL/GAME_COMMAND_PORTAL_SECRET are
// intentionally left unset in this suite, exactly mirroring
// vip-delivery.e2e-spec.ts's own philosophy: an unconfigured transport must
// fail honestly (never fabricate a synced/delivered outcome). What IS
// fully exercised here without a real transport is the divergence-detection
// math (listDivergent()) and the "never falsely progress on error" guarantee
// of runOnce()/manualSync().
const CONTAINER = 'bloodmoon-e2e-vip-sync'

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

describe('VIP tier reconciler -- GameBridge extension plan Part 3B', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let vipSync: import('../src/modules/vip-sync/vip-sync.service').VipSyncService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { VipSyncService } = await import('../src/modules/vip-sync/vip-sync.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    vipSync = app.get(VipSyncService)
  }, 60000)

  afterAll(async () => app?.close())

  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeAccount(label: string) {
    const s = suffix()
    return prisma.account.create({
      data: {
        // Account.username has no @db.VarChar(N) in schema.prisma -- it's
        // a plain String, which Prisma maps to MySQL VARCHAR(191) by
        // default, so there's no real DB-side reason to truncate this
        // short. The old `.slice(0, 20)` cut the string from the END,
        // which for a label like 'vipsyncinflight' (16 chars incl. the
        // underscore) left only ~4 chars of the timestamp component of
        // suffix() and discarded the random component entirely -- and
        // since a base36 timestamp's leading digits only change once
        // every ~28 minutes, rerunning this file twice within that window
        // against the same persistent database produced a real
        // `Unique constraint failed on the constraint: Account_username_key`
        // unrelated to the test itself (hit for real, 2026-08-31). A
        // generous cap here (well under 191) keeps the full suffix --
        // including its random component -- intact for every label used
        // in this file.
        username: `${label}_${s}`.slice(0, 64),
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE'
      }
    })
  }

  async function makeProvisionedIdentity(accountId: string, legacyLogin: string) {
    return prisma.gameAccountIdentity.create({
      data: {
        accountId,
        legacyLogin,
        provisioningStatus: 'ACTIVE',
        provisioningRequestId: `req-${suffix()}`,
        membGuid: Math.floor(Math.random() * 1_000_000) + 1,
        provisionedAt: new Date()
      }
    })
  }

  async function makeEntitlement(accountId: string, tier: 'BRONZE' | 'SILVER' | 'GOLD' | null, expiresAt: Date | null) {
    return prisma.vipEntitlement.create({
      data: { accountId, tier, activatedAt: tier ? new Date() : null, expiresAt, status: tier ? 'ACTIVE' : 'INACTIVE' }
    })
  }

  test('VIP_SYNC_DIVERGENCE_FLAGS_NEVER_SYNCED_ACTIVE_ENTITLEMENT', async () => {
    const account = await makeAccount('vipsyncnew')
    await makeProvisionedIdentity(account.id, `u${suffix()}`.slice(0, 10))
    await makeEntitlement(account.id, 'SILVER', new Date(Date.now() + 7 * 86_400_000))

    const divergent = await vipSync.listDivergent()
    const row = divergent.find((d) => d.accountId === account.id)
    expect(row).toBeDefined()
    expect(row?.effectiveLevel).toBe(2)
    expect(row?.lastSyncedLevel).toBeNull()
  })

  test('VIP_SYNC_DIVERGENCE_EXCLUDES_ACCOUNT_ALREADY_IN_SYNC', async () => {
    const account = await makeAccount('vipsyncok')
    await makeProvisionedIdentity(account.id, `u${suffix()}`.slice(0, 10))
    await makeEntitlement(account.id, 'GOLD', new Date(Date.now() + 30 * 86_400_000))
    await prisma.vipSyncState.create({
      data: { accountId: account.id, lastSyncedLevel: 3, lastSyncedAt: new Date(), lastSyncStatus: 'SUCCEEDED', lastSyncReason: 'PURCHASE' }
    })

    const divergent = await vipSync.listDivergent()
    expect(divergent.find((d) => d.accountId === account.id)).toBeUndefined()
  })

  test('VIP_SYNC_DIVERGENCE_DETECTS_EXPIRY_EFFECTIVE_LEVEL_ZERO', async () => {
    const account = await makeAccount('vipsyncexp')
    await makeProvisionedIdentity(account.id, `u${suffix()}`.slice(0, 10))
    // Expired entitlement -- computeEffectiveLevel must report 0 even
    // though the stored tier is still BRONZE (expiresAt is the sole source
    // of truth for "is VIP active right now", plan Part 3).
    await makeEntitlement(account.id, 'BRONZE', new Date(Date.now() - 60_000))
    await prisma.vipSyncState.create({
      data: { accountId: account.id, lastSyncedLevel: 1, lastSyncedAt: new Date(Date.now() - 3_600_000), lastSyncStatus: 'SUCCEEDED', lastSyncReason: 'PURCHASE' }
    })

    const divergent = await vipSync.listDivergent()
    const row = divergent.find((d) => d.accountId === account.id)
    expect(row).toBeDefined()
    expect(row?.effectiveLevel).toBe(0)
    expect(row?.lastSyncedLevel).toBe(1)
  })

  test('VIP_SYNC_RUN_ONCE_UNCONFIGURED_TRANSPORT_ERRORS_HONESTLY_NEVER_FALSELY_SYNCED', async () => {
    const account = await makeAccount('vipsyncnocfg')
    await makeProvisionedIdentity(account.id, `u${suffix()}`.slice(0, 10))
    await makeEntitlement(account.id, 'BRONZE', new Date(Date.now() + 7 * 86_400_000))

    const result = await vipSync.runOnce()
    expect(result.errors).toBeGreaterThanOrEqual(1)
    expect(result.synced).toBe(0)

    // No VipSyncState row was created at all -- the transport.create() call
    // throws before the upsert, so a real divergence stays genuinely
    // unresolved rather than being marked as attempted.
    const state = await prisma.vipSyncState.findUnique({ where: { accountId: account.id } })
    expect(state).toBeNull()
  })

  test('VIP_SYNC_RUN_ONCE_SKIPS_ACCOUNT_WITHOUT_PROVISIONED_GAME_IDENTITY', async () => {
    const account = await makeAccount('vipsyncunprov')
    // No GameAccountIdentity at all -- nothing to sync yet.
    await makeEntitlement(account.id, 'GOLD', new Date(Date.now() + 30 * 86_400_000))

    await vipSync.runOnce()
    const state = await prisma.vipSyncState.findUnique({ where: { accountId: account.id } })
    expect(state).toBeNull()
  })

  test('VIP_SYNC_MANUAL_SYNC_UNCONFIGURED_TRANSPORT_THROWS_NOT_FALSE_SUCCESS', async () => {
    const account = await makeAccount('vipsyncmanual')
    await makeProvisionedIdentity(account.id, `u${suffix()}`.slice(0, 10))
    await makeEntitlement(account.id, 'SILVER', new Date(Date.now() + 7 * 86_400_000))

    await expect(vipSync.manualSync(account.id)).rejects.toThrow()
  })

  test('VIP_SYNC_IN_FLIGHT_RECONCILIATION_LEAVES_STATE_UNCHANGED_ON_TRANSPORT_ERROR', async () => {
    const account = await makeAccount('vipsyncinflight')
    await makeProvisionedIdentity(account.id, `u${suffix()}`.slice(0, 10))
    await makeEntitlement(account.id, 'BRONZE', new Date(Date.now() + 7 * 86_400_000))
    await prisma.vipSyncState.create({
      data: {
        accountId: account.id, lastSyncCommandId: `cmd-${suffix()}`, pendingDesiredLevel: 1,
        lastSyncStatus: 'CLAIMED', lastSyncReason: 'PURCHASE'
      }
    })

    // Phase 1 (reconcileInFlight) tries transport.get() -- throws, caught,
    // counted as an error. The row must stay exactly as it was: still
    // CLAIMED, never silently promoted to SUCCEEDED.
    const result = await vipSync.runOnce()
    expect(result.errors).toBeGreaterThanOrEqual(1)

    const state = await prisma.vipSyncState.findUniqueOrThrow({ where: { accountId: account.id } })
    expect(state.lastSyncStatus).toBe('CLAIMED')
    expect(state.lastSyncedLevel).toBeNull()
  })
})
