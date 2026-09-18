import { assertAsaasCreationEnabled, loadAsaasConfig, ASAAS_PRODUCTION_URL } from './asaas.config'
import { AsaasPaymentProvider } from './asaas.provider'
import { loadMercadoPagoConfig } from './mercadopago.config'

const names = [
  'NODE_ENV', 'DATABASE_URL', 'ASAAS_ENABLED', 'ASAAS_ENVIRONMENT', 'ASAAS_BASE_URL',
  'ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN', 'ASAAS_FRONTEND_ENABLED',
  'ASAAS_PAYMENT_CREATION_ENABLED', 'ASAAS_WEBHOOK_PROCESSING_ENABLED',
  'ASAAS_RECONCILIATION_ENABLED', 'REAL_MONEY_PAYMENTS_ENABLED', 'MERCADO_PAGO_ENABLED'
] as const
const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]))
const originalFetch = global.fetch

beforeEach(() => {
  for (const name of names) delete process.env[name]
  process.env.NODE_ENV = 'production'
  process.env.ASAAS_ENABLED = 'true'
  process.env.ASAAS_ENVIRONMENT = 'production'
  process.env.ASAAS_BASE_URL = ASAAS_PRODUCTION_URL
})
afterEach(() => {
  global.fetch = originalFetch
  for (const name of names) {
    const value = saved[name]
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

describe('production readiness gates without provider network', () => {
  it('defaults every operational flag off even when provider is configured', () => {
    const config = loadAsaasConfig()
    expect(config).toMatchObject({
      enabled: true, environment: 'production', baseUrl: ASAAS_PRODUCTION_URL,
      frontendEnabled: false, paymentCreationEnabled: false,
      webhookProcessingEnabled: false, reconciliationEnabled: false
    })
    expect(() => assertAsaasCreationEnabled()).toThrow('PAYMENTS_DISABLED')
  })

  it.each([
    ['frontend only', 'true', 'false'],
    ['creation only', 'false', 'true'],
    ['both absent', undefined, undefined]
  ])('never sends a provider POST with %s', async (_case, frontend, creation) => {
    if (frontend) process.env.ASAAS_FRONTEND_ENABLED = frontend
    if (creation) process.env.ASAAS_PAYMENT_CREATION_ENABLED = creation
    process.env.ASAAS_API_KEY = '$aact_prod_fake_test_only'
    const fetchMock = jest.fn()
    global.fetch = fetchMock as typeof fetch
    await expect(new AsaasPaymentProvider().createOrder({
      correlationId: 'fake', externalReference: 'fake', idempotencyKey: 'fake',
      amountBRL: 10, description: 'fake', payerEmail: 'fake@example.invalid', payerCustomerId: 'cus_fake'
    })).rejects.toThrow('PAYMENTS_DISABLED')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects ambiguous, wrong-host and wrong-key production configuration before fetch', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as typeof fetch
    process.env.ASAAS_ENVIRONMENT = 'unknown'
    await expect(new AsaasPaymentProvider().getOrder('fake')).rejects.toThrow('ASAAS_ENVIRONMENT_INVALID')
    process.env.ASAAS_ENVIRONMENT = 'production'
    delete process.env.ASAAS_BASE_URL
    await expect(new AsaasPaymentProvider().getOrder('fake')).rejects.toThrow('ASAAS_PROVIDER_CONFIG_INVALID')
    process.env.ASAAS_BASE_URL = ASAAS_PRODUCTION_URL
    process.env.ASAAS_API_KEY = '$aact_hmlg_fake_test_only'
    await expect(new AsaasPaymentProvider().getOrder('fake')).rejects.toThrow('ASAAS_PROVIDER_CONFIG_INVALID')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps Mercado Pago dormant unless separately opted in', () => {
    process.env.REAL_MONEY_PAYMENTS_ENABLED = 'true'
    expect(loadMercadoPagoConfig().enabled).toBe(false)
  })

  it('requires the production webhook token and allows provider requery while creation is off', async () => {
    process.env.ASAAS_API_KEY = '$aact_prod_fake_test_only'
    process.env.ASAAS_WEBHOOK_PROCESSING_ENABLED = 'true'
    process.env.ASAAS_RECONCILIATION_ENABLED = 'true'
    process.env.ASAAS_PAYMENT_CREATION_ENABLED = 'false'
    const provider = new AsaasPaymentProvider()
    const signature = (token: string | undefined) => provider.validateWebhookSignature({
      signatureHeader: token, requestId: undefined, dataId: undefined
    })
    expect(signature(undefined)).toBe(false)
    expect(signature('wrong')).toBe(false)
    process.env.ASAAS_WEBHOOK_TOKEN = 'fake-production-webhook-token-test-only'
    expect(signature('wrong')).toBe(false)
    expect(signature('fake-production-webhook-token-test-only')).toBe(true)
    const fetchMock = jest.fn(async (_input: string | URL | Request) => new Response(JSON.stringify({
      id: 'pay_fake', customer: 'cus_fake', status: 'PENDING', value: 10,
      billingType: 'PIX', externalReference: 'reference_fake'
    }), { status: 200 }))
    global.fetch = fetchMock as typeof fetch
    await expect(provider.getOrder('pay_fake')).resolves.toMatchObject({ externalOrderId: 'pay_fake' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${ASAAS_PRODUCTION_URL}/payments/pay_fake`)
    await expect(provider.createCustomer({
      legalName: 'Synthetic QA', cpfCnpj: '00000000000', externalReference: 'reference_fake'
    })).rejects.toThrow('PAYMENTS_DISABLED')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
