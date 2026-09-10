import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE U (2026-09-03) -- the Progression control plane (XP/Drop/Reset/
// Master Reset) foundation. Same shape as store-legacy-catalog-phase-t.
// e2e-spec.ts (ADR-0024's own precedent), applied to the new domain per
// docs/decisions/0025-progression-control-plane.md.
const CONTAINER = 'bloodmoon-e2e-progression-config'

describe('Progression control plane -- Phase U', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let progression: import('../src/modules/progression/progression-config.service').ProgressionConfigService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-progression-access-secret'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-progression-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-progression-two-factor-32'
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
  let gmUser: { id: string, username: string, name: string, email: string, role: 'GM', permissions: string[], twoFactorEnabled: boolean }
  let editOnlyAdmin: { id: string, username: string, name: string, email: string, role: 'ADMIN', permissions: string[], twoFactorEnabled: boolean }

  beforeAll(async () => {
    const { permissionKeys } = await import('../src/modules/auth/permissions')
    const full = await prisma.account.create({
      data: { username: `pcfg_full_${suffix}`.slice(0, 20), name: 'Full Admin', email: `pcfg-full-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'SUPER_ADMIN', status: 'ACTIVE', twoFactorEnabled: true }
    })
    fullAdmin = { id: full.id, username: full.username, name: full.name, email: full.email, role: 'SUPER_ADMIN', permissions: ['*'], twoFactorEnabled: true }

    const gm = await prisma.account.create({
      data: { username: `pcfg_gm_${suffix}`.slice(0, 20), name: 'GM Account', email: `pcfg-gm-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'GM', status: 'ACTIVE', twoFactorEnabled: true }
    })
    gmUser = { id: gm.id, username: gm.username, name: gm.name, email: gm.email, role: 'GM', permissions: [], twoFactorEnabled: true }

    const editOnly = await prisma.account.create({
      data: { username: `pcfg_edit_${suffix}`.slice(0, 20), name: 'Edit Only Admin', email: `pcfg-edit-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'ADMIN', status: 'ACTIVE', twoFactorEnabled: true }
    })
    editOnlyAdmin = { id: editOnly.id, username: editOnly.username, name: editOnly.name, email: editOnly.email, role: 'ADMIN', permissions: [permissionKeys.adminProgressionView, permissionKeys.adminProgressionEdit], twoFactorEnabled: true }

    await prisma.progressionConfigItem.deleteMany({})
    await progression.seedAll(fullAdmin)
  })

  it('PROGRESSION_CONFIG_DISCOVERY_DETERMINISTIC: seeding produces the same 25 rows across domains, re-seeding is idempotent', async () => {
    const { items, total } = await progression.list(fullAdmin, {})
    expect(total).toBe(25)
    const byDomain = items.reduce<Record<string, number>>((acc, i) => { acc[i.domain] = (acc[i.domain] || 0) + 1; return acc }, {})
    expect(byDomain.EXPERIENCE).toBe(8)
    expect(byDomain.DROP).toBe(4)
    expect(byDomain.RESET).toBe(6)
    expect(byDomain.MASTER_RESET).toBe(7)

    const second = await progression.seedAll(fullAdmin)
    expect(second.created).toBe(0)
    expect(second.updated).toBe(25)
    const { total: totalAfter } = await progression.list(fullAdmin, {})
    expect(totalAfter).toBe(25)
  })

  // SUPERSEDES (2026-09-08): this test originally asserted reset.cap's
  // "policy target of 20 for every tier" (Fase V, 2026-09-04). That
  // ruling was reopened by the project owner -- RESET_CAP_STATUS is
  // UNRESOLVED again; see docs/decisions/0029-progression-reset-policy-current-ruling.md.
  it('RESET_CAP_UNRESOLVED_NO_POLICY_TARGET: reset.cap seeds with no desired value (RESET_CAP_STATUS = UNRESOLVED), only the real effective config', async () => {
    const resetCap = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'RESET', key: 'reset.cap' } } })
    expect(resetCap.desiredValue).toBeNull()
    expect(resetCap.policyStatus).toBe('NOT_EVALUATED')
    expect(resetCap.effectiveValue).toEqual({ AL0: 20, AL1: 20, AL2: 20, AL3: 50 })
  })

  it('XP_50_NOT_LABELED_50X_WITHOUT_PROOF / UNKNOWN_UNIT_PRESERVED: xp.rate never carries an "x" or "%" unit label', async () => {
    const xpRate = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'EXPERIENCE', key: 'xp.rate' } } })
    expect(xpRate.unit).not.toMatch(/^x$|^%$|^\d+x$/)
    expect(xpRate.unit).toContain('nao confirmada')
    expect(xpRate.effectiveValue).toEqual({ AL0: 50, AL1: 60, AL2: 60, AL3: 60 })
  })

  it('DESIRED_EDIT_AUDITED: an update() call on a non-high-risk row is recorded and visible via history()', async () => {
    const eventRate = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'EXPERIENCE', key: 'xp.event_rate' } } })
    await progression.update(eventRate.id, { internalNotes: 'nota de auditoria de progressao' }, fullAdmin)
    const history = await progression.history(eventRate.id, fullAdmin)
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].action).toBe('admin.progression.updated')
    expect(history[0].actorId).toBe(fullAdmin.id)
  })

  it('HIGH_RISK_EDIT_REQUIRES_REASON: editing a HIGH/CRITICAL-risk row without a reason is rejected', async () => {
    const xpRate = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'EXPERIENCE', key: 'xp.rate' } } })
    expect(xpRate.riskLevel).toBe('HIGH')
    await expect(progression.update(xpRate.id, { desiredValue: 70 }, fullAdmin)).rejects.toThrow(/justificativa/i)
    const withReason = await progression.update(xpRate.id, { desiredValue: 70, desiredReason: 'teste de justificativa obrigatoria' }, fullAdmin)
    expect(withReason.desiredValue).toBe(70)
  })

  it('GM_CANNOT_EDIT_GLOBAL_PROGRESSION: a GM account (zero progression permissions) cannot list or update', async () => {
    await expect(progression.list(gmUser, {})).rejects.toThrow()
    const anyItem = await prisma.progressionConfigItem.findFirstOrThrow({})
    await expect(progression.update(anyItem.id, { internalNotes: 'tentativa de GM' }, gmUser)).rejects.toThrow()
  })

  it('UNAUTHORIZED_ADMIN_CANNOT_SYNC / RUNTIME_SYNC_DEFAULT_OFF: an admin with edit (but not sync) permission cannot sync, and sync is refused even for SUPER_ADMIN because the flag defaults off', async () => {
    await expect(progression.sync(editOnlyAdmin)).rejects.toThrow()
    delete process.env.PROGRESSION_RUNTIME_SYNC_ENABLED
    await expect(progression.sync(fullAdmin)).rejects.toThrow(/desabilitada|PROGRESSION_RUNTIME_SYNC_ENABLED/)
  })

  // SUPERSEDES (2026-09-08): this test originally used reset.cap as its
  // "real, present drift" example (desired=20 vs effective Gold=50).
  // That desired value no longer exists (RESET_CAP_STATUS = UNRESOLVED,
  // see ADR-0029) -- and reset.cap was the ONLY row in the 25-item seed
  // with a genuine desired!=effective mismatch. With it gone, this
  // dataset currently has ZERO rows that exercise real DRIFT_DETECTED
  // behavior end-to-end. That is an honest, real test-coverage gap this
  // extraction surfaces, not silently patched over with a fabricated
  // example on an unrelated row -- flagged as KNOWN_DEBT in this
  // phase's manifest, not fixed here.
  it('EFFECTIVE_SNAPSHOT_STABLE / REFRESH_PRESERVES_DESIRED_STATE / NULL_DESIRED_IS_IN_SYNC: refreshing effective state is deterministic, never touches desired state, and a row with no desired opinion reports IN_SYNC (never a false drift)', async () => {
    const resetCapBefore = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'RESET', key: 'reset.cap' } } })
    const result1 = await progression.refreshEffectiveState(fullAdmin)
    expect(result1.updated).toBe(25)
    const result2 = await progression.refreshEffectiveState(fullAdmin)
    expect(result2.updated).toBe(result1.updated)
    expect(result2.driftCount).toBe(result1.driftCount)

    const resetCapAfter = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { id: resetCapBefore.id } })
    // Desired state untouched -- still no opinion set.
    expect(resetCapAfter.desiredValue).toBeNull()
    expect(resetCapAfter.desiredReason).toBeNull()
    // No desired opinion -> IN_SYNC, never a fabricated drift (matches
    // ProgressionConfigService's own valuesConflict() short-circuit for
    // null desiredValue).
    expect(resetCapAfter.driftStatus).toBe('IN_SYNC')
    expect(resetCapAfter.sourceFingerprint).toBeTruthy()
    expect(resetCapAfter.sourceLastReadAt).not.toBeNull()

    // A row with no desired opinion at all must never report a false drift.
    const eventRate = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'EXPERIENCE', key: 'xp.event_rate' } } })
    expect(eventRate.desiredValue).toBeNull()
    expect(eventRate.driftStatus).toBe('IN_SYNC')
  })

  it('Master Reset config confirms the feature is currently INACTIVE, with zero stat-point reward if it were ever enabled', async () => {
    const enabled = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'MASTER_RESET', key: 'master_reset.enabled' } } })
    const points = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'MASTER_RESET', key: 'master_reset.stat_points' } } })
    expect(enabled.effectiveValue).toBe(0)
    expect(points.effectiveValue).toEqual({ AL0: 0, AL1: 0, AL2: 0, AL3: 0 })
  })
})
