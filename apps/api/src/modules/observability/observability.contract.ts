import type {
  OperationalEventSeverity,
  SystemErrorSeverity
} from '@prisma/client'

export type RecordSystemErrorPayload = {
  module?: string
  severity?: SystemErrorSeverity
  errorCode?: string | null
  publicMessage: string
  internalMessage: string
  stackTrace?: string | null
  correlationId?: string | null
  userId?: string | null
  accountId?: string | null
  entityType?: string | null
  entityId?: string | null
  requestPath?: string | null
  requestMethod?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}

export type RecordOperationalEventPayload = {
  module: string
  eventType: string
  severity?: OperationalEventSeverity
  entityType?: string | null
  entityId?: string | null
  actorUserId?: string | null
  targetUserId?: string | null
  correlationId?: string | null
  description: string
  data?: Record<string, unknown>
}
