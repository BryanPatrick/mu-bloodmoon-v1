export type AdminAuditQuery = {
  page?: string
  pageSize?: string
  search?: string
  action?: string
  severity?: string
  targetType?: string
}

export type AdminAuditEventDto = {
  id: string
  module: string
  actorId: string | null
  actorUsername: string
  actorRole: string | null
  action: string
  targetType: string
  targetId: string | null
  targetUserId: string | null
  result: string
  severity: string
  correlationId: string | null
  beforeData: unknown
  afterData: unknown
  metadata: unknown
  createdAt: string
}

export type AdminAuditListResponse = {
  items: AdminAuditEventDto[]
  total: number
  page: number
  pageSize: number
  summary: {
    total: number
    warnings: number
    errors: number
    authFailures: number
  }
}
