import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { sanitizeSensitiveData } from '../../common/sensitive-data'
import type { AuthenticatedUser } from '../auth/auth.types'
import { permissionKeys } from '../auth/permissions'
import type { AdminAuditQuery } from './admin-audit.contract'

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminAuditQuery, user: AuthenticatedUser) {
    const page = toPositiveInt(query.page, 1)
    const pageSize = Math.min(toPositiveInt(query.pageSize, 30), 100)
    const search = query.search?.trim()
    const fullView =
      user.role === 'SUPER_ADMIN' ||
      user.permissions.includes('*') ||
      user.permissions.includes(permissionKeys.adminAuditFullView)

    const where: Prisma.AuditEventWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search } },
              { targetType: { contains: search } },
              { targetId: { contains: search } },
              { actorUsername: { contains: search } }
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
      this.prisma.auditEvent.count({ where: { AND: [where, { severity: 'warning' }] } }),
      this.prisma.auditEvent.count({ where: { AND: [where, { severity: 'error' }] } }),
      this.prisma.auditEvent.count({ where: { AND: [where, { action: { contains: 'auth.login.failed' } }] } })
    ])

    return {
      items: items.map((event) => ({
        id: event.id,
        module: event.module,
        actorId: event.actorId,
        actorUsername: event.actorUsername || 'system',
        actorRole: event.actorRole,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        targetUserId: event.targetUserId,
        result: event.result,
        severity: event.severity,
        correlationId: event.correlationId,
        beforeData: sanitizeSensitiveData(event.beforeData, { maskPersonalData: !fullView }),
        afterData: sanitizeSensitiveData(event.afterData, { maskPersonalData: !fullView }),
        metadata: sanitizeSensitiveData(event.metadata, { maskPersonalData: !fullView }),
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
