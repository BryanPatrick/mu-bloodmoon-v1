export type AdminAccountQuery = {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  status?: string
}

export type UpdateAdminAccountPayload = {
  role?: string
  status?: string
  reason: string
}

const authStorageKey = 'blood-moon-auth'

const cleanQuery = (query: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

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

export const useAdminAccountsApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const headers = () => readAccessToken()
    ? { Authorization: `Bearer ${readAccessToken()}` }
    : {}

  return {
    list: (query: AdminAccountQuery = {}) =>
      $fetch(`${apiBase.value}/admin/accounts`, {
        query: cleanQuery(query),
        headers: headers()
      }),
    update: (id: string, payload: UpdateAdminAccountPayload, stepUpToken?: string) =>
      $fetch(`${apiBase.value}/admin/accounts/${id}`, {
        method: 'PATCH',
        body: payload,
        headers: { ...headers(), ...(stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}) }
      }),
    permissions: (id: string) => $fetch(`${apiBase.value}/admin/accounts/${id}/permissions`, { headers: headers() }),
    updatePermissions: (id: string, payload: { permissions: Array<{ key: string, granted: boolean }>, reason: string }, stepUpToken?: string) =>
      $fetch(`${apiBase.value}/admin/accounts/${id}/permissions`, {
        method: 'PATCH',
        body: payload,
        headers: { ...headers(), ...(stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}) }
      }),
    revokeSessions: (id: string, reason: string) =>
      $fetch(`${apiBase.value}/admin/accounts/${id}/sessions/revoke`, { method: 'PATCH', body: { reason }, headers: headers() }),
    resetTwoFactor: (id: string, reason: string, stepUpToken: string) =>
      $fetch(`${apiBase.value}/admin/accounts/${id}/2fa/reset`, {
        method: 'PATCH',
        body: { reason },
        headers: { ...headers(), 'X-Step-Up-Token': stepUpToken }
      })
  }
}
