import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { GmOccurrenceStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  GmDashboardSummary,
  GmLogEntry,
  GmLogsQuery,
  GmOccurrenceCreatePayload,
  GmOccurrenceDetail,
  GmOccurrenceListQuery,
  GmOccurrenceNoteCreatePayload,
  GmOccurrenceSummary,
  GmOccurrenceUpdatePayload
} from './gm.contract'

const defaultPageSize = 20
const maxPageSize = 100
const occurrenceStatuses: GmOccurrenceStatus[] = ['OPEN', 'IN_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'DISMISSED']
// GM's log view is deliberately restricted to game/community/guild-facing
// modules -- never system/security/finance/commerce, matching "não entregar
// log bruto irrestrito da infraestrutura".
const gmVisibleLogModules = ['community', 'guilds', 'characters', 'marketplace']

function pagination(query: { page?: string; pageSize?: string }) {
  const page = Math.max(1, Number.parseInt(query.page || '', 10) || 1)
  const pageSize = Math.min(Math.max(1, Number.parseInt(query.pageSize || '', 10) || defaultPageSize), maxPageSize)
  return { page, pageSize, skip: (page - 1) * pageSize }
}

@Injectable()
export class GmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async dashboard(user: AuthenticatedUser): Promise<GmDashboardSummary> {
    const [occurrenceCounts, totalCharacters, onlineCharacters, recentAlerts, recentActions] = await Promise.all([
      this.prisma.gmOccurrence.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.accountCharacter.count(),
      this.prisma.accountCharacter.count({ where: { status: 'ONLINE' } }),
      this.prisma.systemAlert.findMany({
        where: { module: { in: gmVisibleLogModules }, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      this.prisma.auditEvent.findMany({
        where: { actorId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    const byStatus = Object.fromEntries(occurrenceStatuses.map((status) => [status, 0])) as Record<GmOccurrenceStatus, number>
    for (const row of occurrenceCounts) byStatus[row.status] = row._count.status
    const total = occurrenceCounts.reduce((sum, row) => sum + row._count.status, 0)
    const open = byStatus.OPEN + byStatus.IN_REVIEW + byStatus.ACTION_REQUIRED

    return {
      occurrences: { total, open, byStatus },
      characters: { total: totalCharacters, online: onlineCharacters },
      recentAlerts: recentAlerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        createdAt: alert.createdAt.toISOString()
      })),
      recentActions: recentActions.map((event) => ({
        id: event.id,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        result: event.result,
        createdAt: event.createdAt.toISOString()
      }))
    }
  }

  async logs(query: GmLogsQuery): Promise<{ data: GmLogEntry[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, skip } = pagination(query)
    const requestedModule = query.module && gmVisibleLogModules.includes(query.module) ? query.module : undefined
    const where: Prisma.OperationalEventWhereInput = {
      module: requestedModule ? requestedModule : { in: gmVisibleLogModules }
    }
    const [items, total] = await Promise.all([
      this.prisma.operationalEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, skip, take: pageSize }),
      this.prisma.operationalEvent.count({ where })
    ])
    return {
      data: items.map((item) => ({
        id: item.id,
        module: item.module,
        eventType: item.eventType,
        severity: item.severity,
        entityType: item.entityType,
        entityId: item.entityId,
        description: item.description,
        occurredAt: item.occurredAt.toISOString()
      })),
      total,
      page,
      pageSize
    }
  }

  async listOccurrences(query: GmOccurrenceListQuery): Promise<{ data: GmOccurrenceSummary[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.GmOccurrenceWhereInput = {
      ...(query.status && occurrenceStatuses.includes(query.status) ? { status: query.status } : {})
    }
    const [items, total] = await Promise.all([
      this.prisma.gmOccurrence.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          createdBy: { select: { username: true } },
          assignedTo: { select: { username: true } },
          _count: { select: { notes: true } }
        }
      }),
      this.prisma.gmOccurrence.count({ where })
    ])
    return { data: items.map(this.mapOccurrenceSummary), total, page, pageSize }
  }

  async getOccurrence(id: string): Promise<GmOccurrenceDetail> {
    const occurrence = await this.prisma.gmOccurrence.findUnique({
      where: { id },
      include: {
        createdBy: { select: { username: true } },
        assignedTo: { select: { username: true } },
        _count: { select: { notes: true } },
        notes: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { username: true } } }
        }
      }
    })
    if (!occurrence) throw new NotFoundException('Occurrence not found')
    return {
      ...this.mapOccurrenceSummary(occurrence),
      notes: occurrence.notes.map((note) => ({
        id: note.id,
        note: note.note,
        author: note.author.username,
        createdAt: note.createdAt.toISOString()
      }))
    }
  }

  async createOccurrence(payload: GmOccurrenceCreatePayload, user: AuthenticatedUser): Promise<GmOccurrenceDetail> {
    const type = payload.type?.trim()
    const description = payload.description?.trim()
    if (!type || !description) throw new BadRequestException('type and description are required')

    const occurrence = await this.prisma.gmOccurrence.create({
      data: {
        type,
        description,
        targetType: payload.targetType?.trim() || null,
        targetId: payload.targetId?.trim() || null,
        assignedToId: payload.assignedToId || null,
        createdById: user.id
      }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'gm.occurrence.created',
      targetType: 'GmOccurrence',
      targetId: occurrence.id,
      metadata: { type, targetType: payload.targetType, targetId: payload.targetId, result: 'success' }
    })

    return this.getOccurrence(occurrence.id)
  }

  async updateOccurrence(id: string, payload: GmOccurrenceUpdatePayload, user: AuthenticatedUser): Promise<GmOccurrenceDetail> {
    const occurrence = await this.prisma.gmOccurrence.findUnique({ where: { id } })
    if (!occurrence) throw new NotFoundException('Occurrence not found')

    const closingStatuses: GmOccurrenceStatus[] = ['RESOLVED', 'DISMISSED']
    const reason = payload.reason?.trim()
    if (payload.status && closingStatuses.includes(payload.status) && (!reason || reason.length < 5)) {
      throw new BadRequestException('A justification with at least 5 characters is required to resolve or dismiss an occurrence')
    }
    if (payload.status && !occurrenceStatuses.includes(payload.status)) {
      throw new BadRequestException('Invalid status')
    }

    const updated = await this.prisma.gmOccurrence.update({
      where: { id },
      data: {
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.status && closingStatuses.includes(payload.status) ? { resolvedAt: new Date() } : {}),
        ...(payload.assignedToId !== undefined ? { assignedToId: payload.assignedToId } : {})
      }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'gm.occurrence.updated',
      targetType: 'GmOccurrence',
      targetId: id,
      severity: payload.status && closingStatuses.includes(payload.status) ? 'warning' : 'info',
      metadata: {
        previousStatus: occurrence.status,
        nextStatus: updated.status,
        assignedToId: payload.assignedToId,
        reason: reason || null,
        result: 'success'
      }
    })

    return this.getOccurrence(id)
  }

  async addNote(id: string, payload: GmOccurrenceNoteCreatePayload, user: AuthenticatedUser): Promise<GmOccurrenceDetail> {
    const note = payload.note?.trim()
    if (!note) throw new BadRequestException('note is required')
    const occurrence = await this.prisma.gmOccurrence.findUnique({ where: { id } })
    if (!occurrence) throw new NotFoundException('Occurrence not found')

    await this.prisma.gmOccurrenceNote.create({
      data: { occurrenceId: id, authorId: user.id, note }
    })
    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'gm.occurrence.note_added',
      targetType: 'GmOccurrence',
      targetId: id
    })

    return this.getOccurrence(id)
  }

  private mapOccurrenceSummary = (occurrence: {
    id: string
    type: string
    description: string
    targetType: string | null
    targetId: string | null
    status: GmOccurrenceStatus
    createdAt: Date
    updatedAt: Date
    resolvedAt: Date | null
    createdBy: { username: string }
    assignedTo: { username: string } | null
    _count: { notes: number }
  }): GmOccurrenceSummary => ({
    id: occurrence.id,
    type: occurrence.type,
    description: occurrence.description,
    targetType: occurrence.targetType,
    targetId: occurrence.targetId,
    status: occurrence.status,
    createdBy: occurrence.createdBy.username,
    assignedTo: occurrence.assignedTo?.username || null,
    createdAt: occurrence.createdAt.toISOString(),
    updatedAt: occurrence.updatedAt.toISOString(),
    resolvedAt: occurrence.resolvedAt?.toISOString() || null,
    noteCount: occurrence._count.notes
  })
}
