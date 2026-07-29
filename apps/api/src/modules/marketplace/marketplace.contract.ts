import type { CurrencyCode, GameBridgeStatus, MarketplaceListingStatus, MarketplaceOrderStatus } from '@prisma/client'

import type {
  MarketplaceEscrowStatus,
  MarketplaceReportStatus,
  MarketplaceTaskStatus
} from '@prisma/client'

export type MarketplaceQuery = {
  page?: string
  pageSize?: string
  search?: string
  category?: string
  currency?: CurrencyCode
  status?: MarketplaceListingStatus
  seller?: string
  sort?: 'newest' | 'oldest' | 'priceAsc' | 'priceDesc'
}

export type CreateMarketplaceListingPayload = {
  sellerCharacterId?: string | null
  gameItemRef: string
  itemName: string
  itemCategory: string
  itemData: unknown
  price: number
  currency: CurrencyCode
  expiresAt?: string | null
}

export type CreateMarketplaceOrderPayload = {
  listingId: string
}

export type UpdateMarketplaceListingStatusPayload = {
  status: MarketplaceListingStatus
  reason?: string
}

export type UpdateMarketplaceOrderStatusPayload = {
  status: MarketplaceOrderStatus
  reason?: string
}

export type UpdateGameBridgeJobPayload = {
  status: GameBridgeStatus
  result?: unknown
  error?: string | null
}

export type MarketplaceAdminQuery = {
  page?: string
  pageSize?: string
  search?: string
  status?: string
  assignee?: string
  type?: string
}

export type MarketplaceAdminActionPayload = {
  action: string
  reason: string
  notes?: string
  assignedTo?: string | null
  evidence?: unknown
}

export type MarketplaceBulkActionPayload = MarketplaceAdminActionPayload & {
  ids: string[]
}

export type MarketplaceEscrowActionPayload = {
  action: 'RETURN_TO_SELLER' | 'SEND_TO_BUYER' | 'REENQUEUE' | 'MANUAL_REVIEW' | 'FREEZE'
  reason: string
}

export type MarketplaceReportPayload = {
  listingId?: string | null
  orderId?: string | null
  reason: string
  description: string
  evidence?: unknown
}

export type MarketplaceReportUpdatePayload = {
  status?: MarketplaceReportStatus
  assignedTo?: string | null
  resolution?: string | null
  decisionReason?: string | null
  action?: 'SUSPEND_LISTING' | 'SUSPEND_USER' | 'RESOLVE' | 'REJECT' | 'ESCALATE'
  reason: string
}

export type MarketplaceTaskPayload = {
  listingId?: string | null
  orderId?: string | null
  reportId?: string | null
  title: string
  description?: string | null
  type: string
  status?: MarketplaceTaskStatus
  priority?: string
  assigneeId?: string | null
  dueAt?: string | null
}

export type MarketplaceEconomyPayload = {
  publicationFee: number
  saleFeePercent: number
  listingDurationHours: number
  maxListings: number
  vipDiscountPercent: number
  acceptedCurrencies: CurrencyCode[]
  minimumPrice: number
  maximumPrice: number
  cooldownMinutes: number
  allowedCategories?: string[] | null
  reason: string
}

export type MarketplaceEscrowFilter = MarketplaceAdminQuery & {
  status?: MarketplaceEscrowStatus
}
