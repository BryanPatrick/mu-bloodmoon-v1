import type {
  CreateOrderInput,
  CreateOrderResult,
  OrderStatusResult,
  WebhookVerificationInput
} from './payment-provider.types'

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER')

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>
  getOrder(externalOrderId: string): Promise<OrderStatusResult>
  cancelOrder(externalOrderId: string): Promise<void>
  validateWebhookSignature(input: WebhookVerificationInput): boolean
  // Documented stub for a future delivery. Real refunds are not implemented
  // in this etapa -- see the delivery doc's "pending before production" list.
  refundOrder(externalOrderId: string, amount?: number): Promise<never>
}
