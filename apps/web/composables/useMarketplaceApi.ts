type MarketplaceCurrencyCode = 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT'
export type MarketplaceListingStatus =
  | 'DRAFT' | 'ESCROW_PENDING' | 'ACTIVE' | 'RESERVED' | 'SOLD' | 'CANCELED'
  | 'EXPIRED' | 'SUSPENDED' | 'RETURN_PENDING' | 'RETURNED' | 'MANUAL_REVIEW' | 'FAILED'
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
  fee: number
  sellerAmount: number
  currency: MarketplaceCurrencyCode
  status: MarketplaceOrderStatus
  correlationId: string | null
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

export type MarketplaceAdminPage<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type MarketplaceDashboard = {
  activeListings: number
  createdToday: number
  soldListings: number
  expiredListings: number
  suspendedListings: number
  transactionsInProgress: number
  escrowHeld: number
  returnFailures: number
  pendingReports: number
  suspendedUsers: number
  criticalErrors: number
  assignedTasks: number
  financial?: { volume: number, fees: number, averagePrice: number, completedSales: number }
}

export type MarketplaceEscrow = {
  id: string
  gameItemRef: string
  itemSerial: string | null
  originalOwnerId: string
  buyerAccountId: string | null
  status: string
  location: string
  internalHash: string
  attempts: number
  lastError: string | null
  enteredAt: string | null
  exitedAt: string | null
  listing: MarketplaceListing & {
    seller?: { id: string, username: string }
    orders?: Array<MarketplaceOrder & { buyer?: { id: string, username: string } }>
  }
}

export type MarketplaceReport = {
  id: string
  reason: string
  description: string
  status: string
  assignedTo: string | null
  reportedUserId: string | null
  resolution: string | null
  createdAt: string
  reporter: { id: string, username: string }
  listing: { id: string, itemName: string, status: string } | null
}

export type MarketplaceTask = {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  assigneeId: string | null
  dueAt: string | null
  listing?: { id: string, itemName: string } | null
}

export type MarketplaceEconomy = {
  publicationFee: number
  saleFeePercent: number
  listingDurationHours: number
  maxListings: number
  vipDiscountPercent: number
  acceptedCurrencies: MarketplaceCurrencyCode[]
  minimumPrice: number
  maximumPrice: number
  cooldownMinutes: number
  allowedCategories: string[] | null
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
    createReport: (payload: { listingId?: string, orderId?: string, reason: string, description: string, evidence?: unknown }) =>
      send<MarketplaceReport>('POST', '/marketplace/reports', payload),
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
      send<GameBridgeJob>('PATCH', `/admin/game-bridge/jobs/${id}`, { status, result, error }),
    adminDashboard: () =>
      get<MarketplaceDashboard>('/admin/marketplace/dashboard'),
    adminManageListings: (query: Record<string, unknown> = {}) =>
      get<MarketplaceAdminPage<MarketplaceListing>>('/admin/marketplace/manage/listings', query),
    adminListingAction: (id: string, action: string, reason: string, notes = '') =>
      send<MarketplaceListing>('POST', `/admin/marketplace/listings/${id}/actions`, { action, reason, notes }),
    adminListingBulkAction: (ids: string[], action: string, reason: string) =>
      send<{ total: number, succeeded: number, failed: number }>(
        'POST',
        '/admin/marketplace/listings/bulk-actions',
        { ids, action, reason }
      ),
    adminExportListings: (query: Record<string, unknown> = {}) =>
      get<{ exportedAt: string, total: number, truncated: boolean, rows: unknown[] }>(
        '/admin/marketplace/listings/export',
        query
      ),
    adminTransactions: (query: Record<string, unknown> = {}) =>
      get<MarketplaceAdminPage<MarketplaceOrder>>('/admin/marketplace/transactions', query),
    adminTransactionAction: (id: string, action: string, reason: string) =>
      send<unknown>('POST', `/admin/marketplace/transactions/${id}/actions`, { action, reason }),
    adminEscrow: (query: Record<string, unknown> = {}) =>
      get<MarketplaceAdminPage<MarketplaceEscrow>>('/admin/marketplace/escrow', query),
    adminEscrowAction: (id: string, action: string, reason: string) =>
      send<MarketplaceEscrow>('POST', `/admin/marketplace/escrow/${id}/actions`, { action, reason }),
    adminReports: (query: Record<string, unknown> = {}) =>
      get<MarketplaceAdminPage<MarketplaceReport>>('/admin/marketplace/reports', query),
    adminUpdateReport: (id: string, payload: Record<string, unknown>) =>
      send<MarketplaceReport>('PATCH', `/admin/marketplace/reports/${id}`, payload),
    adminSuspendReportedUser: (id: string, reason: string) =>
      send<unknown>('POST', `/admin/marketplace/reports/${id}/suspend-user`, { reason }),
    adminTasks: (query: Record<string, unknown> = {}) =>
      get<MarketplaceAdminPage<MarketplaceTask>>('/admin/marketplace/tasks', query),
    adminCreateTask: (payload: Record<string, unknown>) =>
      send<MarketplaceTask>('POST', '/admin/marketplace/tasks', payload),
    adminUpdateTask: (id: string, payload: Record<string, unknown>) =>
      send<MarketplaceTask>('PATCH', `/admin/marketplace/tasks/${id}`, payload),
    adminEconomy: () =>
      get<MarketplaceEconomy>('/admin/marketplace/economy'),
    adminUpdateEconomy: (payload: MarketplaceEconomy & { reason: string }) =>
      send<MarketplaceEconomy>('PATCH', '/admin/marketplace/economy', payload),
    adminAnalytics: () =>
      get<Record<string, unknown>>('/admin/marketplace/analytics')
  }
}
