export type GmEventExecutionMode = 'AUTOMATED' | 'MANUAL_GM' | 'HYBRID'
export type GmEventRunStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PROBLEM_REPORTED'
export type GmEventResultStatus = 'PENDING_VALIDATION' | 'VALIDATED' | 'INVALIDATED'

export type GmEventDefinition = {
  id: string
  key: string
  name: string
  description: string | null
  category: string
  executionMode: GmEventExecutionMode
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
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

export type GmEventRun = {
  id: string
  definitionId: string
  definitionName: string
  scheduleId: string | null
  status: GmEventRunStatus
  origin: string
  startedBy: string | null
  startedAt: string | null
  endedBy: string | null
  endedAt: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  cancelReason: string | null
  problemNote: string | null
  hasResult: boolean
  createdAt: string
}

export type GmEventRunDetail = GmEventRun & {
  result: {
    id: string
    summary: string
    participantCount: number | null
    status: GmEventResultStatus
    validatedBy: string | null
    validatedAt: string | null
    invalidateReason: string | null
  } | null
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

export const useGmEventsApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  return {
    listDefinitions: () => $fetch<GmEventDefinition[]>(`${apiBase.value}/gm/events/definitions`, { headers: authHeaders() }),
    agenda: () => $fetch<GmEventScheduleEntry[]>(`${apiBase.value}/gm/events/agenda`, { headers: authHeaders() }),
    listRuns: (query: { status?: GmEventRunStatus; page?: number; pageSize?: number } = {}) =>
      $fetch<{ data: GmEventRun[]; total: number }>(`${apiBase.value}/gm/events/runs`, { query: cleanQuery(query), headers: authHeaders() }),
    getRun: (id: string) => $fetch<GmEventRunDetail>(`${apiBase.value}/gm/events/runs/${id}`, { headers: authHeaders() }),
    startRun: (definitionId: string, scheduleId?: string) =>
      $fetch<GmEventRunDetail>(`${apiBase.value}/gm/events/runs`, { method: 'POST', body: { definitionId, scheduleId }, headers: authHeaders() }),
    endRun: (id: string, note?: string) =>
      $fetch<GmEventRunDetail>(`${apiBase.value}/gm/events/runs/${id}/end`, { method: 'PATCH', body: { note }, headers: authHeaders() }),
    reportProblem: (id: string, note: string) =>
      $fetch<GmEventRunDetail>(`${apiBase.value}/gm/events/runs/${id}/problem`, { method: 'PATCH', body: { note }, headers: authHeaders() }),
    cancelRun: (id: string, reason: string) =>
      $fetch<GmEventRunDetail>(`${apiBase.value}/gm/events/runs/${id}/cancel`, { method: 'PATCH', body: { reason }, headers: authHeaders() }),
    submitResult: (id: string, summary: string, participantCount?: number) =>
      $fetch<GmEventRunDetail>(`${apiBase.value}/gm/events/runs/${id}/result`, { method: 'POST', body: { summary, participantCount }, headers: authHeaders() }),
    validateResult: (id: string, status: 'VALIDATED' | 'INVALIDATED', reason?: string) =>
      $fetch<GmEventRunDetail>(`${apiBase.value}/gm/events/runs/${id}/result/validate`, { method: 'PATCH', body: { status, reason }, headers: authHeaders() })
  }
}
