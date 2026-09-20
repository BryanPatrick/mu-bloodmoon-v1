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
let failNextProviderLookup = false

beforeAll(async () => {
  const db = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = db.databaseUrl
  process.env.NODE_ENV = 'test'
  process.env.ASAAS_ENABLED = 'true'
  process.env.ASAAS_FRONTEND_ENABLED = 'true'
  process.env.ASAAS_PAYMENT_CREATION_ENABLED = 'true'
  process.env.ASAAS_WEBHOOK_PROCESSING_ENABLED = 'true'
  process.env.ASAAS_WEBHOOK_POLL_MS = '300000'
  process.env.ASAAS_RECONCILIATION_ENABLED = 'true'
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
    if (single) {
      if (failNextProviderLookup) {
        failNextProviderLookup = false
        throw new Error('synthetic provider timeout')
      }
      return json(payments.get(single[1]) || {})
    }
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
  let inbox: import('../src/modules/commerce/asaas-webhook-inbox.worker').AsaasWebhookInboxWorker
  let webhookEvents: import('../src/modules/payments/payment-webhook-event.service').PaymentWebhookEventService
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
    const { AsaasWebhookInboxWorker } = await import('../src/modules/commerce/asaas-webhook-inbox.worker')
    const { PaymentWebhookEventService } = await import('../src/modules/payments/payment-webhook-event.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    prisma = app.get(PrismaService)
    commerce = app.get(CommerceService)
    billing = app.get(BillingProfileService)
    ledger = app.get(WalletLedgerService)
    inbox = app.get(AsaasWebhookInboxWorker)
    webhookEvents = app.get(PaymentWebhookEventService)
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
    const ack = await commerce.handleAsaasWebhook({
      token,
      body: { id: eventId, event, payment: { id: payment.id } }
    })
    await inbox.runOnce()
    return ack
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

  it('rejects a real-JWT player HTTP recharge while creation is off, before provider POST', async () => {
    const { JwtService } = await import('@nestjs/jwt')
    const request = (await import('supertest')).default
    const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } })
    const session = await prisma.accountSession.create({
      data: { accountId, expiresAt: new Date(Date.now() + 60_000) }
    })
    const accessToken = await app.get(JwtService).signAsync({
      sub: account.id, username: account.username, role: account.role,
      sessionVersion: account.sessionVersion, sid: session.id
    })
    const previousCreation = process.env.ASAAS_PAYMENT_CREATION_ENABLED
    const beforePayments = paymentPosts
    const beforeCustomers = customerPosts
    const beforeIntents = await prisma.rechargeIntent.count({ where: { accountId } })
    process.env.ASAAS_PAYMENT_CREATION_ENABLED = 'false'
    try {
      const response = await request(app.getHttpServer())
        .post('/api/recharge/intents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ packageId: package10 })
      expect(response.status).toBe(503)
      expect(paymentPosts).toBe(beforePayments)
      expect(customerPosts).toBe(beforeCustomers)
      expect(await prisma.rechargeIntent.count({ where: { accountId } })).toBe(beforeIntents)
    } finally {
      if (previousCreation === undefined) delete process.env.ASAAS_PAYMENT_CREATION_ENABLED
      else process.env.ASAAS_PAYMENT_CREATION_ENABLED = previousCreation
    }
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
    await webhook(payment, 'PAYMENT_RECEIVED', eventId)
    expect(await creditCount(intent.id)).toBe(0)
    expect(
      (await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } })).status
    ).not.toBe('PAID')
    await prisma.paymentWebhookEvent.updateMany({ where: { provider: 'asaas', eventId }, data: { nextAttemptAt: new Date(0) } })
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

  it('ACKs only after durable insert and before provider lookup or wallet credit (HTTP, duplicate, invalid auth)', async () => {
    const request = (await import('supertest')).default
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const id = randomUUID()
    const path = '/api/payments/webhooks/asaas'
    const body = { id, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } }
    const beforeFetch = (global.fetch as jest.Mock).mock.calls.length
    expect((await request(app.getHttpServer()).post(path).send(body)).status).toBe(401)
    expect((await request(app.getHttpServer()).post(path).set('asaas-access-token', 'wrong').send(body)).status).toBe(401)
    expect(await prisma.paymentWebhookEvent.count({ where: { provider: 'asaas', eventId: id } })).toBe(0)
    expect(await prisma.systemAlert.count({ where: { module: 'store', title: { contains: 'ASAAS_WEBHOOK_AUTH_REJECTED' } } })).toBeGreaterThanOrEqual(2)
    const persist = jest.spyOn(webhookEvents, 'receiveAsaas').mockRejectedValueOnce(new Error('synthetic durable insert failure'))
    try {
      expect((await request(app.getHttpServer()).post(path).set('asaas-access-token', token).send(body)).status).not.toBe(200)
    } finally { persist.mockRestore() }
    expect(await prisma.paymentWebhookEvent.count({ where: { provider: 'asaas', eventId: id } })).toBe(0)
    const accepted = await request(app.getHttpServer()).post(path).set('asaas-access-token', token).send(body)
    expect(accepted.status).toBe(200)
    expect(accepted.body).toEqual({ received: true })
    const stored = await prisma.paymentWebhookEvent.findFirstOrThrow({ where: { provider: 'asaas', eventId: id, status: 'RECEIVED' } })
    expect((stored.rawPayload as { correlationId?: string }).correlationId).toMatch(/^[0-9a-f-]{36}$/)
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(beforeFetch)
    expect(await creditCount(intent.id)).toBe(0)
    const duplicate = await request(app.getHttpServer()).post(path).set('asaas-access-token', token).send(body)
    expect(duplicate.status).toBe(200)
    expect(await prisma.paymentWebhookEvent.count({ where: { provider: 'asaas', eventId: id } })).toBe(1)
    await inbox.runOnce()
    expect(await creditCount(intent.id)).toBe(1)
  })

  it('logs only opaque correlation and hashed provider identifiers, never token or document-shaped IDs', async () => {
    const { Logger } = await import('@nestjs/common')
    const request = (await import('supertest')).default
    const eventId = '11122233344'
    const paymentId = '12345678901'
    const observed: string[] = []
    const logging = jest.spyOn(Logger.prototype, 'log').mockImplementation((message) => { observed.push(String(message)) })
    try {
      expect((await request(app.getHttpServer()).post('/api/payments/webhooks/asaas')
        .set('asaas-access-token', token)
        .send({ id: eventId, event: 'PAYMENT_SYNTHETIC_UNKNOWN', payment: { id: paymentId } })).status).toBe(200)
    } finally { logging.mockRestore() }
    const output = observed.join('\n')
    expect(output).toContain('correlationId=')
    expect(output).toContain('providerEventHash=')
    expect(output).not.toContain(eventId)
    expect(output).not.toContain(paymentId)
    expect(output).not.toContain(token)
  })

  it('retries after a provider timeout without making the prior ACK wait for lookup', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const eventId = randomUUID()
    await commerce.handleAsaasWebhook({ token, body: { id: eventId, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } } })
    failNextProviderLookup = true
    await inbox.runOnce()
    expect(await prisma.paymentWebhookEvent.findFirst({ where: { eventId } })).toMatchObject({ status: 'RETRY', attemptCount: 1 })
    expect(await creditCount(intent.id)).toBe(0)
    await prisma.paymentWebhookEvent.updateMany({ where: { eventId }, data: { nextAttemptAt: new Date(0) } })
    await inbox.runOnce()
    expect(await creditCount(intent.id)).toBe(1)
    expect(await prisma.paymentWebhookEvent.findFirst({ where: { eventId } })).toMatchObject({ status: 'PROCESSED', attemptCount: 2 })
  })

  it('bounds repeated processing failures and escalates an auditable event to manual review', async () => {
    const { intent, payment } = await checkout()
    const eventId = randomUUID()
    await commerce.handleAsaasWebhook({ token, body: { id: eventId, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } } })
    const processing = jest.spyOn(commerce, 'processStoredAsaasEvent').mockRejectedValue(new Error('synthetic provider unavailable'))
    try {
      for (let attempt = 1; attempt <= 8; attempt++) {
        await inbox.runOnce()
        const row = await prisma.paymentWebhookEvent.findFirstOrThrow({ where: { eventId } })
        expect(row.attemptCount).toBe(attempt)
        expect(row.status).toBe(attempt === 8 ? 'MANUAL_REVIEW' : 'RETRY')
        expect(row.lastErrorCode).toBe('ASAAS_INBOX_PROCESSING_FAILED')
        if (attempt < 8) await prisma.paymentWebhookEvent.update({ where: { id: row.id }, data: { nextAttemptAt: new Date(0) } })
      }
      expect(await inbox.runOnce()).toBe(0)
      expect(await creditCount(intent.id)).toBe(0)
    } finally { processing.mockRestore() }
  })

  it('generates separate critical alerts when confirmed WC credit ultimately fails', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const eventId = randomUUID()
    await commerce.handleAsaasWebhook({ token, body: { id: eventId, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } } })
    const failure = jest.spyOn(ledger, 'credit').mockRejectedValue(new Error('synthetic ledger failure'))
    try {
      for (let attempt = 1; attempt <= 8; attempt++) {
        await inbox.runOnce()
        const row = await prisma.paymentWebhookEvent.findFirstOrThrow({ where: { eventId } })
        expect(row.lastErrorCode).toBe('ASAAS_WALLET_CREDIT_FAILED')
        if (attempt < 8) await prisma.paymentWebhookEvent.update({ where: { id: row.id }, data: { nextAttemptAt: new Date(0) } })
      }
    } finally { failure.mockRestore() }
    const row = await prisma.paymentWebhookEvent.findFirstOrThrow({ where: { eventId } })
    expect(row.status).toBe('MANUAL_REVIEW')
    expect(await creditCount(intent.id)).toBe(0)
    const alerts = await prisma.systemAlert.findMany({ where: { module: 'store', sourceType: 'OperationalEvent' }, select: { title: true } })
    expect(alerts.some((alert) => alert.title.includes('ASAAS_CONFIRMED_CREDIT_FAILURE'))).toBe(true)
    expect(alerts.some((alert) => alert.title.includes('ASAAS_INBOX_MANUAL_REVIEW'))).toBe(true)
  })

  it('atomically elects one of two workers and reclaims an expired PROCESSING lease', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const eventId = randomUUID()
    await commerce.handleAsaasWebhook({ token, body: { id: eventId, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } } })
    const claims = await Promise.all([
      webhookEvents.claimNextAsaas('worker-a', 30000),
      webhookEvents.claimNextAsaas('worker-b', 30000)
    ])
    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(claims.find(Boolean)?.eventId).toBe(eventId)
    expect(await creditCount(intent.id)).toBe(0)
    await prisma.paymentWebhookEvent.updateMany({ where: { eventId }, data: { leaseExpiresAt: new Date(0) } })
    await inbox.runOnce()
    expect(await prisma.paymentWebhookEvent.findFirst({ where: { eventId } })).toMatchObject({ status: 'PROCESSED', attemptCount: 2 })
    expect(await creditCount(intent.id)).toBe(1)
  })

  it('runs two independent worker instances simultaneously with one financial outcome', async () => {
    const { AsaasWebhookInboxWorker } = await import('../src/modules/commerce/asaas-webhook-inbox.worker')
    const { ObservabilityService } = await import('../src/modules/observability/observability.service')
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const eventId = randomUUID()
    await commerce.handleAsaasWebhook({ token, body: { id: eventId, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } } })
    const second = new AsaasWebhookInboxWorker(webhookEvents, commerce, app.get(ObservabilityService))
    await Promise.all([inbox.runOnce(), second.runOnce()])
    expect(await prisma.paymentWebhookEvent.findFirst({ where: { eventId } })).toMatchObject({ status: 'PROCESSED', attemptCount: 1 })
    expect(await creditCount(intent.id)).toBe(1)
    await second.onModuleDestroy()
  })

  it('rolls back a post-status-update crash before transaction commit, then recovers with one credit', async () => {
    // PAID and the wallet credit commit in one serializable transaction.
    // A durable PAID-without-credit intermediate state cannot be injected
    // without corrupting the database, so fail after both writes but before
    // commit and prove they roll back together.
    const { AuditService } = await import('../src/modules/audit/audit.service')
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const eventId = randomUUID()
    await commerce.handleAsaasWebhook({ token, body: { id: eventId, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } } })
    const audit = app.get(AuditService)
    const failure = jest.spyOn(audit, 'record').mockRejectedValueOnce(new Error('synthetic crash before commit'))
    try { await inbox.runOnce() } finally { failure.mockRestore() }
    expect((await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } })).status).not.toBe('PAID')
    expect(await creditCount(intent.id)).toBe(0)
    const row = await prisma.paymentWebhookEvent.findFirstOrThrow({ where: { eventId } })
    expect(row.status).toBe('RETRY')
    await prisma.paymentWebhookEvent.update({ where: { id: row.id }, data: { nextAttemptAt: new Date(0) } })
    await inbox.runOnce()
    expect((await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intent.id } })).status).toBe('PAID')
    expect(await creditCount(intent.id)).toBe(1)
    expect(await prisma.paymentWebhookEvent.findFirst({ where: { eventId } })).toMatchObject({ status: 'PROCESSED', attemptCount: 2 })
  })

  it('recovers after credit committed but before event completion, without a second credit', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const eventId = randomUUID()
    await commerce.handleAsaasWebhook({ token, body: { id: eventId, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } } })
    const claim = await webhookEvents.claimNextAsaas('crashed-worker', 30000)
    expect(claim?.eventId).toBe(eventId)
    await commerce.processStoredAsaasEvent(claim!)
    expect(await creditCount(intent.id)).toBe(1)
    await prisma.paymentWebhookEvent.updateMany({ where: { eventId }, data: { leaseExpiresAt: new Date(0) } })
    await inbox.runOnce()
    expect(await creditCount(intent.id)).toBe(1)
    expect(await prisma.paymentWebhookEvent.findFirst({ where: { eventId } })).toMatchObject({ status: 'PROCESSED', attemptCount: 2 })
  })

  it('resumes an ACKed event after application restart and preserves one credit for distinct event IDs', async () => {
    const { intent, payment } = await checkout()
    payment.status = 'RECEIVED'
    const eventId = randomUUID()
    await commerce.handleAsaasWebhook({ token, body: { id: eventId, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } } })
    expect(await creditCount(intent.id)).toBe(0)
    await app.close()
    await startApp()
    await inbox.runOnce()
    expect(await creditCount(intent.id)).toBe(1)
    await webhook(payment, 'PAYMENT_RECEIVED', randomUUID())
    expect(await creditCount(intent.id)).toBe(1)
  })

  it('keeps the receive route and worker inert when processing flag is absent', async () => {
    const { payment } = await checkout()
    const eventId = randomUUID()
    process.env.ASAAS_WEBHOOK_PROCESSING_ENABLED = 'false'
    try {
      await expect(commerce.handleAsaasWebhook({ token, body: { id: eventId, event: 'PAYMENT_RECEIVED', payment: { id: payment.id } } })).rejects.toThrow('ASAAS_WEBHOOK_PROCESSING_DISABLED')
      expect(await inbox.runOnce()).toBe(0)
      expect(await prisma.paymentWebhookEvent.count({ where: { provider: 'asaas', eventId } })).toBe(0)
    } finally {
      process.env.ASAAS_WEBHOOK_PROCESSING_ENABLED = 'true'
    }
  })

  it('measures durable HTTP ACK latency with synthetic unknown events only', async () => {
    const request = (await import('supertest')).default
    const samples: number[] = []
    for (let i = 0; i < 12; i++) {
      const body = { id: randomUUID(), event: 'PAYMENT_SYNTHETIC_UNKNOWN', payment: { id: `pay_latency_${i}` } }
      const start = performance.now()
      expect((await request(app.getHttpServer()).post('/api/payments/webhooks/asaas').set('asaas-access-token', token).send(body)).status).toBe(200)
      samples.push(performance.now() - start)
    }
    const duplicateBody = { id: randomUUID(), event: 'PAYMENT_SYNTHETIC_UNKNOWN', payment: { id: 'pay_latency_duplicate' } }
    await request(app.getHttpServer()).post('/api/payments/webhooks/asaas').set('asaas-access-token', token).send(duplicateBody)
    const duplicateStart = performance.now()
    expect((await request(app.getHttpServer()).post('/api/payments/webhooks/asaas').set('asaas-access-token', token).send(duplicateBody)).status).toBe(200)
    samples.sort((a, b) => a - b)
    console.log(`ASAAS_ACK_LOCAL samples=${samples.length} p50_ms=${samples[5].toFixed(1)} p95_ms=${samples[11].toFixed(1)} max_ms=${samples[11].toFixed(1)} duplicate_ms=${(performance.now() - duplicateStart).toFixed(1)}`)
    await inbox.runOnce()
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

  it('injects an exactly-once anomaly into the detector and sends critical alerts to a loopback receiver', async () => {
    const { createServer } = await import('node:http')
    const { PaymentReconciliationService } = await import('../src/modules/commerce/payment-reconciliation.service')
    const { AlertDispatchService } = await import('../src/modules/alerting/alert-dispatch.service')
    const { buildSafeAlertPayload } = await import('../src/modules/alerting/alert-payload')
    const received: string[] = []
    const server = createServer((request, response) => {
      const chunks: Buffer[] = []
      request.on('data', (chunk: Buffer) => chunks.push(chunk))
      request.on('end', () => { received.push(Buffer.concat(chunks).toString()); response.writeHead(204); response.end() })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('loopback receiver unavailable')
    const reconcile = app.get(PaymentReconciliationService)
    const dispatch = app.get(AlertDispatchService)
    const source = await prisma.rechargeIntent.findFirstOrThrow({ where: { accountId, provider: 'asaas', status: 'PAID' } })
    const injected = jest.spyOn(reconcile, 'findAnomalies').mockResolvedValueOnce([{
      rechargeIntentId: source.id, accountId, issue: 'PAID_WITHOUT_LEDGER_CREDIT',
      status: 'PAID', detail: `Synthetic invariant alarm for ${source.id}`, createdAt: source.createdAt.toISOString()
    }])
    const previousFetch = global.fetch
    const previousWebhook = process.env.ALERT_WEBHOOK_ENABLED
    const previousUrl = process.env.ALERT_WEBHOOK_URL
    const previousEmail = process.env.ALERT_EMAIL_ENABLED
    try {
      const result = await reconcile.runOnce()
      expect(result.anomalies).toBe(1)
      process.env.ALERT_WEBHOOK_ENABLED = 'true'
      process.env.ALERT_WEBHOOK_URL = `http://127.0.0.1:${address.port}/alerts`
      process.env.ALERT_EMAIL_ENABLED = 'false'
      global.fetch = originalFetch
      for (const code of ['ASAAS_WEBHOOK_AUTH_REJECTED', 'ASAAS_CONFIRMED_CREDIT_FAILURE', 'ASAAS_INBOX_MANUAL_REVIEW', 'PAYMENT_RECONCILIATION_MISSING_CREDIT']) {
        const alert = await prisma.systemAlert.findFirstOrThrow({
          where: { module: 'store', title: { contains: code } }, orderBy: { createdAt: 'desc' }
        })
        const delivered = await dispatch.dispatch(buildSafeAlertPayload(alert, { firstSeenAt: new Date(), notificationCount: 0 }))
        expect(delivered).toEqual([{ channel: 'webhook', ok: true }])
      }
      const payload = received.join('\n')
      for (const code of ['ASAAS_WEBHOOK_AUTH_REJECTED', 'ASAAS_CONFIRMED_CREDIT_FAILURE', 'ASAAS_INBOX_MANUAL_REVIEW', 'PAYMENT_RECONCILIATION_MISSING_CREDIT']) {
        expect(payload).toContain(code)
      }
      expect(payload).not.toContain(token)
      expect(payload).not.toContain('11122233344')
      expect(payload).not.toContain('QA Billing Fixture')
    } finally {
      injected.mockRestore()
      global.fetch = previousFetch
      for (const [key, value] of [
        ['ALERT_WEBHOOK_ENABLED', previousWebhook], ['ALERT_WEBHOOK_URL', previousUrl],
        ['ALERT_EMAIL_ENABLED', previousEmail]
      ] as const) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
