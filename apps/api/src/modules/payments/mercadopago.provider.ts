import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import type { PaymentProvider } from './payment-provider.interface'
import type {
  CreateOrderInput,
  CreateOrderResult,
  OrderStatusResult,
  WebhookVerificationInput
} from './payment-provider.types'
import { loadMercadoPagoConfig, type MercadoPagoConfig } from './mercadopago.config'
import type {
  MercadoPagoCreateOrderRequest,
  MercadoPagoOrderResponse
} from './mercadopago.types'
import { verifyMercadoPagoSignature } from './webhook-signature.util'

// Every direct HTTP call to Mercado Pago lives in this file -- no controller
// or other service ever calls fetch('https://api.mercadopago.com/...')
// directly. Uses native fetch() specifically so tests can mock global.fetch,
// the same technique already used for Turnstile in this codebase.
const PIX_EXPIRATION = 'PT30M'

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  private readonly config: MercadoPagoConfig

  constructor() {
    this.config = loadMercadoPagoConfig()
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const accessToken = this.requireAccessToken()

    const body: MercadoPagoCreateOrderRequest = {
      type: 'online',
      total_amount: toAmountString(input.amountBRL),
      external_reference: input.externalReference,
      processing_mode: 'automatic',
      transactions: {
        payments: [
          {
            amount: toAmountString(input.amountBRL),
            payment_method: { id: 'pix', type: 'bank_transfer' },
            expiration_time: PIX_EXPIRATION
          }
        ]
      },
      payer: { email: input.payerEmail }
    }

    const response = await this.request('/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.idempotencyKey
      },
      body: JSON.stringify(body)
    })

    const order = (await response.json()) as MercadoPagoOrderResponse
    const payment = order.transactions?.payments?.[0]

    return {
      externalOrderId: order.id,
      status: order.status,
      statusDetail: order.status_detail,
      paymentMethod: payment?.payment_method?.id,
      qrCode: payment?.payment_method?.qr_code,
      qrCodeBase64: payment?.payment_method?.qr_code_base64,
      ticketUrl: payment?.payment_method?.ticket_url
    }
  }

  async getOrder(externalOrderId: string): Promise<OrderStatusResult> {
    const accessToken = this.requireAccessToken()

    const response = await this.request(`/v1/orders/${encodeURIComponent(externalOrderId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (response.status === 404) {
      throw new NotFoundException(`Mercado Pago order not found: ${externalOrderId}`)
    }

    const order = (await response.json()) as MercadoPagoOrderResponse
    const payment = order.transactions?.payments?.[0]

    return {
      externalOrderId: order.id,
      externalReference: order.external_reference,
      status: order.status,
      statusDetail: order.status_detail,
      totalAmountBRL: fromAmountString(order.total_amount),
      paymentMethod: payment?.payment_method?.id
    }
  }

  async cancelOrder(externalOrderId: string): Promise<void> {
    const accessToken = this.requireAccessToken()
    await this.request(`/v1/orders/${encodeURIComponent(externalOrderId)}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  }

  validateWebhookSignature(input: WebhookVerificationInput): boolean {
    if (!this.config.webhookSecret) return false
    return verifyMercadoPagoSignature({
      signatureHeader: input.signatureHeader,
      requestId: input.requestId,
      dataId: input.dataId,
      secret: this.config.webhookSecret
    })
  }

  async refundOrder(): Promise<never> {
    throw new ServiceUnavailableException(
      'Real refunds are not implemented yet -- see the payments delivery doc.'
    )
  }

  private requireAccessToken(): string {
    if (!this.config.accessToken) {
      throw new ServiceUnavailableException(
        'O pagamento esta temporariamente indisponivel (Mercado Pago nao configurado).'
      )
    }
    return this.config.accessToken
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)
    try {
      const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
        ...init,
        signal: controller.signal
      })
      if (!response.ok && response.status !== 404) {
        throw new Error(`mercadopago-http-${response.status}`)
      }
      return response
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('mercadopago-http-')) throw error
      throw new ServiceUnavailableException(
        'O pagamento esta temporariamente indisponivel (Mercado Pago inacessivel).'
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}

export function toAmountString(amountBRL: number): string {
  return amountBRL.toFixed(2)
}

export function fromAmountString(amount: string): number {
  const parsed = Number(amount)
  return Number.isFinite(parsed) ? parsed : 0
}
