import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import { RequestContextService } from '../../common/request-context.service'
import {
  redactSensitiveText,
  toSafeJson
} from '../../common/sensitive-data'
import type {
  RecordOperationalEventPayload,
  RecordSystemErrorPayload
} from './observability.contract'

const normalizeFingerprintPart = (value: string) =>
  value
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      ':uuid'
    )
    .replace(/\b\d{3,}\b/g, ':number')
    .slice(0, 1500)

const moduleFromPath = (path?: string | null) => {
  const clean = path?.split('?')[0].replace(/^\/api\//, '').replace(/^\//, '')
  return clean?.split('/').slice(0, 2).join('.') || 'system'
}

@Injectable()
export class ObservabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService
  ) {}

  async recordSystemError(payload: RecordSystemErrorPayload) {
    const context = this.requestContext.current()
    const correlationId =
      payload.correlationId || context?.correlationId || null
    const requestPath = payload.requestPath || context?.requestPath || null
    const requestMethod =
      payload.requestMethod || context?.requestMethod || null
    const module = payload.module || moduleFromPath(requestPath)
    const internalMessage = redactSensitiveText(payload.internalMessage)
    const stackTrace = payload.stackTrace
      ? redactSensitiveText(payload.stackTrace)
      : null
    const fingerprint = createHash('sha256')
      .update(
        [
          module,
          payload.errorCode || '',
          normalizeFingerprintPart(internalMessage),
          normalizeFingerprintPart(stackTrace?.split('\n')[0] || ''),
          normalizeFingerprintPart(requestPath || '')
        ].join('|')
      )
      .digest('hex')

    try {
      const existing = await this.prisma.systemError.findUnique({
        where: { fingerprint },
        select: { id: true, status: true }
      })
      const shouldReopen =
        existing?.status === 'RESOLVED' || existing?.status === 'IGNORED'
      const error = await this.prisma.systemError.upsert({
        where: { fingerprint },
        create: {
          fingerprint,
          module,
          severity: payload.severity || 'ERROR',
          errorCode: payload.errorCode || null,
          publicMessage: redactSensitiveText(payload.publicMessage),
          internalMessage,
          stackTrace,
          correlationId,
          userId: payload.userId || context?.actorUserId || null,
          accountId: payload.accountId || context?.actorUserId || null,
          entityType: payload.entityType || null,
          entityId: payload.entityId || null,
          requestPath,
          requestMethod,
          environment: process.env.NODE_ENV || 'development',
          metadata: toSafeJson(payload.metadata, { maskPersonalData: true }),
          occurrences: {
            create: {
              correlationId,
              userId: payload.userId || context?.actorUserId || null,
              requestPath,
              requestMethod,
              ipAddress: payload.ipAddress || context?.ipAddress || null,
              userAgent: payload.userAgent || context?.userAgent || null,
              metadata: toSafeJson(payload.metadata, { maskPersonalData: true })
            }
          }
        },
        update: {
          severity: payload.severity || 'ERROR',
          errorCode: payload.errorCode || undefined,
          internalMessage,
          stackTrace,
          correlationId,
          userId: payload.userId || context?.actorUserId || undefined,
          accountId: payload.accountId || context?.actorUserId || undefined,
          entityType: payload.entityType || undefined,
          entityId: payload.entityId || undefined,
          requestPath,
          requestMethod,
          occurrenceCount: { increment: 1 },
          lastOccurredAt: new Date(),
          ...(shouldReopen
            ? {
                status: 'REOPENED' as const,
                resolvedBy: null,
                resolvedAt: null,
                resolution: null
              }
            : {}),
          metadata: toSafeJson(payload.metadata, { maskPersonalData: true }),
          occurrences: {
            create: {
              correlationId,
              userId: payload.userId || context?.actorUserId || null,
              requestPath,
              requestMethod,
              ipAddress: payload.ipAddress || context?.ipAddress || null,
              userAgent: payload.userAgent || context?.userAgent || null,
              metadata: toSafeJson(payload.metadata, { maskPersonalData: true })
            }
          }
        }
      })

      if (payload.severity === 'CRITICAL') {
        await this.ensureCriticalAlert({
          module,
          sourceType: 'SystemError',
          sourceId: error.id,
          correlationId,
          title: `Erro critico em ${module}`,
          message: payload.publicMessage,
          metadata: payload.metadata
        })
      }

      return error
    } catch (recordingError) {
      console.error(
        `[${correlationId || 'no-correlation'}] Failed to persist system error`,
        recordingError
      )
      return null
    }
  }

  async recordOperationalEvent(payload: RecordOperationalEventPayload) {
    const correlationId =
      payload.correlationId ||
      this.requestContext.correlationId() ||
      null
    const event = await this.prisma.operationalEvent.create({
      data: {
        module: payload.module,
        eventType: payload.eventType,
        severity: payload.severity || 'INFO',
        entityType: payload.entityType || null,
        entityId: payload.entityId || null,
        actorUserId: payload.actorUserId || null,
        targetUserId: payload.targetUserId || null,
        correlationId,
        description: redactSensitiveText(payload.description),
        data: toSafeJson(payload.data, { maskPersonalData: true })
      }
    })

    const anomalyPattern =
      /DUPLICATE|NEGATIVE_BALANCE|ESCROW_ITEM_LOST|ROLLBACK_FAILED|DATABASE_FAILURE/
    const recentFailures =
      payload.severity === 'ERROR'
        ? await this.prisma.operationalEvent.count({
            where: {
              module: payload.module,
              eventType: payload.eventType,
              severity: { in: ['ERROR', 'CRITICAL'] },
              occurredAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
            }
          })
        : 0
    if (
      payload.severity === 'CRITICAL' ||
      anomalyPattern.test(payload.eventType) ||
      recentFailures >= 5
    ) {
      await this.ensureCriticalAlert({
        module: payload.module,
        sourceType: 'OperationalEvent',
        sourceId: event.id,
        correlationId,
        title: `Alerta operacional: ${payload.eventType}`,
        message: payload.description,
        metadata: payload.data
      })
    }

    return event
  }

  private async ensureCriticalAlert(payload: {
    module: string
    sourceType: string
    sourceId: string
    correlationId: string | null
    title: string
    message: string
    metadata?: Record<string, unknown>
  }) {
    const existing = await this.prisma.systemAlert.findFirst({
      where: {
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] }
      }
    })
    if (existing) return existing

    return this.prisma.systemAlert.create({
      data: {
        module: payload.module,
        alertType: 'CRITICAL_FAILURE',
        severity: 'CRITICAL',
        title: payload.title,
        message: redactSensitiveText(payload.message),
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        correlationId: payload.correlationId,
        metadata: toSafeJson(payload.metadata, { maskPersonalData: true })
      }
    })
  }
}
