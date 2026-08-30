import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Open Beta P0 -- VIP foundation test bucket. No benefit values (XP/drop/
// Chaos Machine bonuses) are exercised as "activated" anywhere here --
// per the phase spec, none are approved yet, and vip.service.ts's
// upsertBenefitConfig always clamps them to 0/disabled regardless of
// what's requested (tested explicitly below).
const CONTAINER = 'bloodmoon-e2e-vip-foundation'

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

describe('VIP foundation -- Open Beta P0', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let vip: import('../src/modules/vip/vip.service').VipService
  let walletLedger: import('../src/modules/wallet/wallet-ledger.service').WalletLedgerService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { VipService } = await import('../src/modules/vip/vip.service')
    const { WalletLedgerService } = await import('../src/modules/wallet/wallet-ledger.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    vip = app.get(VipService)
    walletLedger = app.get(WalletLedgerService)
  }, 60000)

  afterAll(async () => app?.close())

  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeAccount(label: string) {
    const s = suffix()
    return prisma.account.create({
      data: {
        username: `${label}_${s}`.slice(0, 20),
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE',
        currencies: { create: [{ currency: 'WCOIN', balance: 100000 }] }
      }
    })
  }

  function asUser(account: { id: string, username: string, name: string, email: string }) {
    return { ...account, role: 'PLAYER' as const, permissions: [], twoFactorEnabled: false }
  }

  // AuditService.record() writes a real AuditEvent row with a foreign-key
  // actorId -- must be a real Account, not a hand-typed fixture object.
  let adminUser: { id: string, username: string, name: string, email: string, role: 'ADMIN', permissions: string[], twoFactorEnabled: boolean }
  beforeAll(async () => {
    const admin = await prisma.account.create({
      data: {
        username: `vipadmin_${suffix()}`.slice(0, 20),
        name: 'VIP Test Admin',
        email: `vip-admin-${suffix()}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    })
    adminUser = { id: admin.id, username: admin.username, name: admin.name, email: admin.email, role: 'ADMIN', permissions: [], twoFactorEnabled: false }
  })

  async function enableProduct(tier: 'BRONZE' | 'SILVER' | 'GOLD', durationDays: number, price = 100) {
    return vip.upsertProduct({ tier, durationDays, price, currency: 'WCOIN', enabled: true }, adminUser)
  }

  // -------------------------------------------------------------------
  // VIP_7_DAYS_VALID / VIP_15_DAYS_VALID / VIP_30_DAYS_VALID
  // -------------------------------------------------------------------
  for (const days of [7, 15, 30]) {
    it(`VIP_${days}_DAYS_VALID: a ${days}-day plan can be enabled and purchased`, async () => {
      await enableProduct('BRONZE', days)
      const account = await makeAccount(`vip${days}`)
      const entitlement = await vip.purchase(asUser(account), { tier: 'BRONZE', durationDays: days })
      expect(entitlement.tier).toBe('BRONZE')
      expect(entitlement.isActiveNow).toBe(true)
      const expiresAt = new Date(entitlement.expiresAt!)
      const expectedMs = days * 86_400_000
      const actualMs = expiresAt.getTime() - Date.now()
      // Allow a few seconds of test-execution slack either side.
      expect(Math.abs(actualMs - expectedMs)).toBeLessThan(10_000)
    })
  }

  // -------------------------------------------------------------------
  // VIP_INVALID_DURATION_REJECTED
  // -------------------------------------------------------------------
  it('VIP_INVALID_DURATION_REJECTED: purchasing a duration with no matching enabled product is rejected', async () => {
    const account = await makeAccount('vipinvalid')
    await expect(vip.purchase(asUser(account), { tier: 'GOLD', durationDays: 21 })).rejects.toThrow()
  })

  it('VIP_INVALID_DURATION_REJECTED (disabled product): a configured-but-disabled plan is rejected too', async () => {
    await vip.upsertProduct({ tier: 'SILVER', durationDays: 15, price: 200, currency: 'WCOIN', enabled: false }, adminUser)
    const account = await makeAccount('vipdisabled')
    await expect(vip.purchase(asUser(account), { tier: 'SILVER', durationDays: 15 })).rejects.toThrow()
  })

  // -------------------------------------------------------------------
  // VIP_DUPLICATE_DELIVERY_SAFE
  // -------------------------------------------------------------------
  it('VIP_DUPLICATE_DELIVERY_SAFE: retrying a purchase with the same idempotencyKey does not grant twice', async () => {
    await enableProduct('GOLD', 7, 150)
    const account = await makeAccount('vipdup')
    const idempotencyKey = `vip-dup-test-${randomUUID()}`

    const first = await vip.purchase(asUser(account), { tier: 'GOLD', durationDays: 7, idempotencyKey })
    const balanceAfterFirst = await walletLedger.getBalance(account.id, 'WCOIN')
    const second = await vip.purchase(asUser(account), { tier: 'GOLD', durationDays: 7, idempotencyKey })

    expect(second.expiresAt).toBe(first.expiresAt)
    expect(await walletLedger.getBalance(account.id, 'WCOIN')).toBe(balanceAfterFirst)
    const grantCount = await prisma.vipGrant.count({ where: { idempotencyKey } })
    expect(grantCount).toBe(1)
  })

  // -------------------------------------------------------------------
  // VIP_ACTIVE_EXTENSION_SAFE
  // -------------------------------------------------------------------
  it('VIP_ACTIVE_EXTENSION_SAFE: repurchasing while active extends remaining time rather than losing it', async () => {
    await enableProduct('BRONZE', 7, 100)
    const account = await makeAccount('vipextend')
    const first = await vip.purchase(asUser(account), { tier: 'BRONZE', durationDays: 7 })
    const firstExpiry = new Date(first.expiresAt!).getTime()

    const second = await vip.purchase(asUser(account), { tier: 'BRONZE', durationDays: 7 })
    const secondExpiry = new Date(second.expiresAt!).getTime()

    // Second purchase should extend ~7 more days ON TOP of the first
    // expiry, not reset to 7 days from now (which would be earlier than
    // stacking two 7-day periods).
    expect(secondExpiry).toBeGreaterThan(firstExpiry)
    expect(secondExpiry - firstExpiry).toBeGreaterThan(6 * 86_400_000)
    const entitlement = await prisma.vipEntitlement.findUnique({ where: { accountId: account.id } })
    expect(entitlement!.totalDaysGranted).toBe(14)
  })

  // -------------------------------------------------------------------
  // VIP_EXPIRY_SAFE
  // -------------------------------------------------------------------
  it('VIP_EXPIRY_SAFE: an entitlement with a past expiresAt reports isActiveNow=false', async () => {
    const account = await makeAccount('vipexpired')
    await prisma.vipEntitlement.create({
      data: {
        accountId: account.id,
        tier: 'GOLD',
        activatedAt: new Date(Date.now() - 20 * 86_400_000),
        expiresAt: new Date(Date.now() - 1000),
        totalDaysGranted: 7,
        status: 'ACTIVE' // stale status on purpose -- isActiveNow must be computed from expiresAt, not trusted from the stored status field
      }
    })
    const result = await vip.getMyEntitlement(asUser(account))
    expect(result.isActiveNow).toBe(false)
  })

  it('VIP_EXPIRY_SAFE: repurchasing after expiry starts a fresh period from now, not from the stale expiry', async () => {
    await enableProduct('SILVER', 7, 120)
    const account = await makeAccount('vipexpbuy')
    await prisma.vipEntitlement.create({
      data: {
        accountId: account.id,
        tier: 'SILVER',
        activatedAt: new Date(Date.now() - 20 * 86_400_000),
        expiresAt: new Date(Date.now() - 10 * 86_400_000),
        totalDaysGranted: 7,
        status: 'ACTIVE'
      }
    })
    const result = await vip.purchase(asUser(account), { tier: 'SILVER', durationDays: 7 })
    const expiresAt = new Date(result.expiresAt!).getTime()
    // Fresh 7 days from NOW, not from the stale expiry 10 days in the past.
    expect(expiresAt).toBeGreaterThan(Date.now() + 6 * 86_400_000)
  })

  // -------------------------------------------------------------------
  // No unapproved benefit values -- explicit clamp verification
  // -------------------------------------------------------------------
  it('admin cannot activate VIP benefits this phase -- requested values are always clamped to 0/disabled', async () => {
    const row = await vip.upsertBenefitConfig(
      { tier: 'GOLD', xpBonusPercent: 30, dropBonusPercent: 25, chaosMachineBonusPercent: 15, resetBenefitEnabled: true, enabled: true },
      adminUser
    )
    expect(row.xpBonusPercent).toBe(0)
    expect(row.dropBonusPercent).toBe(0)
    expect(row.chaosMachineBonusPercent).toBe(0)
    expect(row.resetBenefitEnabled).toBe(false)
    expect(row.enabled).toBe(false)
  })

  it('no VIP-tier Chaos Machine or XP bonus is granted as part of a purchase itself', async () => {
    await enableProduct('GOLD', 7, 100)
    const account = await makeAccount('vipnobenefit')
    await vip.purchase(asUser(account), { tier: 'GOLD', durationDays: 7 })
    const benefit = await prisma.vipBenefitConfig.findUnique({ where: { tier: 'GOLD' } })
    // No row at all is the expected, safest state (nothing configured,
    // nothing to accidentally activate).
    expect(benefit === null || (benefit.enabled === false && benefit.xpBonusPercent === 0)).toBe(true)
  })
})
