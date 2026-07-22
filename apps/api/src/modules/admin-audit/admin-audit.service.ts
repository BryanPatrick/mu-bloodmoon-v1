import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { AdminAuditQuery } from './admin-audit.contract'

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const hiddenKeys = /password|token|secret|localpath|publicpath|root|bucket|credential/i
const sanitizeMetadata = (value: unknown, maskNetwork: boolean): unknown => {
  if (Array.isArray(value)) return value.map((item) => sanitizeMetadata(item, maskNetwork))
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && (/^[A-Za-z]:\\/.test(value) || value.startsWith('internal://'))) return 'Informação interna protegida'
    return value
  }
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (hiddenKeys.test(key)) return [key, 'Informação protegida']
    if (maskNetwork && key.toLowerCase() === 'ip' && typeof item === 'string') return [key, item.replace(/\d+$/, '***')]
    return [key, sanitizeMetadata(item, maskNetwork)]
  }))
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminAuditQuery, user: AuthenticatedUser) {
    const page = toPositiveInt(query.page, 1)
    const pageSize = Math.min(toPositiveInt(query.pageSize, 30), 100)
    const search = query.search?.trim()

    const where: Prisma.AuditEventWhereInput = {
      ...(user.role === 'ADMIN'
        ? {
            NOT: [
              { action: { contains: 'finance' } },
              { action: { contains: 'recharge' } },
              { action: { contains: 'role.changed' } },
              { action: { contains: 'server-setting' } }
            ]
          }
        : {}),
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
        actorUsername: event.actorUsername || 'system',
        action: event.action,
        targetType: event.targetType,
        severity: event.severity,
        metadata: sanitizeMetadata(event.metadata, user.role === 'ADMIN'),
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
