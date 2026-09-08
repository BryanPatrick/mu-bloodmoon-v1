// PHASE Q DECISION CLOSURE (2026-08-31), Decision 2 -- client for direct
// player-to-player WC transfer + history. Mirrors useVipApi.ts's own
// fetch/header pattern exactly (this project has no shared HTTP client,
// every composable re-implements the same small wrapper).
export type WalletTransferResult = {
  transferred: number
  netAmount: number
  feeCollected: number
  recipientUsername: string
}

export type WalletTransferFeeInfo = {
  currency: 'WCOIN'
  taxPercent: number
  minimumAmount: number
}

export type WalletTransferHistoryRow = {
  id: string
  direction: 'SENT' | 'RECEIVED'
  counterpartyUsername: string
  grossAmount: number
  feeAmount: number
  netAmount: number
  currency: string
  occurredAt: string
  status: 'SETTLED'
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

const headers = () => (readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {})

export const useWalletTransferApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const get = <T>(path: string) => $fetch<T>(`${apiBase.value}${path}`, { headers: headers() })
  const send = <T>(method: 'POST', path: string, body?: unknown) => $fetch<T>(`${apiBase.value}${path}`, { method, body, headers: headers() })

  return {
    transfer: (recipientUsername: string, amount: number, idempotencyKey?: string) =>
      send<WalletTransferResult>('POST', '/wallet/transfers', { recipientUsername, amount, idempotencyKey }),
    listMyHistory: () => get<WalletTransferHistoryRow[]>('/wallet/transfers/history'),
    getFeeInfo: () => get<WalletTransferFeeInfo>('/wallet/transfers/fee-info')
  }
}
