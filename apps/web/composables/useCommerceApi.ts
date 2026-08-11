import type { CurrencyCode, RechargePack, ShopProduct } from '~/data/management'

type ApiCurrencyCode = 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT'
type ApiProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
type ApiPurchaseStatus = 'PREPARED' | 'COMPLETED' | 'CANCELLED'
type ApiRechargeStatus =
  | 'PREPARED'
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'MANUAL_REVIEW'
  | 'REFUND_PENDING'
  | 'REFUNDED'

type ApiList<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type ApiProduct = {
  id: string
  key: string
  name: string
  short: string
  category: string
  description: string
  price: number
  currency: ApiCurrencyCode
  status: ApiProductStatus
  stock: number | null
}

type ApiRechargePackage = {
  id: string
  key: string
  currency: ApiCurrencyCode
  amount: number
  bonus: number
  price: string
  highlight: boolean
  active: boolean
}

export type CommercePurchase = {
  id: string
  username: string
  productId: string
  productName: string
  price: number
  currency: CurrencyCode
  status: 'Preparada' | 'Concluida' | 'Cancelada'
  createdAt: string
}

export type CommerceRechargeStatus =
  | 'Preparada'
  | 'Aguardando pagamento'
  | 'Processando'
  | 'Paga'
  | 'Falhou'
  | 'Cancelada'
  | 'Em analise'
  | 'Estorno em andamento'
  | 'Estornada'

export type CommerceRecharge = {
  id: string
  username: string
  packageId: string
  currency: CurrencyCode
  amount: number
  bonus: number
  price: string
  status: CommerceRechargeStatus
  createdAt: string
}

export type RechargeCheckout = {
  id: string
  status: CommerceRechargeStatus
  externalOrderId: string
  paymentMethod?: string
  qrCode?: string
  qrCodeBase64?: string
  ticketUrl?: string
}

export type RechargeDetail = CommerceRecharge & {
  provider: string
  correlationId: string | null
  externalReference: string | null
  externalOrderId: string | null
  externalStatus: string | null
  externalStatusDetail: string | null
  paymentMethod: string | null
  failureReason: string | null
  manualReviewReason: string | null
  refundReason: string | null
  approvedAt: string | null
  refundedAt: string | null
  lastWebhookAt: string | null
  timeline: Array<{
    id: string
    topic: string
    status: string
    signatureValid: boolean
    receivedAt: string
    processedAt: string | null
    processingError: string | null
  }>
}

const currencyFromApi: Record<ApiCurrencyCode, CurrencyCode> = {
  WCOIN: 'WCoin',
  GOBLIN_POINT: 'Goblin Point',
  HUNT_POINT: 'Hunt Point'
}

const currencyToApi: Record<CurrencyCode, ApiCurrencyCode> = {
  WCoin: 'WCOIN',
  'Goblin Point': 'GOBLIN_POINT',
  'Hunt Point': 'HUNT_POINT'
}

const productStatusFromApi: Record<ApiProductStatus, ShopProduct['status']> = {
  ACTIVE: 'Ativo',
  DRAFT: 'Rascunho',
  ARCHIVED: 'Rascunho'
}

const productStatusToApi: Record<ShopProduct['status'], ApiProductStatus> = {
  Ativo: 'ACTIVE',
  Rascunho: 'DRAFT'
}

const purchaseStatusFromApi: Record<ApiPurchaseStatus, CommercePurchase['status']> = {
  PREPARED: 'Preparada',
  COMPLETED: 'Concluida',
  CANCELLED: 'Cancelada'
}

const purchaseStatusToApi: Record<CommercePurchase['status'], ApiPurchaseStatus> = {
  Preparada: 'PREPARED',
  Concluida: 'COMPLETED',
  Cancelada: 'CANCELLED'
}

