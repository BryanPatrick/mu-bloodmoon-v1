import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AdminAuditQuery } from './admin-audit.contract'

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminAuditQuery) {
    const page = toPositiveInt(query.page, 1)
    const pageSize = Math.min(toPositiveInt(query.pageSize, 30), 100)
    const search = query.search?.trim()

    const where: Prisma.AuditEventWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: 'insensitive' } },
              { targetType: { contains: search, mode: 'insensitive' } },
              { targetId: { contains: search, mode: 'insensitive' } },
              { actorUsername: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [items, total, warnings, errors, authFailures] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.count({ where: { severity: 'warning' } }),
      this.prisma.auditEvent.count({ where: { severity: 'error' } }),
      this.prisma.auditEvent.count({ where: { action: { contains: 'auth.login.failed', mode: 'insensitive' } } })
    ])

    return {
      items: items.map((event) => ({
        id: event.id,
        actorId: event.actorId,
        actorUsername: event.actorUsername || 'system',
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        severity: event.severity,
        metadata: event.metadata,
        createdAt: event.createdAt.toISOString()
      })),
      total,
      page,
      pageSize,
      summary: {
        total,
        warnings,
        errors,
        authFailures
      }
    }
  }
}
