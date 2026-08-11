// Raw Mercado Pago Orders API (Checkout Transparente, Pix) shapes, confirmed
// against Mercado Pago's live developer documentation during implementation
// (checkout-api-orders/payment-integration/pix, checkout-api-orders/notifications,
// your-integrations/notifications/webhooks). total_amount/amount are strings
// on the wire ("50.00"), not numbers -- see toAmountString/fromAmountString
// in mercadopago.provider.ts for the conversion to/from this project's
// RechargePackage.price (BRL comma-decimal string) representation.

export type MercadoPagoCreateOrderRequest = {
  type: 'online'
  total_amount: string
  external_reference: string
  processing_mode: 'automatic'
  transactions: {
    payments: [
      {
        amount: string
        payment_method: { id: 'pix'; type: 'bank_transfer' }
        expiration_time: string
      }
    ]
  }
  payer: { email: string }
}

export type MercadoPagoPaymentMethod = {
  id?: string
  type?: string
  ticket_url?: string
  qr_code?: string
  qr_code_base64?: string
}

export type MercadoPagoOrderTransactionPayment = {
  id: string
  status: string
  status_detail?: string
  amount?: string
  payment_method?: MercadoPagoPaymentMethod
}

export type MercadoPagoOrderResponse = {
  id: string
  type: string
  total_amount: string
  external_reference: string | null
  country_code?: string
  status: string
  status_detail?: string
  transactions?: {
    payments?: MercadoPagoOrderTransactionPayment[]
  }
}

// Webhook notification body for the "order" topic. `data.id` is repeated in
// both the body and the query string (?data.id=...) -- the signature
// manifest uses the query-string value specifically, see webhook-signature.util.ts.
export type MercadoPagoWebhookPayload = {
  action: string
  api_version: string
  application_id: string
  date_created: string
  id: string
  live_mode: boolean
  type: string
  user_id: number
  data: { id: string }
}