const rechargeStatusFromApi: Record<ApiRechargeStatus, CommerceRechargeStatus> = {
  PREPARED: 'Preparada',
  PENDING: 'Aguardando pagamento',
  PROCESSING: 'Processando',
  PAID: 'Paga',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada',
  MANUAL_REVIEW: 'Em analise',
  REFUND_PENDING: 'Estorno em andamento',
  REFUNDED: 'Estornada'
}

const rechargeStatusToApi: Record<CommerceRechargeStatus, ApiRechargeStatus> = {
  Preparada: 'PREPARED',
  'Aguardando pagamento': 'PENDING',
  Processando: 'PROCESSING',
  Paga: 'PAID',
  Falhou: 'FAILED',
  Cancelada: 'CANCELLED',
  'Em analise': 'MANUAL_REVIEW',
  'Estorno em andamento': 'REFUND_PENDING',
  Estornada: 'REFUNDED'
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

const mapProduct = (product: ApiProduct): ShopProduct => ({
  id: product.id,
  name: product.name,
  short: product.short,
  category: product.category,
  description: product.description,
  price: product.price,
  currency: currencyFromApi[product.currency],
  status: productStatusFromApi[product.status],
  stock: product.stock ?? 'Ilimitado'
})

const mapRechargePackage = (pack: ApiRechargePackage): RechargePack => ({
  id: pack.id,
  currency: currencyFromApi[pack.currency],
  amount: pack.amount,
  bonus: pack.bonus,
  price: pack.price,
  highlight: pack.highlight
})

const productPayload = (product: ShopProduct) => ({
  name: product.name,
  short: product.short,
  category: product.category,
  description: product.description,
  price: product.price,
  currency: currencyToApi[product.currency],
  status: productStatusToApi[product.status],
  stock: product.stock === 'Ilimitado' ? null : product.stock
})

const rechargePackagePayload = (pack: RechargePack) => ({
  currency: currencyToApi[pack.currency],
  amount: pack.amount,
  bonus: pack.bonus,
  price: pack.price,
  highlight: Boolean(pack.highlight),
  active: true
})

export const useCommerceApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const get = <T>(path: string, query: Record<string, unknown> = {}) =>
    $fetch<T>(`${apiBase.value}${path}`, { query, headers: headers() })

  const send = <T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
    $fetch<T>(`${apiBase.value}${path}`, { method, body, headers: headers() })

  return {
    listProducts: async (admin = false) => {
      const response = await get<ApiList<ApiProduct>>(admin ? '/admin/shop/products' : '/shop/products', { pageSize: 100 })
      return { ...response, data: response.data.map(mapProduct) }
    },
    createProduct: async (product: ShopProduct) => mapProduct(await send<ApiProduct>('POST', '/admin/shop/products', productPayload(product))),
    updateProduct: async (id: string, product: ShopProduct) => mapProduct(await send<ApiProduct>('PATCH', `/admin/shop/products/${id}`, productPayload(product))),
    deleteProduct: async (id: string) => mapProduct(await send<ApiProduct>('DELETE', `/admin/shop/products/${id}`)),
    listRechargePackages: async (admin = false) => {
      const response = await get<ApiList<ApiRechargePackage>>(admin ? '/admin/recharge/packages' : '/recharge/packages', { pageSize: 100 })
      return { ...response, data: response.data.map(mapRechargePackage) }
    },
    createRechargePackage: async (pack: RechargePack) => mapRechargePackage(await send<ApiRechargePackage>('POST', '/admin/recharge/packages', rechargePackagePayload(pack))),
    updateRechargePackage: async (id: string, pack: RechargePack) => mapRechargePackage(await send<ApiRechargePackage>('PATCH', `/admin/recharge/packages/${id}`, rechargePackagePayload(pack))),
    deleteRechargePackage: async (id: string) => mapRechargePackage(await send<ApiRechargePackage>('DELETE', `/admin/recharge/packages/${id}`)),
    createPurchaseIntent: (productId: string) => send<CommercePurchase>('POST', '/shop/purchases', { productId }),
    createRechargeIntent: (packageId: string) => send<CommerceRecharge>('POST', '/recharge/intents', { packageId }),
    createRechargeCheckout: async (id: string) => {
      const result = await send<Omit<RechargeCheckout, 'status'> & { status: ApiRechargeStatus }>(
        'POST',
        `/recharge/intents/${id}/checkout`
      )
      return { ...result, status: rechargeStatusFromApi[result.status] }
    },
    getRechargeStatus: async (id: string) => {
      const row = await get<Omit<CommerceRecharge, 'currency' | 'status'> & { currency: ApiCurrencyCode, status: ApiRechargeStatus }>(
        `/recharge/intents/${id}`
      )
      return { ...row, currency: currencyFromApi[row.currency], status: rechargeStatusFromApi[row.status] }
    },
    getRechargeDetail: async (id: string) => {
      const row = await get<Omit<RechargeDetail, 'currency' | 'status'> & { currency: ApiCurrencyCode, status: ApiRechargeStatus }>(
        `/admin/finance/recharges/${id}`
      )
      return { ...row, currency: currencyFromApi[row.currency], status: rechargeStatusFromApi[row.status] }
    },
    resyncRecharge: (id: string) => send('POST', `/admin/finance/recharges/${id}/resync`),
    listAccountPurchases: async () => {
      const rows = await get<Array<Omit<CommercePurchase, 'currency' | 'status'> & { currency: ApiCurrencyCode, status: ApiPurchaseStatus }>>('/account/purchases')
      return rows.map((row) => ({ ...row, currency: currencyFromApi[row.currency], status: purchaseStatusFromApi[row.status] }))
    },
    listAccountRecharges: async () => {
      const rows = await get<Array<Omit<CommerceRecharge, 'currency' | 'status'> & { currency: ApiCurrencyCode, status: ApiRechargeStatus }>>('/account/recharges')
      return rows.map((row) => ({ ...row, currency: currencyFromApi[row.currency], status: rechargeStatusFromApi[row.status] }))
    },
    listOperationalOrders: async () => {
      const result = await get<{
        purchases: Array<Omit<CommercePurchase, 'currency' | 'status'> & { currency: ApiCurrencyCode, status: ApiPurchaseStatus }>,
        recharges: Array<Omit<CommerceRecharge, 'currency' | 'status'> & { currency: ApiCurrencyCode, status: ApiRechargeStatus }>
      }>('/admin/shop/orders')
      return {
        purchases: result.purchases.map((row) => ({ ...row, currency: currencyFromApi[row.currency], status: purchaseStatusFromApi[row.status] })),
        recharges: result.recharges.map((row) => ({ ...row, currency: currencyFromApi[row.currency], status: rechargeStatusFromApi[row.status] }))
      }
    },
    listPurchases: async () => {
      const rows = await get<Array<Omit<CommercePurchase, 'currency' | 'status'> & { currency: ApiCurrencyCode, status: ApiPurchaseStatus }>>('/admin/finance/purchases')
      return rows.map((row) => ({ ...row, currency: currencyFromApi[row.currency], status: purchaseStatusFromApi[row.status] }))
    },
    listRecharges: async () => {
      const rows = await get<Array<Omit<CommerceRecharge, 'currency' | 'status'> & { currency: ApiCurrencyCode, status: ApiRechargeStatus }>>('/admin/finance/recharges')
      return rows.map((row) => ({ ...row, currency: currencyFromApi[row.currency], status: rechargeStatusFromApi[row.status] }))
    },
    updatePurchaseStatus: (id: string, status: CommercePurchase['status']) =>
      send('PATCH', `/admin/finance/purchases/${id}/status`, { status: purchaseStatusToApi[status] }),
    updateRechargeStatus: (id: string, status: CommerceRechargeStatus, reason?: string) =>
      send('PATCH', `/admin/finance/recharges/${id}/status`, { status: rechargeStatusToApi[status], reason })
  }
}
