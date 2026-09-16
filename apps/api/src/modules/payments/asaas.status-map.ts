import type { RechargeIntentStatus } from '@prisma/client'

export type AsaasMappedStatus = { status: RechargeIntentStatus; reason?: string }

// Pix CONFIRMED may be precautionarily held; only RECEIVED can credit WC.
// Refund and chargeback always need human review in this phase.
export function mapAsaasPaymentStatus(status: string): AsaasMappedStatus {
  switch (status) {
    case 'PENDING':
    case 'OVERDUE':
      return { status: 'PENDING' }
    case 'CONFIRMED':
      return { status: 'PROCESSING' }
    case 'RECEIVED':
      return { status: 'PAID' }
    case 'REFUND_IN_PROGRESS':
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return { status: 'MANUAL_REVIEW', reason: `charged_back:asaas:${status.toLowerCase()}` }
    case 'DELETED':
      return { status: 'CANCELLED' }
    default:
      return { status: 'MANUAL_REVIEW', reason: 'asaas:unknown_status' }
  }
}
