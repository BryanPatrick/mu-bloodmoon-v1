export type ObservabilityListQuery = {
  page?: string
  pageSize?: string
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

export type ErrorUpdatePayload = {
  status?: string
  assignedTo?: string | null
  resolution?: string | null
  investigation?: string
  evidence?: unknown
  taskId?: string | null
  reason?: string
}

export type AlertUpdatePayload = {
  status?: string
  assignedTo?: string | null
  reason?: string
}

export type WorkLogPayload = {
  module?: string
  action?: string
  entityType?: string
  entityId?: string | null
  taskId?: string | null
  description?: string
  startedAt?: string
  completedAt?: string | null
  durationMinutes?: number | null
  evidence?: unknown
  result?: string
}

export type RetentionPolicyPayload = {
  retentionDays?: number
  enabled?: boolean
  reason?: string
}

export type ExportQuery = ObservabilityListQuery & {
  source?: string
}
