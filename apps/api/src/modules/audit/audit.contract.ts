import type { AuditResult, Role } from '@prisma/client'

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

export type AuditEventDto = {
  id: string
  module: string
  actorId: string | null
  actorUsername: string | null
  actorRole?: Role | null
  action: string
  targetType: string
  targetId?: string
  targetUserId?: string | null
  beforeData?: Record<string, unknown>
  afterData?: Record<string, unknown>
  reason?: string | null
  result: AuditResult
  severity: AuditSeverity
  correlationId?: string | null
  metadata?: Record<string, unknown>
  createdAt: string
}
