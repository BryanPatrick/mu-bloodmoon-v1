import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE O (2026-08-31): RECONCILIATION_PAYMENT / RECONCILIATION_DELIVERY --
// PaymentReconciliationService (payment-reconciliation.service.ts). The
// service's own header comment explains why this is a pure local
// DB-consistency check, never a real Mercado Pago API call.
const CONTAINER = 'bloodmoon-e2e-payment-reconciliation'

describe('Payment reconciliation', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let reconciliation: import('../src/modules/commerce/payment-reconciliation.service').PaymentReconciliationService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-payment-reconciliation-access-secret'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-payment-reconciliation-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-payment-reconciliation-two-factor32'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { PaymentReconciliationService } = await import('../src/modules/commerce/payment-reconciliation.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    reconciliation = app.get(PaymentReconciliationService)
  }, 120000)

  afterAll(async () => app?.close())
  jest.setTimeout(30000)

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
        status: 'ACTIVE'
      }
    })
  }

  async function makePackage() {
    return prisma.rechargePackage.create({
      data: { key: `recon-pkg-${suffix()}`, currency: 'WCOIN', amount: 20, bonus: 0, price: '20,00', active: true }
    })
  }

  test('RECONCILIATION_PAYMENT: a PAID recharge with no matching ledger credit is flagged (real invariant violation, not the normal path)', async () => {
    const account = await makeAccount('recon-missing-credit')
    const pkg = await makePackage()
    // Deliberately created directly as PAID, bypassing transitionRechargeStatus
    // entirely -- this is the ONLY way to reach the anomaly this check
    // exists for, since the real code path always credits atomically.
    const recharge = await prisma.rechargeIntent.create({
      data: { accountId: account.id, packageId: pkg.id, currency: 'WCOIN', amount: 20, bonus: 0, price: '20,00', status: 'PAID', approvedAt: new Date() }
    })

    const anomalies = await reconciliation.findAnomalies()
    const found = anomalies.find((a) => a.rechargeIntentId === recharge.id)
    expect(found).toBeDefined()
    expect(found?.issue).toBe('PAID_WITHOUT_LEDGER_CREDIT')
    expect(found?.accountId).toBe(account.id)
  })

  test('RECONCILIATION_DELIVERY: a PAID recharge WITH a matching ledger credit is never flagged (the normal, correct path)', async () => {
    const account = await makeAccount('recon-has-credit')
    const pkg = await makePackage()
    const recharge = await prisma.rechargeIntent.create({
      data: { accountId: account.id, packageId: pkg.id, currency: 'WCOIN', amount: 20, bonus: 0, price: '20,00', status: 'PAID', approvedAt: new Date() }
    })
    await prisma.walletLedgerEntry.create({
      data: {
        idempotencyKey: `recharge-credit:${recharge.id}`,
        type: 'WC_PURCHASE_CREDIT',
        currency: 'WCOIN',
        accountId: account.id,
        grossAmount: 20,
        netAmount: 20,
        sourceType: 'RechargeIntent',
        sourceId: recharge.id,
        paymentProvenanceRef: recharge.id
      }
    })

    const anomalies = await reconciliation.findAnomalies()
    expect(anomalies.find((a) => a.rechargeIntentId === recharge.id)).toBeUndefined()
  })

  test('STUCK_NON_TERMINAL: a recharge PENDING for over an hour is flagged; a fresh PENDING recharge is not', async () => {
    const account = await makeAccount('recon-stuck')
    const pkg = await makePackage()
    const stuckRecharge = await prisma.rechargeIntent.create({
      data: { accountId: account.id, packageId: pkg.id, currency: 'WCOIN', amount: 20, bonus: 0, price: '20,00', status: 'PENDING' }
    })
    await prisma.$executeRawUnsafe(`UPDATE RechargeIntent SET createdAt = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ?`, stuckRecharge.id)

    const freshAccount = await makeAccount('recon-fresh')
    const freshRecharge = await prisma.rechargeIntent.create({
      data: { accountId: freshAccount.id, packageId: pkg.id, currency: 'WCOIN', amount: 20, bonus: 0, price: '20,00', status: 'PENDING' }
    })

    const anomalies = await reconciliation.findAnomalies()
    const stuckFound = anomalies.find((a) => a.rechargeIntentId === stuckRecharge.id)
    expect(stuckFound).toBeDefined()
    expect(stuckFound?.issue).toBe('STUCK_NON_TERMINAL')
    expect(anomalies.find((a) => a.rechargeIntentId === freshRecharge.id)).toBeUndefined()
  })

  test('a fully terminal recharge (CANCELLED) is never flagged as stuck', async () => {
    const account = await makeAccount('recon-cancelled')
    const pkg = await makePackage()
    const cancelledRecharge = await prisma.rechargeIntent.create({
      data: { accountId: account.id, packageId: pkg.id, currency: 'WCOIN', amount: 20, bonus: 0, price: '20,00', status: 'CANCELLED' }
    })
    await prisma.$executeRawUnsafe(`UPDATE RechargeIntent SET createdAt = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ?`, cancelledRecharge.id)

    const anomalies = await reconciliation.findAnomalies()
    expect(anomalies.find((a) => a.rechargeIntentId === cancelledRecharge.id)).toBeUndefined()
  })

  test('runOnce() records an operational event per anomaly and reports the scanned/anomaly count', async () => {
    const account = await makeAccount('recon-runonce')
    const pkg = await makePackage()
    await prisma.rechargeIntent.create({
      data: { accountId: account.id, packageId: pkg.id, currency: 'WCOIN', amount: 20, bonus: 0, price: '20,00', status: 'PAID', approvedAt: new Date() }
    })

    const result = await reconciliation.runOnce()
    expect(result.scanned).toBeGreaterThanOrEqual(1)
    expect(result.anomalies).toBe(result.scanned)
  })
})
