import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { BugReportCategory, BugReportSeverity, BugReportStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { BetaRewardsService } from '../beta-rewards/beta-rewards.service'

// Phase Z -- Bug Hunters MVP. Distinct from SupportTicket (personal/
// account/support issue): a BugReport is a reproducible product/game
// defect intended for Beta triage. XSS/injection safety follows the same
// convention as CommunityService's own player text -- stored raw, never
// HTML-stripped server-side; the frontend renders it through Vue's
// default text interpolation (auto-escaped), never v-html. This service
// only enforces length/shape, matching that existing division of
// responsibility rather than inventing a second, redundant sanitizer.

const categories: BugReportCategory[] = [
  'LAUNCHER', 'LOGIN_ACCOUNT', 'GAMEPLAY', 'MAP_MONSTER', 'ITEM', 'EVENT', 'QUEST',
  'VIP', 'STORE_PAYMENT', 'MARKETPLACE', 'GUILD', 'COMMUNITY', 'PORTAL', 'PERFORMANCE', 'OTHER'
]
const severities: BugReportSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const statuses: BugReportStatus[] = [
  'OPEN', 'TRIAGE', 'NEEDS_INFO', 'CONFIRMED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'DUPLICATE', 'NOT_A_BUG'
]
const terminalStatuses: BugReportStatus[] = ['RESOLVED', 'CLOSED', 'DUPLICATE', 'NOT_A_BUG']

const MAX_SHORT = 191
const MAX_LONG = 5000
const SUBMIT_COOLDOWN_SECONDS = 60
const SUBMIT_DAILY_LIMIT = 20

type CreatePayload = {
  category?: string
  title?: string
  description?: string
  stepsToReproduce?: string
  expectedBehavior?: string
  actualBehavior?: string
  playerSeverity?: string
  characterName?: string
  contextNote?: string
  attachmentRef?: string
  consentAcknowledged?: boolean
}

@Injectable()
export class BugHuntersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly betaRewards: BetaRewardsService
  ) {}

  // -------------------------------------------------------------------
  // Player-facing
  // -------------------------------------------------------------------

  async createReport(payload: CreatePayload, user: AuthenticatedUser) {
    if (!payload.category || !categories.includes(payload.category as BugReportCategory)) {
      throw new BadRequestException('Selecione uma categoria valida.')
    }
    if (!payload.playerSeverity || !severities.includes(payload.playerSeverity as BugReportSeverity)) {
      throw new BadRequestException('Selecione a severidade percebida.')
    }
    if (!payload.consentAcknowledged) {
      throw new BadRequestException('E preciso confirmar que o relato podera ser revisado pela equipe.')
    }
    const title = requireField(payload.title, 'titulo', 4, MAX_SHORT)
    const description = requireField(payload.description, 'descricao', 10, MAX_LONG)
    const stepsToReproduce = requireField(payload.stepsToReproduce, 'passos para reproduzir', 5, MAX_LONG)
    const expectedBehavior = requireField(payload.expectedBehavior, 'comportamento esperado', 5, MAX_LONG)
    const actualBehavior = requireField(payload.actualBehavior, 'comportamento observado', 5, MAX_LONG)
    const characterName = optionalField(payload.characterName, 80)
    const contextNote = optionalField(payload.contextNote, MAX_LONG)
    const attachmentRef = validateAttachmentRef(payload.attachmentRef)

    await this.enforceSubmissionLimits(user.id)
    const possibleDuplicateOf = await this.findPossibleDuplicates(user.id, title)

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bugReport.create({
        data: {
          accountId: user.id,
          category: payload.category as BugReportCategory,
          title,
          description,
          stepsToReproduce,
          expectedBehavior,
          actualBehavior,
          playerSeverity: payload.playerSeverity as BugReportSeverity,
          characterName,
          contextNote,
          attachmentRef,
          consentAcknowledgedAt: new Date()
        }
      })
      await tx.bugReportEvent.create({
        data: { bugReportId: created.id, type: 'CREATED', actorId: user.id, isInternal: false }
      })
      return created
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'bug-hunters.report.created',
      targetType: 'BugReport',
      targetId: report.id,
      metadata: { category: report.category, playerSeverity: report.playerSeverity, result: 'success' }
    })

    return { ...report, possibleDuplicateOf }
  }

  listOwnReports(user: AuthenticatedUser) {
    return this.prisma.bugReport.findMany({
      where: { accountId: user.id },
      select: {
        id: true, category: true, title: true, playerSeverity: true, staffSeverity: true,
        status: true, createdAt: true, updatedAt: true, resolvedAt: true, closedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 200
    })
  }

  async getOwnReport(id: string, user: AuthenticatedUser) {
    const report = await this.prisma.bugReport.findUnique({
      where: { id },
      include: { events: { where: { isInternal: false }, orderBy: { createdAt: 'asc' }, include: { actor: { select: { username: true, role: true } } } } }
    })
    if (!report) throw new NotFoundException('Relato nao encontrado.')
    if (report.accountId !== user.id) throw new ForbiddenException('Este relato pertence a outra conta.')
    return report
  }

  async addPlayerInfo(id: string, message: string | undefined, user: AuthenticatedUser) {
    const report = await this.prisma.bugReport.findUnique({ where: { id } })
    if (!report) throw new NotFoundException('Relato nao encontrado.')
    if (report.accountId !== user.id) throw new ForbiddenException('Este relato pertence a outra conta.')
    const value = requireField(message, 'mensagem', 2, MAX_LONG)

    const [, updated] = await this.prisma.$transaction([
      this.prisma.bugReportEvent.create({ data: { bugReportId: id, type: 'PLAYER_INFO_ADDED', actorId: user.id, isInternal: false, message: value } }),
      this.prisma.bugReport.update({
        where: { id },
        data: report.status === 'NEEDS_INFO' ? { status: 'TRIAGE' } : {}
      })
    ])

    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'bug-hunters.report.player-info-added',
      targetType: 'BugReport', targetId: id, metadata: { result: 'success' }
    })
    return updated
  }

  // -------------------------------------------------------------------
  // Staff-facing
  // -------------------------------------------------------------------

  listForStaff(filters: { status?: string, category?: string, playerSeverity?: string, assignedToAccountId?: string } = {}) {
    return this.prisma.bugReport.findMany({
      where: {
        ...(filters.status && statuses.includes(filters.status as BugReportStatus) ? { status: filters.status as BugReportStatus } : {}),
        ...(filters.category && categories.includes(filters.category as BugReportCategory) ? { category: filters.category as BugReportCategory } : {}),
        ...(filters.playerSeverity && severities.includes(filters.playerSeverity as BugReportSeverity) ? { playerSeverity: filters.playerSeverity as BugReportSeverity } : {}),
        ...(filters.assignedToAccountId ? { assignedToAccountId: filters.assignedToAccountId } : {})
      },
      include: {
        account: { select: { username: true, name: true } },
        assignee: { select: { username: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 500
    })
  }

  async getForStaff(id: string) {
    const report = await this.prisma.bugReport.findUnique({
      where: { id },
      include: {
        account: { select: { username: true, name: true, email: true } },
        assignee: { select: { username: true } },
        events: { orderBy: { createdAt: 'asc' }, include: { actor: { select: { username: true, role: true } } } }
      }
    })
    if (!report) throw new NotFoundException('Relato nao encontrado.')
    return report
  }

  async assign(id: string, assignedToAccountId: string | undefined, actor: AuthenticatedUser) {
    const report = await this.mustExist(id)
    if (assignedToAccountId) {
      const target = await this.prisma.account.findUnique({ where: { id: assignedToAccountId } })
      if (!target || !['GM', 'ADMIN', 'SUPER_ADMIN'].includes(target.role)) {
        throw new BadRequestException('Selecione um membro valido da equipe.')
      }
    }
    const [, updated] = await this.prisma.$transaction([
      this.prisma.bugReportEvent.create({
        data: { bugReportId: id, type: 'ASSIGNED', actorId: actor.id, isInternal: true, metadata: { previous: report.assignedToAccountId, next: assignedToAccountId || null } }
      }),
      this.prisma.bugReport.update({ where: { id }, data: { assignedToAccountId: assignedToAccountId || null } })
    ])
    await this.audit.record({ actorId: actor.id, actorUsername: actor.username, action: 'bug-hunters.report.assigned', targetType: 'BugReport', targetId: id, metadata: { assignedToAccountId: assignedToAccountId || null, result: 'success' } })
    return updated
  }

  async changeStatus(id: string, status: string | undefined, reason: string | undefined, actor: AuthenticatedUser) {
    const report = await this.mustExist(id)
    if (!status || !statuses.includes(status as BugReportStatus)) throw new BadRequestException('Status invalido.')
    const trimmedReason = reason?.trim()
    if (!trimmedReason || trimmedReason.length < 5) throw new BadRequestException('Informe uma justificativa com pelo menos 5 caracteres.')

    const nextStatus = status as BugReportStatus
    const now = new Date()
    const [, updated] = await this.prisma.$transaction([
      this.prisma.bugReportEvent.create({
        data: { bugReportId: id, type: 'STATUS_CHANGED', actorId: actor.id, isInternal: false, message: trimmedReason, metadata: { previous: report.status, next: nextStatus } }
      }),
      this.prisma.bugReport.update({
        where: { id },
        data: {
          status: nextStatus,
          resolvedAt: nextStatus === 'RESOLVED' ? now : report.resolvedAt,
          closedAt: (nextStatus === 'CLOSED' || nextStatus === 'DUPLICATE' || nextStatus === 'NOT_A_BUG') ? now : report.closedAt
        }
      })
    ])
    await this.audit.record({
      actorId: actor.id, actorUsername: actor.username, action: 'bug-hunters.report.status-changed', targetType: 'BugReport', targetId: id,
      reason: trimmedReason, metadata: { previous: report.status, next: nextStatus, result: 'success' }
    })
    return updated
  }

  async setStaffSeverity(id: string, staffSeverity: string | undefined, actor: AuthenticatedUser) {
    await this.mustExist(id)
    if (!staffSeverity || !severities.includes(staffSeverity as BugReportSeverity)) throw new BadRequestException('Severidade invalida.')
    const [, updated] = await this.prisma.$transaction([
      this.prisma.bugReportEvent.create({ data: { bugReportId: id, type: 'STAFF_SEVERITY_SET', actorId: actor.id, isInternal: true, metadata: { staffSeverity } } }),
      this.prisma.bugReport.update({ where: { id }, data: { staffSeverity: staffSeverity as BugReportSeverity } })
    ])
    await this.audit.record({ actorId: actor.id, actorUsername: actor.username, action: 'bug-hunters.report.staff-severity-set', targetType: 'BugReport', targetId: id, metadata: { staffSeverity, result: 'success' } })
    return updated
  }

  async reply(id: string, message: string | undefined, actor: AuthenticatedUser) {
    await this.mustExist(id)
    const value = requireField(message, 'resposta', 2, MAX_LONG)
    const event = await this.prisma.bugReportEvent.create({ data: { bugReportId: id, type: 'STAFF_REPLY', actorId: actor.id, isInternal: false, message: value } })
    await this.audit.record({ actorId: actor.id, actorUsername: actor.username, action: 'bug-hunters.report.staff-reply', targetType: 'BugReport', targetId: id, metadata: { result: 'success' } })
    return event
  }

  async addInternalNote(id: string, message: string | undefined, actor: AuthenticatedUser) {
    await this.mustExist(id)
    const value = requireField(message, 'nota interna', 2, MAX_LONG)
    // isInternal: true -- never returned by getOwnReport/listOwnReports,
    // enforced by the query filter there, not by anything client-side.
    const event = await this.prisma.bugReportEvent.create({ data: { bugReportId: id, type: 'INTERNAL_NOTE', actorId: actor.id, isInternal: true, message: value } })
    await this.audit.record({ actorId: actor.id, actorUsername: actor.username, action: 'bug-hunters.report.internal-note', targetType: 'BugReport', targetId: id, metadata: { result: 'success' } })
    return event
  }

  /**
   * Part 18: the ONLY link between a BugReport and a real reward. This
   * never pays anything -- it records a BetaParticipationRecord
   * (eligibility fact) via BetaRewardsService, exactly like any other
   * source type. A real BetaRewardEntitlement (and eventually a wallet
   * credit) still requires the separate, explicit generation step staff
   * runs from the Beta Rewards admin page.
   */
  async recordRewardEligibility(id: string, payload: { betaCycleId?: string, justification?: string }, actor: AuthenticatedUser) {
    const report = await this.mustExist(id)
    const account = await this.prisma.account.findUnique({ where: { id: report.accountId }, select: { email: true } })
    if (!account) throw new NotFoundException('Conta do relato nao encontrada.')

    const record = await this.betaRewards.recordParticipation(
      {
        betaCycleId: payload.betaCycleId,
        email: account.email,
        accountId: report.accountId,
        sourceType: 'BUG_HUNTER_CONTRIBUTION',
        sourceId: report.id,
        justification: payload.justification
      },
      actor
    )

    await this.prisma.bugReportEvent.create({
      data: { bugReportId: id, type: 'REWARD_ELIGIBILITY_RECORDED', actorId: actor.id, isInternal: true, metadata: { participationRecordId: record.id } }
    })
    return record
  }

  async metrics() {
    const [total, byStatusRaw, byCategoryRaw, bySeverityRaw] = await Promise.all([
      this.prisma.bugReport.count(),
      this.prisma.bugReport.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.bugReport.groupBy({ by: ['category'], _count: { _all: true } }),
      this.prisma.bugReport.groupBy({ by: ['playerSeverity'], _count: { _all: true } })
    ])
    const byStatus = Object.fromEntries(byStatusRaw.map((r) => [r.status, r._count._all]))
    return {
      total,
      open: byStatus['OPEN'] || 0,
      confirmed: byStatus['CONFIRMED'] || 0,
      resolved: byStatus['RESOLVED'] || 0,
      byStatus,
      byCategory: Object.fromEntries(byCategoryRaw.map((r) => [r.category, r._count._all])),
      bySeverity: Object.fromEntries(bySeverityRaw.map((r) => [r.playerSeverity, r._count._all]))
    }
  }

  async exportCsv(filters: { status?: string, category?: string } = {}) {
    const rows = await this.prisma.bugReport.findMany({
      where: {
        ...(filters.status && statuses.includes(filters.status as BugReportStatus) ? { status: filters.status as BugReportStatus } : {}),
        ...(filters.category && categories.includes(filters.category as BugReportCategory) ? { category: filters.category as BugReportCategory } : {})
      },
      include: { account: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5000
    })
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const header = ['id', 'category', 'status', 'playerSeverity', 'staffSeverity', 'accountUsername', 'createdAt', 'resolvedAt']
    const lines = rows.map((r) => [r.id, r.category, r.status, r.playerSeverity, r.staffSeverity || '', r.account.username, r.createdAt.toISOString(), r.resolvedAt?.toISOString() || ''].map(cell).join(','))
    return `﻿${[header.join(','), ...lines].join('\r\n')}`
  }

  // -------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------

  private async mustExist(id: string) {
    const report = await this.prisma.bugReport.findUnique({ where: { id } })
    if (!report) throw new NotFoundException('Relato nao encontrado.')
    return report
  }

  private async enforceSubmissionLimits(accountId: string) {
    const latest = await this.prisma.bugReport.findFirst({ where: { accountId }, orderBy: { createdAt: 'desc' } })
    if (latest && Date.now() - latest.createdAt.getTime() < SUBMIT_COOLDOWN_SECONDS * 1000) {
      throw new BadRequestException(`Aguarde ${SUBMIT_COOLDOWN_SECONDS} segundos antes de enviar outro relato.`)
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const dailyCount = await this.prisma.bugReport.count({ where: { accountId, createdAt: { gte: since } } })
    if (dailyCount >= SUBMIT_DAILY_LIMIT) {
      throw new BadRequestException(`Limite de ${SUBMIT_DAILY_LIMIT} relatos por dia atingido.`)
    }
  }

  // Advisory only, per Part 17's explicit "do not auto-delete legitimate
  // reports" -- returns candidate IDs, never blocks the submission.
  private async findPossibleDuplicates(accountId: string, title: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recent = await this.prisma.bugReport.findMany({
      where: { accountId, createdAt: { gte: since } },
      select: { id: true, title: true }
    })
    const normalized = title.trim().toLowerCase()
    return recent.filter((r) => r.title.trim().toLowerCase() === normalized).map((r) => r.id)
  }
}

function requireField(value: string | undefined, label: string, min: number, max: number) {
  const trimmed = value?.trim()
  if (!trimmed || trimmed.length < min) throw new BadRequestException(`Informe ${label} com pelo menos ${min} caracteres.`)
  if (trimmed.length > max) throw new BadRequestException(`O campo ${label} excede o tamanho maximo (${max} caracteres).`)
  return trimmed
}

function optionalField(value: string | undefined, max: number) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (trimmed.length > max) throw new BadRequestException(`Campo excede o tamanho maximo (${max} caracteres).`)
  return trimmed
}

function validateAttachmentRef(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (trimmed.length > 500) throw new BadRequestException('Referencia de anexo muito longa.')
  if (!/^https:\/\//i.test(trimmed)) throw new BadRequestException('A referencia de anexo deve ser um link https:// (upload de arquivo nao esta disponivel nesta fase).')
  return trimmed
}
