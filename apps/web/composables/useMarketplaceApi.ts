type MarketplaceCurrencyCode = 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT'
type MarketplaceListingStatus = 'PENDING_LOCK' | 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED' | 'FAILED'
type MarketplaceOrderStatus = 'PREPARED' | 'PAID' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'FAILED'
type GameBridgeStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
type GameBridgeOperation = 'LOCK_ITEM' | 'RELEASE_ITEM' | 'TRANSFER_ITEM' | 'DELIVER_ITEM' | 'CREDIT_CURRENCY' | 'SYNC_INVENTORY'

type ApiList<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  facets?: {
    categories: Array<{ value: string, count: number }>
  }
}

export type MarketplaceListResponse = ApiList<MarketplaceListing>

export type MarketplaceListing = {
  id: string
  sellerUsername: string | null
  sellerCharacter: { name: string, className: string } | null
  gameItemRef: string
  itemName: string
  itemCategory: string
  itemData: unknown
  price: number
  currency: MarketplaceCurrencyCode
  status: MarketplaceListingStatus
  lockedAt: string | null
  expiresAt: string | null
  soldAt: string | null
  createdAt: string
  updatedAt: string
  latestOrderId: string | null
}

export type MarketplaceOrder = {
  id: string
  listingId: string
  buyerUsername: string | null
  sellerUsername: string | null
  itemName: string | null
  gameItemRef: string | null
  price: number
  currency: MarketplaceCurrencyCode
  status: MarketplaceOrderStatus
  paidAt: string | null
  deliveredAt: string | null
  createdAt: string
  updatedAt: string
}

export type GameBridgeJob = {
  id: string
  accountUsername: string | null
  listingId: string | null
  orderId: string | null
  operation: GameBridgeOperation
  status: GameBridgeStatus
  idempotencyKey: string
  attempts: number
  payload: unknown
  result: unknown
  error: string | null
  availableAt: string
  processedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateMarketplaceListingPayload = {
  sellerCharacterId?: string | null
  gameItemRef: string
  itemName: string
  itemCategory: string
  itemData: unknown
  price: number
  currency: MarketplaceCurrencyCode
  expiresAt?: string | null
}

const authStorageKey = 'blood-moon-auth'

const readAccessToken = () => {
  if (!import.meta.client) {
    return ''
  }

  try {
    const saved = localStorage.getItem(authStorageKey)
    return saved ? JSON.parse(saved)?.accessToken || '' : ''
  } catch {
    return ''
  }
}

const headers = () => readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}

export const useMarketplaceApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const get = <T>(path: string, query: Record<string, unknown> = {}) =>
    $fetch<T>(`${apiBase.value}${path}`, { query, headers: headers() })

  const send = <T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
    $fetch<T>(`${apiBase.value}${path}`, { method, body, headers: headers() })

  return {
    listListings: (query: Record<string, unknown> = {}) =>
      get<ApiList<MarketplaceListing>>('/marketplace/listings', query),
    createListing: (payload: CreateMarketplaceListingPayload) =>
      send<MarketplaceListing>('POST', '/marketplace/listings', payload),
    cancelListing: (id: string) =>
      send<MarketplaceListing>('DELETE', `/marketplace/listings/${id}`),
    createOrder: (listingId: string) =>
      send<MarketplaceOrder>('POST', '/marketplace/orders', { listingId }),
    listMyListings: () =>
      get<MarketplaceListing[]>('/account/marketplace/listings'),
    listMyOrders: () =>
      get<MarketplaceOrder[]>('/account/marketplace/orders'),
    listAdminListings: (query: Record<string, unknown> = {}) =>
      get<ApiList<MarketplaceListing>>('/admin/marketplace/listings', query),
    activateListing: (id: string) =>
      send<MarketplaceListing>('POST', `/admin/marketplace/listings/${id}/activate`),
    updateListingStatus: (id: string, status: MarketplaceListingStatus, reason = '') =>
      send<MarketplaceListing>('PATCH', `/admin/marketplace/listings/${id}/status`, { status, reason }),
    updateOrderStatus: (id: string, status: MarketplaceOrderStatus, reason = '') =>
      send<MarketplaceOrder>('PATCH', `/admin/marketplace/orders/${id}/status`, { status, reason }),
    listBridgeJobs: (query: Record<string, unknown> = {}) =>
      get<GameBridgeJob[]>('/admin/game-bridge/jobs', query),
    updateBridgeJob: (id: string, status: GameBridgeStatus, result?: unknown, error?: string | null) =>
      send<GameBridgeJob>('PATCH', `/admin/game-bridge/jobs/${id}`, { status, result, error })
  }
}
