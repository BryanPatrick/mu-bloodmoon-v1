import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 14 Part D. Real 9-account/14-character production data was only
// ever read via bm-sql this phase (see docs/accounts/pre-beta-account-review.md)
// -- nothing here touches production. These tests exercise the two
// deletion modes' real logic against disposable local test accounts only.
const CONTAINER = 'bloodmoon-e2e-account-deletion'

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

describe('Account deletion -- Phase 14 Part D', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let deletion: import('../src/modules/accounts/account-deletion.service').AccountDeletionService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { AccountDeletionService } = await import('../src/modules/accounts/account-deletion.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    deletion = app.get(AccountDeletionService)
  }, 60000)

  afterAll(async () => app?.close())

  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeAccount(label: string, overrides: Record<string, unknown> = {}) {
    const s = suffix()
    return prisma.account.create({
      data: {
        // No 20-char truncation here: this test suite only ever creates
        // accounts via direct prisma.account.create(), never through the
        // HTTP /api/auth/register endpoint, so auth.service.ts's
        // username.length > 20 validation never applies (learned from a
        // real uniqueness collision when a long label plus the 20-char
        // slice used in OTHER e2e files truncated away the suffix's
        // entropy entirely).
        username: `${label}_${s}`,
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE',
        currencies: { create: [{ currency: 'WCOIN', balance: 0 }] },
        ...overrides
      }
    })
  }

  function asActor(account: { id: string, username: string }) {
    return { ...account, name: account.username, email: `${account.username}@example.invalid`, role: 'ADMIN' as const, permissions: [], twoFactorEnabled: false }
  }

  let admin: { id: string, username: string }
  let rechargePackage: { id: string }
  beforeAll(async () => {
    admin = await makeAccount('deladmin')
    rechargePackage = await prisma.rechargePackage.create({
      data: { key: `test-package-${suffix()}`, currency: 'WCOIN', amount: 100, price: '10.00' }
    })
  })

  // ---- NORMAL_ACCOUNT_DELETION -----------------------------------------

  test('NORMAL_DELETION_ANONYMIZES_IN_PLACE_NEVER_HARD_DELETES_ROW', async () => {
    const account = await makeAccount('normaldel')
    const originalId = account.id

    const dryRun = await deletion.dryRunNormalDeletion(account.id)
    expect(dryRun.verdict).toBe('WOULD_ANONYMIZE')

    const result = await deletion.executeNormalDeletion(asActor(admin), account.id, 'test reason')
    expect(result.status).toBe('DELETED')

    const row = await prisma.account.findUnique({ where: { id: originalId } })
    expect(row).not.toBeNull()
    expect(row?.username).toBe(`deleted-${originalId}`)
    expect(row?.email).toBe(`deleted-${originalId}@deleted.invalid`)
    expect(row?.passwordHash).toBe('')
    expect(row?.personalIdHash).toBeNull()
    expect(row?.twoFactorSecret).toBeNull()
    expect(row?.status).toBe('BLOCKED')
    expect(row?.deletedAt).not.toBeNull()
  })

  test('NORMAL_DELETION_PRESERVES_AUDIT_AND_PAYMENT_HISTORY', async () => {
    const account = await makeAccount('normalpreserve')
    await prisma.rechargeIntent.create({
      data: {
        accountId: account.id,
        packageId: rechargePackage.id,
        provider: 'mercadopago',
        status: 'PAID',
        currency: 'WCOIN',
        amount: 100,
        price: '10.00',
        externalReference: `ref-${suffix()}`
      }
    })

    await deletion.executeNormalDeletion(asActor(admin), account.id)

    const recharge = await prisma.rechargeIntent.findFirst({ where: { accountId: account.id } })
    expect(recharge).not.toBeNull()
    expect(recharge?.status).toBe('PAID')
  })

  test('NORMAL_DELETION_DELETES_SESSIONS_AND_RECOVERY_CODES_OUTRIGHT', async () => {
    const account = await makeAccount('normalsessions')
    await prisma.accountSession.create({
      data: { accountId: account.id, expiresAt: new Date(Date.now() + 3_600_000) }
    })
    await prisma.twoFactorRecoveryCode.create({
      data: { accountId: account.id, codeHash: 'hash' }
    })

    await deletion.executeNormalDeletion(asActor(admin), account.id)

    expect(await prisma.accountSession.count({ where: { accountId: account.id } })).toBe(0)
    expect(await prisma.twoFactorRecoveryCode.count({ where: { accountId: account.id } })).toBe(0)
  })

  test('NORMAL_DELETION_REFUSES_STAFF_ACCOUNTS', async () => {
    const staff = await makeAccount('staffnodel', { role: 'GM' })
    const dryRun = await deletion.dryRunNormalDeletion(staff.id)
    expect(dryRun.verdict).toBe('BLOCKED')
    expect(dryRun.blockers).toContain('STAFF_ROLE_REFUSED_BY_ORDINARY_FLOW')
    await expect(deletion.executeNormalDeletion(asActor(admin), staff.id)).rejects.toThrow()
  })

  // Per Bryan's explicit request: a dedicated, standalone test proving
  // staff-exclusive operational data (GmOccurrenceNote, only ever authored
  // by GM/ADMIN/SUPER_ADMIN accounts) is never touched by either deletion
  // mode -- not just that the staff account survives, but that the real
  // data it authored is byte-for-byte untouched.
  test('STAFF_EXCLUSIVE_DATA_NEVER_TOUCHED_BY_EITHER_DELETION_MODE', async () => {
    const gm = await makeAccount('staffdataowner', { role: 'GM' })
    const occurrence = await prisma.gmOccurrence.create({
      data: { type: 'test-occurrence', description: 'staff-only test data', createdById: gm.id }
    })
    const note = await prisma.gmOccurrenceNote.create({
      data: { occurrenceId: occurrence.id, authorId: gm.id, note: 'staff-only note content' }
    })

    await expect(deletion.executeNormalDeletion(asActor(admin), gm.id)).rejects.toThrow()
    await expect(deletion.executePreBetaPurge(asActor(admin), `cycle-${suffix()}`, [gm.id])).rejects.toThrow()

    const noteStillExists = await prisma.gmOccurrenceNote.findUnique({ where: { id: note.id } })
    expect(noteStillExists).not.toBeNull()
    expect(noteStillExists?.note).toBe('staff-only note content')
    expect(noteStillExists?.authorId).toBe(gm.id)

    const gmStillExists = await prisma.account.findUnique({ where: { id: gm.id } })
    expect(gmStillExists?.role).toBe('GM')
    expect(gmStillExists?.deletedAt).toBeNull()
  })

  test('NORMAL_DELETION_IS_IDEMPOTENT', async () => {
    const account = await makeAccount('normalidempotent')
    const first = await deletion.executeNormalDeletion(asActor(admin), account.id)
    expect(first.status).toBe('DELETED')
    const second = await deletion.executeNormalDeletion(asActor(admin), account.id)
    expect(second.status).toBe('ALREADY_DELETED')

    const records = await prisma.accountDeletionRecord.count({ where: { accountId: account.id } })
    expect(records).toBe(1)
  })

  test('NORMAL_DELETION_BLOCKS_ACTIVE_MARKETPLACE_LISTING', async () => {
    const account = await makeAccount('normalmarket')
    await prisma.playerMarketListing.create({
      data: {
        sellerAccountId: account.id,
        gameItemRef: `item-${suffix()}`,
        itemName: 'Test Item',
        itemCategory: 'weapon',
        itemData: {},
        price: 100,
        currency: 'WCOIN',
        status: 'ACTIVE'
      }
    })

    const dryRun = await deletion.dryRunNormalDeletion(account.id)
    expect(dryRun.verdict).toBe('BLOCKED')
    expect(dryRun.blockers).toContain('ACTIVE_MARKETPLACE_LISTING')
  })

  // ---- PRE_BETA_PURGE ----------------------------------------------------

  test('PRE_BETA_PURGE_ELIGIBLE_ACCOUNT_IS_REALLY_DELETED_CASCADE', async () => {
    const account = await makeAccount('purgeable', { accountPhase: 'PRE_BETA' })
    const cycle = `cycle-${suffix()}`

    const assessment = await deletion.assessPreBetaPurgeEligibility(account.id)
    expect(assessment.verdict).toBe('WOULD_DELETE')

    const result = await deletion.executePreBetaPurge(asActor(admin), cycle, [account.id])
    expect(result.status).toBe('PURGED')
    expect(result.accountCount).toBe(1)

    const row = await prisma.account.findUnique({ where: { id: account.id } })
    expect(row).toBeNull()

    const batch = await prisma.purgeBatchRecord.findFirst({ where: { betaCycleId: cycle } })
    expect(batch).not.toBeNull()
    expect((batch?.accountIdsPurged as string[]).includes(account.id)).toBe(true)
  })

  test('PRE_BETA_PURGE_REFUSES_NONZERO_BALANCE', async () => {
    const account = await makeAccount('purgebalance', { accountPhase: 'PRE_BETA', currencies: { create: [{ currency: 'WCOIN', balance: 500 }] } })
    const assessment = await deletion.assessPreBetaPurgeEligibility(account.id)
    expect(assessment.verdict).toBe('BLOCKED')
    expect(assessment.reasons).toContain('NONZERO_CURRENCY_BALANCE')

    await expect(deletion.executePreBetaPurge(asActor(admin), `cycle-${suffix()}`, [account.id])).rejects.toThrow()
    const stillExists = await prisma.account.findUnique({ where: { id: account.id } })
    expect(stillExists).not.toBeNull()
  })

  test('PRE_BETA_PURGE_REFUSES_PAID_RECHARGE_HISTORY', async () => {
    const account = await makeAccount('purgepaid', { accountPhase: 'PRE_BETA' })
    await prisma.rechargeIntent.create({
      data: {
        accountId: account.id,
        packageId: rechargePackage.id,
        provider: 'mercadopago',
        status: 'PAID',
        currency: 'WCOIN',
        amount: 50,
        price: '5.00',
        externalReference: `ref-${suffix()}`
      }
    })
    const assessment = await deletion.assessPreBetaPurgeEligibility(account.id)
    expect(assessment.verdict).toBe('BLOCKED')
    expect(assessment.reasons).toContain('HAS_PAID_RECHARGE_HISTORY')
  })

  test('PRE_BETA_PURGE_REFUSES_VIP_GRANT_HISTORY_GAP_FIX', async () => {
    const account = await makeAccount('purgevip', { accountPhase: 'PRE_BETA' })
    const entitlement = await prisma.vipEntitlement.create({
      data: { accountId: account.id, tier: 'BRONZE', status: 'ACTIVE', totalDaysGranted: 7 }
    })
    await prisma.vipGrant.create({
      data: {
        vipEntitlementId: entitlement.id,
        accountId: account.id,
        tier: 'BRONZE',
        durationDays: 7,
        sourceType: 'test',
        idempotencyKey: `grant-${suffix()}`,
        newExpiresAt: new Date(Date.now() + 7 * 86_400_000)
      }
    })

    const assessment = await deletion.assessPreBetaPurgeEligibility(account.id)
    expect(assessment.verdict).toBe('BLOCKED')
    expect(assessment.reasons).toContain('HAS_VIP_GRANT_HISTORY')
  })

  test('PRE_BETA_PURGE_NEVER_TOUCHES_OPEN_BETA_OR_OFFICIAL_ACCOUNTS', async () => {
    const openBeta = await makeAccount('purgenotopenbeta', { accountPhase: 'OPEN_BETA' })
    const assessment = await deletion.assessPreBetaPurgeEligibility(openBeta.id)
    expect(assessment.verdict).toBe('BLOCKED')
    expect(assessment.reasons).toContain('ACCOUNT_PHASE_NOT_PRE_BETA')
  })

  test('PRE_BETA_PURGE_REFUSES_STAFF_ROLE', async () => {
    const staff = await makeAccount('purgenostaff', { accountPhase: 'PRE_BETA', role: 'GM' })
    const assessment = await deletion.assessPreBetaPurgeEligibility(staff.id)
    expect(assessment.verdict).toBe('BLOCKED')
    expect(assessment.reasons).toContain('NON_PLAYER_ROLE_REFUSED')
  })

  test('PRE_BETA_PURGE_REQUIRES_EXPLICIT_ACCOUNT_IDS_NEVER_IMPLICIT_ALL', async () => {
    await expect(deletion.executePreBetaPurge(asActor(admin), `cycle-${suffix()}`, [])).rejects.toThrow()
  })

  test('PRE_BETA_PURGE_DRY_RUN_SCOPED_TO_PRE_BETA_ONLY', async () => {
    const preBeta = await makeAccount('dryrunprebeta', { accountPhase: 'PRE_BETA' })
    const official = await makeAccount('dryrunofficial', { accountPhase: 'OFFICIAL' })

    const rows = await deletion.dryRunPreBetaPurge(`scope-cycle-${suffix()}`)
    const ids = rows.map((r) => r.accountId)
    expect(ids).toContain(preBeta.id)
    expect(ids).not.toContain(official.id)
  })
})
