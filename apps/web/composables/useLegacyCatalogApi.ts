// PHASE S/T (2026-09-02) -- admin client for the X-Shop/CashShop legacy
// catalog desired-state layer (legacy-catalog-config.service.ts /
// legacy-catalog-effective-state.service.ts on the API side). Mirrors
// useWalletTransferApi.ts/useVipApi.ts's own fetch/header pattern
// exactly.
export type LegacyCatalogChannel = 'XSHOP' | 'CASHSHOP'
export type LegacyCommercialDecision =
  | 'NOT_FOR_COMMERCIAL_SALE'
  | 'BALANCE_TEST_REQUIRED'
  | 'DEAD_UNRESOLVABLE_CATALOG_ROW'
  | 'RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST'
  | 'GREEN_CANDIDATE_NOT_APPROVED'
export type LegacyCatalogCommercialStatus = 'REVIEW_REQUIRED' | 'BLOCKED' | 'APPROVED' | 'PUBLISHED' | 'DISABLED' | 'RETIRED'
export type LegacyCatalogDriftStatus = 'NOT_CHECKED' | 'IN_SYNC' | 'DRIFT_DETECTED' | 'CHECK_FAILED' | 'NOT_MANAGED'
export type LegacyCatalogBulkAction = 'mark-blocked' | 'mark-review-required' | 'hide' | 'set-open-beta-allowed' | 'set-open-beta-disallowed' | 'set-full-release-allowed' | 'set-full-release-disallowed'

export type LegacyCatalogItem = {
  id: string
  channel: LegacyCatalogChannel
  legacyKey: string
  itemName: string
  technicalIdentifiers: Record<string, unknown>
  bryanDecision: LegacyCommercialDecision
  commercialStatus: LegacyCatalogCommercialStatus
  visible: boolean
  purchasable: boolean
  desiredEnabled: boolean
  priceDesired: number | null
  currencyDesired: 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT' | null
  durationDesiredDays: number | null
  availableFrom: string | null
  availableUntil: string | null
  openBetaAllowed: boolean
  fullReleaseAllowed: boolean
  purchaseLimitDesired: number | null
  internalNotes: string | null
  blockReason: string | null
  linkedShopProductId: string | null
  driftStatus: LegacyCatalogDriftStatus
  effectiveEnabled: boolean | null
  effectivePrice: number | null
  effectiveCurrency: string | null
  effectiveDurationSeconds: number | null
  effectiveOptions: Record<string, unknown> | null
  sourceLastReadAt: string | null
  sourceFingerprint: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export type LegacyCatalogSummaryRow = { channel: LegacyCatalogChannel, bryanDecision: LegacyCommercialDecision, commercialStatus: LegacyCatalogCommercialStatus, count: number }

export type LegacyCatalogUpdatePayload = Partial<{
  commercialStatus: LegacyCatalogCommercialStatus
  visible: boolean
  purchasable: boolean
  desiredEnabled: boolean
  priceDesired: number | null
  currencyDesired: 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT' | null
  durationDesiredDays: number | null
  availableFrom: string | null
  availableUntil: string | null
  openBetaAllowed: boolean
  fullReleaseAllowed: boolean
  purchaseLimitDesired: number | null
  internalNotes: string | null
  blockReason: string | null
  reason: string
}>

export type LegacyCatalogListQuery = Partial<{
  channel: LegacyCatalogChannel
  commercialStatus: LegacyCatalogCommercialStatus
  bryanDecision: LegacyCommercialDecision
  desiredEnabled: boolean
  effectiveEnabled: boolean
  currencyDesired: 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT'
  openBetaAllowed: boolean
  fullReleaseAllowed: boolean
  driftStatus: LegacyCatalogDriftStatus
  search: string
  page: number
  pageSize: number
}>

export type LegacyCatalogHistoryEntry = {
  id: string
  action: string
  actorUsername: string | null
  reason: string | null
  beforeData: unknown
  afterData: unknown
  createdAt: string
}

const authStorageKey = 'blood-moon-auth'

const readAccessToken = () => {
  if (!import.meta.client) return ''
  try {
    const saved = localStorage.getItem(authStorageKey)
    return saved ? JSON.parse(saved)?.accessToken || '' : ''
  } catch {
    return ''
  }
}

const headers = (): Record<string, string> => (readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {})

export const useLegacyCatalogApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const get = <T>(path: string, query: Record<string, unknown> = {}) => $fetch<T>(`${apiBase.value}${path}`, { query, headers: headers() })
  const send = <T>(method: 'POST' | 'PATCH', path: string, body?: unknown) => $fetch<T>(`${apiBase.value}${path}`, { method, body: body as Record<string, any> | BodyInit | null | undefined, headers: headers() })

  return {
    list: (query: LegacyCatalogListQuery = {}) =>
      get<{ items: LegacyCatalogItem[], total: number, page: number, pageSize: number }>('/admin/store/legacy-catalog', query),
    summary: () => get<LegacyCatalogSummaryRow[]>('/admin/store/legacy-catalog/summary'),
    seed: () => send<{ xshop: { created: number, updated: number, total: number }, cashshop: { created: number, updated: number, total: number } }>('POST', '/admin/store/legacy-catalog/seed'),
    update: (id: string, payload: LegacyCatalogUpdatePayload) => send<LegacyCatalogItem>('PATCH', `/admin/store/legacy-catalog/${id}`, payload),
    history: (id: string) => get<LegacyCatalogHistoryEntry[]>(`/admin/store/legacy-catalog/${id}/history`),
    bulkUpdate: (ids: string[], action: LegacyCatalogBulkAction, reason: string) =>
      send<{ affected: number }>('POST', '/admin/store/legacy-catalog/bulk', { ids, action, reason }),
    refreshEffectiveState: () =>
      send<{ updated: number, driftCount: number, inSyncCount: number, unmatched: number, snapshotGeneratedAt: string }>('POST', '/admin/store/legacy-catalog/effective-state/refresh'),
    sync: (channel: LegacyCatalogChannel) => send<never>('POST', `/admin/store/legacy-catalog/${channel}/sync`)
  }
}
