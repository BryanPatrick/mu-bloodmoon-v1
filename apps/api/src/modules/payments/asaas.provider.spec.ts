import { AsaasPaymentProvider } from './asaas.provider'
import { mapAsaasPaymentStatus } from './asaas.status-map'

const originalFetch = global.fetch
const saved = {
  nodeEnv: process.env.NODE_ENV,
  enabled: process.env.ASAAS_ENABLED,
  environment: process.env.ASAAS_ENVIRONMENT,
  baseUrl: process.env.ASAAS_BASE_URL,
  databaseUrl: process.env.DATABASE_URL,
  apiKey: process.env.ASAAS_API_KEY,
  webhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
  frontendEnabled: process.env.ASAAS_FRONTEND_ENABLED,
  creationEnabled: process.env.ASAAS_PAYMENT_CREATION_ENABLED
}

const reply = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  process.env.NODE_ENV = 'test'
  process.env.ASAAS_ENABLED = 'true'
  process.env.ASAAS_ENVIRONMENT = 'sandbox'
  process.env.ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3'
  process.env.ASAAS_API_KEY = '$aact_hmlg_fake_test_only'
  process.env.ASAAS_WEBHOOK_TOKEN = 'fake-webhook-token-test-only'
  process.env.ASAAS_FRONTEND_ENABLED = 'true'
  process.env.ASAAS_PAYMENT_CREATION_ENABLED = 'true'
})

