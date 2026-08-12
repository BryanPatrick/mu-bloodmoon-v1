// Env var loading + validation for the Mercado Pago integration.
//
// Hybrid strategy (see the delivery doc for the full rationale): a missing
// credential hard-fails API boot only in production (mirrors
// auth.module.ts's JWT-secret pattern) -- a payment gateway credential
// shouldn't take down auth/wiki/community too. In dev/test the module loads
// fine with empty values; MercadoPagoProvider throws ServiceUnavailableException
// per-call if actually invoked unconfigured (mirrors captcha.service.ts).
export type MercadoPagoConfig = {
  enabled: boolean
  accessToken: string
  publicKey: string
  webhookSecret: string
  apiBaseUrl: string
  timeoutMs: number
}

export function loadMercadoPagoConfig(): MercadoPagoConfig {
  const enabled = process.env.REAL_MONEY_PAYMENTS_ENABLED === 'true'
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || ''
  const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY?.trim() || ''
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim() || ''
  const apiBaseUrl = process.env.MERCADO_PAGO_API_BASE_URL?.trim() || 'https://api.mercadopago.com'
  const timeoutMs = Number(process.env.MERCADO_PAGO_TIMEOUT_MS) || 15000

  if (enabled && process.env.NODE_ENV === 'production' && (!accessToken || !webhookSecret)) {
    throw new Error(
      'MERCADO_PAGO_ACCESS_TOKEN and MERCADO_PAGO_WEBHOOK_SECRET are required in production'
    )
  }

  return { enabled, accessToken, publicKey, webhookSecret, apiBaseUrl, timeoutMs }
}
