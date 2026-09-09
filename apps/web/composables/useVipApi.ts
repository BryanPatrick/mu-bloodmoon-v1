// PHASE Q (2026-08-31), Part 3/15 -- client for the VIP catalog/purchase/
// history endpoints. Mirrors useCommerceApi.ts's own fetch/header pattern
// exactly (this project has no shared HTTP client, every composable
// re-implements the same small wrapper).
export type VipTier = 'BRONZE' | 'SILVER' | 'GOLD'

export type VipCatalogItem = {
  id: string
  tier: VipTier
  durationDays: number
  price: number
  currency: 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT'
  enabled: boolean
}

export type VipBenefit = { key: string, label: string, value: number }
export type VipTierBenefits = { tier: VipTier, benefits: VipBenefit[] }

export type VipEntitlement = {
  accountId: string
  tier: VipTier | null
  activatedAt: string | null
  expiresAt: string | null
  totalDaysGranted: number
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE'
  isActiveNow: boolean
}

export type VipHistoryRow = {
  id: string
  tier: VipTier
  durationDays: number
  price: number | null
  currency: string
  grantedAt: string
  newExpiresAt: string
  paymentStatus: 'PAID'
  deliveryStatus: 'ACTIVE' | 'EXPIRED'
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

export const useVipApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const get = <T>(path: string) => $fetch<T>(`${apiBase.value}${path}`, { headers: headers() })
  const send = <T>(method: 'POST', path: string, body?: unknown) => $fetch<T>(`${apiBase.value}${path}`, { method, body: body as Record<string, any> | BodyInit | null | undefined, headers: headers() })

  return {
    listCatalog: () => get<VipCatalogItem[]>('/vip/catalog'),
    listBenefits: () => get<VipTierBenefits[]>('/vip/benefits'),
    getMyEntitlement: () => get<VipEntitlement>('/account/vip'),
    listMyHistory: () => get<VipHistoryRow[]>('/account/vip/history'),
    purchase: (tier: VipTier, durationDays: number, idempotencyKey?: string) =>
      send<VipEntitlement>('POST', '/account/vip/purchase', { tier, durationDays, idempotencyKey })
  }
}
