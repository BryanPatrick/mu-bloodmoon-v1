import { randomUUID } from 'node:crypto'

// Opt-in only (excluded from the default E2E pattern). This suite makes real requests to the Asaas Sandbox and
// requires a separately created disposable local database.
const run = process.env.ASAAS_PHASE6_RUN || randomUUID().slice(0, 8)
const webhookToken = `phase6-local-${randomUUID()}`
const baseUrl = 'https://api-sandbox.asaas.com/v3'

function assertSafeEnvironment() {
  if (process.env.ASAAS_PHASE6_APPROVED !== 'true' ||
      process.env.ASAAS_ENVIRONMENT !== 'sandbox' ||
      process.env.ASAAS_BASE_URL !== baseUrl ||
      process.env.NODE_ENV !== 'test' ||
      !process.env.ASAAS_API_KEY?.startsWith('$aact_hmlg_') ||
      !process.env.DATABASE_URL?.includes('/bloodmoon_asaas_phase6_20260917')) {
    throw new Error('LIVE_SANDBOX_PREFLIGHT_FAILED')
  }
}

async function sandboxRequest(path: string, method = 'GET', body?: Record<string, unknown>) {
  assertSafeEnvironment()
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      access_token: process.env.ASAAS_API_KEY!,
      accept: 'application/json',
      'content-type': 'application/json',
      'User-Agent': 'BloodMoon-Sandbox/1'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) as Record<string, unknown> : {} }
}

jest.setTimeout(120000)

