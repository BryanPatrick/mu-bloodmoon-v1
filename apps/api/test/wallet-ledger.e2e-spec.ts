import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Open Beta P0 -- the required WC ledger test bucket. Verifies
// WalletLedgerService directly: every real balance mutation in the app
// (RechargeIntent credit, marketplace purchase/settlement) now routes
// through it and leaves exactly one auditable, idempotent row.
const CONTAINER = 'bloodmoon-e2e-wallet-ledger'

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

describe('WalletLedgerService -- Open Beta P0', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let walletLedger: import('../src/modules/wallet/wallet-ledger.service').WalletLedgerService
  let marketplace: import('../src/modules/marketplace/marketplace.service').MarketplaceService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { WalletLedgerService } = await import('../src/modules/wallet/wallet-ledger.service')
    const { MarketplaceService } = await import('../src/modules/marketplace/marketplace.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    walletLedger = app.get(WalletLedgerService)
    marketplace = app.get(MarketplaceService)
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
        currencies: { create: [{ currency: 'WCOIN', balance: 0 }] }
      }
    })
  }

  function asUser(account: { id: string, username: string, name: string, email: string }) {
    return { ...account, role: 'PLAYER' as const, permissions: [], twoFactorEnabled: false }
  }

  // -------------------------------------------------------------------
  // PURCHASE_CREDIT_LEDGER / PAYMENT_PROVENANCE
  // -------------------------------------------------------------------
  it('PURCHASE_CREDIT_LEDGER + PAYMENT_PROVENANCE: a WC_PURCHASE_CREDIT writes a ledger row tracing back to its RechargeIntent', async () => {
    const account = await makeAccount('ledgercredit')
    const key = `test-credit-${randomUUID()}`
    await prisma.$transaction(async (tx) => {
      await walletLedger.credit(tx, account.id, 'WCOIN', 500, {
        idempotencyKey: key,
        type: 'WC_PURCHASE_CREDIT',
        sourceType: 'RechargeIntent',
        sourceId: 'fake-recharge-id',
        paymentProvenanceRef: 'fake-recharge-id'
      })
    })

    const entry = await prisma.walletLedgerEntry.findUnique({ where: { idempotencyKey: key } })
    expect(entry).not.toBeNull()
    expect(entry!.type).toBe('WC_PURCHASE_CREDIT')
    expect(entry!.grossAmount).toBe(500)
    expect(entry!.netAmount).toBe(500)
    expect(entry!.paymentProvenanceRef).toBe('fake-recharge-id')
    expect(await walletLedger.getBalance(account.id, 'WCOIN')).toBe(500)
  })

  // -------------------------------------------------------------------
  // MARKET_LEDGER / TAX_LEDGER / COUNTERPARTY_TRACE
  // -------------------------------------------------------------------
  it('MARKET_LEDGER + TAX_LEDGER + COUNTERPARTY_TRACE: a settled market order produces one row with gross/tax/net and a resolvable counterparty', async () => {
    const seller = await makeAccount('ledgerseller')
    const buyer = await makeAccount('ledgerbuyer')
    await prisma.accountCurrency.update({ where: { accountId_currency: { accountId: buyer.id, currency: 'WCOIN' } }, data: { balance: 100 } })

    const listing = await marketplace.createListing(
      { gameItemRef: `e2e-ledger-${randomUUID()}`, itemName: 'Ledger Item', itemCategory: 'misc', itemData: {}, price: 100, currency: 'WCOIN' },
      asUser(seller)
    )
    await prisma.playerMarketListing.update({ where: { id: listing.id }, data: { status: 'ACTIVE' } })
    const order = await marketplace.createOrder({ listingId: listing.id }, asUser(buyer))
    await marketplace.updateOrderStatus(order.id, { status: 'COMPLETED' }, asUser(seller))

    // Buyer's debit row.
    const buyerEntry = await prisma.walletLedgerEntry.findUnique({ where: { idempotencyKey: `market-order-debit:${order.correlationId}` } })
    expect(buyerEntry).not.toBeNull()
    expect(buyerEntry!.type).toBe('PLAYER_MARKET_PURCHASE')
    expect(buyerEntry!.grossAmount).toBe(100)

    // Seller's settlement row -- the one with real tax accounting.
    const sellerEntry = await prisma.walletLedgerEntry.findUnique({ where: { idempotencyKey: `market-order-settle:${order.correlationId}` } })
    expect(sellerEntry).not.toBeNull()
    expect(sellerEntry!.type).toBe('PLAYER_MARKET_PURCHASE')
    expect(sellerEntry!.grossAmount).toBe(100)
    expect(sellerEntry!.taxAmount).toBe(10)
    expect(sellerEntry!.netAmount).toBe(90)
    expect(sellerEntry!.feeObligationSubunits).toBe(100 * 1000) // 10,000 subunits/WC * 10%
    // COUNTERPARTY_TRACE: from the seller's row alone, the buyer is resolvable.
    expect(sellerEntry!.counterpartyAccountId).toBe(buyer.id)
    expect(sellerEntry!.accountId).toBe(seller.id)
  })

  // -------------------------------------------------------------------
  // FAILED_MUTATION_NO_LEDGER_COMMIT
  // -------------------------------------------------------------------
  it('FAILED_MUTATION_NO_LEDGER_COMMIT: a debit that fails validation writes no ledger row', async () => {
    const account = await makeAccount('ledgerfail')
    const key = `test-fail-${randomUUID()}`
    await expect(
      prisma.$transaction(async (tx) => {
        await walletLedger.debit(tx, account.id, 'WCOIN', 50, { idempotencyKey: key, type: 'STORE_PURCHASE' })
      })
    ).rejects.toThrow()

    const entry = await prisma.walletLedgerEntry.findUnique({ where: { idempotencyKey: key } })
    expect(entry).toBeNull()
    expect(await walletLedger.getBalance(account.id, 'WCOIN')).toBe(0)
  })

  // -------------------------------------------------------------------
  // IDEMPOTENCY
  // -------------------------------------------------------------------
  it('IDEMPOTENCY: crediting twice with the same idempotencyKey applies the balance change once', async () => {
    const account = await makeAccount('ledgeridem')
    const key = `test-idem-${randomUUID()}`
    const ctx = { idempotencyKey: key, type: 'SERVER_REWARD' as const }
    await prisma.$transaction(async (tx) => walletLedger.credit(tx, account.id, 'WCOIN', 30, ctx))
    await prisma.$transaction(async (tx) => walletLedger.credit(tx, account.id, 'WCOIN', 30, ctx))

    expect(await walletLedger.getBalance(account.id, 'WCOIN')).toBe(30)
    const count = await prisma.walletLedgerEntry.count({ where: { idempotencyKey: key } })
    expect(count).toBe(1)
  })

  // -------------------------------------------------------------------
  // CONCURRENCY
  // -------------------------------------------------------------------
  it('CONCURRENCY: two concurrent credits to the same account both land, with no lost update', async () => {
    const account = await makeAccount('ledgerconc')
    await Promise.all([
      prisma.$transaction(async (tx) =>
        walletLedger.credit(tx, account.id, 'WCOIN', 40, { idempotencyKey: `conc-a-${randomUUID()}`, type: 'SERVER_REWARD' })
      ),
      prisma.$transaction(async (tx) =>
        walletLedger.credit(tx, account.id, 'WCOIN', 60, { idempotencyKey: `conc-b-${randomUUID()}`, type: 'SERVER_REWARD' })
      )
    ])
    expect(await walletLedger.getBalance(account.id, 'WCOIN')).toBe(100)
  })

  // -------------------------------------------------------------------
  // SERVER_REWARD_NOT_P2P_TAXED
  // -------------------------------------------------------------------
  it('SERVER_REWARD_NOT_P2P_TAXED: a server reward credits the full amount with zero tax', async () => {
    const account = await makeAccount('ledgerreward')
    const key = `test-reward-${randomUUID()}`
    await prisma.$transaction(async (tx) =>
      walletLedger.credit(tx, account.id, 'WCOIN', 1000, { idempotencyKey: key, type: 'SERVER_REWARD' })
    )
    const entry = await prisma.walletLedgerEntry.findUnique({ where: { idempotencyKey: key } })
    expect(entry!.taxAmount).toBe(0)
    expect(entry!.netAmount).toBe(1000)
    expect(await walletLedger.getBalance(account.id, 'WCOIN')).toBe(1000)
  })
})
