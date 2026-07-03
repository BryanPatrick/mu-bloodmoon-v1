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
  actorId: string | null
  actorUsername: string
  action: string
  targetType: string
  targetId: string | null
  severity: string
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
