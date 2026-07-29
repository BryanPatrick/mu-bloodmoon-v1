import type {
  AdminTaskComplexity,
  AdminTaskEvidenceType,
  AdminTaskPriority,
  AdminTaskStatus
} from '@prisma/client'

export type AdminTaskQuery = {
  search?: string
  module?: string
  type?: string
  priority?: AdminTaskPriority
  complexity?: AdminTaskComplexity
  status?: AdminTaskStatus
  assignedTo?: string
  unassigned?: string
  overdue?: string
  entityType?: string
  entityId?: string
  page?: string | number
  pageSize?: string | number
  sort?: 'createdAt' | 'updatedAt' | 'dueAt' | 'priority' | 'status'
  direction?: 'asc' | 'desc'
}

export type AdminTaskPayload = {
  title?: string
  description?: string
  module?: string
  type?: string
  priority?: AdminTaskPriority
  complexity?: AdminTaskComplexity
  status?: AdminTaskStatus
  assignedTo?: string | null
  dueAt?: string | null
  estimatedMinutes?: number | null
  actualMinutes?: number | null
  entityType?: string | null
  entityId?: string | null
  errorId?: string | null
  reportId?: string | null
  internalNotes?: string | null
  result?: string | null
  approvalRequired?: boolean
  reason?: string
}

export type AdminTaskActionPayload = {
  action?: string
  assignedTo?: string | null
  reason?: string
  result?: string | null
  actualMinutes?: number | null
}

export type AdminTaskCommentPayload = {
  content?: string
  attachments?: unknown
}

export type AdminTaskEvidencePayload = {
  type?: AdminTaskEvidenceType
  title?: string
  description?: string | null
  url?: string | null
  entityType?: string | null
  entityId?: string | null
  beforeData?: unknown
  afterData?: unknown
  metadata?: unknown
}

export type AdminTaskLinkPayload = {
  module?: string
  entityType?: string
  entityId?: string
  label?: string | null
}
