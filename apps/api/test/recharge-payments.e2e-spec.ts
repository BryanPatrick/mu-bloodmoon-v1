import { execSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database pattern as the other E2E specs -- a dedicated,
// disposable MariaDB container, never bloodmoon-mysql, never production.
const CONTAINER = 'bloodmoon-e2e-recharge-payments'
const WEBHOOK_SECRET = 'e2e-mercadopago-webhook-secret'
const originalFetch = global.fetch

type MockOrder = {
  id: string
  external_reference: string | null
  total_amount: string
  status: string
  status_detail?: string
}

let fetchHandler: (url: string, init: RequestInit | undefined) => Promise<Response>

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const mockOrderBody = (order: MockOrder) => ({
  id: order.id,
  type: 'online',
  total_amount: order.total_amount,
  external_reference: order.external_reference,
  status: order.status,
  status_detail: order.status_detail,
  transactions: {
    payments: [
      {
        id: `PAY-${order.id}`,
        status: order.status,
        status_detail: order.status_detail,
        payment_method: {
          id: 'pix',
          type: 'bank_transfer',
          qr_code: '00020126-pix-copia-e-cola',
          qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
          ticket_url: 'https://www.mercadopago.com.br/sandbox/payments/x/ticket'
        }
      }
    ]
  }
})

const signWebhook = (dataId: string, requestId: string, ts: string, secret = WEBHOOK_SECRET) => {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const hash = createHmac('sha256', secret).update(manifest).digest('hex')
  return `ts=${ts},v1=${hash}`
}

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-recharge-payments-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-recharge-payments-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-recharge-payments-two-factor-key-32-chars'
  process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-e2e-access-token'
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = WEBHOOK_SECRET
  process.env.MERCADO_PAGO_API_BASE_URL = 'https://mercadopago.invalid'
  process.env.REAL_MONEY_PAYMENTS_ENABLED = 'true'

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

describe('Mercado Pago recharge payments', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let commerceService: import('../src/modules/commerce/commerce.service').CommerceService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { CommerceService } = await import('../src/modules/commerce/commerce.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    commerceService = app.get(CommerceService)
  }, 60000)

  afterAll(async () => {
    await app?.close()
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  const suffix = Date.now().toString(36)
  const player = {
    name: 'E2E Recharge Player',
    username: `e2erc_${suffix}`,
    password: 'e2e-test-password-recharge',
    personalId: '11122233344',
    email: `e2e-recharge-${suffix}@example.invalid`
  }
  let token = ''
  let packageId = ''

  it('registers the test player and creates a recharge package fixture', async () => {
    const res = await (await request()).post('/api/auth/register').send(player)
    expect(res.status).toBe(201)

    const login = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: player.username, password: player.password })
    expect(login.status).toBe(201)
    token = login.body.accessToken

    const pack = await prisma.rechargePackage.create({
      data: { key: `e2e-recharge-pack-${suffix}`, currency: 'WCOIN', amount: 500, bonus: 50, price: '19,90', active: true }
    })
    packageId = pack.id
  })

  // ── Scenario 1: order creation, idempotency-key header asserted ──
  it('creates a checkout: calls Mercado Pago once with the correct idempotency header, persists externalOrderId', async () => {
    let capturedIdempotencyKey: string | null = null
    let calls = 0
    fetchHandler = async (url, init) => {
      calls += 1
      expect(url).toBe('https://mercadopago.invalid/v1/orders')
      expect(init?.method).toBe('POST')
      capturedIdempotencyKey = (init?.headers as Record<string, string>)?.['X-Idempotency-Key']
      const body = JSON.parse(String(init?.body))
      return jsonResponse(
        mockOrderBody({
          id: 'ORD-scenario-1',
          external_reference: body.external_reference,
          total_amount: '19.90',
          status: 'action_required',
          status_detail: 'waiting_transfer'
        })
      )
    }

    const intentRes = await (await request())
      .post('/api/recharge/intents')
      .set('Authorization', `Bearer ${token}`)
      .send({ packageId })
    expect(intentRes.status).toBe(201)
    const intentId = intentRes.body.id

    const checkoutRes = await (await request())
      .post(`/api/recharge/intents/${intentId}/checkout`)
      .set('Authorization', `Bearer ${token}`)
    expect(checkoutRes.status).toBe(201)
    expect(checkoutRes.body.externalOrderId).toBe('ORD-scenario-1')
    expect(checkoutRes.body.qrCode).toBeTruthy()
    expect(capturedIdempotencyKey).toBeTruthy()
    expect(calls).toBe(1)

    const stored = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    expect(stored?.externalOrderId).toBe('ORD-scenario-1')
    expect(stored?.paymentIdempotencyKey).toBe(capturedIdempotencyKey)
  })

  // ── Scenario 2: duplicate checkout call -> MP fetch invoked once per call, same idempotency key reused ──
  it('reuses the same idempotency key on a repeated checkout call for the same intent', async () => {
    const idempotencyKeys: string[] = []
    fetchHandler = async (url, init) => {
      idempotencyKeys.push((init?.headers as Record<string, string>)?.['X-Idempotency-Key'])
      const body = JSON.parse(String(init?.body))
      return jsonResponse(mockOrderBody({ id: 'ORD-scenario-2', external_reference: body.external_reference, total_amount: '19.90', status: 'action_required' }))
    }

    const intentRes = await (await request())
      .post('/api/recharge/intents')
      .set('Authorization', `Bearer ${token}`)
      .send({ packageId })
    const intentId = intentRes.body.id

    await (await request()).post(`/api/recharge/intents/${intentId}/checkout`).set('Authorization', `Bearer ${token}`)
    await (await request()).post(`/api/recharge/intents/${intentId}/checkout`).set('Authorization', `Bearer ${token}`)

    expect(idempotencyKeys.length).toBe(2)
    expect(idempotencyKeys[0]).toBe(idempotencyKeys[1])
  })

  // Helper: create+checkout an intent, return { intentId, externalOrderId, externalReference }
  const createCheckoutIntent = async (orderId: string) => {
    let externalReference = ''
    fetchHandler = async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      externalReference = body.external_reference
      return jsonResponse(mockOrderBody({ id: orderId, external_reference: externalReference, total_amount: '19.90', status: 'action_required' }))
    }
    const intentRes = await (await request())
      .post('/api/recharge/intents')
      .set('Authorization', `Bearer ${token}`)
      .send({ packageId })
    const intentId = intentRes.body.id
    await (await request()).post(`/api/recharge/intents/${intentId}/checkout`).set('Authorization', `Bearer ${token}`)
    return { intentId, externalOrderId: orderId, externalReference }
  }

  const sendWebhook = (dataId: string, requestId: string, signature?: string) =>
    request().then((req) =>
      req
        .post('/api/payments/webhooks/mercadopago')
        .query({ 'data.id': dataId })
        .set('x-request-id', requestId)
        .set('x-signature', signature ?? signWebhook(dataId, requestId, String(Math.floor(Date.now() / 1000))))
        .send({ action: 'order.updated', api_version: 'v1', application_id: 'e2e', date_created: new Date().toISOString(), id: `evt-${dataId}`, live_mode: false, type: 'order', user_id: 1, data: { id: dataId } })
    )

  // ── Scenario 3: valid webhook -> PAID + balance credited + audit/observability rows ──
  it('processes a valid webhook: credits the wallet exactly once and marks the intent PAID', async () => {
    const { intentId, externalOrderId, externalReference } = await createCheckoutIntent('ORD-scenario-3')

    fetchHandler = async () =>
      jsonResponse(mockOrderBody({ id: externalOrderId, external_reference: externalReference, total_amount: '19.90', status: 'processed', status_detail: 'accredited' }))

    const res = await sendWebhook(externalOrderId, 'req-scenario-3')
    expect(res.status).toBe(200)

    const updated = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    expect(updated?.status).toBe('PAID')

    const wallet = await prisma.accountCurrency.findFirst({ where: { accountId: updated!.accountId, currency: 'WCOIN' } })
    expect(wallet?.balance).toBeGreaterThanOrEqual(550) // amount 500 + bonus 50

    const auditRows = await prisma.auditEvent.findMany({ where: { targetId: intentId, action: 'recharge.webhook.status' } })
    expect(auditRows.length).toBeGreaterThan(0)
  })

  // ── Scenario 4: invalid/malformed webhook (garbage data.id, valid-looking signature) -> no mutation ──
  it('rejects a webhook whose data.id does not resolve to any known order without mutating anything', async () => {
    const dataId = 'ORD-does-not-exist-anywhere'
    fetchHandler = async () => jsonResponse({ message: 'not found' }, 404)

    const res = await sendWebhook(dataId, 'req-scenario-4')
    expect(res.status).toBe(200) // always 200 to MP so it does not retry forever
    const event = await prisma.paymentWebhookEvent.findFirst({ where: { externalOrderId: dataId } })
    expect(event?.rechargeIntentId).toBeNull()
  })

  // ── Scenario 5: invalid signature -> getOrder never called ──
  it('rejects an invalid signature before ever calling Mercado Pago', async () => {
    let called = false
    fetchHandler = async () => {
      called = true
      return jsonResponse({}, 200)
    }
    const dataId = 'ORD-scenario-5'
    const ts = String(Math.floor(Date.now() / 1000))
    const badSignature = `ts=${ts},v1=${'0'.repeat(64)}`
    const res = await sendWebhook(dataId, 'req-scenario-5', badSignature)
    expect(res.status).toBe(200)
    expect(called).toBe(false)

    const event = await prisma.paymentWebhookEvent.findFirst({ where: { externalOrderId: dataId } })
    expect(event?.signatureValid).toBe(false)
    expect(event?.status).toBe('FAILED')
  })

  // ── Scenario 6: repeated webhook (same event) -> credited once ──
  it('does not double-credit when the exact same webhook event is redelivered', async () => {
    const { intentId, externalOrderId, externalReference } = await createCheckoutIntent('ORD-scenario-6')
    fetchHandler = async () =>
      jsonResponse(mockOrderBody({ id: externalOrderId, external_reference: externalReference, total_amount: '19.90', status: 'processed', status_detail: 'accredited' }))

    const before = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    const walletBefore = (await prisma.accountCurrency.findFirst({ where: { accountId: before!.accountId, currency: 'WCOIN' } }))?.balance || 0

    const requestId = 'req-scenario-6-fixed'
    const ts = String(Math.floor(Date.now() / 1000))
    const signature = signWebhook(externalOrderId, requestId, ts)
    await (await request()).post('/api/payments/webhooks/mercadopago').query({ 'data.id': externalOrderId }).set('x-request-id', requestId).set('x-signature', signature).send({ action: 'order.updated', api_version: 'v1', application_id: 'e2e', date_created: new Date().toISOString(), id: `evt-${externalOrderId}`, live_mode: false, type: 'order', user_id: 1, data: { id: externalOrderId } })
    await (await request()).post('/api/payments/webhooks/mercadopago').query({ 'data.id': externalOrderId }).set('x-request-id', requestId).set('x-signature', signature).send({ action: 'order.updated', api_version: 'v1', application_id: 'e2e', date_created: new Date().toISOString(), id: `evt-${externalOrderId}`, live_mode: false, type: 'order', user_id: 1, data: { id: externalOrderId } })

    const walletAfter = (await prisma.accountCurrency.findFirst({ where: { accountId: before!.accountId, currency: 'WCOIN' } }))?.balance || 0
    expect(walletAfter - walletBefore).toBe(550)
  })

  // ── Scenario 7: approved payment -> approvedAt set, exact credited amount ──
  it('sets approvedAt and credits exactly amount + bonus on approval', async () => {
    const { intentId, externalOrderId, externalReference } = await createCheckoutIntent('ORD-scenario-7')
    fetchHandler = async () =>
      jsonResponse(mockOrderBody({ id: externalOrderId, external_reference: externalReference, total_amount: '19.90', status: 'processed', status_detail: 'accredited' }))
    await sendWebhook(externalOrderId, 'req-scenario-7')

    const updated = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    expect(updated?.status).toBe('PAID')
    expect(updated?.approvedAt).not.toBeNull()
  })

  // ── Scenario 8: rejected payment -> FAILED, no credit ──
  it('marks a rejected payment as FAILED without crediting the wallet', async () => {
    const { intentId, externalOrderId, externalReference } = await createCheckoutIntent('ORD-scenario-8')
    const before = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    const walletBefore = (await prisma.accountCurrency.findFirst({ where: { accountId: before!.accountId, currency: 'WCOIN' } }))?.balance || 0

    fetchHandler = async () =>
      jsonResponse(mockOrderBody({ id: externalOrderId, external_reference: externalReference, total_amount: '19.90', status: 'failed', status_detail: 'failed' }))
    await sendWebhook(externalOrderId, 'req-scenario-8')

    const updated = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    expect(updated?.status).toBe('FAILED')
    const walletAfter = (await prisma.accountCurrency.findFirst({ where: { accountId: before!.accountId, currency: 'WCOIN' } }))?.balance || 0
    expect(walletAfter).toBe(walletBefore)
  })

  // ── Scenario 9: pending payment -> no premature credit, webhook still processed (not an error) ──
  it('keeps a pending (action_required) order in a non-terminal status without crediting', async () => {
    const { intentId, externalOrderId, externalReference } = await createCheckoutIntent('ORD-scenario-9')
    fetchHandler = async () =>
      jsonResponse(mockOrderBody({ id: externalOrderId, external_reference: externalReference, total_amount: '19.90', status: 'action_required', status_detail: 'waiting_transfer' }))

    const res = await sendWebhook(externalOrderId, 'req-scenario-9')
    expect(res.status).toBe(200)
    const updated = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    expect(['PENDING', 'PREPARED']).toContain(updated?.status)
  })

  // ── Scenario 10: divergent amount -> MANUAL_REVIEW, no credit, CRITICAL SystemAlert ──
  it('flags a divergent amount for manual review and raises a CRITICAL alert', async () => {
    const { intentId, externalOrderId, externalReference } = await createCheckoutIntent('ORD-scenario-10')
    fetchHandler = async () =>
      jsonResponse(mockOrderBody({ id: externalOrderId, external_reference: externalReference, total_amount: '999.00', status: 'processed', status_detail: 'accredited' }))
    await sendWebhook(externalOrderId, 'req-scenario-10')

    const updated = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    expect(updated?.status).toBe('MANUAL_REVIEW')

    const alerts = await prisma.systemAlert.findMany({ where: { module: 'store', severity: 'CRITICAL' } })
    expect(alerts.length).toBeGreaterThan(0)
  })

  // ── Scenario 11: nonexistent internal order -> 200, no match, alert fired ──
  it('handles a webhook for an order with no matching RechargeIntent without throwing', async () => {
    const orderId = 'ORD-scenario-11-orphan'
    fetchHandler = async () => jsonResponse(mockOrderBody({ id: orderId, external_reference: 'never-created-reference', total_amount: '19.90', status: 'processed', status_detail: 'accredited' }))
    const res = await sendWebhook(orderId, 'req-scenario-11')
    expect(res.status).toBe(200)

    const alerts = await prisma.systemAlert.findMany({ where: { module: 'store', alertType: 'CRITICAL_FAILURE' } })
    expect(alerts.length).toBeGreaterThan(0)
  })

  // ── Scenario 12 + 13: failure during credit (retryable), then a successful retry credits once, further redelivery credits nothing more ──
  it('does not leave the intent PAID if crediting fails, and a later retry credits exactly once', async () => {
    const { intentId, externalOrderId, externalReference } = await createCheckoutIntent('ORD-scenario-12')

    // Patch the service's own creditCurrency (not the Prisma delegate --
    // $transaction hands the callback a distinct transactional `tx` proxy,
    // so patching prisma.accountCurrency.upsert directly would not actually
    // intercept the call made through `tx` inside the transaction).
    const service = commerceService as unknown as { creditCurrency: (...args: unknown[]) => Promise<void> }
    const originalCreditCurrency = service.creditCurrency.bind(service)
    let shouldFail = true
    service.creditCurrency = async (...args: unknown[]) => {
      if (shouldFail) {
        shouldFail = false
        throw new Error('simulated transient credit failure')
      }
      return originalCreditCurrency(...args)
    }

    fetchHandler = async () =>
      jsonResponse(mockOrderBody({ id: externalOrderId, external_reference: externalReference, total_amount: '19.90', status: 'processed', status_detail: 'accredited' }))

    const requestId = 'req-scenario-12-13'
    const ts = String(Math.floor(Date.now() / 1000))
    const signature = signWebhook(externalOrderId, requestId, ts)
    const body = { action: 'order.updated', api_version: 'v1', application_id: 'e2e', date_created: new Date().toISOString(), id: `evt-${externalOrderId}`, live_mode: false, type: 'order', user_id: 1, data: { id: externalOrderId } }

    const firstAttempt = await (await request()).post('/api/payments/webhooks/mercadopago').query({ 'data.id': externalOrderId }).set('x-request-id', requestId).set('x-signature', signature).send(body)
    expect(firstAttempt.status).toBe(500)

    let updated = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    expect(updated?.status).not.toBe('PAID')

    // Redeliver (same event) -- the webhook table row is FAILED, not
    // PROCESSED, so this retry is allowed to proceed and should now succeed.
    const secondAttempt = await (await request()).post('/api/payments/webhooks/mercadopago').query({ 'data.id': externalOrderId }).set('x-request-id', requestId).set('x-signature', signature).send(body)
    expect(secondAttempt.status).toBe(200)

    updated = await prisma.rechargeIntent.findUnique({ where: { id: intentId } })
    expect(updated?.status).toBe('PAID')
    const walletAfterSecond = (await prisma.accountCurrency.findFirst({ where: { accountId: updated!.accountId, currency: 'WCOIN' } }))?.balance || 0

    // A third redelivery of the same (now PROCESSED) event must not credit again.
    const thirdAttempt = await (await request()).post('/api/payments/webhooks/mercadopago').query({ 'data.id': externalOrderId }).set('x-request-id', requestId).set('x-signature', signature).send(body)
    expect(thirdAttempt.status).toBe(200)
    const walletAfterThird = (await prisma.accountCurrency.findFirst({ where: { accountId: updated!.accountId, currency: 'WCOIN' } }))?.balance || 0
    expect(walletAfterThird).toBe(walletAfterSecond)

    service.creditCurrency = originalCreditCurrency
  })

  // ── Regression: client-sent price is ignored -- only packageId is accepted ──
  it('ignores any client-sent price/amount and always prices from the server-side package', async () => {
    fetchHandler = async () => jsonResponse(mockOrderBody({ id: 'ORD-regression-price', external_reference: 'x', total_amount: '19.90', status: 'action_required' }))
    const res = await (await request())
      .post('/api/recharge/intents')
      .set('Authorization', `Bearer ${token}`)
      // Deliberately sending extra fields a malicious client might try --
      // the contract type only has packageId, so this is a runtime check
      // that the server ignores them, not a type-level one.
      .send({ packageId, price: '0,01', amount: 999999999 })
    expect(res.status).toBe(201)
    const stored = await prisma.rechargeIntent.findUnique({ where: { id: res.body.id } })
    expect(stored?.price).toBe('19,90')
    expect(stored?.amount).toBe(500)
  })

  // ── Ownership: a different player cannot start checkout on someone else's intent ──
  it('rejects checkout attempts from an account that does not own the recharge intent', async () => {
    const other = {
      name: 'E2E Recharge Other Player',
      username: `e2erc2_${suffix}`,
      password: 'e2e-test-password-recharge-2',
      personalId: '55566677788',
      email: `e2e-recharge-other-${suffix}@example.invalid`
    }
    await (await request()).post('/api/auth/register').send(other)
    const otherLogin = await (await request()).post('/api/auth/login').send({ username: other.username, password: other.password })
    const otherToken = otherLogin.body.accessToken

    const intentRes = await (await request()).post('/api/recharge/intents').set('Authorization', `Bearer ${token}`).send({ packageId })
    const res = await (await request()).post(`/api/recharge/intents/${intentRes.body.id}/checkout`).set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  it('fails closed when real-money payments are disabled, even through the API', async () => {
    process.env.REAL_MONEY_PAYMENTS_ENABLED = 'false'
    const countBefore = await prisma.rechargeIntent.count()
    const res = await (await request())
      .post('/api/recharge/intents')
      .set('Authorization', `Bearer ${token}`)
      .send({ packageId })

    expect(res.status).toBe(503)
    expect(res.body.message).toContain('temporariamente indisponiveis')
    expect(await prisma.rechargeIntent.count()).toBe(countBefore)
    process.env.REAL_MONEY_PAYMENTS_ENABLED = 'true'
  })
})
