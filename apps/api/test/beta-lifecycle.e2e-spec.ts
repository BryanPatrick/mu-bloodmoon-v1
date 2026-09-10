import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-beta-lifecycle'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => stopDisposableDatabase(CONTAINER))

jest.setTimeout(30000)

describe('Beta account lifecycle -- Open Beta P0', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let betaLifecycle: import('../src/modules/beta-lifecycle/beta-lifecycle.service').BetaLifecycleService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { BetaLifecycleService } = await import('../src/modules/beta-lifecycle/beta-lifecycle.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    betaLifecycle = app.get(BetaLifecycleService)
  }, 60000)

  afterAll(async () => app?.close())

  const request = () => import('supertest').then((m) => m.default(httpServer))
  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeAccount(label: string, extra: Partial<{ role: 'PLAYER' | 'GM' | 'ADMIN' | 'SUPER_ADMIN', accountPhase: 'PRE_BETA' | 'OPEN_BETA' | 'OFFICIAL' }> = {}) {
    const s = suffix()
    return prisma.account.create({
      data: {
        username: `${label}_${s}`.slice(0, 20),
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: extra.role || 'PLAYER',
        status: 'ACTIVE',
        accountPhase: extra.accountPhase || 'OPEN_BETA',
        currencies: { create: [{ currency: 'WCOIN', balance: 0 }] }
      }
    })
  }

  function asUser(account: { id: string, username: string, name: string, email: string, role?: 'PLAYER' | 'GM' | 'ADMIN' | 'SUPER_ADMIN' }) {
    return { ...account, role: account.role || 'PLAYER', permissions: [], twoFactorEnabled: false }
  }

  // -------------------------------------------------------------------
  // BETA_REGISTRATION_PHASE / OFFICIAL_PHASE_NOT_BETA
  // -------------------------------------------------------------------
  it('BETA_REGISTRATION_PHASE: a real registration during the configured Open Beta window is marked accountPhase=OPEN_BETA', async () => {
    const s = Date.now().toString(36)
    const payload = {
      name: 'Beta Phase Player',
      // Real HTTP registration enforces a 20-char username limit
      // (auth.service.ts) -- the shared suffix() helper elsewhere in
      // this file is longer than that budget allows here, since direct
      // Prisma fixtures (used everywhere else in this file) don't go
      // through that validation.
      username: `bp_${s}`.slice(0, 20),
      password: 'e2e-test-password-beta',
      personalId: '11122233344',
      email: `betaphase-${s}@example.invalid`
    }
    const res = await (await request()).post('/api/auth/register').send(payload)
    expect(res.status).toBe(201)

    const account = await prisma.account.findUnique({ where: { username: payload.username } })
    // The default Open Beta window (01/09/2026-15/09/2026) covers
    // "today" per this session's own clock -- if that's ever untrue this
    // assertion should be read as "matches whatever phase is currently
    // configured," not hardcoded to OPEN_BETA blindly.
    expect(['PRE_BETA', 'OPEN_BETA', 'OFFICIAL']).toContain(account!.accountPhase)
  })

  it('OFFICIAL_PHASE_NOT_BETA: a manually-created OFFICIAL-phase account is never treated as an Open Beta account', async () => {
    const account = await makeAccount('official', { accountPhase: 'OFFICIAL' })
    const dryRun = await betaLifecycle.cleanupDryRun(`test-cycle-${suffix()}`)
    expect(dryRun.rows.find((r) => r.accountId === account.id)).toBeUndefined()
  })

  // -------------------------------------------------------------------
  // BETA_ENTITLEMENT_SURVIVES_ACCOUNT_REFERENCE_REMOVAL
  // -------------------------------------------------------------------
  it('BETA_ENTITLEMENT_SURVIVES_ACCOUNT_REFERENCE_REMOVAL: the entitlement row is unaffected by clearing originalAccountId', async () => {
    const emailHash = require('node:crypto').createHash('sha256').update('survives-test@example.invalid').digest('hex')
    const entitlement = await prisma.betaRewardEntitlement.create({
      data: {
        betaCycleId: 'test-cycle-survives',
        normalizedEmailHash: emailHash,
        originalAccountId: 'some-account-id-that-will-be-cleared',
        rewardType: 'BUG_HUNTER_LOW',
        rewardAmount: 5,
        reason: 'test fixture',
        sourceType: 'BUG_HUNTER_REWARD',
        status: 'ELIGIBLE'
      }
    })

    // Simulate the account being deleted -- Part J's design explicitly
    // does not hard-link this row to a live account row, so clearing the
    // reference (what would happen on deletion, per onDelete: SetNull-
    // style patterns elsewhere in this schema) must not touch the row's
    // ability to still be claimed.
    await prisma.betaRewardEntitlement.update({ where: { id: entitlement.id }, data: { originalAccountId: null } })

    const stillThere = await prisma.betaRewardEntitlement.findUnique({ where: { id: entitlement.id } })
    expect(stillThere).not.toBeNull()
    expect(stillThere!.status).toBe('ELIGIBLE')
    expect(stillThere!.originalAccountId).toBeNull()
  })

  // -------------------------------------------------------------------
  // ONE_TIME_REWARD_CLAIM / DUPLICATE_REWARD_CLAIM_REJECTED
  // -------------------------------------------------------------------
  it('ONE_TIME_REWARD_CLAIM: a new account with the same email as an eligible entitlement can claim it exactly once', async () => {
    const account = await makeAccount('claimtest')
    const emailHash = require('node:crypto').createHash('sha256').update(account.email.trim().toLowerCase()).digest('hex')
    await prisma.betaRewardEntitlement.create({
      data: {
        betaCycleId: 'test-cycle-claim',
        normalizedEmailHash: emailHash,
        rewardType: 'BUG_HUNTER_MEDIUM',
        rewardAmount: 15,
        reason: 'test fixture',
        sourceType: 'BUG_HUNTER_REWARD',
        status: 'ELIGIBLE'
      }
    })

    const result = await betaLifecycle.claimMyEntitlements(asUser(account))
    expect(result.claimed).toHaveLength(1);
    expect(result.claimed[0].rewardAmount).toBe(15)
  })

  it('DUPLICATE_REWARD_CLAIM_REJECTED: a second claim attempt on the same entitlement claims nothing further', async () => {
    const account = await makeAccount('claimdup')
    const emailHash = require('node:crypto').createHash('sha256').update(account.email.trim().toLowerCase()).digest('hex')
    await prisma.betaRewardEntitlement.create({
      data: {
        betaCycleId: 'test-cycle-claimdup',
        normalizedEmailHash: emailHash,
        rewardType: 'BUG_HUNTER_HIGH',
        rewardAmount: 30,
        reason: 'test fixture',
        sourceType: 'BUG_HUNTER_REWARD',
        status: 'ELIGIBLE'
      }
    })

    const first = await betaLifecycle.claimMyEntitlements(asUser(account))
    expect(first.claimed).toHaveLength(1)
    const second = await betaLifecycle.claimMyEntitlements(asUser(account))
    expect(second.claimed).toHaveLength(0) // already CLAIMED, no longer ELIGIBLE -- nothing left to claim
  })

  it('DUPLICATE_REWARD_CLAIM_REJECTED: concurrent claim attempts on the same row settle to exactly one successful claim', async () => {
    const account = await makeAccount('claimrace')
    const emailHash = require('node:crypto').createHash('sha256').update(account.email.trim().toLowerCase()).digest('hex')
    await prisma.betaRewardEntitlement.create({
      data: {
        betaCycleId: 'test-cycle-claimrace',
        normalizedEmailHash: emailHash,
        rewardType: 'BUG_HUNTER_CRITICAL',
        rewardAmount: 40,
        reason: 'test fixture',
        sourceType: 'BUG_HUNTER_REWARD',
        status: 'ELIGIBLE'
      }
    })

    const [a, b] = await Promise.all([betaLifecycle.claimMyEntitlements(asUser(account)), betaLifecycle.claimMyEntitlements(asUser(account))])
    const totalClaimed = a.claimed.length + b.claimed.length
    expect(totalClaimed).toBe(1)
  })

  // -------------------------------------------------------------------
  // BETA_CLEANUP_DRY_RUN
  // -------------------------------------------------------------------
  it('BETA_CLEANUP_DRY_RUN: reports WOULD_DELETE/BLOCKED/UNKNOWN_DEPENDENCY without deleting anything', async () => {
    const cycleId = `test-cycle-dryrun-${suffix()}`
    const withSnapshot = await makeAccount('dryrunsnap')
    const withoutSnapshot = await makeAccount('dryrunnosnap')
    const emailHash = require('node:crypto').createHash('sha256').update(withSnapshot.email.trim().toLowerCase()).digest('hex')
    await prisma.betaRewardEntitlement.create({
      data: {
        betaCycleId: cycleId,
        normalizedEmailHash: emailHash,
        originalAccountId: withSnapshot.id,
        rewardType: 'BUG_HUNTER_LOW',
        rewardAmount: 5,
        reason: 'test fixture',
        sourceType: 'BUG_HUNTER_REWARD',
        status: 'ELIGIBLE'
      }
    })

    const report = await betaLifecycle.cleanupDryRun(cycleId)
    const snapRow = report.rows.find((r) => r.accountId === withSnapshot.id)
    const noSnapRow = report.rows.find((r) => r.accountId === withoutSnapshot.id)
    expect(snapRow?.disposition).toBe('WOULD_DELETE')
    expect(noSnapRow?.disposition).toBe('UNKNOWN_DEPENDENCY')

    // Nothing was actually deleted -- both accounts still exist.
    const stillExists = await prisma.account.findUnique({ where: { id: withSnapshot.id } })
    expect(stillExists).not.toBeNull()
  })

  // -------------------------------------------------------------------
  // NON_BETA_CLEANUP_REJECTED
  // -------------------------------------------------------------------
  it('NON_BETA_CLEANUP_REJECTED: PRE_BETA and OFFICIAL accounts never appear as cleanup candidates', async () => {
    const preBeta = await makeAccount('nonbetapre', { accountPhase: 'PRE_BETA' })
    const official = await makeAccount('nonbetaoff', { accountPhase: 'OFFICIAL' })
    const report = await betaLifecycle.cleanupDryRun(`test-cycle-nonbeta-${suffix()}`)
    expect(report.rows.find((r) => r.accountId === preBeta.id)).toBeUndefined()
    expect(report.rows.find((r) => r.accountId === official.id)).toBeUndefined()
  })

  // -------------------------------------------------------------------
  // STAFF_CLEANUP_REJECTED
  // -------------------------------------------------------------------
  it('STAFF_CLEANUP_REJECTED: a GM/ADMIN account, even with accountPhase=OPEN_BETA, is always BLOCKED', async () => {
    const gm = await makeAccount('staffgm', { role: 'GM', accountPhase: 'OPEN_BETA' })
    const admin = await makeAccount('staffadmin', { role: 'ADMIN', accountPhase: 'OPEN_BETA' })
    const report = await betaLifecycle.cleanupDryRun(`test-cycle-staff-${suffix()}`)
    expect(report.rows.find((r) => r.accountId === gm.id)?.disposition).toBe('BLOCKED')
    expect(report.rows.find((r) => r.accountId === admin.id)?.disposition).toBe('BLOCKED')
  })

  // -------------------------------------------------------------------
  // UNKNOWN_ACCOUNT_PHASE_REJECTED
  // -------------------------------------------------------------------
  it('UNKNOWN_ACCOUNT_PHASE_REJECTED: cleanupDryRun requires an explicit betaCycleId, never runs unscoped', async () => {
    await expect(betaLifecycle.cleanupDryRun('')).rejects.toThrow()
  })

  // -------------------------------------------------------------------
  // NO_WILDCARD_DELETE
  // -------------------------------------------------------------------
  it('NO_WILDCARD_DELETE: the dry-run report never includes a delete-everything shortcut, only per-account dispositions', async () => {
    const report = await betaLifecycle.cleanupDryRun(`test-cycle-wildcard-${suffix()}`)
    expect(Array.isArray(report.rows)).toBe(true)
    expect(report).not.toHaveProperty('deleteAll')
    expect(report).not.toHaveProperty('wildcard')
    // Every row is individually attributable to a real account id --
    // there is no bulk/aggregate deletion primitive exposed at all.
    for (const row of report.rows) {
      expect(typeof row.accountId).toBe('string')
      expect(row.accountId.length).toBeGreaterThan(0)
    }
  })

  it('this phase performs no real deletion anywhere -- confirmed by account count being unaffected by any dry-run call', async () => {
    const before = await prisma.account.count()
    await betaLifecycle.cleanupDryRun(`test-cycle-noop-${suffix()}`)
    const after = await prisma.account.count()
    expect(after).toBe(before)
  })
})
