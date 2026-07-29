export type StoreProductStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ARCHIVED'
  | 'BLOCKED'

export type StoreCurrency = 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT'
export type StoreDeliveryTarget = 'ACCOUNT' | 'CHARACTER' | 'INVENTORY' | 'VAULT' | 'MAIL'

export type StoreVariant = {
  id: string
  productId: string
  name: string
  sku: string
  durationSeconds: number | null
  quantity: number
  itemLevel: number | null
  options: unknown
  price: number
  currency: StoreCurrency
  stock: number | null
  available: boolean
  accountLimit: number | null
  periodLimit: number | null
  periodDays: number | null
  deliveryTarget: StoreDeliveryTarget | null
  sortOrder: number
}

export type StoreProduct = {
  id: string
  key?: string
  slug: string
  name: string
  short: string
  category: string
  categoryId: string | null
  summary: string | null
  description: string
  price: number
  currency: StoreCurrency
  status: StoreProductStatus
  stock: number | null
  images: string[]
  featured: boolean
  deliveryTarget: StoreDeliveryTarget
  accountLimit: number | null
  periodLimit: number | null
  periodDays: number | null
  saleStartsAt: string | null
  saleEndsAt: string | null
  scheduledPublishAt?: string | null
  technicalCode?: string | null
  sourceOrigin?: string | null
  ambiguous?: boolean
  internalNotes?: string | null
  revisionReason?: string | null
  version?: number
  sortOrder?: number
  variants: StoreVariant[]
}

export type StoreCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  sortOrder: number
  active: boolean
  archivedAt: string | null
  deletedAt: string | null
}

export type StoreList<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type StoreOrder = {
  id: string
  status: string
  price: number
  currency: StoreCurrency
  quantity: number
  correlationId: string
  createdAt: string
  account: { id: string, username: string }
  product: StoreProduct
  variant: StoreVariant | null
  deliveries: StoreDelivery[]
  notes: Array<{ id: string, authorName: string, content: string, createdAt: string }>
}

export type StoreDelivery = {
  id: string
  status: string
  target: StoreDeliveryTarget
  accountId: string
  characterId: string | null
  itemCode: string | null
  itemName: string
  quantity: number
  attempts: number
  maxAttempts: number
  lastError: string | null
  correlationId: string
  createdAt: string
}

const authStorageKey = 'blood-moon-auth'

const accessHeaders = () => {
  if (!import.meta.client) return {}
  try {
    const saved = localStorage.getItem(authStorageKey)
    const token = saved ? JSON.parse(saved)?.accessToken : ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export const useStoreApi = () => {
  const config = useRuntimeConfig()
  const base = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))
  const get = <T>(url: string, query: Record<string, unknown> = {}) =>
    $fetch<T>(`${base.value}${url}`, { query, headers: accessHeaders() })
  const send = <T>(method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: unknown) =>
    $fetch<T>(`${base.value}${url}`, { method, body, headers: accessHeaders() })

  return {
    publicProducts: (query: Record<string, unknown> = {}) => get<StoreList<StoreProduct>>('/shop/products', query),
    publicCategories: () => get<StoreCategory[]>('/shop/categories'),
    publicProduct: (slug: string) => get<StoreProduct>(`/shop/products/${slug}`),
    purchase: (body: { productId: string, variantId?: string, quantity?: number, destinationCharacterId?: string }) =>
      send<StoreOrder>('POST', '/shop/purchases', body),

    dashboard: (query: Record<string, unknown> = {}) => get<Record<string, any>>('/admin/store/dashboard', query),
    categories: (query: Record<string, unknown> = {}) => get<StoreCategory[]>('/admin/store/categories', query),
    createCategory: (body: Record<string, unknown>) => send<StoreCategory>('POST', '/admin/store/categories', body),
    updateCategory: (id: string, body: Record<string, unknown>) => send<StoreCategory>('PATCH', `/admin/store/categories/${id}`, body),
    categoryAction: (id: string, action: 'archive' | 'restore' | 'delete', reason?: string) =>
      send<StoreCategory>('POST', `/admin/store/categories/${id}/${action}`, { reason }),

    products: (query: Record<string, unknown> = {}) => get<StoreList<StoreProduct>>('/admin/shop/products', query),
    exportProducts: (query: Record<string, unknown> = {}) => get<{ filename: string, contentType: string, content: string }>('/admin/store/products-export', query),
    bulkProducts: (body: Record<string, unknown>) => send<{ requested: number, succeeded: number, failed: number, results: unknown[] }>('POST', '/admin/store/products-bulk', body),
    product: (id: string) => get<StoreProduct>(`/admin/store/products/${id}`),
    productHistory: (id: string) => get<unknown[]>(`/admin/store/products/${id}/history`),
    createProduct: (body: Record<string, unknown>) => send<StoreProduct>('POST', '/admin/shop/products', body),
    updateProduct: (id: string, body: Record<string, unknown>) => send<StoreProduct>('PATCH', `/admin/shop/products/${id}`, body),
    duplicateProduct: (id: string) => send<StoreProduct>('POST', `/admin/store/products/${id}/duplicate`),
    transitionProduct: (id: string, body: Record<string, unknown>) => send<StoreProduct>('POST', `/admin/store/products/${id}/transition`, body),
    reorderProducts: (ids: string[]) => send<{ updated: number }>('POST', '/admin/store/products/reorder', { ids }),
    importCatalog: (body: { limit?: number, dryRun?: boolean }) => send<Record<string, number | boolean>>('POST', '/admin/store/catalog/import', body),

    createVariant: (productId: string, body: Record<string, unknown>) => send<StoreVariant>('POST', `/admin/store/products/${productId}/variants`, body),
    updateVariant: (id: string, body: Record<string, unknown>) => send<StoreVariant>('PATCH', `/admin/store/variants/${id}`, body),
    deleteVariant: (id: string) => send<StoreVariant>('DELETE', `/admin/store/variants/${id}`),

    orders: (query: Record<string, unknown> = {}) => get<StoreList<StoreOrder>>('/admin/store/orders', query),
    order: (id: string) => get<StoreOrder & { timeline: unknown[] }>(`/admin/store/orders/${id}`),
    orderAction: (id: string, body: Record<string, unknown>) => send<unknown>('POST', `/admin/store/orders/${id}/action`, body),
    addOrderNote: (id: string, body: Record<string, unknown>) => send<unknown>('POST', `/admin/store/orders/${id}/notes`, body),

    deliveries: (query: Record<string, unknown> = {}) => get<StoreList<StoreDelivery>>('/admin/store/deliveries', query),
    deliveryAction: (id: string, body: Record<string, unknown>) => send<StoreDelivery>('POST', `/admin/store/deliveries/${id}/action`, body),
    reports: (query: Record<string, unknown> = {}) => get<Record<string, any>>('/admin/store/reports', query),
    testProduct: (body: Record<string, unknown>) => send<unknown>('POST', '/admin/store/tests', body)
  }
}
