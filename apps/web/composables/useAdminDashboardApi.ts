export type AdminDashboardSummary = {
  metrics: {
    accounts: number
    characters: number
    onlineCharacters: number
    purchases: number
    recharges: number
    pending: number
    recentRevenue: number
  }
  activity: Array<{
    key: string
    title: string
    description: string
    status: string
    trend: string
  }>
  recentAudit: Array<{
    id: string
    action: string
    actorUsername: string
    targetType: string
    severity: string
    createdAt: string
  }>
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

export const useAdminDashboardApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  return {
    summary: () => $fetch<AdminDashboardSummary>(`${apiBase.value}/admin/dashboard/summary`, {
      headers: readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}
    })
  }
}
