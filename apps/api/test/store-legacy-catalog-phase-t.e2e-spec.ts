import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE T (2026-09-02) -- the X-Shop/CashShop admin control plane's
// second increment: effective-state refresh/drift detection, bulk
// operations, desiredEnabled (ENABLED != APPROVED), search, history,
// and the disabled-by-default sync guard. Builds on Phase S's
// store-legacy-catalog-config.e2e-spec.ts (still the source of truth
// for the core NO_RED_AUTO_APPROVAL/RBAC coverage) -- this suite covers
// only what's new this phase, per Part 26's own named-test list.
const CONTAINER = 'bloodmoon-e2e-store-legacy-catalog-phase-t'

describe('Legacy catalog control plane -- Phase T', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let legacyCatalog: import('../src/modules/commerce/legacy-catalog-config.service').LegacyCatalogConfigService
  let effectiveState: import('../src/modules/commerce/legacy-catalog-effective-state.service').LegacyCatalogEffectiveStateService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-legacy-catalog-phase-t-access-secret'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-legacy-catalog-phase-t-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-legacy-catalog-phase-t-two-factor-32'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { LegacyCatalogConfigService } = await import('../src/modules/commerce/legacy-catalog-config.service')
    const { LegacyCatalogEffectiveStateService } = await import('../src/modules/commerce/legacy-catalog-effective-state.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    legacyCatalog = app.get(LegacyCatalogConfigService)
    effectiveState = app.get(LegacyCatalogEffectiveStateService)
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
      data: { username: `slct_full_${suffix}`.slice(0, 20), name: 'Full Admin', email: `slct-full-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'SUPER_ADMIN', status: 'ACTIVE', twoFactorEnabled: true }
    })
    fullAdmin = { id: full.id, username: full.username, name: full.name, email: full.email, role: 'SUPER_ADMIN', permissions: ['*'], twoFactorEnabled: true }

    const gm = await prisma.account.create({
      data: { username: `slct_gm_${suffix}`.slice(0, 20), name: 'GM Account', email: `slct-gm-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'GM', status: 'ACTIVE', twoFactorEnabled: true }
    })
    gmUser = { id: gm.id, username: gm.username, name: gm.name, email: gm.email, role: 'GM', permissions: [], twoFactorEnabled: true }

    const editOnly = await prisma.account.create({
      data: { username: `slct_edit_${suffix}`.slice(0, 20), name: 'Edit Only Admin', email: `slct-edit-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'ADMIN', status: 'ACTIVE', twoFactorEnabled: true }
    })
    editOnlyAdmin = { id: editOnly.id, username: editOnly.username, name: editOnly.name, email: editOnly.email, role: 'ADMIN', permissions: [permissionKeys.adminStoreLegacyCatalogView, permissionKeys.adminStoreLegacyCatalogEdit], twoFactorEnabled: true }

    await prisma.legacyCatalogItem.deleteMany({})
    await legacyCatalog.seedAll(fullAdmin)
  })

  it('XSHOP_168_VISIBLE_IN_ADMIN / CASHSHOP_12_VISIBLE_IN_ADMIN: the full 180-row catalog is listable', async () => {
    const xshop = await legacyCatalog.list(fullAdmin, { channel: 'XSHOP', pageSize: 200 })
    const cashshop = await legacyCatalog.list(fullAdmin, { channel: 'CASHSHOP', pageSize: 200 })
    expect(xshop.total).toBe(168)
    expect(cashshop.total).toBe(12)
  })

  it('ACCESSORY_12_REVIEW_REQUIRED: Decision 2 items initialize as REVIEW_REQUIRED, not BLOCKED (Phase T refinement of Phase S)', async () => {
    const accessories = await prisma.legacyCatalogItem.findMany({ where: { channel: 'XSHOP', bryanDecision: 'BALANCE_TEST_REQUIRED' } })
    expect(accessories.length).toBe(12)
    for (const item of accessories) {
      expect(item.commercialStatus).toBe('REVIEW_REQUIRED')
      expect(item.purchasable).toBe(false)
      expect(item.blockReason).toContain('BALANCE_TEST_REQUIRED')
    }
  })

  it('DEAD_3_BLOCKED: the 3 dead Axes rows stay BLOCKED and unpublishable', async () => {
    const dead = await prisma.legacyCatalogItem.findMany({ where: { channel: 'XSHOP', bryanDecision: 'DEAD_UNRESOLVABLE_CATALOG_ROW' } })
    expect(dead.length).toBe(3)
    for (const item of dead) expect(item.commercialStatus).toBe('BLOCKED')
  })

  it('RENTAL_9_REVIEW_REQUIRED / EVENT_3_NOT_AUTO_APPROVED: CashShop rows start REVIEW_REQUIRED, never purchasable', async () => {
    const rentals = await prisma.legacyCatalogItem.findMany({ where: { channel: 'CASHSHOP', bryanDecision: 'RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST' } })
    const tickets = await prisma.legacyCatalogItem.findMany({ where: { channel: 'CASHSHOP', bryanDecision: 'GREEN_CANDIDATE_NOT_APPROVED' } })
    expect(rentals.length).toBe(9)
    expect(tickets.length).toBe(3)
    for (const item of [...rentals, ...tickets]) {
      expect(item.commercialStatus).toBe('REVIEW_REQUIRED')
      expect(item.purchasable).toBe(false)
    }
  })

  it('VISIBLE_NOT_EQUAL_PURCHASABLE: setting visible=true never implies purchasable=true', async () => {
    const ticket = await prisma.legacyCatalogItem.findFirstOrThrow({ where: { channel: 'CASHSHOP', bryanDecision: 'GREEN_CANDIDATE_NOT_APPROVED' } })
    const updated = await legacyCatalog.update(ticket.id, { visible: true, reason: 'teste de visibilidade' }, fullAdmin)
    expect(updated.visible).toBe(true)
    expect(updated.purchasable).toBe(false)
  })

  it('ENABLED_NOT_EQUAL_APPROVED: a Decision 1 (RED) item can have desiredEnabled=true while staying commercially BLOCKED', async () => {
    const redItem = await prisma.legacyCatalogItem.findFirstOrThrow({ where: { channel: 'XSHOP', bryanDecision: 'NOT_FOR_COMMERCIAL_SALE' } })
    const updated = await legacyCatalog.update(redItem.id, { desiredEnabled: true, internalNotes: 'habilitado para teste tecnico controlado', reason: 'teste tecnico' }, fullAdmin)
    expect(updated.desiredEnabled).toBe(true)
    expect(updated.commercialStatus).toBe('BLOCKED')
    expect(updated.purchasable).toBe(false)
  })

  it('DESIRED_STATE_CHANGE_AUDITED: an update() call is recorded and visible via history()', async () => {
    const ticket = await prisma.legacyCatalogItem.findFirstOrThrow({ where: { channel: 'CASHSHOP', bryanDecision: 'GREEN_CANDIDATE_NOT_APPROVED' }, orderBy: { legacyKey: 'desc' } })
    await legacyCatalog.update(ticket.id, { internalNotes: 'nota de auditoria', reason: 'DESIRED_STATE_CHANGE_AUDITED fixture' }, fullAdmin)
    const history = await legacyCatalog.history(ticket.id, fullAdmin)
    expect(history.length).toBeGreaterThan(0)
    const latest = history[0]
    expect(latest.action).toBe('admin.store.legacy-catalog.updated')
    expect(latest.reason).toBe('DESIRED_STATE_CHANGE_AUDITED fixture')
    expect(latest.actorId).toBe(fullAdmin.id)
  })

  it('BULK_BLOCK_AUDITED: bulkUpdate marks selected rows and records one audit entry with the affected count', async () => {
    const accessories = await prisma.legacyCatalogItem.findMany({ where: { channel: 'XSHOP', bryanDecision: 'BALANCE_TEST_REQUIRED' }, take: 2 })
    const ids = accessories.map((a) => a.id)
    const result = await legacyCatalog.bulkUpdate({ ids, action: 'mark-blocked', reason: 'BULK_BLOCK_AUDITED fixture' }, fullAdmin)
    expect(result.affected).toBe(2)
    for (const id of ids) {
      const row = await prisma.legacyCatalogItem.findUniqueOrThrow({ where: { id } })
      expect(row.commercialStatus).toBe('BLOCKED')
    }
    const historyRows = await Promise.all(ids.map((id) => legacyCatalog.history(id, fullAdmin)))
    for (const rows of historyRows) {
      expect(rows.some((r) => r.action === 'admin.store.legacy-catalog.bulk-mark-blocked' && r.reason === 'BULK_BLOCK_AUDITED fixture')).toBe(true)
    }
  })

  it('Bulk operations cannot bulk-approve/publish a Decision 1 item -- the action enum has no such action at all', async () => {
    const redItem = await prisma.legacyCatalogItem.findFirstOrThrow({ where: { channel: 'XSHOP', bryanDecision: 'NOT_FOR_COMMERCIAL_SALE' } })
    // @ts-expect-error -- deliberately passing an action outside the real enum to prove the server rejects it, not just TypeScript
    await expect(legacyCatalog.bulkUpdate({ ids: [redItem.id], action: 'mark-approved', reason: 'attempt' }, fullAdmin)).rejects.toThrow()
  })

  it('GM_CANNOT_EDIT: a GM account (zero legacy-catalog permissions) cannot list or update', async () => {
    await expect(legacyCatalog.list(gmUser, {})).rejects.toThrow()
    const anyItem = await prisma.legacyCatalogItem.findFirstOrThrow({})
    await expect(legacyCatalog.update(anyItem.id, { internalNotes: 'tentativa de GM' }, gmUser)).rejects.toThrow()
  })

  it('UNAUTHORIZED_ADMIN_CANNOT_SYNC / NO_RUNTIME_SYNC_BY_DEFAULT: an admin with edit (but not sync) permission cannot sync, and sync is refused even for SUPER_ADMIN because the flag defaults off', async () => {
    await expect(legacyCatalog.sync('XSHOP', editOnlyAdmin)).rejects.toThrow()
    delete process.env.XSHOP_RUNTIME_SYNC_ENABLED
    await expect(legacyCatalog.sync('XSHOP', fullAdmin)).rejects.toThrow(/desativada|XSHOP_RUNTIME_SYNC_ENABLED/)
  })

  it('EFFECTIVE_REFRESH_PRESERVES_DESIRED_STATE / DRIFT_DETECTION: refreshing effective state from the real snapshot never touches desired-state fields, and correctly reports drift for a manually-diverged row', async () => {
    const kris = await prisma.legacyCatalogItem.findUniqueOrThrow({ where: { channel_legacyKey: { channel: 'XSHOP', legacyKey: '0-0' } } })
    // Kris's real desiredEnabled is still false (never set true for this
    // specific row) -- the real snapshot has enabled=true for every row
    // (row presence = active) -- so this is a real, expected DRIFT case,
    // not a fabricated one.
    expect(kris.desiredEnabled).toBe(false)
    const beforeNotes = kris.internalNotes

    const result = await effectiveState.refresh(fullAdmin)
    expect(result.updated).toBeGreaterThan(0)

    const afterKris = await prisma.legacyCatalogItem.findUniqueOrThrow({ where: { id: kris.id } })
    expect(afterKris.effectiveEnabled).toBe(true)
    expect(afterKris.effectivePrice).toBe(10000)
    expect(afterKris.sourceFingerprint).toBeTruthy()
    expect(afterKris.sourceLastReadAt).not.toBeNull()
    // Desired-state fields untouched by the refresh.
    expect(afterKris.desiredEnabled).toBe(false)
    expect(afterKris.internalNotes).toBe(beforeNotes)
    expect(afterKris.commercialStatus).toBe('BLOCKED')
    // desiredEnabled(false) != effectiveEnabled(true) -> real drift.
    expect(afterKris.driftStatus).toBe('DRIFT_DETECTED')
  })

  it('DEAD_ROWS_NOT_LOST: the 3 dead Axes rows are still discoverable by search even with a placeholder name', async () => {
    const bySearch = await legacyCatalog.list(fullAdmin, { search: '1-9', pageSize: 50 })
    expect(bySearch.items.some((i) => i.legacyKey === '1-9')).toBe(true)
    const allDead = await prisma.legacyCatalogItem.count({ where: { channel: 'XSHOP', bryanDecision: 'DEAD_UNRESOLVABLE_CATALOG_ROW' } })
    expect(allDead).toBe(3)
  })

  it('Search by item name finds a real X-Shop item', async () => {
    const result = await legacyCatalog.list(fullAdmin, { search: 'Kris', pageSize: 50 })
    expect(result.items.some((i) => i.itemName === 'Kris')).toBe(true)
  })
})
