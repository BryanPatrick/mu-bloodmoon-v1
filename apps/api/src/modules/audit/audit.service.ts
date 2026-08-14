import { Injectable } from '@nestjs/common'
import type { AuditResult, Role, WorkLogResult } from '@prisma/client'
import { RequestContextService } from '../../common/request-context.service'
import { redactSensitiveText, toSafeJson } from '../../common/sensitive-data'
import { PrismaService } from '../../database/prisma.service'
import type { AuditSeverity } from './audit.contract'

export type RecordAuditPayload = {
  module?: string
  actorId?: string | null
  actorUsername?: string | null
  actorRole?: Role | null
  action: string
  targetType: string
  targetId?: string | null
  targetUserId?: string | null
  beforeData?: unknown
  afterData?: unknown
  reason?: string | null
  result?: AuditResult
  severity?: AuditSeverity
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  sessionId?: string | null
  correlationId?: string | null
  workDescription?: string
  workEvidence?: unknown
  workDurationMinutes?: number
  workTaskId?: string
}

const moduleFromAction = (action: string) => {
  const parts = action.split('.')
  const first = parts[0] === 'admin' ? parts[1] : parts[0]
  const aliases: Record<string, string> = {
    shop: 'store',
    recharge: 'store',
    finance: 'commerce',
    'game-bridge': 'marketplace',
    moderation: 'community',
    support: 'support'
  }
  return aliases[first] || first || 'system'
}

const resultFromMetadata = (
  metadata: Record<string, unknown> | undefined,
  explicit: AuditResult | undefined
): AuditResult => {
  if (explicit) return explicit
  const value = String(metadata?.result || '').toUpperCase()
  return ['SUCCESS', 'FAILURE', 'PARTIAL', 'DENIED'].includes(value)
    ? value as AuditResult
    : 'SUCCESS'
}

const workResult = (result: AuditResult): WorkLogResult => {
  if (result === 'FAILURE' || result === 'DENIED') return 'FAILURE'
  if (result === 'PARTIAL') return 'PARTIAL'
  return 'SUCCESS'
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService
  ) {}

  async record(payload: RecordAuditPayload) {
    const context = this.requestContext.current()
    const actor = payload.actorId && !payload.actorRole
      ? await this.prisma.account.findUnique({
          where: { id: payload.actorId },
          select: { role: true }
        })
      : null
    const actorRole = payload.actorRole || actor?.role || null
    const result = resultFromMetadata(payload.metadata, payload.result)
    const beforeData =
      payload.beforeData ?? payload.metadata?.before ?? undefined
    const afterData =
      payload.afterData ?? payload.metadata?.after ?? undefined
    const reason =
      payload.reason ??
      (typeof payload.metadata?.reason === 'string'
        ? payload.metadata.reason
        : null)
    const module = payload.module || moduleFromAction(payload.action)
    const correlationId =
      payload.correlationId || context?.correlationId || null
    const isAdministrative =
      Boolean(payload.actorId) &&
      (actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN' || actorRole === 'GM') &&
      (
        payload.action.startsWith('admin.') ||
        payload.action.startsWith('gm.') ||
        payload.action.startsWith('moderation.') ||
        payload.action.startsWith('support.ticket.updated')
      )

    return this.prisma.$transaction(async (transaction) => {
      const event = await transaction.auditEvent.create({
        data: {
          module,
          actorId: payload.actorId || null,
          actorUsername: payload.actorUsername || 'system',
          actorRole,
          action: payload.action,
          targetType: payload.targetType,
          targetId: payload.targetId || null,
          targetUserId: payload.targetUserId || null,
          beforeData: toSafeJson(beforeData, { maskPersonalData: true }),
          afterData: toSafeJson(afterData, { maskPersonalData: true }),
          reason: reason ? redactSensitiveText(reason) : null,
          result,
          severity: payload.severity || 'info',
          ipAddress: payload.ipAddress || context?.ipAddress || null,
          userAgent: payload.userAgent || context?.userAgent || null,
          sessionId: payload.sessionId || context?.sessionId || null,
          correlationId,
          metadata: toSafeJson(payload.metadata, { maskPersonalData: true })
        }
      })

      if (isAdministrative && payload.actorId) {
        const now = new Date()
        await transaction.adminWorkLog.create({
          data: {
            userId: payload.actorId,
            username: payload.actorUsername || null,
            module,
            action: payload.action,
            entityType: payload.targetType,
            entityId: payload.targetId || null,
            taskId: payload.workTaskId || null,
            description: redactSensitiveText(
              payload.workDescription ||
              `${payload.actorUsername || 'Administrador'} executou ${payload.action} em ${payload.targetType}${payload.targetId ? ` ${payload.targetId}` : ''}.`
            ),
            startedAt: now,
            completedAt: now,
            durationMinutes: Math.max(0, Math.round(payload.workDurationMinutes || 0)),
            evidence: toSafeJson(payload.workEvidence, { maskPersonalData: true }),
            result: workResult(result),
            correlationId
          }
        })
      }

      return event
    })
  }
}
