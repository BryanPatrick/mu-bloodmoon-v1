export type GmOccurrenceStatus = 'OPEN' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'RESOLVED' | 'DISMISSED'

export type GmDashboardSummary = {
  occurrences: {
    total: number
    open: number
    byStatus: Record<GmOccurrenceStatus, number>
  }
  characters: {
    total: number
    online: number
  }
  recentAlerts: Array<{ id: string; title: string; message: string; severity: string; createdAt: string }>
  recentActions: Array<{ id: string; action: string; targetType: string; targetId: string | null; result: string; createdAt: string }>
}

export type GmOccurrenceSummary = {
  id: string
  type: string
  description: string
  targetType: string | null
  targetId: string | null
  status: GmOccurrenceStatus
  createdBy: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  noteCount: number
}

export type GmOccurrenceDetail = GmOccurrenceSummary & {
  notes: Array<{ id: string; note: string; author: string; createdAt: string }>
}

export type GmLogEntry = {
  id: string
  module: string
  eventType: string
  severity: string
  entityType: string | null
  entityId: string | null
  description: string
  occurredAt: string
}

type Paginated<T> = { data: T[]; total: number; page: number; pageSize: number }

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

const authHeaders = () => readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}

const cleanQuery = (query: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''))

export const useGmApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  return {
    dashboard: () => $fetch<GmDashboardSummary>(`${apiBase.value}/gm/dashboard`, { headers: authHeaders() }),
    logs: (query: { page?: number; pageSize?: number; module?: string } = {}) =>
      $fetch<Paginated<GmLogEntry>>(`${apiBase.value}/gm/logs`, { query: cleanQuery(query), headers: authHeaders() }),
    listOccurrences: (query: { status?: GmOccurrenceStatus; page?: number; pageSize?: number } = {}) =>
      $fetch<Paginated<GmOccurrenceSummary>>(`${apiBase.value}/gm/occurrences`, { query: cleanQuery(query), headers: authHeaders() }),
    getOccurrence: (id: string) => $fetch<GmOccurrenceDetail>(`${apiBase.value}/gm/occurrences/${id}`, { headers: authHeaders() }),
    createOccurrence: (payload: { type: string; description: string; targetType?: string; targetId?: string }) =>
      $fetch<GmOccurrenceDetail>(`${apiBase.value}/gm/occurrences`, { method: 'POST', body: payload, headers: authHeaders() }),
    updateOccurrence: (id: string, payload: { status?: GmOccurrenceStatus; assignedToId?: string | null; reason?: string }) =>
      $fetch<GmOccurrenceDetail>(`${apiBase.value}/gm/occurrences/${id}`, { method: 'PATCH', body: payload, headers: authHeaders() }),
    addNote: (id: string, note: string) =>
      $fetch<GmOccurrenceDetail>(`${apiBase.value}/gm/occurrences/${id}/notes`, { method: 'POST', body: { note }, headers: authHeaders() })
  }
}
