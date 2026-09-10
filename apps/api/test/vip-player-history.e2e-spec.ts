import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE Q (2026-08-31), Part 3/15 -- public approved-benefits list and
// the player's own VIP purchase history, both new this phase.
const CONTAINER = 'bloodmoon-e2e-vip-player-history'

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

describe('VIP player history + public benefits -- Phase Q', () => {
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
        username: `vphadmin_${suffix()}`.slice(0, 64),
        name: 'VIP History Admin',
        email: `vip-history-admin-${suffix()}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    })
    adminUser = { id: admin.id, username: admin.username, name: admin.name, email: admin.email, role: 'ADMIN', permissions: [], twoFactorEnabled: false }
  })

  it('PUBLIC_BENEFITS_APPROVED_ONLY: only the two approved benefit fields ever appear, never the unapproved ones', async () => {
    await vip.upsertBenefitConfig({ tier: 'GOLD', warehouseBonusPages: 10, commandCostReductionPercent: 25, enabled: true }, adminUser)
    const benefits = await vip.listPublicBenefits()
    const gold = benefits.find((b) => b.tier === 'GOLD')!
    expect(gold.benefits.some((b) => b.key === 'warehouseBonusPages')).toBe(true)
    expect(gold.benefits.some((b) => b.key === 'commandCostReductionPercent')).toBe(true)
    expect(gold.benefits.length).toBe(2)
    // Every tier's benefit list, whatever its real configured values are,
    // must only ever contain the two approved keys -- never
    // xp/drop/chaosMachine/reset, which stay permanently unlisted.
    const approvedKeys = new Set(['warehouseBonusPages', 'commandCostReductionPercent'])
    for (const tierBenefits of benefits) {
      for (const benefit of tierBenefits.benefits) {
        expect(approvedKeys.has(benefit.key)).toBe(true)
      }
    }
  })

  it('VIP_HISTORY_REAL_PRICE: a purchase appears in history with the ACTUAL price paid from the ledger, not the current config price', async () => {
    await vip.upsertProduct({ tier: 'SILVER', durationDays: 7, price: 900, currency: 'WCOIN', enabled: true }, adminUser)
    const account = await makeAccount('viphist')
    await vip.purchase(asUser(account), { tier: 'SILVER', durationDays: 7, idempotencyKey: randomUUID() })

    // Price changes AFTER the purchase -- history must still show 900, not the new price.
    await vip.upsertProduct({ tier: 'SILVER', durationDays: 7, price: 1500, currency: 'WCOIN', enabled: true }, adminUser)

    const history = await vip.listMyVipHistory(asUser(account))
    expect(history.length).toBe(1)
    expect(history[0].tier).toBe('SILVER')
    expect(history[0].durationDays).toBe(7)
    expect(history[0].price).toBe(900)
    expect(history[0].paymentStatus).toBe('PAID')
    expect(history[0].deliveryStatus).toBe('ACTIVE')
  })

  it('VIP_HISTORY_OWNERSHIP: one account never sees another account\'s VIP history', async () => {
    await vip.upsertProduct({ tier: 'BRONZE', durationDays: 7, price: 350, currency: 'WCOIN', enabled: true }, adminUser)
    const accountA = await makeAccount('viphista')
    const accountB = await makeAccount('viphistb')
    await vip.purchase(asUser(accountB), { tier: 'BRONZE', durationDays: 7, idempotencyKey: randomUUID() })

    const historyA = await vip.listMyVipHistory(asUser(accountA))
    expect(historyA.length).toBe(0)
    const historyB = await vip.listMyVipHistory(asUser(accountB))
    expect(historyB.length).toBe(1)
  })
})
