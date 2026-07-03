export type AdminAuditApiQuery = {
  page?: number
  pageSize?: number
  search?: string
  action?: string
  severity?: string
  targetType?: string
}

export type AdminAuditApiEvent = {
  id: string
  actorId: string | null
  actorUsername: string
  action: string
  targetType: string
  targetId: string | null
  severity: string
  metadata: unknown
  createdAt: string
}

export type AdminAuditApiResponse = {
  items: AdminAuditApiEvent[]
  total: number
  page: number
  pageSize: number
  summary: {
    total: number
    warnings: number
    errors: number
    authFailures: number
  }
}

const authStorageKey = 'blood-moon-auth'

const cleanAuditQuery = (query: Record<string, unknown>) =>
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

export const useAdminAuditApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const events = (query: AdminAuditApiQuery = {}) =>
    $fetch<AdminAuditApiResponse>(`${apiBase.value}/admin/audit/events`, {
      query: cleanAuditQuery(query),
      headers: readAccessToken()
        ? { Authorization: `Bearer ${readAccessToken()}` }
        : {}
    })

  return { events }
}