describe('Phase 6 — real Asaas Sandbox with isolated local DB', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let commerce: import('../src/modules/commerce/commerce.service').CommerceService
  let billing: import('../src/modules/payments/billing-profile.service').BillingProfileService
  let asaas: import('../src/modules/payments/asaas.provider').AsaasPaymentProvider
  let accountId = ''
  let packageId = ''
  let customerId = ''
  let intentId = ''
  let paymentId = ''
  const user = () => ({
    id: accountId, username: `asaaslive_${run}`, name: 'Synthetic QA',
    email: `asaaslive-${run}@example.invalid`, role: 'PLAYER' as const,
    permissions: [], twoFactorEnabled: false
  })

  async function startApp() {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { CommerceService } = await import('../src/modules/commerce/commerce.service')
    const { BillingProfileService } = await import('../src/modules/payments/billing-profile.service')
    const { AsaasPaymentProvider } = await import('../src/modules/payments/asaas.provider')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.listen(37118, '127.0.0.1')
    prisma = app.get(PrismaService)
    commerce = app.get(CommerceService)
    billing = app.get(BillingProfileService)
    asaas = app.get(AsaasPaymentProvider)
  }

  beforeAll(async () => {
    assertSafeEnvironment()
    process.env.ASAAS_ENABLED = 'true'
    process.env.ASAAS_WEBHOOK_TOKEN = webhookToken
    process.env.BILLING_PII_KEY_B64 = Buffer.alloc(32, 41).toString('base64')
    process.env.JWT_ACCESS_SECRET = 'disposable-local-phase6-access'
    process.env.JWT_REFRESH_SECRET = 'disposable-local-phase6-refresh'
    await startApp()
    const account = await prisma.account.findUnique({ where: { username: `asaaslive_${run}` } }) ||
      await prisma.account.create({ data: {
        username: `asaaslive_${run}`, name: 'Synthetic QA',
        email: `asaaslive-${run}@example.invalid`, passwordHash: 'not-a-login',
        status: 'ACTIVE'
      } })
    accountId = account.id
    packageId = (await prisma.rechargePackage.findUnique({ where: { key: `asaaslive-10-${run}` } }) ||
      await prisma.rechargePackage.create({ data: {
        key: `asaaslive-10-${run}`, currency: 'WCOIN', amount: 10,
        bonus: 0, price: '10,00'
      } })).id
  }, 120000)

  afterAll(async () => { await app?.close() })

  it('creates and reuses a synthetic customer, storing billing fields encrypted', async () => {
    const fakeName = 'Blood Moon Teste Sandbox'
    const fakeDocument = '24971563792' // Asaas documentation example, Sandbox only.
    await billing.saveForAccount(accountId, { legalName: fakeName, cpfCnpj: fakeDocument })
    const stored = await prisma.billingProfile.findUniqueOrThrow({ where: { accountId } })
    expect(stored.legalNameCiphertext).not.toContain(fakeName)
    expect(stored.cpfCnpjCiphertext).not.toContain(fakeDocument)
    customerId = await billing.ensureAsaasCustomer(accountId)
    expect(await billing.ensureAsaasCustomer(accountId)).toBe(customerId)
    const list = await sandboxRequest(`/customers?externalReference=${encodeURIComponent(`bm-account:${accountId}`)}&limit=2`)
    expect(list.status).toBe(200)
    expect((list.body.data as Array<{ id: string }>).map((row) => row.id)).toEqual([customerId])
  })

  it('creates a real Sandbox PIX and verifies the provider-side contract', async () => {
    let intent = await prisma.rechargeIntent.findFirst({ where: { accountId, provider: 'asaas' }, orderBy: { createdAt: 'asc' } })
    if (!intent) {
      const created = await commerce.createRechargeIntent({ packageId }, user())
      intent = await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: created.id } })
    }
    intentId = intent.id
    if (intent.externalOrderId && intent.status === 'PAID') {
      paymentId = intent.externalOrderId
    } else {
      const checkout = await commerce.createRechargeCheckout(intent.id, user())
      paymentId = checkout.externalOrderId
    }
    const order = await asaas.getOrder(paymentId)
    expect(order.providerCustomerId).toBe(customerId)
    expect(order.totalAmountBRL).toBe(10)
    expect(order.paymentMethod).toBe('PIX')
    const storedIntent = await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intentId } })
    expect(order.externalReference).toBe(storedIntent.externalReference)
    const creditBefore = await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${intentId}` } })
    expect(creditBefore).toBe(intent.status === 'PAID' ? 1 : 0)
    if (intent.status !== 'PAID') {
      const existing = await commerce.createRechargeCheckout(intent.id, user())
      expect(existing.externalOrderId).toBe(paymentId)
    }
    const matches = await sandboxRequest(`/payments?externalReference=${encodeURIComponent(order.externalReference!)}&limit=2`)
    expect(matches.status).toBe(200)
    expect((matches.body.data as Array<{ id: string }>).map((row) => row.id)).toEqual([paymentId])
  })

  it('rejects missing/invalid webhook auth and re-queries the provider for a valid event', async () => {
    const body = { id: `evt_${randomUUID()}`, event: 'PAYMENT_CREATED', payment: { id: paymentId } }
    const creditsBefore = await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${intentId}` } })
    await expect(commerce.handleAsaasWebhook({ token: undefined, body })).rejects.toThrow()
    await expect(commerce.handleAsaasWebhook({ token: 'invalid', body })).rejects.toThrow()
    await commerce.handleAsaasWebhook({ token: webhookToken, body })
    expect(await prisma.paymentWebhookEvent.count({ where: { provider: 'asaas', eventId: body.id } })).toBe(1)
    expect(await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${intentId}` } })).toBe(creditsBefore)
  })

  it('uses only the Sandbox confirmation action, then reconciles and stays idempotent after restart', async () => {
    let order = await asaas.getOrder(paymentId)
    if (order.status === 'PENDING') {
      const confirmation = await sandboxRequest(`/sandbox/payment/${encodeURIComponent(paymentId)}/confirm`, 'POST')
      expect(confirmation.status).toBe(200)
      order = await asaas.getOrder(paymentId)
    }
    for (let attempt = 0; attempt < 15 && order.status === 'PENDING'; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      order = await asaas.getOrder(paymentId)
    }
    expect(['CONFIRMED', 'RECEIVED']).toContain(order.status)
    const event = order.status === 'RECEIVED' ? 'PAYMENT_RECEIVED' : 'PAYMENT_CONFIRMED'
    const body = { id: `evt_${randomUUID()}`, event, payment: { id: paymentId } }
    await Promise.allSettled(Array.from({ length: 4 }, () =>
      commerce.handleAsaasWebhook({ token: webhookToken, body })))
    await commerce.handleAsaasWebhook({ token: webhookToken, body })
    expect(await prisma.paymentWebhookEvent.count({ where: { provider: 'asaas', eventId: body.id } })).toBe(1)
    const credits = await prisma.walletLedgerEntry.findMany({ where: { idempotencyKey: `recharge-credit:${intentId}` } })
    expect(credits.length).toBe(order.status === 'RECEIVED' ? 1 : 0)
    if (credits.length) expect(credits[0].grossAmount).toBe(10)
    await app.close()
    await startApp()
    await commerce.reconcileFromProviderPoll(intentId)
    expect((await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: intentId } })).externalOrderId).toBe(paymentId)
    expect(await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${intentId}` } })).toBe(credits.length)
    console.log(`SANDBOX_PROVIDER_STATUS=${order.status}; LOCAL_CREDIT_COUNT=${credits.length}`)
  })

  it('rejects local amount/customer mismatches and exercises Sandbox overdue/cancellation', async () => {
    const previous = await prisma.rechargeIntent.findFirst({ where: {
      accountId, provider: 'asaas', id: { not: intentId }, externalOrderId: { not: null }
    }, orderBy: { createdAt: 'asc' } })
    if (previous?.externalOrderId && (await asaas.getOrder(previous.externalOrderId)).status === 'DELETED') {
      await commerce.reconcileFromProviderPoll(previous.id)
      expect((await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: previous.id } })).status).toBe('CANCELLED')
      expect(await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${previous.id}` } })).toBe(0)
      console.log('SANDBOX_CANCELLED_PAYMENT_RECONCILED=PASS')
      return
    }
    const created = await commerce.createRechargeIntent({ packageId }, user())
    const extraId = created.id
    let checkout: Awaited<ReturnType<typeof commerce.createRechargeCheckout>>
    try {
      checkout = await commerce.createRechargeCheckout(extraId, user())
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('ASAAS_PAYMENT_RECONCILE_REQUIRED')) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000))
      checkout = await commerce.createRechargeCheckout(extraId, user())
    }
    const extraPaymentId = checkout.externalOrderId
    const original = await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: extraId } })
    expect(original.status).toBe('PENDING')

    await prisma.rechargeIntent.update({ where: { id: extraId }, data: { price: '11,00', amount: 11 } })
    await commerce.reconcileFromProviderPoll(extraId)
    expect((await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: extraId } })).status).toBe('MANUAL_REVIEW')
    expect(await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${extraId}` } })).toBe(0)
    await prisma.rechargeIntent.update({ where: { id: extraId }, data: { price: original.price, amount: original.amount, status: 'PENDING' } })

    const mapping = await prisma.providerCustomer.findUniqueOrThrow({ where: {
      accountId_provider_environment: { accountId, provider: 'asaas', environment: 'sandbox' }
    } })
    await prisma.providerCustomer.update({ where: { id: mapping.id }, data: { providerCustomerId: 'cus_controlled_mismatch' } })
    try {
      await commerce.reconcileFromProviderPoll(extraId)
      expect((await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: extraId } })).status).toBe('MANUAL_REVIEW')
      expect(await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${extraId}` } })).toBe(0)
    } finally {
      await prisma.providerCustomer.update({ where: { id: mapping.id }, data: { providerCustomerId: mapping.providerCustomerId } })
    }
    await prisma.rechargeIntent.update({ where: { id: extraId }, data: { status: 'PENDING' } })

    const overdue = await sandboxRequest(`/sandbox/payment/${encodeURIComponent(extraPaymentId)}/overdue`, 'POST')
    expect(overdue.status).toBe(200)
    const afterOverdue = await asaas.getOrder(extraPaymentId)
    expect(afterOverdue.status).toBe('OVERDUE')
    await commerce.reconcileFromProviderPoll(extraId)
    expect(await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${extraId}` } })).toBe(0)

    await asaas.cancelOrder(extraPaymentId)
    const afterDelete = await asaas.getOrder(extraPaymentId)
    expect(afterDelete.status).toBe('DELETED')
    await commerce.reconcileFromProviderPoll(extraId)
    expect((await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: extraId } })).status).toBe('CANCELLED')
    expect(await prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${extraId}` } })).toBe(0)
    console.log('SANDBOX_OVERDUE_AND_CANCELLATION=PASS; MISMATCH_CREDIT=0')
  })

  it('receives an actual Asaas Sandbox webhook through a temporary restricted tunnel', async () => {
    const publicUrl = process.env.ASAAS_PHASE6_PUBLIC_URL || ''
    if (!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(publicUrl))
      throw new Error('PHASE6_TEST_TUNNEL_REQUIRED')
    const hookName = `BM Phase6 Codex ${run}`
    let hookId = ''
    try {
      const createdHook = await sandboxRequest('/webhooks', 'POST', {
        name: hookName,
        url: `${publicUrl}/api/payments/webhooks/asaas`,
        email: 'qa-notifications@example.com',
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        authToken: webhookToken,
        sendType: 'SEQUENTIALLY',
        events: ['PAYMENT_RECEIVED']
      })
      expect(createdHook.status).toBe(200)
      hookId = String(createdHook.body.id || '')
      expect(hookId).toBeTruthy()

      const created = await commerce.createRechargeIntent({ packageId }, user())
      let checkout: Awaited<ReturnType<typeof commerce.createRechargeCheckout>>
      try {
        checkout = await commerce.createRechargeCheckout(created.id, user())
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('ASAAS_PAYMENT_RECONCILE_REQUIRED')) throw error
        await new Promise((resolve) => setTimeout(resolve, 1000))
        checkout = await commerce.createRechargeCheckout(created.id, user())
      }
      const confirmed = await sandboxRequest(`/sandbox/payment/${encodeURIComponent(checkout.externalOrderId)}/confirm`, 'POST')
      expect(confirmed.status).toBe(200)

      let delivered = false
      for (let attempt = 0; attempt < 60; attempt++) {
        const event = await prisma.paymentWebhookEvent.findFirst({ where: {
          provider: 'asaas', topic: 'PAYMENT_RECEIVED', externalOrderId: checkout.externalOrderId
        } })
        if (event) { delivered = true; break }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      expect(delivered).toBe(true)
      expect((await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: created.id } })).status).toBe('PAID')
      const credits = await prisma.walletLedgerEntry.findMany({ where: { idempotencyKey: `recharge-credit:${created.id}` } })
      expect(credits).toHaveLength(1)
      expect(credits[0].grossAmount).toBe(10)
      console.log('REAL_ASAAS_WEBHOOK_DELIVERY=PASS; WC_CREDIT=10')
    } finally {
      if (hookId) {
        const removed = await sandboxRequest(`/webhooks/${encodeURIComponent(hookId)}`, 'DELETE')
        expect(removed.status).toBe(200)
      }
    }
  })
})
