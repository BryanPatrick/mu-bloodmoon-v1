export type GmEventExecutionMode = 'AUTOMATED' | 'MANUAL_GM' | 'HYBRID'
export type GmEventDefinitionStatus = 'ACTIVE' | 'INACTIVE'
export type GmEventRunStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PROBLEM_REPORTED'
export type GmEventResultStatus = 'PENDING_VALIDATION' | 'VALIDATED' | 'INVALIDATED'

export type GmEventDefinitionCreatePayload = {
  key: string
  name: string
  description?: string
  category: string
  executionMode: GmEventExecutionMode
}

export type GmEventDefinitionSummary = {
  id: string
  key: string
  name: string
  description: string | null
  category: string
  executionMode: GmEventExecutionMode
  status: GmEventDefinitionStatus
  createdAt: string
}

export type GmEventScheduleCreatePayload = {
  startsAt: string
  endsAt?: string
  recurrenceNote?: string
  notes?: string
}

export type GmEventScheduleSummary = {
  id: string
  definitionId: string
  definitionName: string
  startsAt: string
  endsAt: string | null
  recurrenceNote: string | null
  notes: string | null
}

export type GmEventRunListQuery = {
  status?: GmEventRunStatus
  page?: string
  pageSize?: string
}

export type GmEventRunSummary = {
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

export type GmEventRunDetail = GmEventRunSummary & {
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

export type GmEventRunCreatePayload = {
  definitionId: string
  scheduleId?: string
}

export type GmEventRunEndPayload = {
  note?: string
}

export type GmEventRunProblemPayload = {
  note: string
}

export type GmEventRunCancelPayload = {
  reason: string
}

export type GmEventResultSubmitPayload = {
  summary: string
  participantCount?: number
}

export type GmEventResultValidatePayload = {
  status: 'VALIDATED' | 'INVALIDATED'
  reason?: string
}
