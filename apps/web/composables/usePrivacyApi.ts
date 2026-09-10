// Privacidade e meus dados -- foundation UI for the backend self-service
// deletion flow (apps/api/src/modules/accounts/account-deletion-request.*)
// and the exit-feedback questionnaire
// (account-deletion.contract.ts#ExitFeedbackPayload). Mirrors
// useAccountSecurityApi.ts's exact fetch/auth-header pattern -- no new
// conventions introduced.

export type ExitFeedbackReasonCode =
  | 'LACK_OF_TIME' | 'PROGRESSION' | 'BALANCING' | 'BUGS' | 'PERFORMANCE_CONNECTION'
  | 'PLAYER_COMMUNITY_ISSUE' | 'STAFF_SUPPORT_ISSUE' | 'SHOP_VIP_ECONOMY'
  | 'ANOTHER_SERVER' | 'ACCOUNT_ISSUE' | 'PRIVACY_SECURITY' | 'OTHER'

// Phase K (2026-08-30) Part 12: mirrors account-deletion.contract.ts's
// ExitRetentionInteraction exactly -- observational, never gates deletion.
export type ExitRetentionInteraction = {
  offered: boolean
  offerCodes: ExitFeedbackReasonCode[]
  helpAccepted: boolean
  ticketCreated: boolean
  continuedAnyway: boolean
}

export type ExitFeedbackPayload = {
  reasons: Array<{ code: ExitFeedbackReasonCode, detail?: string }>
  otherText?: string
  retentionInteraction?: ExitRetentionInteraction
}

// Real backend status values (AccountDeletionRequestStatus, Prisma schema)
// -- never renamed client-side, per the instruction to use existing
// backend names rather than inventing new ones.
export type DeletionRequestStatus = 'NONE' | 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'EXECUTED'

export type DeletionStatusResponse = {
  status: DeletionRequestStatus
  requestedAt?: string
  scheduledExecutionAt?: string | null
}

export type ExportedAccountData = {
  exportedAt: string
  account: { username: string, name: string, email: string, createdAt: string, accountPhase: string }
  characters: Array<{ name: string, className: string, level: number, reset: number, masterReset: number }>
  walletLedgerEntries: Array<{ type: string, currency: string, grossAmount: number, taxAmount: number, netAmount: number, status: string, createdAt: string }>
  vipEntitlement: { tier: string | null, activatedAt: string | null, expiresAt: string | null, totalDaysGranted: number, status: string } | null
  recharges: Array<{ amount: number, bonus: number, price: number, currency: string, status: string, createdAt: string }>
  purchases: Array<{ status: string, createdAt: string }>
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

const authHeaders = (): Record<string, string> => readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}

export const usePrivacyApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  return {
    status: () =>
      $fetch<DeletionStatusResponse>(`${apiBase.value}/account/deletion/status`, { headers: authHeaders() }),
    exportMyData: () =>
      $fetch<ExportedAccountData>(`${apiBase.value}/account/deletion/export`, { headers: authHeaders() }),
    requestDeletion: (feedback?: ExitFeedbackPayload) =>
      $fetch<{ status: 'REQUESTED', alreadyPending: boolean }>(`${apiBase.value}/account/deletion/request`, {
        method: 'POST',
        body: feedback ? { feedback } : {},
        headers: authHeaders()
      }),
    cancelDeletion: () =>
      $fetch<{ status: 'CANCELLED' | 'NONE' }>(`${apiBase.value}/account/deletion/cancel`, {
        method: 'POST',
        headers: authHeaders()
      })
    // Note: /account/deletion/confirm is deliberately NOT called from an
    // authenticated composable -- it's reached via the emailed link
    // (?token=...) and may be used by someone with no active session, per
    // account-deletion-request.controller.ts's own comment. That page
    // calls the endpoint directly, unauthenticated, with just the token.
  }
}
