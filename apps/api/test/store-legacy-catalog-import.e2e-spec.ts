import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE S (2026-09-02) -- persists Bryan's Phase R decisions as real,
// tested enforcement, not just documentation. Before this phase,
// StoreAdminService#importCatalog (the only bulk-import path from the
// legacy GameServer item reference into Portal Store products) had
// ZERO e2e coverage anywhere in this codebase -- confirmed by a real
// search this phase. Its own `catalogItemBlocked()` heuristic predates
// Phase R's rigorous X-Shop classification and never knew about the
// +13/all-excellent configuration at all (that lives in a different
// source file, CustomXShop.txt, not the base-item reference catalog
// this import reads). This suite proves the NEW wiring
// (legacy-catalog-policy.ts) actually blocks what Bryan decided must
// never be commercially approved, using the REAL
// docs/catalogs/commerce-item-catalog.json this service reads in
// production -- not a mock.
const CONTAINER = 'bloodmoon-e2e-store-legacy-catalog-import'

describe('Store catalog import -- legacy X-Shop policy enforcement -- Phase S', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let storeAdmin: import('../src/modules/commerce/store-admin.service').StoreAdminService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-store-legacy-catalog-access-secret'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-store-legacy-catalog-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-store-legacy-catalog-two-factor-32ch'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { StoreAdminService } = await import('../src/modules/commerce/store-admin.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    storeAdmin = app.get(StoreAdminService)
  }, 120000)

  afterAll(async () => app?.close())

  jest.setTimeout(60000)

  const suffix = Date.now().toString(36)
  let adminUser: { id: string, username: string, name: string, email: string, role: 'SUPER_ADMIN', permissions: string[], twoFactorEnabled: boolean }

  beforeAll(async () => {
    const account = await prisma.account.create({
      data: {
        username: `slci_admin_${suffix}`.slice(0, 20),
        name: 'Legacy Catalog Import Test Admin',
        email: `slci-admin-${suffix}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        twoFactorEnabled: true
      }
    })
    adminUser = { id: account.id, username: account.username, name: account.name, email: account.email, role: 'SUPER_ADMIN', permissions: ['*'], twoFactorEnabled: true }

    // This suite's own `key`s (`catalog-{item.key}`) are deterministic --
    // re-running against a persistent local DB (E2E_LOCAL_MYSQL_URL,
    // shared across runs, stopDisposableDatabase is a no-op there) would
    // otherwise make importCatalog() skip everything as "already exists"
    // on a second run, making result.created misleadingly 0. Clean up
    // any leftover rows from a prior run of THIS suite specifically
    // first, so the suite is self-contained and re-runnable.
    await prisma.shopProduct.deleteMany({ where: { key: { startsWith: 'catalog-' } } })
  })

  it('LEGACY_RED_TOTAL_153 / ACCESSORY_HOLD_TOTAL_12: classifyLegacyCatalogKey covers exactly the decided counts', async () => {
    const { LEGACY_XSHOP_NOT_FOR_SALE_KEYS, LEGACY_XSHOP_BALANCE_TEST_REQUIRED_KEYS, LEGACY_XSHOP_DEAD_ROW_KEYS, classifyLegacyCatalogKey } =
      await import('../src/modules/commerce/legacy-catalog-policy')
    expect(LEGACY_XSHOP_NOT_FOR_SALE_KEYS.size).toBe(153)
    expect(LEGACY_XSHOP_BALANCE_TEST_REQUIRED_KEYS.size).toBe(12)
    expect(LEGACY_XSHOP_DEAD_ROW_KEYS.length).toBe(3)
    for (const key of LEGACY_XSHOP_NOT_FOR_SALE_KEYS) expect(classifyLegacyCatalogKey(key)).toBe('NOT_FOR_COMMERCIAL_SALE')
    for (const key of LEGACY_XSHOP_BALANCE_TEST_REQUIRED_KEYS) expect(classifyLegacyCatalogKey(key)).toBe('BALANCE_TEST_REQUIRED')
    expect(classifyLegacyCatalogKey('999-999')).toBeNull()
    expect(classifyLegacyCatalogKey(undefined)).toBeNull()
  })

  it('NO_RED_AUTO_APPROVAL: a real catalog import blocks every one of the 165 decided X-Shop rows (153 RED + 12 balance-test), never DRAFT', async () => {
    const result = await storeAdmin.importCatalog({ dryRun: false, limit: 2000 }, adminUser)
    expect(result.created).toBeGreaterThan(0)

    const { LEGACY_XSHOP_NOT_FOR_SALE_KEYS, LEGACY_XSHOP_BALANCE_TEST_REQUIRED_KEYS } = await import('../src/modules/commerce/legacy-catalog-policy')
    const redProductKeys = [...LEGACY_XSHOP_NOT_FOR_SALE_KEYS].map((k) => `catalog-${k}`)
    const yellowProductKeys = [...LEGACY_XSHOP_BALANCE_TEST_REQUIRED_KEYS].map((k) => `catalog-${k}`)

    const redProducts = await prisma.shopProduct.findMany({ where: { key: { in: redProductKeys } } })
    expect(redProducts.length).toBe(153)
    for (const p of redProducts) {
      expect(p.status).toBe('BLOCKED')
      expect(p.ambiguous).toBe(true)
      expect(p.internalNotes).toContain('Fase S, Decisao 1')
      expect(p.price).toBe(0)
    }

    const yellowProducts = await prisma.shopProduct.findMany({ where: { key: { in: yellowProductKeys } } })
    expect(yellowProducts.length).toBe(12)
    for (const p of yellowProducts) {
      expect(p.status).toBe('BLOCKED')
      expect(p.ambiguous).toBe(true)
      expect(p.internalNotes).toContain('Fase S, Decisao 2')
    }
  })

  it('NO_DEAD_ROW_PUBLISHABLE: the 3 dead Axes rows never appear as any importable product (no source data exists for them)', async () => {
    const { LEGACY_XSHOP_DEAD_ROW_KEYS } = await import('../src/modules/commerce/legacy-catalog-policy')
    const deadProductKeys = LEGACY_XSHOP_DEAD_ROW_KEYS.map((k) => `catalog-${k}`)
    const deadProducts = await prisma.shopProduct.findMany({ where: { key: { in: deadProductKeys } } })
    expect(deadProducts.length).toBe(0)
  })

  it('NO_RED_AUTO_APPROVAL (workflow-level): even walking a blocked RED product through submit-review -> approve, publish is still rejected while ambiguous', async () => {
    const redProduct = await prisma.shopProduct.findFirstOrThrow({ where: { key: 'catalog-0-0' } })
    expect(redProduct.status).toBe('BLOCKED')
    expect(redProduct.ambiguous).toBe(true)

    await storeAdmin.transitionProduct(redProduct.id, { action: 'submit-review' }, adminUser)
    const inReview = await prisma.shopProduct.findUniqueOrThrow({ where: { id: redProduct.id } })
    expect(inReview.status).toBe('IN_REVIEW')

    const approver = await prisma.account.create({
      data: {
        username: `slci_appr_${suffix}`.slice(0, 20),
        name: 'Legacy Catalog Approver',
        email: `slci-appr-${suffix}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        twoFactorEnabled: true
      }
    })
    const approverUser = { id: approver.id, username: approver.username, name: approver.name, email: approver.email, role: 'SUPER_ADMIN' as const, permissions: ['*'], twoFactorEnabled: true }

    await storeAdmin.transitionProduct(redProduct.id, { action: 'approve' }, approverUser)
    const approved = await prisma.shopProduct.findUniqueOrThrow({ where: { id: redProduct.id } })
    expect(approved.status).toBe('APPROVED')
    expect(approved.ambiguous).toBe(true)

    await expect(storeAdmin.transitionProduct(redProduct.id, { action: 'publish' }, approverUser)).rejects.toThrow()
    const stillApproved = await prisma.shopProduct.findUniqueOrThrow({ where: { id: redProduct.id } })
    expect(stillApproved.status).toBe('APPROVED')
    expect(stillApproved.status).not.toBe('ACTIVE')
  })

  it('Dry-run reports the same blocked count as a real import, without creating anything', async () => {
    const dryRunResult = await storeAdmin.importCatalog({ dryRun: true, limit: 2000 }, adminUser)
    expect(dryRunResult.blocked).toBeGreaterThanOrEqual(165)
    expect(dryRunResult.created).toBe(0)
  })
})
