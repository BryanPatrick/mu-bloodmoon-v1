import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE O (2026-08-31): CHARGEBACK_AFTER_WC_DISPERSAL_TRACEABILITY --
// WalletLedgerService.traceChargebackDispersal() (see that method's own
// header comment, docs/decisions/0016-rmt-policy-gap.md's Decision 2).
// Uses settleTaxedCredit() directly (bypassing whatever higher-level
// marketplace/transfer service normally calls it) since this suite's job
// is to prove the TRACING query is correct given real ledger rows shaped
// the way a real P2P transfer/market sale produces them, not to
// re-exercise the transfer feature itself.
const CONTAINER = 'bloodmoon-e2e-chargeback-dispersal-trace'

describe('Chargeback dispersal tracing', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let walletLedger: import('../src/modules/wallet/wallet-ledger.service').WalletLedgerService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-chargeback-trace-access-secret'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-chargeback-trace-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-chargeback-trace-two-factor-32c'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { WalletLedgerService } = await import('../src/modules/wallet/wallet-ledger.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    walletLedger = app.get(WalletLedgerService)
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

  test('CHARGEBACK_AFTER_WC_DISPERSAL_TRACEABILITY: traces payment -> A -> B -> C across multiple hops', async () => {
    const [a, b, c, unrelated] = await Promise.all([
      makeAccount('trace-a'),
      makeAccount('trace-b'),
      makeAccount('trace-c'),
      makeAccount('trace-unrelated')
    ])

    const pkg = await prisma.rechargePackage.create({
      data: { key: `trace-pkg-${suffix()}`, currency: 'WCOIN', amount: 100, bonus: 0, price: '100,00', active: true }
    })
    const recharge = await prisma.rechargeIntent.create({
      data: { accountId: a.id, packageId: pkg.id, currency: 'WCOIN', amount: 100, bonus: 0, price: '100,00', status: 'PAID', approvedAt: new Date() }
    })

    // Origin credit: the real recharge payment lands on A.
    await prisma.$transaction((tx) =>
      walletLedger.credit(tx, a.id, 'WCOIN', 100, {
        idempotencyKey: `trace-origin-${recharge.id}`,
        type: 'WC_PURCHASE_CREDIT',
        sourceType: 'RechargeIntent',
        sourceId: recharge.id,
        paymentProvenanceRef: recharge.id
      })
    )

    // A short, real delay so createdAt ordering between origin and the
    // dispersal hops below is unambiguous (MySQL DATETIME(3) resolution).
    await new Promise((resolve) => setTimeout(resolve, 20))

    // Hop 1: A pays B (settleTaxedCredit sets counterpartyAccountId=A on
    // B's own credit row -- exactly what a real P2P transfer produces).
    await prisma.$transaction((tx) =>
      walletLedger.settleTaxedCredit(tx, b.id, a.id, 'WCOIN', 40, {
        idempotencyKey: `trace-hop1-${suffix()}`,
        type: 'PLAYER_DIRECT_TRANSFER'
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 20))

    // Hop 2: B pays C.
    await prisma.$transaction((tx) =>
      walletLedger.settleTaxedCredit(tx, c.id, b.id, 'WCOIN', 15, {
        idempotencyKey: `trace-hop2-${suffix()}`,
        type: 'PLAYER_DIRECT_TRANSFER'
      })
    )

    // Unrelated noise: a completely separate transfer between B and
    // "unrelated" BEFORE the origin credit even happened -- must NOT be
    // picked up by the trace (wrong time window).
    await prisma.$transaction((tx) =>
      walletLedger.credit(tx, unrelated.id, 'WCOIN', 500, {
        idempotencyKey: `trace-noise-fund-${suffix()}`,
        type: 'ADMIN_ADJUSTMENT'
      })
    )

    const trace = await walletLedger.traceChargebackDispersal(recharge.id)

    expect(trace.originAccountId).toBe(a.id)
    expect(trace.originAmount).toBe(100)
    expect(trace.truncated).toBe(false)
    expect(trace.involvedAccountIds.sort()).toEqual([a.id, b.id, c.id].sort())
    expect(trace.involvedAccountIds).not.toContain(unrelated.id)

    expect(trace.dispersalChain).toHaveLength(2)
    const hop1 = trace.dispersalChain.find((h) => h.hop === 1)
    const hop2 = trace.dispersalChain.find((h) => h.hop === 2)
    expect(hop1).toMatchObject({ fromAccountId: a.id, toAccountId: b.id, amount: 40 })
    expect(hop2).toMatchObject({ fromAccountId: b.id, toAccountId: c.id, amount: 15 })
  })

  test('a recharge with no dispersal (WC never left the original account) traces to an empty chain, not an error', async () => {
    const a = await makeAccount('trace-solo')
    const pkg = await prisma.rechargePackage.create({
      data: { key: `trace-solo-pkg-${suffix()}`, currency: 'WCOIN', amount: 50, bonus: 0, price: '50,00', active: true }
    })
    const recharge = await prisma.rechargeIntent.create({
      data: { accountId: a.id, packageId: pkg.id, currency: 'WCOIN', amount: 50, bonus: 0, price: '50,00', status: 'PAID', approvedAt: new Date() }
    })
    await prisma.$transaction((tx) =>
      walletLedger.credit(tx, a.id, 'WCOIN', 50, {
        idempotencyKey: `trace-solo-${recharge.id}`,
        type: 'WC_PURCHASE_CREDIT',
        sourceType: 'RechargeIntent',
        sourceId: recharge.id,
        paymentProvenanceRef: recharge.id
      })
    )

    const trace = await walletLedger.traceChargebackDispersal(recharge.id)
    expect(trace.originAccountId).toBe(a.id)
    expect(trace.dispersalChain).toHaveLength(0)
    expect(trace.involvedAccountIds).toEqual([a.id])
  })

  test('a RechargeIntent with no matching credit row (never reached PAID) traces to a null origin, not an error', async () => {
    const a = await makeAccount('trace-nocred')
    const pkg = await prisma.rechargePackage.create({
      data: { key: `trace-nocred-pkg-${suffix()}`, currency: 'WCOIN', amount: 30, bonus: 0, price: '30,00', active: true }
    })
    const recharge = await prisma.rechargeIntent.create({
      data: { accountId: a.id, packageId: pkg.id, currency: 'WCOIN', amount: 30, bonus: 0, price: '30,00', status: 'PENDING' }
    })

    const trace = await walletLedger.traceChargebackDispersal(recharge.id)
    expect(trace.originAccountId).toBeNull()
    expect(trace.dispersalChain).toHaveLength(0)
  })
})
