import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { GmEventRunStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  GmEventDefinitionCreatePayload,
  GmEventDefinitionSummary,
  GmEventResultSubmitPayload,
  GmEventResultValidatePayload,
  GmEventRunCancelPayload,
  GmEventRunCreatePayload,
  GmEventRunDetail,
  GmEventRunEndPayload,
  GmEventRunListQuery,
  GmEventRunProblemPayload,
  GmEventRunSummary,
  GmEventScheduleCreatePayload,
  GmEventScheduleSummary
} from './gm-events.contract'

const defaultPageSize = 20
const maxPageSize = 100
// AUTOMATED definitions have no driver this round -- there is no live
// connection to the MU game server (see schema.prisma header comment and
// game-integration.contract.ts), so nothing can execute an AUTOMATED run.
// Only definitions a human is meant to operate can have a run started.
const gmStartableModes = ['MANUAL_GM', 'HYBRID']

function pagination(query: { page?: string; pageSize?: string }) {
  const page = Math.max(1, Number.parseInt(query.page || '', 10) || 1)
  const pageSize = Math.min(Math.max(1, Number.parseInt(query.pageSize || '', 10) || defaultPageSize), maxPageSize)
  return { page, pageSize, skip: (page - 1) * pageSize }
}

@Injectable()
export class GmEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // -- Definitions & schedule: ADMIN/SUPER_ADMIN configure, GM only views --

  async createDefinition(payload: GmEventDefinitionCreatePayload, user: AuthenticatedUser): Promise<GmEventDefinitionSummary> {
    const key = payload.key?.trim()
    const name = payload.name?.trim()
    const category = payload.category?.trim()
    if (!key || !name || !category) throw new BadRequestException('key, name and category are required')

    const definition = await this.prisma.gmEventDefinition.create({
      data: { key, name, description: payload.description?.trim() || null, category, executionMode: payload.executionMode, createdById: user.id }
    })
    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'gm.event.definition.created',
      targetType: 'GmEventDefinition', targetId: definition.id, metadata: { key, name, category, executionMode: payload.executionMode, result: 'success' }
    })
    return this.mapDefinition(definition)
  }

  async listDefinitions(): Promise<GmEventDefinitionSummary[]> {
    const definitions = await this.prisma.gmEventDefinition.findMany({ orderBy: { name: 'asc' } })
    return definitions.map(this.mapDefinition)
  }

  async createSchedule(definitionId: string, payload: GmEventScheduleCreatePayload, user: AuthenticatedUser): Promise<GmEventScheduleSummary> {
    const definition = await this.prisma.gmEventDefinition.findUnique({ where: { id: definitionId } })
    if (!definition) throw new NotFoundException('Event definition not found')
    const startsAt = new Date(payload.startsAt)
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Invalid startsAt')
    const endsAt = payload.endsAt ? new Date(payload.endsAt) : null
    if (endsAt && Number.isNaN(endsAt.getTime())) throw new BadRequestException('Invalid endsAt')

    const schedule = await this.prisma.gmEventSchedule.create({
      data: {
        definitionId,
        startsAt,
        endsAt,
        recurrenceNote: payload.recurrenceNote?.trim() || null,
        notes: payload.notes?.trim() || null
      }
    })
    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'gm.event.schedule.created',
      targetType: 'GmEventSchedule', targetId: schedule.id, metadata: { definitionId, startsAt: payload.startsAt, result: 'success' }
    })
    return { ...schedule, definitionName: definition.name, startsAt: schedule.startsAt.toISOString(), endsAt: schedule.endsAt?.toISOString() || null }
  }

  async agenda(): Promise<GmEventScheduleSummary[]> {
    const schedules = await this.prisma.gmEventSchedule.findMany({
      where: { startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { startsAt: 'asc' },
      take: 50,
      include: { definition: { select: { name: true } } }
    })
    return schedules.map((schedule) => ({
      id: schedule.id,
      definitionId: schedule.definitionId,
      definitionName: schedule.definition.name,
      startsAt: schedule.startsAt.toISOString(),
      endsAt: schedule.endsAt?.toISOString() || null,
      recurrenceNote: schedule.recurrenceNote,
      notes: schedule.notes
    }))
  }

  // -- Runs: the GM-operable surface --

  async listRuns(query: GmEventRunListQuery): Promise<{ data: GmEventRunSummary[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.GmEventRunWhereInput = {
      ...(query.status ? { status: query.status } : {})
    }
    const [items, total] = await Promise.all([
      this.prisma.gmEventRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: this.runInclude()
      }),
      this.prisma.gmEventRun.count({ where })
    ])
    return { data: items.map(this.mapRunSummary), total, page, pageSize }
  }

  async getRun(id: string): Promise<GmEventRunDetail> {
    const run = await this.prisma.gmEventRun.findUnique({ where: { id }, include: { ...this.runInclude(), result: { include: { validatedBy: { select: { username: true } } } } } })
    if (!run) throw new NotFoundException('Event run not found')
    return {
      ...this.mapRunSummary(run),
      result: run.result
        ? {
            id: run.result.id,
            summary: run.result.summary,
            participantCount: run.result.participantCount,
            status: run.result.status,
            validatedBy: run.result.validatedBy?.username || null,
            validatedAt: run.result.validatedAt?.toISOString() || null,
            invalidateReason: run.result.invalidateReason
          }
        : null
    }
  }

  async startRun(payload: GmEventRunCreatePayload, user: AuthenticatedUser): Promise<GmEventRunDetail> {
    const definition = await this.prisma.gmEventDefinition.findUnique({ where: { id: payload.definitionId } })
    if (!definition) throw new NotFoundException('Event definition not found')
    if (definition.status !== 'ACTIVE') throw new BadRequestException('This event definition is not active')
    if (!gmStartableModes.includes(definition.executionMode)) {
      throw new BadRequestException('AUTOMATED events have no manual driver yet -- they cannot be started by a GM')
    }
    if (payload.scheduleId) {
      const schedule = await this.prisma.gmEventSchedule.findUnique({ where: { id: payload.scheduleId } })
      if (!schedule || schedule.definitionId !== payload.definitionId) throw new BadRequestException('Schedule does not belong to this event definition')
    }

    const run = await this.prisma.gmEventRun.create({
      data: {
        definitionId: payload.definitionId,
        scheduleId: payload.scheduleId || null,
        status: 'ACTIVE',
        origin: 'PORTAL_ONLY',
        startedById: user.id,
        startedAt: new Date()
      },
      include: this.runInclude()
    })
    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'gm.event.run.started',
      targetType: 'GmEventRun', targetId: run.id, severity: 'warning',
      metadata: { definitionId: payload.definitionId, definitionKey: definition.key, origin: 'PORTAL_ONLY', result: 'success' }
    })
    return this.getRun(run.id)
  }

  async endRun(id: string, payload: GmEventRunEndPayload, user: AuthenticatedUser): Promise<GmEventRunDetail> {
    const run = await this.requireRun(id)
    if (run.status !== 'ACTIVE') throw new BadRequestException('Only an active run can be ended')

    await this.prisma.gmEventRun.update({ where: { id }, data: { status: 'COMPLETED', endedById: user.id, endedAt: new Date() } })
    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'gm.event.run.ended',
      targetType: 'GmEventRun', targetId: id, metadata: { note: payload.note || null, result: 'success' }
    })
    return this.getRun(id)
  }

  async reportProblem(id: string, payload: GmEventRunProblemPayload, user: AuthenticatedUser): Promise<GmEventRunDetail> {
    const note = payload.note?.trim()
    if (!note) throw new BadRequestException('note is required')
    const run = await this.requireRun(id)
    if (run.status === 'CANCELLED') throw new BadRequestException('A cancelled run cannot report a problem')

    await this.prisma.gmEventRun.update({ where: { id }, data: { status: 'PROBLEM_REPORTED', problemNote: note } })
    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'gm.event.run.problem_reported',
      targetType: 'GmEventRun', targetId: id, severity: 'warning', metadata: { note, result: 'success' }
    })
    return this.getRun(id)
  }

  async cancelRun(id: string, payload: GmEventRunCancelPayload, user: AuthenticatedUser): Promise<GmEventRunDetail> {
    const reason = payload.reason?.trim()
    if (!reason || reason.length < 5) throw new BadRequestException('A justification with at least 5 characters is required to cancel an event run')
    const run = await this.requireRun(id)
    if (!['SCHEDULED', 'ACTIVE', 'PROBLEM_REPORTED'].includes(run.status)) {
      throw new BadRequestException('This run can no longer be cancelled')
    }

    await this.prisma.gmEventRun.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledById: user.id, cancelledAt: new Date(), cancelReason: reason }
    })
    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'gm.event.run.cancelled',
      targetType: 'GmEventRun', targetId: id, severity: 'warning', metadata: { reason, result: 'success' }
    })
    return this.getRun(id)
  }

  async submitResult(id: string, payload: GmEventResultSubmitPayload, user: AuthenticatedUser): Promise<GmEventRunDetail> {
    const summary = payload.summary?.trim()
    if (!summary) throw new BadRequestException('summary is required')
    const run = await this.requireRun(id)
    if (run.status !== 'COMPLETED') throw new BadRequestException('A result can only be submitted for a completed run')

    const existing = await this.prisma.gmEventResult.findUnique({ where: { runId: id } })
    if (existing) throw new BadRequestException('This run already has a result')

    await this.prisma.gmEventResult.create({
      data: { runId: id, summary, participantCount: payload.participantCount ?? null, createdById: user.id }
    })
    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'gm.event.result.submitted',
      targetType: 'GmEventRun', targetId: id, metadata: { result: 'success' }
    })
    return this.getRun(id)
  }

  async validateResult(id: string, payload: GmEventResultValidatePayload, user: AuthenticatedUser): Promise<GmEventRunDetail> {
    const result = await this.prisma.gmEventResult.findUnique({ where: { runId: id } })
    if (!result) throw new NotFoundException('This run has no result to validate')
    if (result.status !== 'PENDING_VALIDATION') throw new BadRequestException('This result was already validated')
    if (payload.status === 'INVALIDATED' && (!payload.reason || payload.reason.trim().length < 5)) {
      throw new BadRequestException('A justification with at least 5 characters is required to invalidate a result')
    }

    await this.prisma.gmEventResult.update({
      where: { runId: id },
      data: {
        status: payload.status,
        validatedById: user.id,
        validatedAt: new Date(),
        invalidateReason: payload.status === 'INVALIDATED' ? payload.reason!.trim() : null
      }
    })
    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'gm.event.result.validated',
      targetType: 'GmEventRun', targetId: id, severity: 'warning', metadata: { status: payload.status, reason: payload.reason || null, result: 'success' }
    })
    return this.getRun(id)
  }

  private async requireRun(id: string) {
    const run = await this.prisma.gmEventRun.findUnique({ where: { id } })
    if (!run) throw new NotFoundException('Event run not found')
    return run
  }

  private runInclude() {
    return {
      definition: { select: { name: true } },
      startedBy: { select: { username: true } },
      endedBy: { select: { username: true } },
      cancelledBy: { select: { username: true } },
      result: { select: { id: true } }
    } satisfies Prisma.GmEventRunInclude
  }

  private mapRunSummary = (run: {
    id: string
    definitionId: string
    definition: { name: string }
    scheduleId: string | null
    status: GmEventRunStatus
    origin: string
    startedBy: { username: string } | null
    startedAt: Date | null
    endedBy: { username: string } | null
    endedAt: Date | null
    cancelledBy: { username: string } | null
    cancelledAt: Date | null
    cancelReason: string | null
    problemNote: string | null
    result: { id: string } | null
    createdAt: Date
  }): GmEventRunSummary => ({
    id: run.id,
    definitionId: run.definitionId,
    definitionName: run.definition.name,
    scheduleId: run.scheduleId,
    status: run.status,
    origin: run.origin,
    startedBy: run.startedBy?.username || null,
    startedAt: run.startedAt?.toISOString() || null,
    endedBy: run.endedBy?.username || null,
    endedAt: run.endedAt?.toISOString() || null,
    cancelledBy: run.cancelledBy?.username || null,
    cancelledAt: run.cancelledAt?.toISOString() || null,
    cancelReason: run.cancelReason,
    problemNote: run.problemNote,
    hasResult: Boolean(run.result),
    createdAt: run.createdAt.toISOString()
  })

  private mapDefinition = (definition: {
    id: string
    key: string
    name: string
    description: string | null
    category: string
    executionMode: GmEventDefinitionSummary['executionMode']
    status: GmEventDefinitionSummary['status']
    createdAt: Date
  }): GmEventDefinitionSummary => ({
    id: definition.id,
    key: definition.key,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    executionMode: definition.executionMode,
    status: definition.status,
    createdAt: definition.createdAt.toISOString()
  })
}
