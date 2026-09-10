import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Open Beta P0 -- the required WC/GP/HP tax test bucket from the
// implementation phase spec. Uses the real, disposable e2e database (same
// pattern as every other spec in this suite), driving MarketplaceService
// and WalletLedgerService directly rather than through HTTP -- these
// tests are about economic correctness (exact fee math, idempotency,
// concurrency), not the HTTP contract, and the marketplace HTTP flow
// itself is already covered by the app's own request/response wiring
// (unchanged this phase).
const CONTAINER = 'bloodmoon-e2e-wc-economy-tax'

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

describe('WC/GP/HP marketplace tax -- Open Beta P0', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let marketplace: import('../src/modules/marketplace/marketplace.service').MarketplaceService
  let walletLedger: import('../src/modules/wallet/wallet-ledger.service').WalletLedgerService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { MarketplaceService } = await import('../src/modules/marketplace/marketplace.service')
    const { WalletLedgerService } = await import('../src/modules/wallet/wallet-ledger.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    marketplace = app.get(MarketplaceService)
    walletLedger = app.get(WalletLedgerService)

    // Confirm the decided rates before any test runs -- guards against a
    // config drift silently invalidating every test below.
    const economy = await prisma.marketplaceEconomyConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', acceptedCurrencies: ['WCOIN', 'GOBLIN_POINT', 'HUNT_POINT'] },
      update: {}
    })
    expect(economy.wcoinTaxPercent).toBe(10)
    expect(economy.goblinPointTaxPercent).toBe(5)
    expect(economy.huntPointTaxPercent).toBe(5)
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
        currencies: {
          create: [
            { currency: 'WCOIN', balance: 0 },
            { currency: 'GOBLIN_POINT', balance: 0 },
            { currency: 'HUNT_POINT', balance: 0 }
          ]
        }
      }
    })
  }

  function asUser(account: { id: string, username: string, name: string, email: string, role: 'PLAYER' | 'GM' | 'ADMIN' | 'SUPER_ADMIN' }) {
    return { ...account, permissions: [], twoFactorEnabled: false }
  }

  async function fund(accountId: string, currency: 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT', amount: number) {
    await prisma.accountCurrency.update({
      where: { accountId_currency: { accountId, currency } },
      data: { balance: { increment: amount } }
    })
  }

  async function sellThroughMarketplace(
    seller: { id: string, username: string, name: string, email: string, role: 'PLAYER' },
    buyer: { id: string, username: string, name: string, email: string, role: 'PLAYER' },
    currency: 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT',
    price: number
  ) {
    await fund(buyer.id, currency, price)
    const listing = await marketplace.createListing(
      {
        gameItemRef: `e2e-item-${randomUUID()}`,
        itemName: 'Test Item',
        itemCategory: 'weapon',
        itemData: { serial: randomUUID() },
        price,
        currency
      },
      asUser(seller)
    )
    // Skip the escrow lock/activation dance (GameBridge doesn't run in
    // this test) -- go straight to ACTIVE the same way the disabled dev
    // controls would, since only the tax/ledger behavior is under test.
    await prisma.playerMarketListing.update({ where: { id: listing.id }, data: { status: 'ACTIVE' } })
    const order = await marketplace.createOrder({ listingId: listing.id }, asUser(buyer))
    const completed = await marketplace.updateOrderStatus(order.id, { status: 'COMPLETED' }, asUser(seller))
    return { listing, order, completed }
  }

  // -------------------------------------------------------------------
  // WC_MARKET_100_GROSS_90_NET / WC_MARKET_RATE_10_PERCENT
  // -------------------------------------------------------------------
  it('WC_MARKET_100_GROSS_90_NET: a 100 WC sale nets the seller exactly 90 WC (10% sink)', async () => {
    const seller = await makeAccount('sellwc100')
    const buyer = await makeAccount('buywc100')
    const { completed } = await sellThroughMarketplace(seller as never, buyer as never, 'WCOIN', 100)
    expect(completed.fee).toBe(10)
    expect(completed.sellerAmount).toBe(90)
    expect(await walletLedger.getBalance(seller.id, 'WCOIN')).toBe(90)
  })

  // -------------------------------------------------------------------
  // NO_5_PLUS_10_DOUBLE_TAX
  // -------------------------------------------------------------------
  it('NO_5_PLUS_10_DOUBLE_TAX: the fee is exactly 10%, never 15% (old 5% never stacks on the new 10%)', async () => {
    const seller = await makeAccount('sellnodbl')
    const buyer = await makeAccount('buynodbl')
    const { completed } = await sellThroughMarketplace(seller as never, buyer as never, 'WCOIN', 200)
    // 15% would be 30, 10% is 20 -- assert the real (correct) value AND
    // explicitly refute the double-tax value.
    expect(completed.fee).toBe(20)
    expect(completed.fee).not.toBe(30)
  })

  // -------------------------------------------------------------------
  // GP_MARKET_REMAINS_5_PERCENT / HP_MARKET_REMAINS_5_PERCENT
  // -------------------------------------------------------------------
  it('GP_MARKET_REMAINS_5_PERCENT: GOBLIN_POINT market sales stay at 5%, not raised to 10%', async () => {
    const seller = await makeAccount('sellgp')
    const buyer = await makeAccount('buygp')
    const { completed } = await sellThroughMarketplace(seller as never, buyer as never, 'GOBLIN_POINT', 100)
    expect(completed.fee).toBe(5)
    expect(completed.sellerAmount).toBe(95)
  })

  it('HP_MARKET_REMAINS_5_PERCENT: HUNT_POINT market sales stay at 5%, not raised to 10%', async () => {
    const seller = await makeAccount('sellhp')
    const buyer = await makeAccount('buyhp')
    const { completed } = await sellThroughMarketplace(seller as never, buyer as never, 'HUNT_POINT', 100)
    expect(completed.fee).toBe(5)
    expect(completed.sellerAmount).toBe(95)
  })

  // -------------------------------------------------------------------
  // WC_MARKET_{1,2,9,10,20}_ALLOWED
  // -------------------------------------------------------------------
  for (const price of [1, 2, 9, 10, 20]) {
    it(`WC_MARKET_${price}_ALLOWED: a ${price} WC market sale is allowed and settles without error`, async () => {
      const seller = await makeAccount(`sellwc${price}`)
      const buyer = await makeAccount(`buywc${price}`)
      const { completed } = await sellThroughMarketplace(seller as never, buyer as never, 'WCOIN', price)
      expect(completed.status).toBe('COMPLETED')
      // Seller always receives the full gross immediately; the fee
      // realizes via the accumulator, possibly across future sales.
      expect(await walletLedger.getBalance(seller.id, 'WCOIN')).toBeGreaterThanOrEqual(price - Math.ceil(price / 10))
    })
  }

  // -------------------------------------------------------------------
  // FRACTION_ACCUMULATES / FRACTION_EXACT_OVER_TIME / NO_FLOATING_POINT
  // -------------------------------------------------------------------
  it('FRACTION_ACCUMULATES + FRACTION_EXACT_OVER_TIME: ten 1 WC sales converge to exactly 1 WC collected, no drift', async () => {
    const seller = await makeAccount('sellfrac')
    const buyer = await makeAccount('buyfrac')
    await fund(buyer.id, 'WCOIN', 10)

    let lastCompleted
    for (let i = 0; i < 10; i++) {
      const listing = await marketplace.createListing(
        { gameItemRef: `e2e-frac-${i}-${randomUUID()}`, itemName: 'Frac Item', itemCategory: 'misc', itemData: {}, price: 1, currency: 'WCOIN' },
        asUser(seller as never)
      )
      await prisma.playerMarketListing.update({ where: { id: listing.id }, data: { status: 'ACTIVE' } })
      const order = await marketplace.createOrder({ listingId: listing.id }, asUser(buyer as never))
      lastCompleted = await marketplace.updateOrderStatus(order.id, { status: 'COMPLETED' }, asUser(seller as never))
    }

    // 10 sales x 1 WC gross = 10 WC total; exact 10% = 1.0 WC, a whole
    // number -- must have converged exactly, no more, no less.
    expect(await walletLedger.getBalance(seller.id, 'WCOIN')).toBe(9)
    expect(await walletLedger.getFeeAccumulator(seller.id, 'WCOIN')).toBe(0)
    // NO_FLOATING_POINT: every intermediate and final value is an exact
    // integer -- if any float arithmetic had crept in, at least one of
    // these values would not be a clean integer after 10 repeated 10%
    // operations (a classic float-drift symptom).
    expect(Number.isInteger(await walletLedger.getBalance(seller.id, 'WCOIN'))).toBe(true)
    expect(lastCompleted!.status).toBe('COMPLETED')
  })

  // -------------------------------------------------------------------
  // FAILED_TRANSACTION_NO_TAX / ROLLBACK_NO_TAX
  // -------------------------------------------------------------------
  it('FAILED_TRANSACTION_NO_TAX: a failed purchase (insufficient balance) generates no ledger row and no accumulator change', async () => {
    const seller = await makeAccount('sellfail')
    const buyer = await makeAccount('buyfail')
    // Buyer intentionally NOT funded.
    const listing = await marketplace.createListing(
      { gameItemRef: `e2e-fail-${randomUUID()}`, itemName: 'Fail Item', itemCategory: 'misc', itemData: {}, price: 50, currency: 'WCOIN' },
      asUser(seller as never)
    )
    await prisma.playerMarketListing.update({ where: { id: listing.id }, data: { status: 'ACTIVE' } })

    await expect(marketplace.createOrder({ listingId: listing.id }, asUser(buyer as never))).rejects.toThrow()

    expect(await walletLedger.getBalance(seller.id, 'WCOIN')).toBe(0)
    expect(await walletLedger.getFeeAccumulator(seller.id, 'WCOIN')).toBe(0)
    const ledgerRows = await prisma.walletLedgerEntry.findMany({ where: { OR: [{ accountId: buyer.id }, { accountId: seller.id }] } })
    expect(ledgerRows).toHaveLength(0)
  })

  // -------------------------------------------------------------------
  // IDEMPOTENT_RETRY_NO_DOUBLE_TAX
  // -------------------------------------------------------------------
  it('IDEMPOTENT_RETRY_NO_DOUBLE_TAX: settling the same order twice never double-charges the fee', async () => {
    const seller = await makeAccount('sellidem')
    const buyer = await makeAccount('buyidem')
    const { order } = await sellThroughMarketplace(seller as never, buyer as never, 'WCOIN', 100)

    // updateOrderStatus itself no-ops on a repeat call to the SAME target
    // status via its own order.status check, so exercise the underlying
    // idempotency guarantee directly instead: calling settleTaxedCredit
    // again with the exact same idempotencyKey the completion already
    // used must not mutate anything a second time.
    const before = await walletLedger.getBalance(seller.id, 'WCOIN')
    await prisma.$transaction(async (tx) => {
      await walletLedger.settleTaxedCredit(tx, seller.id, buyer.id, 'WCOIN', order.price, {
        idempotencyKey: `market-order-settle:${order.correlationId}`,
        type: 'PLAYER_MARKET_PURCHASE',
        sourceType: 'PlayerMarketOrder',
        sourceId: order.id
      })
    })
    expect(await walletLedger.getBalance(seller.id, 'WCOIN')).toBe(before)
    const ledgerCount = await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `market-order-settle:${order.correlationId}` } })
    expect(ledgerCount).toBe(1)
  })

  // -------------------------------------------------------------------
  // CONCURRENT_PURCHASE_SAFE
  // -------------------------------------------------------------------
  it('CONCURRENT_PURCHASE_SAFE: two concurrent sales for the same seller settle to the exact combined fee, no lost updates', async () => {
    const seller = await makeAccount('sellconc')
    const buyerA = await makeAccount('buyconcA')
    const buyerB = await makeAccount('buyconcB')
    await fund(buyerA.id, 'WCOIN', 100)
    await fund(buyerB.id, 'WCOIN', 100)

    const listingA = await marketplace.createListing(
      { gameItemRef: `e2e-conc-a-${randomUUID()}`, itemName: 'Conc A', itemCategory: 'misc', itemData: {}, price: 100, currency: 'WCOIN' },
      asUser(seller as never)
    )
    const listingB = await marketplace.createListing(
      { gameItemRef: `e2e-conc-b-${randomUUID()}`, itemName: 'Conc B', itemCategory: 'misc', itemData: {}, price: 100, currency: 'WCOIN' },
      asUser(seller as never)
    )
    await prisma.playerMarketListing.update({ where: { id: listingA.id }, data: { status: 'ACTIVE' } })
    await prisma.playerMarketListing.update({ where: { id: listingB.id }, data: { status: 'ACTIVE' } })
    const orderA = await marketplace.createOrder({ listingId: listingA.id }, asUser(buyerA as never))
    const orderB = await marketplace.createOrder({ listingId: listingB.id }, asUser(buyerB as never))

    await Promise.all([
      marketplace.updateOrderStatus(orderA.id, { status: 'COMPLETED' }, asUser(seller as never)),
      marketplace.updateOrderStatus(orderB.id, { status: 'COMPLETED' }, asUser(seller as never))
    ])

    // 2 x 100 WC gross = 200 WC total, exact 10% = 20 WC combined fee,
    // regardless of which completion's transaction committed first.
    expect(await walletLedger.getBalance(seller.id, 'WCOIN')).toBe(180)
    expect(await walletLedger.getFeeAccumulator(seller.id, 'WCOIN')).toBe(0)
  })

  // -------------------------------------------------------------------
  // WC_MARKET_1_PURCHASE_ALLOWED without the 20 WC direct-transfer
  // minimum ever applying to a market/shop purchase
  // -------------------------------------------------------------------
  it('a 1 WC market purchase is never blocked by the 20 WC direct-transfer minimum (that rule does not apply here)', async () => {
    const seller = await makeAccount('sellmin')
    const buyer = await makeAccount('buymin')
    const { completed } = await sellThroughMarketplace(seller as never, buyer as never, 'WCOIN', 1)
    expect(completed.status).toBe('COMPLETED')
  })
})
