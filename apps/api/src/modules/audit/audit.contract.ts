export type AuditSeverity = 'info' | 'warning' | 'critical'

export type AuditEventDto = {
  id: string
  actorId: string | null
  actorUsername: string | null
  action: string
  targetType: string
  targetId?: string
  severity: AuditSeverity
  metadata?: Record<string, unknown>
  createdAt: string
}
