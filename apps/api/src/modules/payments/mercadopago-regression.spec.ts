import { MercadoPagoProvider } from './mercadopago.provider'

const originalFetch = global.fetch
const original = {
  enabled: process.env.REAL_MONEY_PAYMENTS_ENABLED,
  mpEnabled: process.env.MERCADO_PAGO_ENABLED,
  token: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  baseUrl: process.env.MERCADO_PAGO_API_BASE_URL,
  nodeEnv: process.env.NODE_ENV
}

afterEach(() => {
  global.fetch = originalFetch
  for (const [key, value] of Object.entries({
    REAL_MONEY_PAYMENTS_ENABLED: original.enabled,
    MERCADO_PAGO_ENABLED: original.mpEnabled,
    MERCADO_PAGO_ACCESS_TOKEN: original.token,
    MERCADO_PAGO_WEBHOOK_SECRET: original.secret,
    MERCADO_PAGO_API_BASE_URL: original.baseUrl,
    NODE_ENV: original.nodeEnv
  })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

it('keeps the Mercado Pago idempotent PIX request contract', async () => {
  process.env.NODE_ENV = 'test'
  process.env.REAL_MONEY_PAYMENTS_ENABLED = 'true'
  process.env.MERCADO_PAGO_ENABLED = 'true'
  process.env.MERCADO_PAGO_ACCESS_TOKEN = 'fake-mp-test-token'
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'fake-mp-test-secret'
  process.env.MERCADO_PAGO_API_BASE_URL = 'https://mercadopago.invalid'
  global.fetch = jest.fn(async (input, init) => {
    expect(String(input)).toBe('https://mercadopago.invalid/v1/orders')
    expect((init?.headers as Record<string, string>)['X-Idempotency-Key']).toBe('idempotent-1')
    const body = JSON.parse(String(init?.body))
    expect(body.external_reference).toBe('recharge-1')
    return new Response(
      JSON.stringify({
        id: 'mp-order-1',
        status: 'action_required',
        status_detail: 'waiting_transfer',
        transactions: { payments: [{ payment_method: { id: 'pix', qr_code: 'fake-pix' } }] }
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  }) as typeof fetch
  const order = await new MercadoPagoProvider().createOrder({
    correlationId: 'correlation-1',
    externalReference: 'recharge-1',
    idempotencyKey: 'idempotent-1',
    amountBRL: 10,
    description: 'QA',
    payerEmail: 'qa@example.invalid'
  })
  expect(order).toMatchObject({
    externalOrderId: 'mp-order-1',
    qrCode: 'fake-pix',
    paymentMethod: 'pix'
  })
})
