import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE P (2026-08-31), Part 13 -- provider-polling reconciliation.
// SANDBOX_VALIDATION_REQUIRED: these tests prove the mechanism's own
// logic (gating, rate-limiting, batch cap, reconciliation outcome) using
// a mocked Mercado Pago response, not a real sandbox call. The feature
// stays disabled by default in every real environment
// (MERCADO_PAGO_PROVIDER_POLL_ENABLED unset) -- the first test proves
// that default holds.
const CONTAINER = 'bloodmoon-e2e-payment-provider-poll'
const originalFetch = global.fetch
let fetchHandler: (url: string, init: RequestInit | undefined) => Promise<Response>

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-provider-poll-access-secret'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-provider-poll-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-provider-poll-two-factor-32chars'
  process.env.REAL_MONEY_PAYMENTS_ENABLED = 'true'
  process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-provider-poll-token'
  process.env.MERCADO_PAGO_API_BASE_URL = 'https://mercadopago.invalid'
  // Deliberately NOT set here -- each test controls it explicitly, so the
  // "disabled by default" test genuinely reflects what a fresh
  // environment looks like.
  delete process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED

  global.fetch = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    return fetchHandler(url, init)
  }) as typeof fetch

  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => {
  global.fetch = originalFetch
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('Provider-polling reconciliation -- Phase P Part 13', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let paymentReconciliation: import('../src/modules/commerce/payment-reconciliation.service').PaymentReconciliationService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { PaymentReconciliationService } = await import('../src/modules/commerce/payment-reconciliation.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    paymentReconciliation = app.get(PaymentReconciliationService)
  }, 60000)

  afterAll(async () => app?.close())

  const runSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  let counter = 0
  const makeStuckRecharge = async (status: 'PENDING' | 'PROCESSING' | 'REFUND_PENDING' | 'MANUAL_REVIEW', ageMs: number) => {
    counter += 1
    const account = await prisma.account.create({
      data: {
        username: `ppoll_${runSuffix}_${counter}`.slice(0, 64),
        name: `Provider Poll ${counter}`,
        email: `ppoll-${runSuffix}-${counter}@example.invalid`,
        passwordHash: 'not-used-in-this-suite',
        role: 'PLAYER',
        status: 'ACTIVE'
      }
    })
    const pkg = await prisma.rechargePackage.create({
      data: { key: `ppoll-pkg-${runSuffix}-${counter}`, currency: 'WCOIN', amount: 10, bonus: 0, price: '10,00', active: true }
    })
    const updatedAt = new Date(Date.now() - ageMs)
    const recharge = await prisma.rechargeIntent.create({
      data: {
        accountId: account.id,
        packageId: pkg.id,
        currency: 'WCOIN',
        amount: 10,
        bonus: 0,
        price: '10,00',
        status,
        externalOrderId: `ORDER-${runSuffix}-${counter}`,
        externalReference: `ref-ppoll-${runSuffix}-${counter}`
      }
    })
    // updatedAt has @updatedAt -- bypass it with a raw update so the
    // fixture can simulate "this has been stuck for a while."
    await prisma.$executeRawUnsafe(`UPDATE RechargeIntent SET updatedAt = ? WHERE id = ?`, updatedAt, recharge.id)
    return { account, recharge }
  }

  it('PROVIDER_POLL_DISABLED_BY_DEFAULT: with the flag unset, the poll is a safe no-op', async () => {
    delete process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED
    const result = await paymentReconciliation.pollProviderForStuckPayments()
    expect(result.enabled).toBe(false)
    expect(result.polled).toBe(0)
  })

  it('PROVIDER_POLL_RATE_LIMITED: a recently-updated stuck recharge is not polled yet', async () => {
    process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED = 'true'
    const { recharge } = await makeStuckRecharge('PENDING', 60_000) // 1 minute old -- below the 5-minute min-age

    fetchHandler = async () => jsonResponse({ id: 'ORDER-X', total_amount: '10.00', external_reference: 'irrelevant', status: 'processed', transactions: { payments: [] } })

    await paymentReconciliation.pollProviderForStuckPayments()

    const unchanged = await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: recharge.id } })
    expect(unchanged.status).toBe('PENDING')
    process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED = 'false'
  })

  it('PROVIDER_POLL_RECONCILES: a real candidate is polled and reconciled via the exact same state machine as a webhook', async () => {
    process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED = 'true'
    const { recharge } = await makeStuckRecharge('PENDING', 10 * 60_000) // 10 minutes old -- eligible

    fetchHandler = async (url) => {
      expect(url).toContain(recharge.externalOrderId!)
      return jsonResponse({
        id: recharge.externalOrderId,
        total_amount: '10.00',
        external_reference: recharge.externalReference,
        status: 'processed',
        status_detail: 'accredited',
        transactions: { payments: [{ id: 'PAY-X', status: 'processed', amount: '10.00' }] }
      })
    }

    const result = await paymentReconciliation.pollProviderForStuckPayments()
    expect(result.enabled).toBe(true)
    expect(result.polled).toBeGreaterThanOrEqual(1)

    const updated = await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: recharge.id } })
    expect(updated.status).toBe('PAID')

    const ledgerEntry = await prisma.walletLedgerEntry.findFirst({ where: { sourceType: 'RechargeIntent', sourceId: recharge.id } })
    expect(ledgerEntry).not.toBeNull()

    process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED = 'false'
  })

  it('PROVIDER_POLL_BATCH_CAPPED: only up to MERCADO_PAGO_PROVIDER_POLL_BATCH_SIZE candidates are polled per tick', async () => {
    process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED = 'true'
    process.env.MERCADO_PAGO_PROVIDER_POLL_BATCH_SIZE = '2'

    await makeStuckRecharge('PENDING', 10 * 60_000)
    await makeStuckRecharge('PENDING', 10 * 60_000)
    await makeStuckRecharge('PENDING', 10 * 60_000)

    fetchHandler = async () => jsonResponse({ id: 'ORDER-BATCH', total_amount: '10.00', external_reference: 'no-match', status: 'processed', transactions: { payments: [] } })

    const result = await paymentReconciliation.pollProviderForStuckPayments()
    expect(result.candidates).toBeLessThanOrEqual(2)

    delete process.env.MERCADO_PAGO_PROVIDER_POLL_BATCH_SIZE
    process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED = 'false'
  })
})