afterEach(() => {
  global.fetch = originalFetch
  for (const [key, value] of Object.entries({
    NODE_ENV: saved.nodeEnv,
    ASAAS_ENABLED: saved.enabled,
    ASAAS_ENVIRONMENT: saved.environment,
    ASAAS_BASE_URL: saved.baseUrl,
    DATABASE_URL: saved.databaseUrl,
    ASAAS_API_KEY: saved.apiKey,
    ASAAS_WEBHOOK_TOKEN: saved.webhookToken,
    ASAAS_FRONTEND_ENABLED: saved.frontendEnabled,
    ASAAS_PAYMENT_CREATION_ENABLED: saved.creationEnabled
  })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('Asaas sandbox adapter (mock HTTP only)', () => {
  it('fails closed for production endpoint and never calls fetch', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as typeof fetch
    process.env.ASAAS_BASE_URL = 'https://api.asaas.com/v3'
    await expect(new AsaasPaymentProvider().getOrder('pay_x')).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires a loopback database in development before any fetch', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as typeof fetch
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'mysql://placeholder:placeholder@db.example.invalid:3306/qa'
    await expect(new AsaasPaymentProvider().getOrder('pay_x')).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses a distinct webhook token and never accepts an API key', () => {
    const provider = new AsaasPaymentProvider()
    expect(
      provider.validateWebhookSignature({
        signatureHeader: 'fake-webhook-token-test-only',
        requestId: undefined,
        dataId: undefined
      })
    ).toBe(true)
    expect(
      provider.validateWebhookSignature({
        signatureHeader: '$aact_hmlg_fake_test_only',
        requestId: undefined,
        dataId: undefined
      })
    ).toBe(false)
  })

  it('creates and looks up a customer by stable internal reference', async () => {
    const seen: string[] = []
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input)
      seen.push(url)
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        expect(body.externalReference).toBe('bm-account:account-1')
        expect(body.notificationDisabled).toBe(true)
        expect(body.email).toBeUndefined()
        return reply({ id: 'cus_1' })
      }
      return reply({
        data: [{ id: 'cus_1', externalReference: 'bm-account:account-1' }],
        hasMore: false
      })
    }) as typeof fetch
    const provider = new AsaasPaymentProvider()
    expect(
      await provider.createCustomer({
        legalName: 'QA Player',
        cpfCnpj: '11144477735',
        externalReference: 'bm-account:account-1'
      })
    ).toBe('cus_1')
    expect(await provider.findCustomerByExternalReference('bm-account:account-1')).toBe('cus_1')
    expect(seen[0]).toBe('https://api-sandbox.asaas.com/v3/customers')
  })

  it('creates PIX only, with customer, exact amount and external reference', async () => {
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/payments')) {
        const body = JSON.parse(String(init?.body))
        expect(body).toMatchObject({
          customer: 'cus_1',
          billingType: 'PIX',
          value: 10,
          externalReference: 'recharge-1'
        })
        expect(body.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        return reply({
          id: 'pay_1',
          customer: 'cus_1',
          billingType: 'PIX',
          value: 10,
          externalReference: 'recharge-1',
          status: 'PENDING'
        })
      }
      return reply({ payload: 'pix-copy-code', encodedImage: 'image-b64' })
    }) as typeof fetch
    const result = await new AsaasPaymentProvider().createOrder({
      correlationId: 'correlation-1',
      externalReference: 'recharge-1',
      idempotencyKey: 'not-a-provider-header',
      amountBRL: 10,
      description: 'QA',
      payerEmail: 'qa@example.invalid',
      payerCustomerId: 'cus_1'
    })
    expect(result).toMatchObject({
      externalOrderId: 'pay_1',
      qrCode: 'pix-copy-code',
      qrCodeBase64: 'image-b64'
    })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('rejects fractional BRL before a provider request', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as typeof fetch
    await expect(
      new AsaasPaymentProvider().createOrder({
        correlationId: 'c',
        externalReference: 'r',
        idempotencyKey: 'i',
        amountBRL: 10.5,
        description: 'QA',
        payerEmail: 'qa@example.invalid',
        payerCustomerId: 'cus_1'
      })
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('looks up a payment and rejects duplicate provider references', async () => {
    global.fetch = jest.fn(async () =>
      reply({
        data: [
          {
            id: 'pay_1',
            customer: 'cus_1',
            billingType: 'PIX',
            value: 10,
            externalReference: 'ref',
            status: 'PENDING'
          },
          {
            id: 'pay_2',
            customer: 'cus_1',
            billingType: 'PIX',
            value: 10,
            externalReference: 'ref',
            status: 'PENDING'
          }
        ],
        hasMore: false
      })
    ) as typeof fetch
    await expect(new AsaasPaymentProvider().findPaymentByExternalReference('ref')).rejects.toThrow()
  })

  it('treats deleted=true as cancellation even when Asaas retains OVERDUE status', async () => {
    global.fetch = jest.fn(async () => reply({
      id: 'pay_cancelled', customer: 'cus_1', billingType: 'PIX',
      value: 10, externalReference: 'ref', status: 'OVERDUE', deleted: true
    })) as typeof fetch
    const order = await new AsaasPaymentProvider().getOrder('pay_cancelled')
    expect(order.status).toBe('DELETED')
    expect(mapAsaasPaymentStatus(order.status).status).toBe('CANCELLED')
  })

  it('fails closed on provider unavailability and never invokes refunds', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('timeout')
    }) as typeof fetch
    await expect(new AsaasPaymentProvider().getOrder('pay_x')).rejects.toThrow()
    await expect(new AsaasPaymentProvider().refundOrder()).rejects.toThrow()
  })

  it('records a safe durable event for provider 5xx responses', async () => {
    global.fetch = jest.fn(async () => reply({ error: 'synthetic' }, 503)) as typeof fetch
    const observability = { recordOperationalEvent: jest.fn(async () => undefined) }
    await expect(new AsaasPaymentProvider(observability as never).getOrder('pay_x')).rejects.toThrow()
    expect(observability.recordOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
      module: 'payments', eventType: 'ASAAS_PROVIDER_5XX', severity: 'WARNING',
      data: { category: 'ASAAS_PROVIDER_5XX', httpStatus: 503 }
    }))
  })

  it('keeps provider authentication failures immediate and critical', async () => {
    global.fetch = jest.fn(async () => reply({ error: 'synthetic' }, 401)) as typeof fetch
    const observability = { recordOperationalEvent: jest.fn(async () => undefined) }
    await expect(new AsaasPaymentProvider(observability as never).getOrder('pay_x')).rejects.toThrow()
    expect(observability.recordOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
      module: 'payments', eventType: 'ASAAS_PROVIDER_AUTH_FAILURE', severity: 'CRITICAL',
      data: { category: 'ASAAS_PROVIDER_AUTH_FAILURE', httpStatus: 401 }
    }))
  })
})

describe('Asaas status mapping', () => {
  it.each([
    ['PENDING', 'PENDING'],
    ['OVERDUE', 'PENDING'],
    ['CONFIRMED', 'PROCESSING'],
    ['RECEIVED', 'PAID'],
    ['REFUNDED', 'MANUAL_REVIEW'],
    ['CHARGEBACK_REQUESTED', 'MANUAL_REVIEW'],
    ['DELETED', 'CANCELLED'],
    ['NEW_STATUS', 'MANUAL_REVIEW']
  ])('%s → %s', (external, internal) => {
    expect(mapAsaasPaymentStatus(external).status).toBe(internal)
  })
})
