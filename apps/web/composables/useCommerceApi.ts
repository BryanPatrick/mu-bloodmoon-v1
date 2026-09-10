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

// PHASE P (2026-08-31) -- antifraud/chargeback/reconciliation admin
// surface. Kept as raw pass-through types (no PT-BR label mapping like
// the recharge/purchase status maps above) since these are new, admin-
// only concepts with no pre-existing player-facing vocabulary to match.
export type PaymentRiskSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type PaymentRiskCaseStatus = 'OPEN' | 'UNDER_REVIEW' | 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED'
export type PaymentRiskAction = 'MANUAL_REVIEW' | 'PAYMENT_RESTRICTION' | 'TRANSFER_RESTRICTION' | 'ACCOUNT_RESTRICTION'

export type PaymentRiskSignal = {
  id: string
  signalType: string
  severity: PaymentRiskSeverity
  reason: string
  evidence: Record<string, unknown> | null
  sourceType: string | null
  sourceId: string | null
  detectedAt: string
}

export type PaymentRiskCaseAction = {
  id: string
  action: PaymentRiskAction
  reason: string
  performedByUsername: string
  performedAt: string
  liftedAt: string | null
}

export type PaymentRiskCase = {
  id: string
  accountId: string | null
  username: string | null
  status: PaymentRiskCaseStatus
  highestSeverity: PaymentRiskSeverity
  summary: string
  reviewNotes: string | null
  resolution: string | null
  openedAt: string
  resolvedAt: string | null
  signals: PaymentRiskSignal[]
  actions: PaymentRiskCaseAction[]
}

export type ChargebackCaseStatus = 'OPEN' | 'UNDER_REVIEW' | 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED'

export type ChargebackCase = {
  id: string
  rechargeIntentId: string
  accountId: string | null
  username: string | null
  provider: string
  externalOrderId: string | null
  currency: ApiCurrencyCode
  originalAmountCredited: number
  accountBalanceAtCaseOpen: number | null
  dispersalTraceSnapshot: { originAccountId: string | null; involvedAccountIds: string[]; dispersalChain: Array<{ hop: number, fromAccountId: string, toAccountId: string, amount: number, type: string, occurredAt: string }>, truncated: boolean } | null
  providerChargebackReason: string | null
  chargebackDate: string | null
  status: ChargebackCaseStatus
  reviewNotes: string | null
  resolution: string | null
  resolvedAt: string | null
  createdAt: string
  rechargePrice: string
}

export type ReconciliationRow = {
  rechargeIntentId: string
  accountId: string
  issue: 'PAID_WITHOUT_LEDGER_CREDIT' | 'STUCK_NON_TERMINAL'
  status: string
  detail: string
  createdAt: string
}

export type ChargebackDispersalTrace = {
  rechargeIntentId: string
  originAccountId: string | null
  originCurrency: ApiCurrencyCode | null
  originAmount: number | null
  originatedAt: string | null
  dispersalChain: Array<{ hop: number, fromAccountId: string, toAccountId: string, ledgerEntryId: string, amount: number, type: string, occurredAt: string }>
  involvedAccountIds: string[]
  truncated: boolean
}

const currencyFromApi: Record<ApiCurrencyCode, CurrencyCode> = {
  WCOIN: 'WCoin',
  GOBLIN_POINT: 'Blood Coin',
  HUNT_POINT: 'Hunt Point'
}

const currencyToApi: Record<CurrencyCode, ApiCurrencyCode> = {
  WCoin: 'WCOIN',
  'Blood Coin': 'GOBLIN_POINT',
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

const headers = (): Record<string, string> => readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}

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
    $fetch<T>(`${apiBase.value}${path}`, { method, body: body as Record<string, any> | BodyInit | null | undefined, headers: headers() })

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
      send('PATCH', `/admin/finance/recharges/${id}/status`, { status: rechargeStatusToApi[status], reason }),

    // PHASE P (2026-08-31) additions below --

    getChargebackTrace: (id: string) => get<ChargebackDispersalTrace>(`/admin/finance/recharges/${id}/chargeback-trace`),
    getReconciliationReport: () => get<ReconciliationRow[]>('/admin/finance/reconciliation'),
    triggerProviderPoll: () => send<{ enabled: boolean, candidates: number, polled: number, failed: number }>('POST', '/admin/finance/reconciliation/provider-poll'),

    listRiskCases: (query: { status?: string, page?: string } = {}) => get<ApiList<PaymentRiskCase>>('/admin/finance/risk-cases', query),
    getRiskCase: (id: string) => get<PaymentRiskCase>(`/admin/finance/risk-cases/${id}`),
    applyRiskAction: (id: string, action: PaymentRiskAction, reason: string) => send<PaymentRiskCaseAction>('POST', `/admin/finance/risk-cases/${id}/actions`, { action, reason }),
    liftRiskAction: (actionId: string) => send('POST', `/admin/finance/risk-cases/actions/${actionId}/lift`),
    resolveRiskCase: (id: string, status: 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED', resolution: string) => send<PaymentRiskCase>('POST', `/admin/finance/risk-cases/${id}/resolve`, { status, resolution }),

    listChargebackCases: (query: { status?: string, page?: string } = {}) => get<ApiList<ChargebackCase>>('/admin/finance/chargeback-cases', query),
    getChargebackCase: (id: string) => get<ChargebackCase>(`/admin/finance/chargeback-cases/${id}`),
    updateChargebackCaseNotes: (id: string, reviewNotes: string) => send('PATCH', `/admin/finance/chargeback-cases/${id}/notes`, { reviewNotes }),
    resolveChargebackCase: (id: string, status: 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED', resolution: string) => send<ChargebackCase>('POST', `/admin/finance/chargeback-cases/${id}/resolve`, { status, resolution })
  }
}
