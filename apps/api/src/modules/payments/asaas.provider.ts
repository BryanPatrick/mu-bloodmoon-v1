import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { PaymentProvider } from './payment-provider.interface'
import type {
  CreateOrderInput,
  CreateOrderResult,
  OrderStatusResult,
  WebhookVerificationInput
} from './payment-provider.types'
import { loadAsaasConfig } from './asaas.config'

type AsaasCustomer = { id: string; externalReference?: string }
type AsaasPayment = {
  id: string
  customer: string
  externalReference?: string
  status: string
  deleted?: boolean
  value: number
  billingType: string
  invoiceUrl?: string
}
type AsaasList<T> = { data?: T[]; hasMore?: boolean }
type AsaasPix = { payload?: string; encodedImage?: string }

@Injectable()
export class AsaasPaymentProvider implements PaymentProvider {
  private config() {
    return loadAsaasConfig()
  }

  assertSandboxEnabled() {
    const config = this.config()
    if (!config.enabled) throw new ServiceUnavailableException('ASAAS_SANDBOX_DISABLED')
    return config
  }

  async createCustomer(input: {
    legalName: string
    cpfCnpj: string
    externalReference: string
  }): Promise<string> {
    const customer = await this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: input.legalName,
        cpfCnpj: input.cpfCnpj,
        externalReference: input.externalReference,
        notificationDisabled: true
      })
    })
    if (!customer.id) throw new ServiceUnavailableException('ASAAS_CUSTOMER_RESPONSE_INVALID')
    return customer.id
  }

  async findCustomerByExternalReference(reference: string): Promise<string | null> {
    const list = await this.request<AsaasList<AsaasCustomer>>(
      `/customers?externalReference=${encodeURIComponent(reference)}&limit=2`
    )
    const matching = (list.data || []).filter((item) => item.externalReference === reference)
    if (matching.length > 1 || list.hasMore)
      throw new ServiceUnavailableException('ASAAS_CUSTOMER_AMBIGUOUS')
    return matching[0]?.id || null
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    if (!input.payerCustomerId) throw new ServiceUnavailableException('ASAAS_CUSTOMER_REQUIRED')
    if (!Number.isSafeInteger(input.amountBRL) || input.amountBRL <= 0) {
      throw new ServiceUnavailableException('ASAAS_WCOIN_AMOUNT_INVALID')
    }
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const payment = await this.request<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: input.payerCustomerId,
        billingType: 'PIX',
        value: input.amountBRL,
        dueDate,
        description: input.description,
        externalReference: input.externalReference
      })
    })
    if (
      !payment.id ||
      payment.customer !== input.payerCustomerId ||
      payment.externalReference !== input.externalReference ||
      payment.value !== input.amountBRL ||
      payment.billingType !== 'PIX'
    ) {
      throw new ServiceUnavailableException('ASAAS_PAYMENT_RESPONSE_MISMATCH')
    }
    const pix = await this.getPix(payment.id)
    return {
      externalOrderId: payment.id,
      status: payment.status,
      paymentMethod: payment.billingType,
      qrCode: pix.payload,
      qrCodeBase64: pix.encodedImage,
      ticketUrl: payment.invoiceUrl
    }
  }

  async getOrder(externalOrderId: string): Promise<OrderStatusResult> {
    const payment = await this.request<AsaasPayment>(
      `/payments/${encodeURIComponent(externalOrderId)}`
    )
    return this.mapPayment(payment)
  }

  async getCheckout(externalOrderId: string): Promise<CreateOrderResult> {
    const payment = await this.getOrder(externalOrderId)
    const pix = await this.getPix(externalOrderId)
    return {
      externalOrderId,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      qrCode: pix.payload,
      qrCodeBase64: pix.encodedImage,
      ticketUrl: payment.ticketUrl
    }
  }

  async findPaymentByExternalReference(reference: string): Promise<OrderStatusResult | null> {
    const list = await this.request<AsaasList<AsaasPayment>>(
      `/payments?externalReference=${encodeURIComponent(reference)}&limit=2`
    )
    const matching = (list.data || []).filter((item) => item.externalReference === reference)
    if (matching.length > 1 || list.hasMore)
      throw new ServiceUnavailableException('ASAAS_PAYMENT_AMBIGUOUS')
    return matching[0] ? this.mapPayment(matching[0]) : null
  }

  async cancelOrder(externalOrderId: string): Promise<void> {
    await this.request(`/payments/${encodeURIComponent(externalOrderId)}`, { method: 'DELETE' })
  }

  validateWebhookSignature(input: WebhookVerificationInput): boolean {
    const expected = this.config().webhookToken
    if (!expected || !input.signatureHeader) return false
    const left = createHash('sha256').update(input.signatureHeader).digest()
    const right = createHash('sha256').update(expected).digest()
    return timingSafeEqual(left, right)
  }

  async refundOrder(): Promise<never> {
    throw new ServiceUnavailableException('ASAAS_REFUND_DEFERRED')
  }

  private mapPayment(payment: AsaasPayment): OrderStatusResult {
    if (!payment.id || !payment.customer || !Number.isFinite(payment.value)) {
      throw new ServiceUnavailableException('ASAAS_PAYMENT_RESPONSE_INVALID')
    }
    return {
      externalOrderId: payment.id,
      externalReference: payment.externalReference || null,
      // Asaas Sandbox can retain OVERDUE after DELETE while setting
      // deleted=true. Use the deletion flag for reconciliation.
      status: payment.deleted === true ? 'DELETED' : payment.status,
      totalAmountBRL: payment.value,
      paymentMethod: payment.billingType,
      providerCustomerId: payment.customer,
      ticketUrl: payment.invoiceUrl
    }
  }

  private async getPix(id: string): Promise<AsaasPix> {
    return this.request<AsaasPix>(`/payments/${encodeURIComponent(id)}/pixQrCode`)
  }

  private async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const config = this.assertSandboxEnabled()
    if (!config.apiKey) throw new ServiceUnavailableException('ASAAS_SANDBOX_KEY_MISSING')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch(`${config.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          access_token: config.apiKey,
          'User-Agent': 'BloodMoon-Sandbox/1',
          ...(init.headers || {})
        }
      })
      if (response.status === 404) throw new NotFoundException('ASAAS_RESOURCE_NOT_FOUND')
      if (!response.ok) throw new ServiceUnavailableException(`ASAAS_HTTP_${response.status}`)
      return response.json() as Promise<T>
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ServiceUnavailableException)
        throw error
      throw new ServiceUnavailableException('ASAAS_PROVIDER_UNAVAILABLE')
    } finally {
      clearTimeout(timeout)
    }
  }
}
