import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE S (2026-09-02) -- the Portal-side desired-state layer for the
// X-Shop/CashShop admin control plane (legacy-catalog-config.service.ts).
// Proves: seeding produces exactly the decided counts (153/12/3/9/3),
// Decision 1/3 items can never become purchasable/APPROVED/PUBLISHED
// through this service regardless of who asks, and view/edit permissions
// are checked separately (not a single blanket store permission).
const CONTAINER = 'bloodmoon-e2e-store-legacy-catalog-config'

describe('Legacy catalog config (X-Shop/CashShop admin control plane, desired state) -- Phase S', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let legacyCatalog: import('../src/modules/commerce/legacy-catalog-config.service').LegacyCatalogConfigService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-legacy-catalog-config-access-secret'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-legacy-catalog-config-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-legacy-catalog-config-two-factor-32c'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { LegacyCatalogConfigService } = await import('../src/modules/commerce/legacy-catalog-config.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    legacyCatalog = app.get(LegacyCatalogConfigService)
  }, 120000)

  afterAll(async () => app?.close())

  jest.setTimeout(60000)

  const suffix = Date.now().toString(36)
  let fullAdmin: { id: string, username: string, name: string, email: string, role: 'SUPER_ADMIN', permissions: string[], twoFactorEnabled: boolean }
  let viewOnlyAdmin: { id: string, username: string, name: string, email: string, role: 'ADMIN', permissions: string[], twoFactorEnabled: boolean }
  let noPermsAdmin: { id: string, username: string, name: string, email: string, role: 'ADMIN', permissions: string[], twoFactorEnabled: boolean }

  beforeAll(async () => {
    const { permissionKeys } = await import('../src/modules/auth/permissions')
    const full = await prisma.account.create({
      data: { username: `slcc_full_${suffix}`.slice(0, 20), name: 'Full Admin', email: `slcc-full-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'SUPER_ADMIN', status: 'ACTIVE', twoFactorEnabled: true }
    })
    fullAdmin = { id: full.id, username: full.username, name: full.name, email: full.email, role: 'SUPER_ADMIN', permissions: ['*'], twoFactorEnabled: true }

    const viewOnly = await prisma.account.create({
      data: { username: `slcc_view_${suffix}`.slice(0, 20), name: 'View Only Admin', email: `slcc-view-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'ADMIN', status: 'ACTIVE', twoFactorEnabled: true }
    })
    viewOnlyAdmin = { id: viewOnly.id, username: viewOnly.username, name: viewOnly.name, email: viewOnly.email, role: 'ADMIN', permissions: [permissionKeys.adminStoreLegacyCatalogView], twoFactorEnabled: true }

    const noPerms = await prisma.account.create({
      data: { username: `slcc_none_${suffix}`.slice(0, 20), name: 'No Perms Admin', email: `slcc-none-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'ADMIN', status: 'ACTIVE', twoFactorEnabled: true }
    })
    noPermsAdmin = { id: noPerms.id, username: noPerms.username, name: noPerms.name, email: noPerms.email, role: 'ADMIN', permissions: [], twoFactorEnabled: true }

    // LegacyCatalogItem rows are globally keyed (channel+legacyKey, not
    // per-suffix) -- against a persistent local DB (E2E_LOCAL_MYSQL_URL,
    // shared across runs and with any manual browser verification of
    // this same feature), a prior run's desired-state edits (e.g. an
    // item manually approved while verifying the admin UI) would leak
    // into this suite's own "nothing is approved right after seeding"
    // assertion. Clean up first so the suite is self-contained.
    await prisma.legacyCatalogItem.deleteMany({})
  })

  it('LEGACY_RED_TOTAL_153 / ACCESSORY_HOLD_TOTAL_12 / DEAD_ROWS_TOTAL_3 / CASHSHOP_RENTAL_HOLD_TOTAL_9 / CASHSHOP_GREEN_CANDIDATE_TOTAL_3: seeding produces exactly the decided counts', async () => {
    const result = await legacyCatalog.seedAll(fullAdmin)
    expect(result.xshop.total).toBe(168)
    expect(result.cashshop.total).toBe(12)

    const redCount = await prisma.legacyCatalogItem.count({ where: { channel: 'XSHOP', bryanDecision: 'NOT_FOR_COMMERCIAL_SALE' } })
    const accessoryCount = await prisma.legacyCatalogItem.count({ where: { channel: 'XSHOP', bryanDecision: 'BALANCE_TEST_REQUIRED' } })
    const deadCount = await prisma.legacyCatalogItem.count({ where: { channel: 'XSHOP', bryanDecision: 'DEAD_UNRESOLVABLE_CATALOG_ROW' } })
    const rentalCount = await prisma.legacyCatalogItem.count({ where: { channel: 'CASHSHOP', bryanDecision: 'RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST' } })
    const greenCount = await prisma.legacyCatalogItem.count({ where: { channel: 'CASHSHOP', bryanDecision: 'GREEN_CANDIDATE_NOT_APPROVED' } })
    expect(redCount).toBe(153)
    expect(accessoryCount).toBe(12)
    expect(deadCount).toBe(3)
    expect(rentalCount).toBe(9)
    expect(greenCount).toBe(3)

    // Every RED/BALANCE_TEST/DEAD row starts BLOCKED and not purchasable;
    // every rental/ticket starts REVIEW_REQUIRED and not purchasable --
    // never auto-approved by the seed itself.
    const anyPurchasable = await prisma.legacyCatalogItem.count({ where: { purchasable: true } })
    const anyApprovedOrPublished = await prisma.legacyCatalogItem.count({ where: { commercialStatus: { in: ['APPROVED', 'PUBLISHED'] } } })
    expect(anyPurchasable).toBe(0)
    expect(anyApprovedOrPublished).toBe(0)
  })

  it('Re-seeding is idempotent -- total row count never grows on a second run', async () => {
    const before = await prisma.legacyCatalogItem.count()
    await legacyCatalog.seedAll(fullAdmin)
    const after = await prisma.legacyCatalogItem.count()
    expect(after).toBe(before)
  })

  it('NO_RED_AUTO_APPROVAL: a Decision 1 (NOT_FOR_COMMERCIAL_SALE) item can never become purchasable, APPROVED, or PUBLISHED', async () => {
    const redItem = await prisma.legacyCatalogItem.findFirstOrThrow({ where: { channel: 'XSHOP', bryanDecision: 'NOT_FOR_COMMERCIAL_SALE' } })
    await expect(legacyCatalog.update(redItem.id, { purchasable: true }, fullAdmin)).rejects.toThrow()
    await expect(legacyCatalog.update(redItem.id, { commercialStatus: 'APPROVED', reason: 'tentativa de teste' }, fullAdmin)).rejects.toThrow()
    await expect(legacyCatalog.update(redItem.id, { commercialStatus: 'PUBLISHED', reason: 'tentativa de teste' }, fullAdmin)).rejects.toThrow()
    const stillBlocked = await prisma.legacyCatalogItem.findUniqueOrThrow({ where: { id: redItem.id } })
    expect(stillBlocked.commercialStatus).toBe('BLOCKED')
    expect(stillBlocked.purchasable).toBe(false)
  })

  it('NO_DEAD_ROW_PUBLISHABLE: a Decision 3 (DEAD_UNRESOLVABLE_CATALOG_ROW) item is equally permanently blocked', async () => {
    const deadItem = await prisma.legacyCatalogItem.findFirstOrThrow({ where: { channel: 'XSHOP', bryanDecision: 'DEAD_UNRESOLVABLE_CATALOG_ROW' } })
    await expect(legacyCatalog.update(deadItem.id, { commercialStatus: 'PUBLISHED', reason: 'tentativa de teste' }, fullAdmin)).rejects.toThrow()
  })

  it('A non-permanently-blocked item (CashShop event ticket, Decision 7) CAN move to APPROVED with a reason', async () => {
    const ticket = await prisma.legacyCatalogItem.findFirstOrThrow({ where: { channel: 'CASHSHOP', bryanDecision: 'GREEN_CANDIDATE_NOT_APPROVED' } })
    const approved = await legacyCatalog.update(ticket.id, { commercialStatus: 'APPROVED', reason: 'Revisao de evento concluida (fixture de teste).' }, fullAdmin)
    expect(approved.commercialStatus).toBe('APPROVED')
  })

  it('STORE_PRODUCT_RBAC: view-only permission can list but not update; no permission can do neither', async () => {
    const anyItem = await prisma.legacyCatalogItem.findFirstOrThrow({})

    const viewList = await legacyCatalog.list(viewOnlyAdmin, {})
    expect(viewList.total).toBeGreaterThan(0)
    await expect(legacyCatalog.update(anyItem.id, { internalNotes: 'tentativa sem permissao de edicao' }, viewOnlyAdmin)).rejects.toThrow()

    await expect(legacyCatalog.list(noPermsAdmin, {})).rejects.toThrow()
    await expect(legacyCatalog.update(anyItem.id, { internalNotes: 'tentativa sem nenhuma permissao' }, noPermsAdmin)).rejects.toThrow()
  })
})
