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
  recentAlerts: Array<{
    id: string
    title: string
    message: string
    severity: string
    createdAt: string
  }>
  recentActions: Array<{
    id: string
    action: string
    targetType: string
    targetId: string | null
    result: string
    createdAt: string
  }>
}

export type GmOccurrenceListQuery = {
  status?: GmOccurrenceStatus
  page?: string
  pageSize?: string
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
  notes: Array<{
    id: string
    note: string
    author: string
    createdAt: string
  }>
}

export type GmOccurrenceCreatePayload = {
  type: string
  description: string
  targetType?: string
  targetId?: string
  assignedToId?: string
}

export type GmOccurrenceUpdatePayload = {
  status?: GmOccurrenceStatus
  assignedToId?: string | null
  reason?: string
}

export type GmOccurrenceNoteCreatePayload = {
  note: string
}

export type GmLogsQuery = {
  page?: string
  pageSize?: string
  module?: string
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
