import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE V (2026-09-04) -- policy-drift layer on top of Phase U's
// progression control plane: the VIP effective-vs-approved distinction
// (policyStatus) and the drift-detection behavior against real
// production values. Builds on progression-config.e2e-spec.ts (Phase U,
// still the source of truth for the core desired/effective/drift/RBAC
// coverage) -- this suite covers only what's new this phase.
//
// SUPERSEDES (2026-09-08): this file originally also asserted reset.cap's
// "final, closed policy decision (20 for all tiers)" from this same
// Fase V. That ruling was reopened by the project owner -- see
// docs/decisions/0029-progression-reset-policy-current-ruling.md.
// RESET_CAP_STATUS is UNRESOLVED again; the reset.cap-specific tests
// below were updated to match (RESET_CAP_UNRESOLVED /
// RESET_CAP_EFFECTIVE_STATE_UNCHANGED), replacing the two that asserted
// the now-superseded cap=20 ruling. The VIP-tier reset-stat-points work
// this phase also covered (Free=450, Bronze/Silver/Gold=500) is
// unaffected and remains current -- see ADR-0029 for the full,
// consolidated ruling.
const CONTAINER = 'bloodmoon-e2e-progression-policy-phase-v'

describe('Progression policy drift -- Phase V', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let progression: import('../src/modules/progression/progression-config.service').ProgressionConfigService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-progression-policy-v-access-secret'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-progression-policy-v-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-progression-policy-v-two-factor-32'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { ProgressionConfigService } = await import('../src/modules/progression/progression-config.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    progression = app.get(ProgressionConfigService)
  }, 120000)

  afterAll(async () => app?.close())

  jest.setTimeout(60000)

  const suffix = Date.now().toString(36)
  let fullAdmin: { id: string, username: string, name: string, email: string, role: 'SUPER_ADMIN', permissions: string[], twoFactorEnabled: boolean }

  beforeAll(async () => {
    const full = await prisma.account.create({
      data: { username: `ppv_full_${suffix}`.slice(0, 20), name: 'Full Admin', email: `ppv-full-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'SUPER_ADMIN', status: 'ACTIVE', twoFactorEnabled: true }
    })
    fullAdmin = { id: full.id, username: full.username, name: full.name, email: full.email, role: 'SUPER_ADMIN', permissions: ['*'], twoFactorEnabled: true }

    await prisma.progressionConfigItem.deleteMany({})
    await progression.seedAll(fullAdmin)
  })

  // SUPERSEDES (2026-09-08): the Fase V "cap = 20 for all tiers" ruling
  // these two tests originally asserted was reopened by the project
  // owner -- see docs/decisions/0029-progression-reset-policy-current-ruling.md.
  // RESET_CAP_STATUS is UNRESOLVED again; the seed no longer sets a
  // desiredValue for reset.cap at all (the established "no opinion !=
  // false drift" null representation), and policyStatus reverts to
  // NOT_EVALUATED. These two tests replace the old
  // RESET_CAP_ALL_TIERS_DESIRED_20 / GOLD_RESET_50_DETECTED_AS_POLICY_DRIFT
  // pair, which asserted the now-superseded ruling and would otherwise
  // fail against the corrected seed data.
  it('RESET_CAP_UNRESOLVED: a fresh seed persists reset.cap with no desired value and policyStatus=NOT_EVALUATED', async () => {
    const resetCap = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'RESET', key: 'reset.cap' } } })
    expect(resetCap.desiredValue).toBeNull()
    expect(resetCap.policyStatus).toBe('NOT_EVALUATED')
  })

  it('RESET_CAP_EFFECTIVE_STATE_UNCHANGED: reset.cap still honestly reports the real Gold-tier value (50) as effective, independent of the reopened policy question', async () => {
    const resetCap = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'RESET', key: 'reset.cap' } } })
    const effective = resetCap.effectiveValue as { AL0: number, AL1: number, AL2: number, AL3: number }
    expect(effective).toEqual({ AL0: 20, AL1: 20, AL2: 20, AL3: 50 })
    // With no desiredValue set, no drift comparison is meaningful -- the
    // service's own valuesConflict() only computes drift when a desired
    // opinion exists, matching the "no opinion != false drift" rule.
  })

  // SUPERSEDES (2026-09-08): this test's own name/comment referred to
  // reset.stat_points as POLICY_DRIFT (Phase X, 2026-09-04) and asserted
  // zero APPROVED rows -- both already stale before this extraction, not
  // caused by it. reset.stat_points was superseded again in Fase AD
  // (2026-09-05, before this test was ever actually run against a real
  // database) to APPROVED (Free=450/VIP=500, see ADR-0029) -- this is
  // the first time these tests have actually executed against that seed
  // data, surfacing a real, pre-existing test/seed-data drift rather
  // than one introduced by this branch.
  it('VIP_EFFECTIVE_CONFIG_NOT_AUTO_APPROVED: real VIP-tiered settings never seed as APPROVED except reset.stat_points (Fase AD ruling), and reset.cap never auto-promotes past NOT_EVALUATED/EFFECTIVE_BUT_UNAPPROVED', async () => {
    const allItems = await prisma.progressionConfigItem.findMany({})
    expect(allItems.length).toBe(25)
    const approved = allItems.filter((i) => i.policyStatus === 'APPROVED')
    expect(approved.map((i) => i.key)).toEqual(['reset.stat_points'])

    const xpRate = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'EXPERIENCE', key: 'xp.rate' } } })
    const dropItemRate = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'DROP', key: 'drop.item_rate' } } })
    const dropZenRate = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'DROP', key: 'drop.zen_rate' } } })
    for (const item of [xpRate, dropItemRate, dropZenRate]) {
      expect(item.policyStatus).toBe('EFFECTIVE_BUT_UNAPPROVED')
      expect(item.desiredValue).toBeNull()
    }
  })

  it('Master Reset rows all seed as policyStatus=DISABLED, matching the real inactive command switch', async () => {
    const masterResetItems = await prisma.progressionConfigItem.findMany({ where: { domain: 'MASTER_RESET' } })
    expect(masterResetItems.length).toBe(7)
    for (const item of masterResetItems) expect(item.policyStatus).toBe('DISABLED')
  })

  it('Reseeding is idempotent for policyStatus and never overwrites an existing desiredValue/desiredReason', async () => {
    const before = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'RESET', key: 'reset.cap' } } })
    await progression.update(before.id, { desiredReason: 'admin override reason for idempotency test' }, fullAdmin)
    await progression.seedAll(fullAdmin)
    const after = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { id: before.id } })
    expect(after.desiredReason).toBe('admin override reason for idempotency test')
    // SUPERSEDES (2026-09-08): reset.cap's policyStatus is NOT_EVALUATED
    // now that RESET_CAP_STATUS is unresolved again -- was POLICY_DRIFT
    // under the since-reopened Fase V ruling.
    expect(after.policyStatus).toBe('NOT_EVALUATED')
  })
})
