export type ObservabilityQuery = {
  page?: number
  pageSize?: number
  search?: string
  module?: string
  action?: string
  severity?: string
  status?: string
  result?: string
  entityType?: string
  entityId?: string
  actorUserId?: string
  assignedTo?: string
  correlationId?: string
  eventType?: string
  taskId?: string
  dateFrom?: string
  dateTo?: string
}

export type PagedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type AuditRecord = {
  id: string
  module: string
  action: string
  targetType: string
  targetId: string | null
  actorId: string | null
  actorUsername: string | null
  actorRole: string | null
  targetUserId: string | null
  beforeData: unknown
  afterData: unknown
  reason: string | null
  result: string
  severity: string
  correlationId: string | null
  metadata: unknown
  createdAt: string
  version?: number
}

export type WorkLogRecord = {
  id: string
  userId: string
  username: string | null
  module: string
  action: string
  entityType: string
  entityId: string | null
  taskId: string | null
  description: string
  startedAt: string
  completedAt: string | null
  durationMinutes: number | null
  evidence: unknown
  result: string
  correlationId: string | null
  createdAt: string
}

export type OperationalRecord = {
  id: string
  module: string
  eventType: string
  severity: string
  entityType: string | null
  entityId: string | null
  actorUserId: string | null
  targetUserId: string | null
  correlationId: string | null
  description: string
  data: unknown
  occurredAt: string
}

export type SystemErrorRecord = {
  id: string
  module: string
  severity: string
  errorCode: string | null
  publicMessage: string
  internalMessage?: string
  stackTrace?: string | null
  correlationId: string | null
  requestPath: string | null
  requestMethod: string | null
  environment: string
  occurrenceCount: number
  firstOccurredAt: string
  lastOccurredAt: string
  status: string
  assignedTo: string | null
  resolution?: string | null
  taskId: string | null
  occurrences?: Array<Record<string, unknown>>
  timeline?: Array<Record<string, unknown>>
}

export type SystemAlertRecord = {
  id: string
  module: string
  alertType: string
  severity: string
  title: string
  message: string
  status: string
  assignedTo: string | null
  correlationId: string | null
  createdAt: string
}

export type RetentionPolicyRecord = {
  id: string
  dataType: string
  retentionDays: number
  immutableForAdmin: boolean
  enabled: boolean
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

const authStorageKey = 'blood-moon-auth'

const accessToken = () => {
  if (!import.meta.client) return ''
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) || '{}')?.accessToken || ''
  } catch {
    return ''
  }
}

const cleanQuery = (query: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  )

export const useAdminObservabilityApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() =>
    String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, '')
  )
  const headers = () =>
    accessToken() ? { Authorization: `Bearer ${accessToken()}` } : {}
  const request = <T>(path: string, options: Record<string, unknown> = {}) =>
    $fetch<T>(`${apiBase.value}${path}`, {
      ...options,
      headers: { ...headers(), ...(options.headers as Record<string, string> || {}) }
    })

  const summary = () =>
    request<Record<string, number | boolean>>('/admin/observability/summary')
  const audit = (query: ObservabilityQuery = {}) =>
    request<PagedResponse<AuditRecord>>('/admin/observability/audit', {
      query: cleanQuery(query)
    })
  const history = (entityType: string, entityId: string) =>
    request<AuditRecord[]>(
      `/admin/observability/history/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`
    )
  const workLogs = (query: ObservabilityQuery = {}) =>
    request<PagedResponse<WorkLogRecord>>('/admin/observability/work-logs', {
      query: cleanQuery(query)
    })
  const createWorkLog = (body: Record<string, unknown>) =>
    request<WorkLogRecord>('/admin/observability/work-logs', {
      method: 'POST',
      body
    })
  const events = (query: ObservabilityQuery = {}) =>
    request<PagedResponse<OperationalRecord>>('/admin/observability/events', {
      query: cleanQuery(query)
    })
  const errors = (query: ObservabilityQuery = {}) =>
    request<PagedResponse<SystemErrorRecord>>('/admin/errors', {
      query: cleanQuery(query)
    })
  const error = (id: string) =>
    request<SystemErrorRecord>(`/admin/errors/${encodeURIComponent(id)}`)
  const updateError = (id: string, body: Record<string, unknown>) =>
    request<SystemErrorRecord>(`/admin/errors/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body
    })
  const alerts = (query: ObservabilityQuery = {}) =>
    request<PagedResponse<SystemAlertRecord>>('/admin/alerts', {
      query: cleanQuery(query)
    })
  const updateAlert = (id: string, body: Record<string, unknown>) =>
    request<SystemAlertRecord>(`/admin/alerts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body
    })
  const exports = () =>
    request<Array<Record<string, unknown>>>('/admin/observability/exports')
  const retentionPolicies = () =>
    request<RetentionPolicyRecord[]>('/admin/observability/retention')
  const updateRetentionPolicy = (
    dataType: string,
    body: Record<string, unknown>
  ) =>
    request<RetentionPolicyRecord>(
      `/admin/observability/retention/${encodeURIComponent(dataType)}`,
      { method: 'PATCH', body }
    )

  const downloadExport = async (
    source: 'audit' | 'work' | 'events' | 'errors',
    query: ObservabilityQuery = {}
  ) => {
    const url = new URL(`${apiBase.value}/admin/observability/export`)
    for (const [key, value] of Object.entries(cleanQuery({ ...query, source }))) {
      url.searchParams.set(key, String(value))
    }
    const response = await fetch(url, { headers: headers() })
    if (!response.ok) throw new Error('Nao foi possivel gerar a exportacao.')
    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition') || ''
    const fileName =
      disposition.match(/filename="([^"]+)"/)?.[1] ||
      `blood-moon-${source}.csv`
    const downloadUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(downloadUrl)
  }

  return {
    summary,
    audit,
    history,
    workLogs,
    createWorkLog,
    events,
    errors,
    error,
    updateError,
    alerts,
    updateAlert,
    exports,
    retentionPolicies,
    updateRetentionPolicy,
    downloadExport
  }
}
