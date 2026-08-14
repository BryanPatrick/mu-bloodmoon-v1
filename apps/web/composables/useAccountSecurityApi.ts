type ChangePasswordPayload = {
  currentPassword: string
  personalId: string
  newPassword: string
}

export type AccountProfile = {
  id: string
  username: string
  name: string
  email: string
  role: string
  status: string
  personalIdMask: string
  currencies: Record<string, number>
  createdAt: string
  updatedAt: string
  twoFactorEnabled: boolean
}

export type AccountSession = {
  id: string
  current: boolean
  active: boolean
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  revokedAt: string | null
  revokeReason: string | null
  ipAddress: string | null
  label: string
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

const authHeaders = () => readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}

export const useAccountSecurityApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  return {
    profile: () =>
      $fetch<AccountProfile>(`${apiBase.value}/account/profile`, {
        headers: authHeaders()
      }),
    changePassword: (payload: ChangePasswordPayload) =>
      $fetch<{ ok: true }>(`${apiBase.value}/auth/change-password`, {
        method: 'POST',
        body: payload,
        headers: authHeaders()
      }),
    sessions: () => $fetch<AccountSession[]>(`${apiBase.value}/account/sessions`, { headers: authHeaders() }),
    revokeSessions: (reason: string) => $fetch<{ ok: boolean }>(`${apiBase.value}/account/sessions/revoke`, { method: 'PATCH', body: { reason }, headers: authHeaders() }),
    setupTwoFactor: (currentPassword: string) => $fetch<{ secret: string, uri: string, qrCode: string }>(`${apiBase.value}/auth/2fa/setup`, { method: 'POST', body: { currentPassword }, headers: authHeaders() }),
    verifyTwoFactor: (code: string) => $fetch<{ ok: true, recoveryCodes: string[] }>(`${apiBase.value}/auth/2fa/verify`, { method: 'POST', body: { code }, headers: authHeaders() }),
    disableTwoFactor: (currentPassword: string, code?: string, recoveryCode?: string) => $fetch<{ ok: true }>(`${apiBase.value}/auth/2fa/disable`, { method: 'POST', body: { currentPassword, code, recoveryCode }, headers: authHeaders() }),
    regenerateRecoveryCodes: (currentPassword: string, code?: string, recoveryCode?: string) => $fetch<{ ok: true, recoveryCodes: string[] }>(`${apiBase.value}/auth/2fa/recovery-codes/regenerate`, { method: 'POST', body: { currentPassword, code, recoveryCode }, headers: authHeaders() }),
    stepUp: (currentPassword: string, code?: string, recoveryCode?: string) => $fetch<{ stepUpToken: string, expiresAt: string }>(`${apiBase.value}/auth/step-up`, { method: 'POST', body: { currentPassword, code, recoveryCode }, headers: authHeaders() })
  }
}
