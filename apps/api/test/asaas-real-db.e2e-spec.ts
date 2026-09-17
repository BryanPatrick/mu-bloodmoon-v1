import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-asaas-real-db'
const originalFetch = global.fetch
const run = randomUUID().slice(0, 8)
const token = 'fake-e2e-webhook-token'
const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 })
type FakePayment = {
  id: string
  customer: string
  externalReference: string
  status: string
  value: number
  billingType: string
}
const customers = new Map<string, string>()
const payments = new Map<string, FakePayment>()
let customerPosts = 0
let paymentPosts = 0
let paymentGate: Promise<void> | null = null
let loseNextPaymentResponse = false
let customerPayloadValid = false

beforeAll(async () => {
  const db = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = db.databaseUrl
  process.env.NODE_ENV = 'test'
  process.env.ASAAS_ENABLED = 'true'
  process.env.ASAAS_ENVIRONMENT = 'sandbox'
  process.env.ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3'
  process.env.ASAAS_API_KEY = '$aact_hmlg_fake_local_e2e'
  process.env.ASAAS_WEBHOOK_TOKEN = token
  process.env.BILLING_PII_KEY_B64 = Buffer.alloc(32, 23).toString('base64')
  process.env.JWT_ACCESS_SECRET = 'fake-local-e2e-access'
  process.env.JWT_REFRESH_SECRET = 'fake-local-e2e-refresh'
  global.fetch = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString())
    if (url.origin !== 'https://api-sandbox.asaas.com')
      throw new Error('unexpected external request')
    const path = url.pathname.replace('/v3', '')
    if (path === '/customers' && init?.method === 'POST') {
      customerPosts++
      const body = JSON.parse(String(init.body)) as {
        externalReference: string
        name: string
        cpfCnpj: string
      }
      customerPayloadValid = body.name === 'QA Billing Fixture' && body.cpfCnpj === '11122233344'
      const id = `cus_${run}_${customers.size + 1}`
      customers.set(body.externalReference, id)
      return json({ id, externalReference: body.externalReference })
    }
    if (path === '/customers') {
      const reference = url.searchParams.get('externalReference') || ''
      const id = customers.get(reference)
      return json({ data: id ? [{ id, externalReference: reference }] : [], hasMore: false })
    }
    if (path === '/payments' && init?.method === 'POST') {
      paymentPosts++
      const body = JSON.parse(String(init.body)) as {
        customer: string
        externalReference: string
        value: number
        billingType: string
      }
      const payment: FakePayment = {
        id: `pay_${run}_${payments.size + 1}`,
        customer: body.customer,
        externalReference: body.externalReference,
        value: body.value,
        billingType: body.billingType,
        status: 'PENDING'
      }
      payments.set(payment.id, payment)
      if (paymentGate) await paymentGate
      if (loseNextPaymentResponse) {
        loseNextPaymentResponse = false
        throw new Error('simulated response loss')
      }
      return json(payment)
    }
    if (path === '/payments') {
      const reference = url.searchParams.get('externalReference') || ''
      return json({
        data: [...payments.values()].filter((p) => p.externalReference === reference),
        hasMore: false
      })
    }
    const pix = /^\/payments\/([^/]+)\/pixQrCode$/.exec(path)
    if (pix) return json({ payload: 'fake-pix', encodedImage: 'fake-image' })
    const single = /^\/payments\/([^/]+)$/.exec(path)
    if (single) return json(payments.get(single[1]) || {})
    throw new Error('unexpected fake provider route')
  }) as typeof fetch
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => {
  global.fetch = originalFetch
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(60000)

describe('Asaas Phase 3 against a real disposable database', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let commerce: import('../src/modules/commerce/commerce.service').CommerceService
  let billing: import('../src/modules/payments/billing-profile.service').BillingProfileService
  let ledger: import('../src/modules/wallet/wallet-ledger.service').WalletLedgerService
  let accountId = ''
  let package10 = ''
  let package50 = ''
  let customerId = ''
  const user = () => ({
    id: accountId,
    username: `asaas_${run}`,
    name: 'QA',
    email: `asaas-${run}@example.invalid`,
    role: 'PLAYER' as const,
    permissions: [],
    twoFactorEnabled: false
  })

  async function startApp() {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { CommerceService } = await import('../src/modules/commerce/commerce.service')
    const { BillingProfileService } =
      await import('../src/modules/payments/billing-profile.service')
    const { WalletLedgerService } = await import('../src/modules/wallet/wallet-ledger.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    commerce = app.get(CommerceService)
    billing = app.get(BillingProfileService)
    ledger = app.get(WalletLedgerService)
  }

  async function createIntent(packageId = package10) {
    return commerce.createRechargeIntent({ packageId }, user())
  }

  async function checkout(packageId = package10) {
    const intent = await createIntent(packageId)
    const created = await commerce.createRechargeCheckout(intent.id, user())
    const payment = payments.get(created.externalOrderId)!
    expect(payment).toBeDefined()
    return { intent, payment }
  }

  async function webhook(payment: FakePayment, event: string, eventId = randomUUID()) {
    return commerce.handleAsaasWebhook({
      token,
      body: { id: eventId, event, payment: { id: payment.id } }
    })
  }

  async function creditCount(intentId: string) {
    return prisma.walletLedgerEntry.count({
      where: { idempotencyKey: `recharge-credit:${intentId}` }
    })
  }

  beforeAll(async () => {
    await startApp()
    const account = await prisma.account.create({
      data: {
        username: `asaas_${run}`,
        name: 'QA',
        email: `asaas-${run}@example.invalid`,
        passwordHash: 'not-a-login',
        status: 'ACTIVE'
      }
    })
    accountId = account.id
    package10 = (
      await prisma.rechargePackage.create({
        data: {
          key: `asaas-10-${run}`,
          currency: 'WCOIN',
          amount: 10,
          bonus: 0,
          price: '10,00'
        }
      })
    ).id
    package50 = (
      await prisma.rechargePackage.create({
        data: {
          key: `asaas-50-${run}`,
          currency: 'WCOIN',
          amount: 50,
          bonus: 0,
          price: '50,00'
        }
      })
    ).id
  }, 60000)

  afterAll(async () => {
    await app?.close()
  })

  it('encrypts billing data at rest, supports update, and cascades on account deletion', async () => {
    const temporary = await prisma.account.create({
      data: {
        username: `billing_${run}`,
        name: 'QA',
        email: `billing-${run}@example.invalid`,
        passwordHash: 'not-a-login'
      }
    })
    const name = 'QA Billing Fixture'
    const document = '11122233344'
    await billing.saveForAccount(temporary.id, { legalName: name, cpfCnpj: document })
    const stored = await prisma.billingProfile.findUniqueOrThrow({
      where: { accountId: temporary.id }
    })
    expect(stored.legalNameCiphertext).not.toContain(name)
    expect(stored.cpfCnpjCiphertext).not.toContain(document)
    expect(stored.legalNameCiphertext.startsWith('1.v1.')).toBe(true)
    await billing.saveForAccount(temporary.id, {
      legalName: 'QA Billing Changed',
      cpfCnpj: document
    })
    expect(await prisma.billingProfile.count({ where: { accountId: temporary.id } })).toBe(1)
    await prisma.account.delete({ where: { id: temporary.id } })
    expect(await prisma.billingProfile.count({ where: { accountId: temporary.id } })).toBe(0)
    await billing.saveForAccount(accountId, { legalName: name, cpfCnpj: document })
  })

  it('counts old-key dependencies without decrypting or returning PII', async () => {
    const originalActive = process.env.BILLING_PII_ACTIVE_KEY_VERSION
    const originalV2 = process.env.BILLING_PII_KEY_V2_B64
    const temporary = await prisma.account.create({ data: {
      username: `billing_v2_${run}`, name: 'QA',
      email: `billing-v2-${run}@example.invalid`, passwordHash: 'not-a-login'
    } })
    try {
      process.env.BILLING_PII_KEY_V2_B64 = Buffer.alloc(32, 31).toString('base64')
      process.env.BILLING_PII_ACTIVE_KEY_VERSION = 'v2'
      await billing.saveForAccount(temporary.id, { legalName: 'Synthetic Billing V2', cpfCnpj: '11122233344' })
      const inventory = await billing.keyVersionInventory()
      expect(inventory.byVersion.v1).toBeGreaterThanOrEqual(1)
      expect(inventory.byVersion.v2).toBeGreaterThanOrEqual(1)
      expect(JSON.stringify(inventory)).not.toContain('11122233344')
      expect(JSON.stringify(inventory)).not.toContain('Synthetic Billing V2')
    } finally {
      if (originalActive === undefined) delete process.env.BILLING_PII_ACTIVE_KEY_VERSION
      else process.env.BILLING_PII_ACTIVE_KEY_VERSION = originalActive
      if (originalV2 === undefined) delete process.env.BILLING_PII_KEY_V2_B64
      else process.env.BILLING_PII_KEY_V2_B64 = originalV2
      await prisma.account.delete({ where: { id: temporary.id } })
    }
  })

  it('keeps one durable customer mapping under concurrent calls', async () => {
    const results = await Promise.allSettled([
      billing.ensureAsaasCustomer(accountId),
      billing.ensureAsaasCustomer(accountId)
    ])
    expect(results.some((r) => r.status === 'fulfilled')).toBe(true)
    customerId = await billing.ensureAsaasCustomer(accountId)
    expect(
      await prisma.providerCustomer.count({
        where: { accountId, provider: 'asaas', environment: 'sandbox' }
      })
    ).toBe(1)
    expect(customerPosts).toBe(1)
    expect(customerPayloadValid).toBe(true)
  })

  it('enforces unique provider payment and separate environment in the database', async () => {
    const mapping = await prisma.providerCustomer.findUniqueOrThrow({
      where: {
        accountId_provider_environment: { accountId, provider: 'asaas', environment: 'sandbox' }
      }
    })
    await expect(
      prisma.providerCustomer.create({
        data: {
          accountId,
          provider: 'asaas',
          environment: 'sandbox',
          externalReference: `duplicate-${run}`
        }
      })
    ).rejects.toMatchObject({ code: 'P2002' })
    await prisma.providerCustomer.create({
      data: {
        accountId,
        provider: 'asaas',
        environment: 'production',
        externalReference: `prod-${run}`
      }
    })
    expect(mapping.providerCustomerId).toBe(customerId)
    const first = await createIntent()
    const second = await createIntent()
    await prisma.rechargeIntent.update({
      where: { id: first.id },
      data: { externalOrderId: `unique-${run}` }
    })
    await expect(
      prisma.rechargeIntent.update({
        where: { id: second.id },
        data: { externalOrderId: `unique-${run}` }
      })
    ).rejects.toMatchObject({ code: 'P2002' })
  })

  it('allows only one concurrent payment POST for one intent', async () => {
    const intent = await createIntent()
    let release!: () => void
    paymentGate = new Promise<void>((resolve) => {
      release = resolve
    })
    const before = paymentPosts
    const first = commerce.createRechargeCheckout(intent.id, user())
    for (let i = 0; i < 100 && paymentPosts === before; i++)
      await new Promise((resolve) => setTimeout(resolve, 10))
    expect(paymentPosts).toBe(before + 1)
    await expect(commerce.createRechargeCheckout(intent.id, user())).rejects.toThrow()
    release()
    paymentGate = null
    await first
    expect(paymentPosts).toBe(before + 1)
    expect(
      (await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } }))
        .providerCreateState
    ).toBe('CREATED')
  })

  it('reconciles an ambiguous provider response without a second POST', async () => {
    const intent = await createIntent()
    const before = paymentPosts
    loseNextPaymentResponse = true
    await expect(commerce.createRechargeCheckout(intent.id, user())).rejects.toThrow()
    expect(
      (await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } }))
        .providerCreateState
    ).toBe('RECONCILE_REQUIRED')
    const recovered = await commerce.createRechargeCheckout(intent.id, user())
    expect(recovered.externalOrderId).toBeTruthy()
    expect(paymentPosts).toBe(before + 1)
  })

  it('persists one webhook event and exactly one 10 WC credit on redelivery', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const eventId = randomUUID()
    await webhook(payment, 'PAYMENT_RECEIVED', eventId)
    await webhook(payment, 'PAYMENT_RECEIVED', eventId)
    expect(await prisma.paymentWebhookEvent.count({ where: { provider: 'asaas', eventId } })).toBe(
      1
    )
    expect(await creditCount(intent.id)).toBe(1)
    const row = await prisma.walletLedgerEntry.findUniqueOrThrow({
      where: { idempotencyKey: `recharge-credit:${intent.id}` }
    })
    expect(row.grossAmount).toBe(10)
  })

  it('handles concurrent paid deliveries with one durable credit', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const eventId = randomUUID()
    await Promise.allSettled(
      Array.from({ length: 4 }, () => webhook(payment, 'PAYMENT_RECEIVED', eventId))
    )
    await webhook(payment, 'PAYMENT_RECEIVED', eventId)
    expect(await prisma.paymentWebhookEvent.count({ where: { provider: 'asaas', eventId } })).toBe(
      1
    )
    expect(await creditCount(intent.id)).toBe(1)
    expect(
      (await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } })).status
    ).toBe('PAID')
  })

  it('keeps PAID monotonic after weaker out-of-order events', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'CONFIRMED'
    await webhook(payment, 'PAYMENT_CONFIRMED')
    expect(
      (await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } })).status
    ).toBe('PROCESSING')
    payment.status = 'RECEIVED'
    await webhook(payment, 'PAYMENT_RECEIVED')
    payment.status = 'PENDING'
    await webhook(payment, 'PAYMENT_CONFIRMED')
    await webhook(payment, 'PAYMENT_CREATED')
    expect(
      (await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } })).status
    ).toBe('PAID')
    expect(await creditCount(intent.id)).toBe(1)
  })

  it('never credits mismatched amount, customer, reference, or environment', async () => {
    for (const mismatch of ['amount', 'customer', 'reference', 'environment']) {
      const { intent, payment } = await checkout()
      payment.status = 'RECEIVED'
      if (mismatch === 'amount') payment.value++
      if (mismatch === 'customer') payment.customer = 'wrong-customer'
      if (mismatch === 'reference') payment.externalReference = 'wrong-reference'
      if (mismatch === 'environment')
        await prisma.rechargeIntent.update({
          where: { id: intent.id },
          data: { providerEnvironment: 'production' }
        })
      await webhook(payment, 'PAYMENT_RECEIVED')
      expect(await creditCount(intent.id)).toBe(0)
      expect(
        (await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } })).status
      ).not.toBe('PAID')
    }
  })

  it('credits exactly 50 WC for R$50 without bonus and rejects the bonus pack', async () => {
    const { intent, payment } = await checkout(package50)
    payment.status = 'RECEIVED'
    await webhook(payment, 'PAYMENT_RECEIVED')
    const row = await prisma.walletLedgerEntry.findUniqueOrThrow({
      where: { idempotencyKey: `recharge-credit:${intent.id}` }
    })
    expect(row.grossAmount).toBe(50)
    const bonusPack = await prisma.rechargePackage.create({
      data: {
        key: `asaas-bonus-${run}`,
        currency: 'WCOIN',
        amount: 50,
        bonus: 5,
        price: '50,00'
      }
    })
    await expect(createIntent(bonusPack.id)).rejects.toThrow()
  })

  it('rolls back payment and ledger together after a controlled credit failure, then retries', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const originalCredit = ledger.credit.bind(ledger)
    jest.spyOn(ledger, 'credit').mockImplementationOnce(async (...args) => {
      await originalCredit(...args)
      throw new Error('controlled rollback')
    })
    const eventId = randomUUID()
    await expect(webhook(payment, 'PAYMENT_RECEIVED', eventId)).rejects.toThrow()
    expect(await creditCount(intent.id)).toBe(0)
    expect(
      (await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } })).status
    ).not.toBe('PAID')
    await webhook(payment, 'PAYMENT_RECEIVED', eventId)
    expect(await creditCount(intent.id)).toBe(1)
  })

  it('recovers persisted state after recreating the service context', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    await webhook(payment, 'PAYMENT_RECEIVED')
    const ambiguous = await createIntent()
    loseNextPaymentResponse = true
    await expect(commerce.createRechargeCheckout(ambiguous.id, user())).rejects.toThrow()
    const pending = await checkout()
    pending.payment.status = 'RECEIVED'
    const pendingEventId = randomUUID()
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: 'asaas',
        topic: 'PAYMENT_RECEIVED',
        eventId: pendingEventId,
        externalOrderId: pending.payment.id,
        signatureValid: true,
        rawPayload: {
          id: pendingEventId,
          event: 'PAYMENT_RECEIVED',
          payment: { id: pending.payment.id }
        }
      }
    })
    const before = paymentPosts
    await app.close()
    await startApp()
    await commerce.createRechargeCheckout(ambiguous.id, user())
    expect(paymentPosts).toBe(before)
    await webhook(pending.payment, 'PAYMENT_RECEIVED', pendingEventId)
    expect(await creditCount(pending.intent.id)).toBe(1)
    await webhook(payment, 'PAYMENT_RECEIVED', randomUUID())
    expect(await creditCount(intent.id)).toBe(1)
  })

  it('fails closed on production Asaas URL without sending a request', async () => {
    const before = (global.fetch as jest.Mock).mock.calls.length
    process.env.ASAAS_BASE_URL = 'https://api.asaas.com/v3'
    try {
      await expect(createIntent()).rejects.toThrow()
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(before)
    } finally {
      process.env.ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3'
    }
  })
})
