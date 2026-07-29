import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import type {
  AdminTask,
  AdminTaskStatus,
  Prisma
} from '@prisma/client'
import { RequestContextService } from '../../common/request-context.service'
import { redactSensitiveText, toSafeJson } from '../../common/sensitive-data'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  AdminTaskActionPayload,
  AdminTaskCommentPayload,
  AdminTaskEvidencePayload,
  AdminTaskLinkPayload,
  AdminTaskPayload,
  AdminTaskQuery
} from './admin-tasks.contract'

const activeStatuses: AdminTaskStatus[] = [
  'BACKLOG',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING',
  'IN_REVIEW',
  'REOPENED'
]

const completionStatuses: AdminTaskStatus[] = ['COMPLETED', 'CANCELED']

const pageValues = (query: AdminTaskQuery) => {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(5, Number(query.pageSize) || 20))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const cleanText = (value: unknown, field: string, min = 1, max = 10000) => {
  const text = redactSensitiveText(String(value || '').trim())
  if (text.length < min || text.length > max) {
    throw new BadRequestException(`${field} deve ter entre ${min} e ${max} caracteres.`)
  }
  return text
}

const nullableDate = (value: string | null | undefined) => {
  if (value === undefined) return undefined
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Data inválida.')
  return date
}

const nullableMinutes = (value: number | null | undefined, field: string) => {
  if (value === undefined) return undefined
  if (value === null) return null
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) {
    throw new BadRequestException(`${field} inválido.`)
  }
  return parsed
}

