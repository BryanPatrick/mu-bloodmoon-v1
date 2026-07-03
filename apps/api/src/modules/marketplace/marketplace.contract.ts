import type { CurrencyCode, GameBridgeStatus, MarketplaceListingStatus, MarketplaceOrderStatus } from '@prisma/client'

export type MarketplaceQuery = {
  page?: string
  pageSize?: string
  search?: string
  currency?: CurrencyCode
  status?: MarketplaceListingStatus
  seller?: string
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
