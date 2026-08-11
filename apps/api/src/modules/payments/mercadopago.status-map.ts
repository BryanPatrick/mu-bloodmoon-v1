import type { RechargeIntentStatus } from '@prisma/client'

export type MappedOrderStatus = {
  status: RechargeIntentStatus
  failureReason?: string
}

// Confirmed against Mercado Pago's Orders API status documentation
// (checkout-api-v2/payment-management/status/order-status). "processed" +
// "accredited" is the only status/status_detail pair that should ever
// trigger a currency credit -- see CommerceService.applyPaymentStatusFromWebhook.
export function mapMercadoPagoOrderStatus(status: string, statusDetail?: string): MappedOrderStatus {
  switch (status) {
    case 'created':
      return { status: 'PENDING' }
    case 'processing':
      return { status: 'PROCESSING' }
    case 'action_required':
      // waiting_payment / waiting_transfer / waiting_capture -- still
      // waiting on the player, not an error.
      return { status: 'PENDING' }
    case 'processed':
      return { status: 'PAID' }
    case 'failed':
      return { status: 'FAILED', failureReason: statusDetail || 'failed' }
    case 'expired':
      return { status: 'FAILED', failureReason: 'expired' }
    case 'canceled':
      return { status: 'CANCELLED' }
    case 'refunded':
      return { status: 'REFUNDED' }
    case 'charged_back':
      // Chargebacks are out of scope for automated handling in this etapa --
      // always route to a human, never auto-anything.
      return { status: 'MANUAL_REVIEW', failureReason: `charged_back:${statusDetail || 'unknown'}` }
    default:
      return { status: 'MANUAL_REVIEW', failureReason: `unrecognized_status:${status}` }
  }
}
