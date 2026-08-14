export type GmEventExecutionMode = 'AUTOMATED' | 'MANUAL_GM' | 'HYBRID'
export type GmEventDefinitionStatus = 'ACTIVE' | 'INACTIVE'

export type GmEventDefinition = {
  id: string
  key: string
  name: string
  description: string | null
  category: string
  executionMode: GmEventExecutionMode
  status: GmEventDefinitionStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type GmEventScheduleEntry = {
  id: string
  definitionId: string
  definitionName: string
  startsAt: string
  endsAt: string | null
  recurrenceNote: string | null
  notes: string | null
}

export type GmEventDefinitionDetail = GmEventDefinition & { schedules: GmEventScheduleEntry[] }

export type GmEventAuditEntry = {
  id: string
  action: string
  actorUsername: string | null
  reason: string | null
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

const authHeaders = () => readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}

const cleanQuery = (query: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''))

export const useGmEventsAdminApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  return {
    listDefinitions: (query: { status?: GmEventDefinitionStatus; category?: string; executionMode?: GmEventExecutionMode } = {}) =>
      $fetch<GmEventDefinition[]>(`${apiBase.value}/gm/events/definitions`, { query: cleanQuery(query), headers: authHeaders() }),
    getDefinition: (id: string) => $fetch<GmEventDefinitionDetail>(`${apiBase.value}/gm/events/definitions/${id}`, { headers: authHeaders() }),
    createDefinition: (payload: { key: string; name: string; description?: string; category: string; executionMode: GmEventExecutionMode }) =>
      $fetch<GmEventDefinition>(`${apiBase.value}/gm/events/definitions`, { method: 'POST', body: payload, headers: authHeaders() }),
    updateDefinition: (id: string, payload: { name?: string; description?: string; category?: string; executionMode?: GmEventExecutionMode; status?: GmEventDefinitionStatus; reason?: string }) =>
      $fetch<GmEventDefinition>(`${apiBase.value}/gm/events/definitions/${id}`, { method: 'PATCH', body: payload, headers: authHeaders() }),
    definitionHistory: (id: string) => $fetch<GmEventAuditEntry[]>(`${apiBase.value}/gm/events/definitions/${id}/history`, { headers: authHeaders() }),
    createSchedule: (definitionId: string, payload: { startsAt: string; endsAt?: string; recurrenceNote?: string; notes?: string }) =>
      $fetch<GmEventScheduleEntry>(`${apiBase.value}/gm/events/definitions/${definitionId}/schedules`, { method: 'POST', body: payload, headers: authHeaders() }),
    updateSchedule: (definitionId: string, scheduleId: string, payload: { startsAt?: string; endsAt?: string | null; recurrenceNote?: string | null; notes?: string | null }) =>
      $fetch<GmEventScheduleEntry>(`${apiBase.value}/gm/events/definitions/${definitionId}/schedules/${scheduleId}`, { method: 'PATCH', body: payload, headers: authHeaders() }),
    deleteSchedule: (definitionId: string, scheduleId: string) =>
      $fetch<{ ok: true }>(`${apiBase.value}/gm/events/definitions/${definitionId}/schedules/${scheduleId}`, { method: 'DELETE', headers: authHeaders() })
  }
}
