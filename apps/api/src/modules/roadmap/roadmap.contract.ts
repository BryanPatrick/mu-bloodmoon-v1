import type {
  RoadmapHorizon,
  RoadmapPriority,
  RoadmapRelationType,
  RoadmapStatus,
  RoadmapTaskStatus,
  RoadmapUpdateType,
  RoadmapVisibility,
  RoadmapWorkflowStatus,
  RoadmapWorkSituation
} from '@prisma/client'

export type RoadmapQuery = {
  page?: string
  pageSize?: string
  search?: string
  category?: string
  horizon?: RoadmapHorizon
  status?: RoadmapStatus
  priority?: RoadmapPriority
  workflowStatus?: RoadmapWorkflowStatus
  ownerId?: string
  visibility?: RoadmapVisibility
  includeDeleted?: string
  staleDays?: string
}

export type RoadmapItemPayload = {
  title: string
  slug?: string
  summary: string
  description: string
  objective?: string | null
  problem?: string | null
  playerBenefit?: string | null
  scopeIncluded?: string[]
  scopeExcluded?: string[]
  category: string
  horizon: RoadmapHorizon
  status: RoadmapStatus
  priority?: RoadmapPriority
  progress?: number
  estimatedPeriod?: string | null
  completedAt?: string | null
  image?: string | null
  icon?: string | null
  tags?: string[]
  dependencies?: string[]
  visibility?: RoadmapVisibility
  sortOrder?: number
  ownerId?: string | null
  internalDeadline?: string | null
  workSituation?: RoadmapWorkSituation
  internalNotes?: string | null
  publicNotes?: string | null
  revisionReason?: string | null
  workDescription?: string
  evidence?: unknown
  durationMinutes?: number
}

export type RoadmapTransitionPayload = {
  action:
    | 'SUBMIT_REVIEW'
    | 'APPROVE'
    | 'REJECT'
    | 'PUBLISH'
    | 'SCHEDULE'
    | 'UNPUBLISH'
    | 'ARCHIVE'
    | 'RESTORE'
    | 'DELETE'
  reason?: string
  scheduledPublishAt?: string
  evidence?: unknown
  durationMinutes?: number
}

export type RoadmapUpdatePayload = {
  title: string
  content: string
  updateType?: RoadmapUpdateType
  newStatus?: RoadmapStatus
  newProgress?: number
  visibility?: RoadmapVisibility
  evidence?: unknown
  durationMinutes?: number
}

export type RoadmapTaskPayload = {
  title: string
  description?: string | null
  status?: RoadmapTaskStatus
  assigneeId?: string | null
  dueAt?: string | null
}

export type RoadmapRelationPayload = {
  type: RoadmapRelationType
  entityId: string
  label?: string | null
}

export type RoadmapReorderPayload = {
  items: Array<{ id: string; order: number }>
}