@Injectable()
export class AdminTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService
  ) {}

  private async task(id: string) {
    const task = await this.prisma.adminTask.findUnique({ where: { id } })
    if (!task) throw new NotFoundException('Tarefa não encontrada.')
    return task
  }

  private async adminAccount(id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
      select: { id: true, username: true, name: true, role: true }
    })
    if (!account) throw new BadRequestException('Responsável administrativo inválido.')
    return account
  }

  private async record(
    user: AuthenticatedUser,
    action: string,
    task: AdminTask,
    beforeData: unknown,
    afterData: unknown,
    reason: string,
    workDescription?: string,
    workEvidence?: unknown
  ) {
    await this.audit.record({
      module: 'tasks',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action,
      targetType: 'AdminTask',
      targetId: task.id,
      beforeData,
      afterData,
      reason,
      workTaskId: task.id,
      workDescription,
      workEvidence
    })
  }

  private async history(
    transaction: Prisma.TransactionClient,
    taskId: string,
    user: AuthenticatedUser,
    action: string,
    description: string,
    beforeData: unknown,
    afterData: unknown,
    fromStatus?: AdminTaskStatus | null,
    toStatus?: AdminTaskStatus | null
  ) {
    return transaction.adminTaskHistory.create({
      data: {
        taskId,
        actorId: user.id,
        action,
        description: redactSensitiveText(description),
        fromStatus: fromStatus || null,
        toStatus: toStatus || null,
        beforeData: toSafeJson(beforeData),
        afterData: toSafeJson(afterData),
        correlationId: this.requestContext.correlationId() || null
      }
    })
  }

  private where(query: AdminTaskQuery): Prisma.AdminTaskWhereInput {
    const search = String(query.search || '').trim()
    return {
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
              { internalNotes: { contains: search } },
              { entityId: { contains: search } }
            ]
          }
        : {}),
      ...(query.module ? { module: query.module } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.complexity ? { complexity: query.complexity } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.unassigned === 'true' ? { assignedTo: null } : {}),
      ...(query.overdue === 'true'
        ? { dueAt: { lt: new Date() }, status: { in: activeStatuses } }
        : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {})
    }
  }

  async list(query: AdminTaskQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const where = this.where(query)
    const sort = query.sort || 'updatedAt'
    const direction = query.direction === 'asc' ? 'asc' : 'desc'
    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminTask.findMany({
        where,
        include: {
          assignee: { select: { id: true, username: true, name: true } },
          creator: { select: { id: true, username: true, name: true } },
          _count: { select: { comments: true, evidence: true, links: true, history: true } }
        },
        orderBy: { [sort]: direction },
        skip,
        take: pageSize
      }),
      this.prisma.adminTask.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async details(id: string) {
    const task = await this.prisma.adminTask.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, username: true, name: true, role: true } },
        assigner: { select: { id: true, username: true, name: true } },
        creator: { select: { id: true, username: true, name: true } },
        comments: {
          include: { author: { select: { id: true, username: true, name: true } } },
          orderBy: { createdAt: 'asc' }
        },
        evidence: {
          include: { author: { select: { id: true, username: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        },
        links: { orderBy: { createdAt: 'asc' } },
        history: { orderBy: { createdAt: 'desc' }, take: 200 }
      }
    })
    if (!task) throw new NotFoundException('Tarefa não encontrada.')

    const targets = [
      ...(task.entityType && task.entityId ? [{ entityType: task.entityType, entityId: task.entityId }] : []),
      ...task.links.map((item) => ({ entityType: item.entityType, entityId: item.entityId }))
    ]
    const targetWhere = targets.map((item) => ({
      targetType: item.entityType,
      targetId: item.entityId
    }))
    const workTargetWhere = targets.map((item) => ({
      entityType: item.entityType,
      entityId: item.entityId
    }))
    const [auditEvents, workLogs] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where: {
          OR: [
            { targetType: 'AdminTask', targetId: id },
            ...targetWhere
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      }),
      this.prisma.adminWorkLog.findMany({
        where: {
          OR: [
            { taskId: id },
            ...workTargetWhere
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      })
    ])
    return {
      ...task,
      proof: {
        auditEvents,
        workLogs,
        totals: {
          actions: auditEvents.length,
          workLogs: workLogs.length,
          entitiesAccessed: new Set(targets.map((item) => `${item.entityType}:${item.entityId}`)).size,
          changes: auditEvents.filter((item) => item.beforeData || item.afterData).length,
          approvals: auditEvents.filter((item) => /approve|publish|review/i.test(item.action)).length,
          minutes: workLogs.reduce((sum, item) => sum + (item.durationMinutes || 0), 0)
        }
      }
    }
  }

  async create(payload: AdminTaskPayload, user: AuthenticatedUser) {
    const title = cleanText(payload.title, 'Título', 3, 191)
    const description = cleanText(payload.description, 'Descrição', 3, 30000)
    const module = cleanText(payload.module, 'Módulo', 2, 100).toLowerCase()
    const type = cleanText(payload.type, 'Tipo', 2, 100).toUpperCase()
    const assignedTo = payload.assignedTo || null
    if (assignedTo) await this.adminAccount(assignedTo)
    const data: Prisma.AdminTaskUncheckedCreateInput = {
      title,
      description,
      module,
      type,
      priority: payload.priority || 'NORMAL',
      complexity: payload.complexity || 'STANDARD',
      status: assignedTo ? 'ASSIGNED' : payload.status || 'OPEN',
      assignedTo,
      assignedBy: assignedTo ? user.id : null,
      createdBy: user.id,
      dueAt: nullableDate(payload.dueAt),
      estimatedMinutes: nullableMinutes(payload.estimatedMinutes, 'Estimativa'),
      entityType: payload.entityType?.trim() || null,
      entityId: payload.entityId?.trim() || null,
      errorId: payload.errorId?.trim() || null,
      reportId: payload.reportId?.trim() || null,
      internalNotes: payload.internalNotes ? redactSensitiveText(payload.internalNotes.trim()) : null,
      approvalRequired: Boolean(payload.approvalRequired)
    }
    const task = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.adminTask.create({ data })
      await this.history(
        transaction,
        created.id,
        user,
        'CREATE',
        'Tarefa administrativa criada.',
        null,
        created,
        null,
        created.status
      )
      return created
    })
    await this.record(user, 'admin.tasks.create', task, null, task, payload.reason || 'Criação da tarefa.')
    return this.details(task.id)
  }

  async update(id: string, payload: AdminTaskPayload, user: AuthenticatedUser) {
    const before = await this.task(id)
    if (completionStatuses.includes(before.status)) {
      throw new BadRequestException('Reabra a tarefa antes de editar seu conteúdo.')
    }
    const data: Prisma.AdminTaskUncheckedUpdateInput = {
      ...(payload.title !== undefined ? { title: cleanText(payload.title, 'Título', 3, 191) } : {}),
      ...(payload.description !== undefined ? { description: cleanText(payload.description, 'Descrição', 3, 30000) } : {}),
      ...(payload.module !== undefined ? { module: cleanText(payload.module, 'Módulo', 2, 100).toLowerCase() } : {}),
      ...(payload.type !== undefined ? { type: cleanText(payload.type, 'Tipo', 2, 100).toUpperCase() } : {}),
      ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      ...(payload.complexity !== undefined ? { complexity: payload.complexity } : {}),
      ...(payload.dueAt !== undefined ? { dueAt: nullableDate(payload.dueAt) } : {}),
      ...(payload.estimatedMinutes !== undefined ? { estimatedMinutes: nullableMinutes(payload.estimatedMinutes, 'Estimativa') } : {}),
      ...(payload.actualMinutes !== undefined ? { actualMinutes: nullableMinutes(payload.actualMinutes, 'Tempo realizado') } : {}),
      ...(payload.entityType !== undefined ? { entityType: payload.entityType?.trim() || null } : {}),
      ...(payload.entityId !== undefined ? { entityId: payload.entityId?.trim() || null } : {}),
      ...(payload.errorId !== undefined ? { errorId: payload.errorId?.trim() || null } : {}),
      ...(payload.reportId !== undefined ? { reportId: payload.reportId?.trim() || null } : {}),
      ...(payload.internalNotes !== undefined ? { internalNotes: payload.internalNotes ? redactSensitiveText(payload.internalNotes.trim()) : null } : {}),
      ...(payload.result !== undefined ? { result: payload.result ? redactSensitiveText(payload.result.trim()) : null } : {}),
      ...(payload.approvalRequired !== undefined ? { approvalRequired: payload.approvalRequired } : {})
    }
    const after = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.adminTask.update({ where: { id }, data })
      await this.history(transaction, id, user, 'EDIT', payload.reason || 'Dados da tarefa atualizados.', before, updated, before.status, updated.status)
      return updated
    })
    await this.record(user, 'admin.tasks.edit', after, before, after, payload.reason || 'Edição da tarefa.')
    return this.details(id)
  }

  async action(id: string, payload: AdminTaskActionPayload, user: AuthenticatedUser) {
    const before = await this.task(id)
    const action = String(payload.action || '').trim().toUpperCase()
    const requiredPermission = ['ASSIGN', 'TRANSFER'].includes(action)
      ? 'admin.tasks.assign'
      : ['APPROVE', 'REJECT'].includes(action)
        ? 'admin.tasks.review'
        : 'admin.tasks.operate'
    if (!user.permissions.includes('*') && !user.permissions.includes(requiredPermission)) {
      throw new ForbiddenException('Você não possui permissão para esta ação.')
    }
    const reason = redactSensitiveText(String(payload.reason || '').trim())
    const sensitiveActions = ['TRANSFER', 'REJECT', 'REOPEN', 'CANCEL']
    if (sensitiveActions.includes(action) && reason.length < 3) {
      throw new BadRequestException('Informe uma justificativa para esta ação.')
    }

    let status = before.status
    const data: Prisma.AdminTaskUncheckedUpdateInput = {}
    if (action === 'ASSIGN' || action === 'TRANSFER') {
      if (!payload.assignedTo) throw new BadRequestException('Selecione o responsável.')
      await this.adminAccount(payload.assignedTo)
      data.assignedTo = payload.assignedTo
      data.assignedBy = user.id
      status = before.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'ASSIGNED'
    } else if (action === 'CLAIM') {
      data.assignedTo = user.id
      data.assignedBy = user.id
      status = before.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'ASSIGNED'
    } else if (action === 'START') {
      if (before.assignedTo && before.assignedTo !== user.id && user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Somente o responsável ou Super ADM pode iniciar a tarefa.')
      }
      data.assignedTo = before.assignedTo || user.id
      data.assignedBy = before.assignedBy || user.id
      data.startedAt = before.startedAt || new Date()
      status = 'IN_PROGRESS'
    } else if (action === 'PAUSE') {
      status = 'WAITING'
    } else if (action === 'SUBMIT_REVIEW') {
      status = 'IN_REVIEW'
      data.result = payload.result ? redactSensitiveText(payload.result.trim()) : before.result
      data.actualMinutes = nullableMinutes(payload.actualMinutes, 'Tempo realizado')
    } else if (action === 'COMPLETE') {
      status = before.approvalRequired ? 'IN_REVIEW' : 'COMPLETED'
      data.completedAt = status === 'COMPLETED' ? new Date() : null
      data.result = payload.result ? redactSensitiveText(payload.result.trim()) : before.result
      data.actualMinutes = nullableMinutes(payload.actualMinutes, 'Tempo realizado')
    } else if (action === 'APPROVE') {
      if (before.status !== 'IN_REVIEW') throw new BadRequestException('A tarefa não está em revisão.')
      status = 'COMPLETED'
      data.completedAt = new Date()
      data.reviewedBy = user.id
      data.reviewedAt = new Date()
      data.reviewReason = reason || 'Aprovada.'
    } else if (action === 'REJECT') {
      if (before.status !== 'IN_REVIEW') throw new BadRequestException('A tarefa não está em revisão.')
      status = 'REOPENED'
      data.completedAt = null
      data.reviewedBy = user.id
      data.reviewedAt = new Date()
      data.reviewReason = reason
      data.rejectedCount = { increment: 1 }
    } else if (action === 'REOPEN') {
      status = 'REOPENED'
      data.completedAt = null
      data.reopenedCount = { increment: 1 }
    } else if (action === 'CANCEL') {
      status = 'CANCELED'
      data.completedAt = null
    } else {
      throw new BadRequestException('Ação de tarefa inválida.')
    }
    data.status = status

    const after = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.adminTask.update({ where: { id }, data })
      await this.history(
        transaction,
        id,
        user,
        action,
        reason || `Ação ${action} executada.`,
        before,
        updated,
        before.status,
        updated.status
      )
      return updated
    })
    await this.record(
      user,
      `admin.tasks.${action.toLowerCase()}`,
      after,
      before,
      after,
      reason || `Ação ${action}.`,
      `${user.username} executou ${action} na tarefa "${after.title}".`,
      { result: payload.result, actualMinutes: payload.actualMinutes }
    )
    return this.details(id)
  }

  async addComment(id: string, payload: AdminTaskCommentPayload, user: AuthenticatedUser) {
    const task = await this.task(id)
    const content = cleanText(payload.content, 'Comentário', 2, 10000)
    const comment = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.adminTaskComment.create({
        data: {
          taskId: id,
          authorId: user.id,
          content,
          attachments: toSafeJson(payload.attachments)
        }
      })
      await this.history(transaction, id, user, 'COMMENT', 'Comentário interno adicionado.', null, { commentId: created.id })
      return created
    })
    await this.record(user, 'admin.tasks.comment.create', task, null, { commentId: comment.id }, 'Comentário interno.')
    return comment
  }

  async editComment(commentId: string, payload: AdminTaskCommentPayload, user: AuthenticatedUser) {
    const before = await this.prisma.adminTaskComment.findUnique({ where: { id: commentId } })
    if (!before) throw new NotFoundException('Comentário não encontrado.')
    if (before.authorId !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Você não pode editar este comentário.')
    }
    const task = await this.task(before.taskId)
    const after = await this.prisma.adminTaskComment.update({
      where: { id: commentId },
      data: {
        content: cleanText(payload.content, 'Comentário', 2, 10000),
        ...(payload.attachments !== undefined ? { attachments: toSafeJson(payload.attachments) } : {}),
        editedAt: new Date()
      }
    })
    await this.record(user, 'admin.tasks.comment.edit', task, before, after, 'Comentário interno editado.')
    return after
  }

  async addEvidence(id: string, payload: AdminTaskEvidencePayload, user: AuthenticatedUser) {
    const task = await this.task(id)
    if (!payload.type) throw new BadRequestException('Tipo de evidência obrigatório.')
    const url = payload.url?.trim() || null
    if (url && !/^(https?:\/\/|\/)/i.test(url)) {
      throw new BadRequestException('A evidência deve usar URL HTTP(S) ou link interno.')
    }
    const evidence = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.adminTaskEvidence.create({
        data: {
          taskId: id,
          authorId: user.id,
          type: payload.type!,
          title: cleanText(payload.title, 'Título da evidência', 2, 191),
          description: payload.description ? redactSensitiveText(payload.description.trim()) : null,
          url,
          entityType: payload.entityType?.trim() || null,
          entityId: payload.entityId?.trim() || null,
          beforeData: toSafeJson(payload.beforeData),
          afterData: toSafeJson(payload.afterData),
          metadata: toSafeJson(payload.metadata)
        }
      })
      await this.history(transaction, id, user, 'EVIDENCE', 'Evidência adicionada.', null, { evidenceId: created.id, type: created.type })
      return created
    })
    await this.record(user, 'admin.tasks.evidence.create', task, null, evidence, 'Evidência adicionada.', undefined, evidence)
    return evidence
  }

  async addLink(id: string, payload: AdminTaskLinkPayload, user: AuthenticatedUser) {
    const task = await this.task(id)
    const link = await this.prisma.adminTaskLink.create({
      data: {
        taskId: id,
        module: cleanText(payload.module, 'Módulo', 2, 100).toLowerCase(),
        entityType: cleanText(payload.entityType, 'Tipo da entidade', 2, 191),
        entityId: cleanText(payload.entityId, 'ID da entidade', 1, 191),
        label: payload.label?.trim() || null,
        createdBy: user.id
      }
    })
    await this.record(user, 'admin.tasks.link.create', task, null, link, 'Registro relacionado à tarefa.')
    return link
  }

  async removeLink(taskId: string, linkId: string, user: AuthenticatedUser) {
    const task = await this.task(taskId)
    const link = await this.prisma.adminTaskLink.findFirst({ where: { id: linkId, taskId } })
    if (!link) throw new NotFoundException('Vínculo não encontrado.')
    await this.prisma.adminTaskLink.delete({ where: { id: linkId } })
    await this.record(user, 'admin.tasks.link.remove', task, link, null, 'Vínculo removido.')
    return { ok: true }
  }

  async personalDashboard(user: AuthenticatedUser) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const [mine, overdue, urgent, review, completedToday, errors, recent] = await this.prisma.$transaction([
      this.prisma.adminTask.count({ where: { assignedTo: user.id, status: { in: activeStatuses } } }),
      this.prisma.adminTask.count({ where: { assignedTo: user.id, dueAt: { lt: now }, status: { in: activeStatuses } } }),
      this.prisma.adminTask.count({ where: { assignedTo: user.id, priority: { in: ['URGENT', 'CRITICAL'] }, status: { in: activeStatuses } } }),
      this.prisma.adminTask.count({ where: { OR: [{ assignedTo: user.id }, { createdBy: user.id }], status: 'IN_REVIEW' } }),
      this.prisma.adminTask.count({ where: { assignedTo: user.id, status: 'COMPLETED', completedAt: { gte: startOfDay } } }),
      this.prisma.systemError.count({ where: { assignedTo: user.id, status: { notIn: ['RESOLVED', 'IGNORED'] } } }),
      this.prisma.adminTaskHistory.findMany({
        where: { actorId: user.id },
        include: { task: { select: { id: true, title: true, module: true } } },
        orderBy: { createdAt: 'desc' },
        take: 12
      })
    ])
    return { mine, overdue, urgent, review, completedToday, errors, recent }
  }

  async managementDashboard() {
    const now = new Date()
    const since = new Date(now.getTime() - 30 * 86400000)
    const [byAssignee, byModule, byStatus, overdue, unassigned, completed, reopened, work] = await this.prisma.$transaction([
      this.prisma.adminTask.groupBy({ by: ['assignedTo'], where: { status: { in: activeStatuses } }, _count: { _all: true }, orderBy: { assignedTo: 'asc' } }),
      this.prisma.adminTask.groupBy({ by: ['module'], _count: { _all: true }, orderBy: { module: 'asc' } }),
      this.prisma.adminTask.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
      this.prisma.adminTask.count({ where: { dueAt: { lt: now }, status: { in: activeStatuses } } }),
      this.prisma.adminTask.count({ where: { assignedTo: null, status: { in: activeStatuses } } }),
      this.prisma.adminTask.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: since } },
        select: { createdAt: true, completedAt: true, complexity: true, actualMinutes: true, assignedTo: true }
      }),
      this.prisma.adminTask.aggregate({ _sum: { reopenedCount: true, rejectedCount: true } }),
      this.prisma.adminWorkLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { durationMinutes: true },
        orderBy: { userId: 'asc' }
      })
    ])
    const assigneeIds = byAssignee.map((item) => item.assignedTo).filter(Boolean) as string[]
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, username: true, name: true }
    })
    const names = new Map(accounts.map((item) => [item.id, item]))
    const durations = completed
      .filter((item) => item.completedAt)
      .map((item) => item.completedAt!.getTime() - item.createdAt.getTime())
    return {
      byAssignee: byAssignee.map((item) => ({ ...item, account: item.assignedTo ? names.get(item.assignedTo) : null })),
      byModule,
      byStatus,
      overdue,
      unassigned,
      completedLast30Days: completed.length,
      averageCompletionHours: durations.length
        ? Math.round(durations.reduce((sum, item) => sum + item, 0) / durations.length / 360000) / 10
        : 0,
      reopened: reopened._sum.reopenedCount || 0,
      rejected: reopened._sum.rejectedCount || 0,
      work,
      note: 'Complexidade, reaberturas, rejeições e tempo são exibidos separadamente; volume isolado não representa desempenho.'
    }
  }

  async reports() {
    const [complexity, priority, module, status, totals] = await this.prisma.$transaction([
      this.prisma.adminTask.groupBy({ by: ['complexity'], _count: { _all: true }, _sum: { actualMinutes: true }, orderBy: { complexity: 'asc' } }),
      this.prisma.adminTask.groupBy({ by: ['priority'], _count: { _all: true }, orderBy: { priority: 'asc' } }),
      this.prisma.adminTask.groupBy({ by: ['module'], _count: { _all: true }, _sum: { actualMinutes: true }, orderBy: { module: 'asc' } }),
      this.prisma.adminTask.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
      this.prisma.adminTask.aggregate({
        _count: { _all: true },
        _sum: { actualMinutes: true, estimatedMinutes: true, reopenedCount: true, rejectedCount: true }
      })
    ])
    return { complexity, priority, module, status, totals }
  }

  async administrators() {
    return this.prisma.account.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
      select: { id: true, username: true, name: true, role: true },
      orderBy: { name: 'asc' }
    })
  }
}
