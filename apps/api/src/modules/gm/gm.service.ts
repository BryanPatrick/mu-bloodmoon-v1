import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { GmOccurrencePriority, GmOccurrenceStatus, Prisma } from '@prisma/client'
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
  GmOccurrenceSlaStatus,
  GmOccurrenceSummary,
  GmOccurrenceTimelineEntry,
  GmOccurrenceUpdatePayload
} from './gm.contract'

const defaultPageSize = 20
const maxPageSize = 100
const occurrenceStatuses: GmOccurrenceStatus[] = ['OPEN', 'IN_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'DISMISSED']
const occurrencePriorities: GmOccurrencePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const closingStatuses: GmOccurrenceStatus[] = ['RESOLVED', 'DISMISSED']

// How long an occurrence has, per priority, before it is considered overdue.
// Configurable since what counts as "urgent" is an operational call, not a
// code one. AT_RISK starts at 80% of the target.
function slaHours() {
  const hours = (name: string, fallback: number) => {
    const value = Number(process.env[name])
    return Number.isFinite(value) && value > 0 ? value : fallback
  }
  return {
    CRITICAL: hours('GM_OCCURRENCE_SLA_CRITICAL_HOURS', 4),
    HIGH: hours('GM_OCCURRENCE_SLA_HIGH_HOURS', 24),
    MEDIUM: hours('GM_OCCURRENCE_SLA_MEDIUM_HOURS', 72),
    LOW: hours('GM_OCCURRENCE_SLA_LOW_HOURS', 168)
  } satisfies Record<GmOccurrencePriority, number>
}

function computeSlaStatus(status: GmOccurrenceStatus, priority: GmOccurrencePriority, createdAt: Date): GmOccurrenceSlaStatus {
  if (closingStatuses.includes(status)) return 'CLOSED'
  const targetHours = slaHours()[priority]
  const ageHours = (Date.now() - createdAt.getTime()) / 3_600_000
  if (ageHours >= targetHours) return 'OVERDUE'
  if (ageHours >= targetHours * 0.8) return 'AT_RISK'
  return 'ON_TIME'
}

function extractReason(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || !metadata || !('reason' in metadata)) return null
  const reason = (metadata as { reason?: unknown }).reason
  return typeof reason === 'string' && reason ? reason : null
}
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
    const search = query.search?.trim()
    const where: Prisma.GmOccurrenceWhereInput = {
      ...(query.status && occurrenceStatuses.includes(query.status) ? { status: query.status } : {}),
      ...(query.priority && occurrencePriorities.includes(query.priority) ? { priority: query.priority } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(search ? { OR: [{ type: { contains: search } }, { description: { contains: search } }] } : {})
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
    const labels = await this.resolveTargetLabels(items)
    return { data: items.map((item) => this.mapOccurrenceSummary(item, labels)), total, page, pageSize }
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
    const [labels, events] = await Promise.all([
      this.resolveTargetLabels([occurrence]),
      this.prisma.auditEvent.findMany({ where: { targetType: 'GmOccurrence', targetId: id }, orderBy: { createdAt: 'asc' } })
    ])
    const notes = occurrence.notes.map((note) => ({
      id: note.id,
      note: note.note,
      author: note.author.username,
      createdAt: note.createdAt.toISOString()
    }))
    const timeline: GmOccurrenceTimelineEntry[] = [
      ...notes.map((note): GmOccurrenceTimelineEntry => ({
        id: note.id,
        kind: 'NOTE',
        action: 'gm.occurrence.note_added',
        actor: note.author,
        note: note.note,
        reason: null,
        createdAt: note.createdAt
      })),
      ...events.map((event): GmOccurrenceTimelineEntry => ({
        id: event.id,
        kind: 'EVENT',
        action: event.action,
        actor: event.actorUsername,
        note: null,
        reason: extractReason(event.metadata),
        createdAt: event.createdAt.toISOString()
      }))
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return {
      ...this.mapOccurrenceSummary(occurrence, labels),
      notes,
      timeline
    }
  }

  async createOccurrence(payload: GmOccurrenceCreatePayload, user: AuthenticatedUser): Promise<GmOccurrenceDetail> {
    const type = payload.type?.trim()
    const description = payload.description?.trim()
    if (!type || !description) throw new BadRequestException('type and description are required')
    if (payload.priority && !occurrencePriorities.includes(payload.priority)) {
      throw new BadRequestException('Invalid priority')
    }

    const occurrence = await this.prisma.gmOccurrence.create({
      data: {
        type,
        priority: payload.priority || 'MEDIUM',
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
      metadata: { type, priority: occurrence.priority, targetType: payload.targetType, targetId: payload.targetId, result: 'success' }
    })

    return this.getOccurrence(occurrence.id)
  }

  async updateOccurrence(id: string, payload: GmOccurrenceUpdatePayload, user: AuthenticatedUser): Promise<GmOccurrenceDetail> {
    const occurrence = await this.prisma.gmOccurrence.findUnique({ where: { id } })
    if (!occurrence) throw new NotFoundException('Occurrence not found')

    const reason = payload.reason?.trim()
    if (payload.status && closingStatuses.includes(payload.status) && (!reason || reason.length < 5)) {
      throw new BadRequestException('A justification with at least 5 characters is required to resolve or dismiss an occurrence')
    }
    if (payload.status && !occurrenceStatuses.includes(payload.status)) {
      throw new BadRequestException('Invalid status')
    }
    if (payload.priority && !occurrencePriorities.includes(payload.priority)) {
      throw new BadRequestException('Invalid priority')
    }

    const updated = await this.prisma.gmOccurrence.update({
      where: { id },
      data: {
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.status && closingStatuses.includes(payload.status) ? { resolvedAt: new Date() } : {}),
        ...(payload.priority ? { priority: payload.priority } : {}),
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
        previousPriority: occurrence.priority,
        nextPriority: updated.priority,
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

  // Best-effort: GM.targetType/targetId is free text the GM typed, not a
  // real foreign key, so an unrecognized type or a stale/typo'd id simply
  // resolves to no label -- it never blocks listing or viewing occurrences.
  private async resolveTargetLabels(occurrences: Array<{ targetType: string | null; targetId: string | null }>) {
    const idsByType = new Map<string, Set<string>>()
    for (const occurrence of occurrences) {
      if (!occurrence.targetType || !occurrence.targetId) continue
      const key = occurrence.targetType.trim().toLowerCase()
      if (!idsByType.has(key)) idsByType.set(key, new Set())
      idsByType.get(key)!.add(occurrence.targetId)
    }

    const labels = new Map<string, string>()
    const tasks: Array<Promise<void>> = []

    const accountIds = [...(idsByType.get('account') || [])]
    if (accountIds.length) {
      tasks.push(
        this.prisma.account.findMany({ where: { id: { in: accountIds } }, select: { id: true, username: true } }).then((rows) => {
          for (const row of rows) labels.set(`account:${row.id}`, row.username)
        })
      )
    }
    const characterIds = [...(idsByType.get('accountcharacter') || []), ...(idsByType.get('character') || [])]
    if (characterIds.length) {
      tasks.push(
        this.prisma.accountCharacter.findMany({ where: { id: { in: characterIds } }, select: { id: true, name: true } }).then((rows) => {
          for (const row of rows) {
            labels.set(`accountcharacter:${row.id}`, row.name)
            labels.set(`character:${row.id}`, row.name)
          }
        })
      )
    }
    const guildIds = [...(idsByType.get('guild') || [])]
    if (guildIds.length) {
      tasks.push(
        this.prisma.guild.findMany({ where: { id: { in: guildIds } }, select: { id: true, name: true, tag: true } }).then((rows) => {
          for (const row of rows) labels.set(`guild:${row.id}`, `${row.name} [${row.tag}]`)
        })
      )
    }
    const eventRunIds = [...(idsByType.get('gmeventrun') || [])]
    if (eventRunIds.length) {
      tasks.push(
        this.prisma.gmEventRun
          .findMany({ where: { id: { in: eventRunIds } }, include: { definition: { select: { name: true } } } })
          .then((rows) => {
            for (const row of rows) labels.set(`gmeventrun:${row.id}`, row.definition.name)
          })
      )
    }

    await Promise.all(tasks)
    return labels
  }

  private mapOccurrenceSummary = (
    occurrence: {
      id: string
      type: string
      priority: GmOccurrencePriority
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
    },
    labels: Map<string, string>
  ): GmOccurrenceSummary => ({
    id: occurrence.id,
    type: occurrence.type,
    priority: occurrence.priority,
    description: occurrence.description,
    targetType: occurrence.targetType,
    targetId: occurrence.targetId,
    targetLabel:
      occurrence.targetType && occurrence.targetId
        ? labels.get(`${occurrence.targetType.trim().toLowerCase()}:${occurrence.targetId}`) || null
        : null,
    status: occurrence.status,
    slaStatus: computeSlaStatus(occurrence.status, occurrence.priority, occurrence.createdAt),
    createdBy: occurrence.createdBy.username,
    assignedTo: occurrence.assignedTo?.username || null,
    createdAt: occurrence.createdAt.toISOString(),
    updatedAt: occurrence.updatedAt.toISOString(),
    resolvedAt: occurrence.resolvedAt?.toISOString() || null,
    noteCount: occurrence._count.notes
  })
}
