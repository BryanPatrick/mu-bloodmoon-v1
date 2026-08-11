// Gateway-agnostic DTOs. CommerceService and every other consumer talk only
// in these shapes -- MercadoPago's raw request/response fields stay isolated
// inside mercadopago.provider.ts / mercadopago.types.ts.

export type CreateOrderInput = {
  // Blood Moon's own audit-chain id for the whole operation. Passed through
  // for logging/tracing only -- never sent to the provider directly.
  correlationId: string
  // Sent to the provider as its own "relate this order back to us" field
  // (external_reference for Mercado Pago). Modeled separately from
  // correlationId and idempotencyKey on purpose: today all three happen to
  // share one generated value, but a retried/second payment attempt on the
  // same intent, a refund, or a future provider should be able to diverge
  // them without a schema change.
  externalReference: string
  // Sent as the idempotency header for this specific create-order call.
  idempotencyKey: string
  amountBRL: number
  description: string
  payerEmail: string
}

export type CreateOrderResult = {
  externalOrderId: string
  status: string
  statusDetail?: string
  paymentMethod?: string
  qrCode?: string
  qrCodeBase64?: string
  ticketUrl?: string
}

export type OrderStatusResult = {
  externalOrderId: string
  externalReference: string | null
  status: string
  statusDetail?: string
  totalAmountBRL: number
  paymentMethod?: string
}

export type WebhookVerificationInput = {
  signatureHeader: string | undefined
  requestId: string | undefined
  dataId: string | undefined
}
