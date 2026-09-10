const bugHuntersAuthStorageKey = 'blood-moon-auth'
const bugHuntersHeaders = (): Record<string, string> => {
  if (!import.meta.client) return {}
  try { const session = JSON.parse(localStorage.getItem(bugHuntersAuthStorageKey) || '{}'); return session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {} } catch { return {} }
}

export type BugReportEvent = { id: string; type: string; isInternal: boolean; message?: string | null; createdAt: string; actor?: { username: string; role: string } }
export type BugReportSummary = { id: string; category: string; title: string; playerSeverity: string; staffSeverity?: string | null; status: string; createdAt: string; updatedAt: string; resolvedAt?: string | null; closedAt?: string | null }
export type BugReportDetail = BugReportSummary & {
  description: string; stepsToReproduce: string; expectedBehavior: string; actualBehavior: string
  characterName?: string | null; contextNote?: string | null; attachmentRef?: string | null
  events: BugReportEvent[]
  account?: { username: string; name: string; email?: string }
  assignee?: { username: string } | null
}
export type BugHuntersMetrics = { total: number; open: number; confirmed: number; resolved: number; byStatus: Record<string, number>; byCategory: Record<string, number>; bySeverity: Record<string, number> }

export const bugReportCategories = ['LAUNCHER', 'LOGIN_ACCOUNT', 'GAMEPLAY', 'MAP_MONSTER', 'ITEM', 'EVENT', 'QUEST', 'VIP', 'STORE_PAYMENT', 'MARKETPLACE', 'GUILD', 'COMMUNITY', 'PORTAL', 'PERFORMANCE', 'OTHER'] as const
export const bugReportSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const bugReportStatuses = ['OPEN', 'TRIAGE', 'NEEDS_INFO', 'CONFIRMED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'DUPLICATE', 'NOT_A_BUG'] as const

export const useBugHuntersApi = () => {
  const config = useRuntimeConfig(); const base = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))
  const get = <T>(path: string, query: Record<string, unknown> = {}) => $fetch<T>(`${base.value}${path}`, { query, headers: bugHuntersHeaders() })
  const send = <T>(method: 'POST' | 'PATCH', path: string, body: unknown) => $fetch<T>(`${base.value}${path}`, { method, body: body as Record<string, any> | BodyInit | null | undefined, headers: bugHuntersHeaders() })
  return {
    // Player
    ownReports: () => get<BugReportSummary[]>('/account/bug-reports'),
    ownReport: (id: string) => get<BugReportDetail>(`/account/bug-reports/${id}`),
    createReport: (body: Record<string, unknown>) => send<BugReportDetail>('POST', '/account/bug-reports', body),
    addPlayerInfo: (id: string, message: string) => send<BugReportEvent>('POST', `/account/bug-reports/${id}/info`, { message }),
    // Staff
    listReports: (filters: Record<string, unknown> = {}) => get<BugReportDetail[]>('/admin/bug-reports', filters),
    getReport: (id: string) => get<BugReportDetail>(`/admin/bug-reports/${id}`),
    metrics: () => get<BugHuntersMetrics>('/admin/bug-reports/metrics'),
    assign: (id: string, assignedToAccountId: string) => send<BugReportDetail>('PATCH', `/admin/bug-reports/${id}/assign`, { assignedToAccountId }),
    changeStatus: (id: string, status: string, reason: string) => send<BugReportDetail>('PATCH', `/admin/bug-reports/${id}/status`, { status, reason }),
    setStaffSeverity: (id: string, staffSeverity: string) => send<BugReportDetail>('PATCH', `/admin/bug-reports/${id}/staff-severity`, { staffSeverity }),
    reply: (id: string, message: string) => send<BugReportEvent>('POST', `/admin/bug-reports/${id}/reply`, { message }),
    internalNote: (id: string, message: string) => send<BugReportEvent>('POST', `/admin/bug-reports/${id}/internal-note`, { message }),
    recordRewardEligibility: (id: string, betaCycleId: string, justification: string) => send('POST', `/admin/bug-reports/${id}/reward-eligibility`, { betaCycleId, justification }),
    exportUrl: (filters: Record<string, string> = {}) => `${base.value}/admin/bug-reports/export?${new URLSearchParams(filters).toString()}`
  }
}
