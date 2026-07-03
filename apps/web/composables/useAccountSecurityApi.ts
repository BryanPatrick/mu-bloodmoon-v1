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
      })
  }
}
