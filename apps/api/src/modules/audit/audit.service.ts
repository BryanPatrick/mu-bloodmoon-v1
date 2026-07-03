import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuditSeverity } from './audit.contract'

type RecordAuditPayload = {
  actorId?: string | null
  actorUsername?: string | null
  action: string
  targetType: string
  targetId?: string | null
  severity?: AuditSeverity
  metadata?: Record<string, unknown>
}

const jsonValue = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined || value === null ? undefined : value as Prisma.InputJsonValue

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(payload: RecordAuditPayload) {
    return this.prisma.auditEvent.create({
      data: {
        actorId: payload.actorId || null,
        actorUsername: payload.actorUsername || 'system',
        action: payload.action,
        targetType: payload.targetType,
        targetId: payload.targetId || null,
        severity: payload.severity || 'info',
        metadata: jsonValue(payload.metadata)
      }
    })
  }
}
