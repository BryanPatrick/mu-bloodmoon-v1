import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE P (2026-08-31), Part 15 -- explicit deterministic coverage for the
// full VIP tier x duration purchase matrix. `vip-foundation.e2e-spec.ts`'s
// own VIP_{7,15,30}_DAYS_VALID loop only ever purchases BRONZE (confirmed
// by a full read of that file this phase) -- SILVER and GOLD were never
// exercised by any test in this codebase before this file. Deliberately
// scoped to PORTAL-side purchase correctness (price charged, entitlement
// tier/duration, idempotency) -- NOT re-testing GameServer-side
// AccountLevel/AccountExpireDate delivery mechanics, which
// vip-gamebridge-delivery.e2e-spec.ts (Phase O) already covers in
// isolation via the real two-phase GameBridgeVipGateway; duplicating that
// here per-combination would be the exact "do not duplicate tests
// unnecessarily" this phase's own instruction warns against.
const CONTAINER = 'bloodmoon-e2e-vip-purchase-matrix'

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

describe('VIP purchase matrix -- Phase P Part 15', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let vip: import('../src/modules/vip/vip.service').VipService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { VipService } = await import('../src/modules/vip/vip.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    vip = app.get(VipService)
  }, 60000)

  afterAll(async () => app?.close())

  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeAccount(label: string) {
    const s = suffix()
    return prisma.account.create({
      data: {
        username: `${label}_${s}`.slice(0, 64),
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE',
        currencies: { create: [{ currency: 'WCOIN', balance: 1_000_000 }] }
      }
    })
  }

  function asUser(account: { id: string, username: string, name: string, email: string }) {
    return { ...account, role: 'PLAYER' as const, permissions: [], twoFactorEnabled: false }
  }

  let adminUser: { id: string, username: string, name: string, email: string, role: 'ADMIN', permissions: string[], twoFactorEnabled: boolean }
  beforeAll(async () => {
    const admin = await prisma.account.create({
      data: {
        username: `vmadmin_${suffix()}`.slice(0, 64),
        name: 'VIP Matrix Test Admin',
        email: `vip-matrix-admin-${suffix()}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    })
    adminUser = { id: admin.id, username: admin.username, name: admin.name, email: admin.email, role: 'ADMIN', permissions: [], twoFactorEnabled: false }
  })

  const tiers: Array<'BRONZE' | 'SILVER' | 'GOLD'> = ['BRONZE', 'SILVER', 'GOLD']
  const durations = [7, 15, 30]
  // Distinct, real-looking prices per tier so a wrong-tier debit would be
  // visibly wrong, not accidentally matching by coincidence.
  const priceForTier: Record<'BRONZE' | 'SILVER' | 'GOLD', number> = { BRONZE: 350, SILVER: 700, GOLD: 1400 }

  for (const tier of tiers) {
    for (const days of durations) {
      it(`VIP_${tier}_${days}: purchase charges the configured price, grants the correct tier/duration entitlement`, async () => {
        const price = priceForTier[tier]
        await vip.upsertProduct({ tier, durationDays: days, price, currency: 'WCOIN', enabled: true }, adminUser)
        const account = await makeAccount(`vm${tier.slice(0, 1).toLowerCase()}${days}`)

        const entitlement = await vip.purchase(asUser(account), { tier, durationDays: days })

        expect(entitlement.tier).toBe(tier)
        expect(entitlement.isActiveNow).toBe(true)
        const expiresAt = new Date(entitlement.expiresAt!)
        const expectedMs = days * 86_400_000
        const actualMs = expiresAt.getTime() - Date.now()
        expect(Math.abs(actualMs - expectedMs)).toBeLessThan(10_000)

        const wallet = await prisma.accountCurrency.findUniqueOrThrow({ where: { accountId_currency: { accountId: account.id, currency: 'WCOIN' } } })
        expect(wallet.balance).toBe(1_000_000 - price)

        const grant = await prisma.vipGrant.findFirst({ where: { accountId: account.id, tier, durationDays: days }, orderBy: { grantedAt: 'desc' } })
        expect(grant).not.toBeNull()
      })
    }
  }

  it('VIP_DUPLICATE_PAYMENT_DELIVERY: retrying the same idempotencyKey across ANY tier/duration never double-charges or double-extends', async () => {
    await vip.upsertProduct({ tier: 'GOLD', durationDays: 30, price: 1400, currency: 'WCOIN', enabled: true }, adminUser)
    const account = await makeAccount('vmdup')
    const idempotencyKey = randomUUID()

    const first = await vip.purchase(asUser(account), { tier: 'GOLD', durationDays: 30, idempotencyKey })
    const second = await vip.purchase(asUser(account), { tier: 'GOLD', durationDays: 30, idempotencyKey })

    expect(second.expiresAt).toBe(first.expiresAt)

    const wallet = await prisma.accountCurrency.findUniqueOrThrow({ where: { accountId_currency: { accountId: account.id, currency: 'WCOIN' } } })
    expect(wallet.balance).toBe(1_000_000 - 1400)

    const grants = await prisma.vipGrant.count({ where: { accountId: account.id, idempotencyKey } })
    expect(grants).toBe(1)
  })

  // PHASE Q DECISION CLOSURE (2026-08-31), Decision 3 -- Bryan's own
  // explicit reversal of "latest-tier-wins + additive days" (that could
  // silently turn 20 remaining Bronze days + a 30-day Gold purchase into
  // 50 Gold days). New conservative policy: SAME tier while active
  // extends normally; a DIFFERENT tier while active is blocked outright,
  // never silent, never a partial mutation. Named explicitly in the
  // phase's own test list -- one test per direction, since "Bronze to
  // Gold" and "Gold to Bronze" are the two concrete examples Bryan gave.
  it('VIP_CROSS_TIER_PURCHASE_BLOCKED_BRONZE_TO_GOLD: an active Bronze entitlement blocks a Gold purchase, leaving Bronze untouched', async () => {
    await vip.upsertProduct({ tier: 'BRONZE', durationDays: 30, price: 350, currency: 'WCOIN', enabled: true }, adminUser)
    await vip.upsertProduct({ tier: 'GOLD', durationDays: 30, price: 1400, currency: 'WCOIN', enabled: true }, adminUser)
    const account = await makeAccount('vmb2g')

    const bronze = await vip.purchase(asUser(account), { tier: 'BRONZE', durationDays: 30 })
    expect(bronze.tier).toBe('BRONZE')

    await expect(vip.purchase(asUser(account), { tier: 'GOLD', durationDays: 30 })).rejects.toMatchObject({
      response: { code: 'VIP_TIER_CHANGE_BLOCKED' }
    })

    const entitlement = await prisma.vipEntitlement.findUniqueOrThrow({ where: { accountId: account.id } })
    expect(entitlement.tier).toBe('BRONZE')
    expect(entitlement.expiresAt!.toISOString()).toBe(bronze.expiresAt)

    const wallet = await prisma.accountCurrency.findUniqueOrThrow({ where: { accountId_currency: { accountId: account.id, currency: 'WCOIN' } } })
    expect(wallet.balance).toBe(1_000_000 - 350)
  })

  it('VIP_CROSS_TIER_PURCHASE_BLOCKED_GOLD_TO_BRONZE: an active Gold entitlement blocks a Bronze purchase, leaving Gold untouched (no value destroyed)', async () => {
    await vip.upsertProduct({ tier: 'GOLD', durationDays: 30, price: 1400, currency: 'WCOIN', enabled: true }, adminUser)
    await vip.upsertProduct({ tier: 'BRONZE', durationDays: 7, price: 100, currency: 'WCOIN', enabled: true }, adminUser)
    const account = await makeAccount('vmg2b')

    const gold = await vip.purchase(asUser(account), { tier: 'GOLD', durationDays: 30 })
    expect(gold.tier).toBe('GOLD')

    await expect(vip.purchase(asUser(account), { tier: 'BRONZE', durationDays: 7 })).rejects.toMatchObject({
      response: { code: 'VIP_TIER_CHANGE_BLOCKED' }
    })

    const entitlement = await prisma.vipEntitlement.findUniqueOrThrow({ where: { accountId: account.id } })
    expect(entitlement.tier).toBe('GOLD')
    expect(entitlement.expiresAt!.toISOString()).toBe(gold.expiresAt)

    const wallet = await prisma.accountCurrency.findUniqueOrThrow({ where: { accountId_currency: { accountId: account.id, currency: 'WCOIN' } } })
    expect(wallet.balance).toBe(1_000_000 - 1400)
  })
})
