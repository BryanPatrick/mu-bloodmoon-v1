import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import type { Prisma, RoadmapWorkflowStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import { permissionKeys } from '../auth/permissions'
import type {
  RoadmapItemPayload,
  RoadmapQuery,
  RoadmapRelationPayload,
  RoadmapReorderPayload,
  RoadmapTaskPayload,
  RoadmapTransitionPayload,
  RoadmapUpdatePayload
} from './roadmap.contract'

const roadmapInclude = {
  updates: { orderBy: { createdAt: 'desc' as const } },
  tasks: { orderBy: [{ status: 'asc' as const }, { dueAt: 'asc' as const }] },
  relations: { orderBy: { createdAt: 'desc' as const } }
}

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const slugify = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()

const nullableDate = (value?: string | null) => value ? new Date(value) : null
const clampProgress = (value = 0) => Math.max(0, Math.min(100, Math.round(value)))
const json = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined || value === null ? undefined : value as Prisma.InputJsonValue
const actor = (user: AuthenticatedUser) => ({
  actorId: user.id,
  actorUsername: user.username,
  actorRole: user.role
})

@Injectable()
export class RoadmapService implements OnModuleInit, OnModuleDestroy {
  private scheduleTimer?: ReturnType<typeof setInterval>

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService
  ) {}

  onModuleInit() {
    this.scheduleTimer = setInterval(() => {
      void this.processDueSchedules()
    }, 60_000)
    this.scheduleTimer.unref()
  }

  onModuleDestroy() {
    if (this.scheduleTimer) clearInterval(this.scheduleTimer)
  }

  private validateImage(image?: string | null) {
    if (!image) return
    if (!/^(https?:\/\/|\/)[^\s]+$/i.test(image)) {
      void this.observability.recordSystemError({
        module: 'roadmap',
        severity: 'WARNING',
        errorCode: 'ROADMAP_INVALID_IMAGE',
        publicMessage: 'A imagem informada e invalida.',
        internalMessage: `Invalid roadmap image path: ${image.slice(0, 120)}`
      })
      throw new BadRequestException('Informe uma URL HTTPS ou um caminho publico valido para a imagem.')
    }
  }

  private async recordFailure(code: string, message: string, error: unknown, entityId?: string) {
    await this.observability.recordSystemError({
      module: 'roadmap',
      severity: 'ERROR',
      errorCode: code,
      publicMessage: message,
      internalMessage: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : null,
      entityType: 'RoadmapItem',
      entityId
    })
  }

  private async processDueSchedules() {
    try {
      const due = await this.prisma.roadmapItem.findMany({
        where: {
          workflowStatus: 'SCHEDULED',
          scheduledPublishAt: { lte: new Date() },
          deletedAt: null
        },
        select: { id: true, updatedBy: true }
      })
      if (!due.length) return
      await this.prisma.roadmapItem.updateMany({
        where: { id: { in: due.map((item) => item.id) } },
        data: {
          workflowStatus: 'PUBLISHED',
          publishedAt: new Date(),
          scheduledPublishAt: null
        }
      })
      await Promise.all(due.map((item) => this.observability.recordOperationalEvent({
        module: 'roadmap',
        eventType: 'ROADMAP_SCHEDULE_PUBLISHED',
        entityType: 'RoadmapItem',
        entityId: item.id,
        actorUserId: item.updatedBy,
        description: `Iniciativa ${item.id} publicada pelo agendamento.`
      })))
    } catch (error) {
      await this.recordFailure('ROADMAP_SCHEDULE_FAILED', 'Falha ao executar um agendamento do roadmap.', error)
    }
  }

  async publicOverview(query: RoadmapQuery) {
    await this.processDueSchedules()
    const where: Prisma.RoadmapItemWhereInput = {
      workflowStatus: 'PUBLISHED',
      visibility: 'PUBLIC',
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.horizon ? { horizon: query.horizon } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { title: { contains: query.search } },
          { summary: { contains: query.search } },
          { description: { contains: query.search } },
          { category: { contains: query.search } }
        ]
      } : {})
    }
    const [items, lastUpdated] = await Promise.all([
      this.prisma.roadmapItem.findMany({
        where,
        orderBy: [{ horizon: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        include: {
          updates: {
            where: { visibility: 'PUBLIC' },
            orderBy: { createdAt: 'desc' },
            take: 3
          },
          relations: true,
          tasks: {
            where: { status: 'DONE' },
            select: { id: true }
          }
        }
      }),
      this.prisma.roadmapItem.findFirst({
        where: { workflowStatus: 'PUBLISHED', visibility: 'PUBLIC', deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      })
    ])
    const categories = [...new Set(items.map((item) => item.category))].sort()
    return {
      presentation: {
        title: 'Roadmap Blood Moon',
        purpose: 'Uma visao transparente das prioridades, entregas e mudancas planejadas para o servidor.',
        vision: 'Construir um ecossistema MU Online confiavel, evolutivo e orientado pela experiencia dos jogadores.',
        lastUpdatedAt: lastUpdated?.updatedAt || null
      },
      categories,
      items,
      delivered: items.filter((item) => item.status === 'RELEASED' || item.horizon === 'COMPLETED'),
      history: items.flatMap((item) => item.updates.map((update) => ({
        ...update,
        roadmapTitle: item.title,
        roadmapSlug: item.slug
      }))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    }
  }

  async publicDetail(slug: string) {
    await this.processDueSchedules()
    const item = await this.prisma.roadmapItem.findFirst({
      where: { slug, workflowStatus: 'PUBLISHED', visibility: { in: ['PUBLIC', 'UNLISTED'] }, deletedAt: null },
      include: {
        updates: { where: { visibility: 'PUBLIC' }, orderBy: { createdAt: 'desc' } },
        relations: true,
        tasks: { where: { status: 'DONE' }, select: { id: true, title: true, completedAt: true } }
      }
    })
    if (!item) throw new NotFoundException('Iniciativa nao encontrada.')
    return item
  }

  async summary() {
    await this.processDueSchedules()
    const now = new Date()
    const staleAt = new Date(Date.now() - 30 * 86400000)
    const [
      total, drafts, review, overdue, stale, development, testing,
      completed, cancelled, pendingTasks, owners
    ] = await Promise.all([
      this.prisma.roadmapItem.count({ where: { deletedAt: null } }),
      this.prisma.roadmapItem.count({ where: { workflowStatus: 'DRAFT', deletedAt: null } }),
      this.prisma.roadmapItem.count({ where: { workflowStatus: 'IN_REVIEW', deletedAt: null } }),
      this.prisma.roadmapItem.count({ where: { internalDeadline: { lt: now }, workSituation: { not: 'DONE' }, deletedAt: null } }),
      this.prisma.roadmapItem.count({ where: { updatedAt: { lt: staleAt }, status: { notIn: ['RELEASED', 'CANCELLED'] }, deletedAt: null } }),
      this.prisma.roadmapItem.count({ where: { status: 'DEVELOPMENT', deletedAt: null } }),
      this.prisma.roadmapItem.count({ where: { status: 'TESTING', deletedAt: null } }),
      this.prisma.roadmapItem.count({ where: { status: 'RELEASED', deletedAt: null } }),
      this.prisma.roadmapItem.count({ where: { status: 'CANCELLED', deletedAt: null } }),
      this.prisma.roadmapTask.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } } }),
      this.prisma.roadmapItem.groupBy({ by: ['ownerId'], where: { ownerId: { not: null }, deletedAt: null }, _count: { _all: true } })
    ])
    const ownerAccounts = await this.prisma.account.findMany({
      where: { id: { in: owners.map((owner) => owner.ownerId).filter((id): id is string => Boolean(id)) } },
      select: { id: true, name: true, username: true }
    })
    const ownerById = new Map(ownerAccounts.map((owner) => [owner.id, owner]))
    return {
      total, drafts, review, overdue, stale, development, testing, completed, cancelled, pendingTasks,
      owners: owners.map((owner) => ({ ...ownerById.get(owner.ownerId || ''), total: owner._count._all }))
    }
  }

  async list(query: RoadmapQuery) {
    await this.processDueSchedules()
    const page = positiveInt(query.page, 1)
    const pageSize = Math.min(positiveInt(query.pageSize, 24), 100)
    const where: Prisma.RoadmapItemWhereInput = {
      ...(query.includeDeleted === 'true' ? {} : { deletedAt: null }),
      ...(query.category ? { category: query.category } : {}),
      ...(query.horizon ? { horizon: query.horizon } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.workflowStatus ? { workflowStatus: query.workflowStatus } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      ...(query.search ? { OR: [
        { title: { contains: query.search } },
        { slug: { contains: query.search } },
        { summary: { contains: query.search } },
        { category: { contains: query.search } }
      ] } : {})
    }
    const [total, items] = await Promise.all([
      this.prisma.roadmapItem.count({ where }),
      this.prisma.roadmapItem.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { updates: true, tasks: true, relations: true } },
          tasks: { where: { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } }, take: 5 }
        }
      })
    ])
    const ownerAccounts = await this.prisma.account.findMany({
      where: { id: { in: items.map((item) => item.ownerId).filter((id): id is string => Boolean(id)) } },
      select: { id: true, name: true, username: true }
    })
    const ownerById = new Map(ownerAccounts.map((owner) => [owner.id, owner]))
    return {
      items: items.map((item) => ({ ...item, owner: item.ownerId ? ownerById.get(item.ownerId) || null : null })),
      total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async detail(id: string) {
    const item = await this.prisma.roadmapItem.findUnique({ where: { id }, include: roadmapInclude })
    if (!item) throw new NotFoundException('Iniciativa nao encontrada.')
    return item
  }

  async create(payload: RoadmapItemPayload, user: AuthenticatedUser) {
    this.validateImage(payload.image)
    if (!payload.title?.trim() || !payload.summary?.trim() || !payload.description?.trim() || !payload.category?.trim()) {
      throw new BadRequestException('Titulo, resumo, descricao e categoria sao obrigatorios.')
    }
    try {
      const item = await this.prisma.roadmapItem.create({
        data: {
          title: payload.title.trim(),
          slug: slugify(payload.slug || payload.title),
          summary: payload.summary.trim(),
          description: payload.description.trim(),
          objective: payload.objective?.trim() || null,
          problem: payload.problem?.trim() || null,
          playerBenefit: payload.playerBenefit?.trim() || null,
          scopeIncluded: json(payload.scopeIncluded),
          scopeExcluded: json(payload.scopeExcluded),
          category: payload.category.trim(),
          horizon: payload.horizon,
          status: payload.status,
          priority: payload.priority || 'MEDIUM',
          progress: clampProgress(payload.progress),
          estimatedPeriod: payload.estimatedPeriod?.trim() || null,
          completedAt: nullableDate(payload.completedAt),
          image: payload.image?.trim() || null,
          icon: payload.icon?.trim() || null,
          tags: json(payload.tags),
          dependencies: json(payload.dependencies),
          visibility: payload.visibility || 'PUBLIC',
          sortOrder: payload.sortOrder || 0,
          ownerId: payload.ownerId?.trim() || null,
          internalDeadline: nullableDate(payload.internalDeadline),
          workSituation: payload.workSituation || 'ON_TRACK',
          internalNotes: payload.internalNotes?.trim() || null,
          publicNotes: payload.publicNotes?.trim() || null,
          revisionReason: payload.revisionReason?.trim() || null,
          createdBy: user.id,
          updatedBy: user.id
        },
        include: roadmapInclude
      })
      await this.audit.record({
        ...actor(user), module: 'roadmap', action: 'admin.roadmap.created',
        targetType: 'RoadmapItem', targetId: item.id, afterData: item,
        workDescription: payload.workDescription || `${user.username} criou a iniciativa ${item.title}.`,
        workEvidence: payload.evidence,
        workDurationMinutes: payload.durationMinutes
      })
      return item
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        await this.recordFailure('ROADMAP_DUPLICATE_SLUG', 'Ja existe uma iniciativa com este slug.', error)
        throw new ConflictException('Ja existe uma iniciativa com este slug.')
      }
      throw error
    }
  }

  async update(id: string, payload: Partial<RoadmapItemPayload>, user: AuthenticatedUser) {
    const before = await this.detail(id)
    this.validateImage(payload.image)
    try {
      const item = await this.prisma.roadmapItem.update({
        where: { id },
        data: {
          ...(payload.title?.trim() ? { title: payload.title.trim() } : {}),
          ...(payload.slug?.trim() ? { slug: slugify(payload.slug) } : {}),
          ...(payload.summary?.trim() ? { summary: payload.summary.trim() } : {}),
          ...(payload.description?.trim() ? { description: payload.description.trim() } : {}),
          ...(payload.objective !== undefined ? { objective: payload.objective?.trim() || null } : {}),
          ...(payload.problem !== undefined ? { problem: payload.problem?.trim() || null } : {}),
          ...(payload.playerBenefit !== undefined ? { playerBenefit: payload.playerBenefit?.trim() || null } : {}),
          ...(payload.scopeIncluded !== undefined ? { scopeIncluded: json(payload.scopeIncluded) } : {}),
          ...(payload.scopeExcluded !== undefined ? { scopeExcluded: json(payload.scopeExcluded) } : {}),
          ...(payload.category?.trim() ? { category: payload.category.trim() } : {}),
          ...(payload.horizon ? { horizon: payload.horizon } : {}),
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.priority ? { priority: payload.priority } : {}),
          ...(payload.progress !== undefined ? { progress: clampProgress(payload.progress) } : {}),
          ...(payload.estimatedPeriod !== undefined ? { estimatedPeriod: payload.estimatedPeriod?.trim() || null } : {}),
          ...(payload.completedAt !== undefined ? { completedAt: nullableDate(payload.completedAt) } : {}),
          ...(payload.image !== undefined ? { image: payload.image?.trim() || null } : {}),
          ...(payload.icon !== undefined ? { icon: payload.icon?.trim() || null } : {}),
          ...(payload.tags !== undefined ? { tags: json(payload.tags) } : {}),
          ...(payload.dependencies !== undefined ? { dependencies: json(payload.dependencies) } : {}),
          ...(payload.visibility ? { visibility: payload.visibility } : {}),
          ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
          ...(payload.ownerId !== undefined ? { ownerId: payload.ownerId?.trim() || null } : {}),
          ...(payload.internalDeadline !== undefined ? { internalDeadline: nullableDate(payload.internalDeadline) } : {}),
          ...(payload.workSituation ? { workSituation: payload.workSituation } : {}),
          ...(payload.internalNotes !== undefined ? { internalNotes: payload.internalNotes?.trim() || null } : {}),
          ...(payload.publicNotes !== undefined ? { publicNotes: payload.publicNotes?.trim() || null } : {}),
          ...(payload.revisionReason !== undefined ? { revisionReason: payload.revisionReason?.trim() || null } : {}),
          updatedBy: user.id,
          lastWorkAt: new Date(),
          version: { increment: 1 }
        },
        include: roadmapInclude
      })
      await this.audit.record({
        ...actor(user), module: 'roadmap', action: 'admin.roadmap.updated',
        targetType: 'RoadmapItem', targetId: item.id, beforeData: before, afterData: item,
        reason: payload.revisionReason,
        workDescription: payload.workDescription || `${user.username} atualizou a iniciativa ${item.title}.`,
        workEvidence: payload.evidence,
        workDurationMinutes: payload.durationMinutes
      })
      return item
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        await this.recordFailure('ROADMAP_DUPLICATE_SLUG', 'Ja existe uma iniciativa com este slug.', error, id)
        throw new ConflictException('Ja existe uma iniciativa com este slug.')
      }
      throw error
    }
  }

  async duplicate(id: string, user: AuthenticatedUser) {
    const source = await this.detail(id)
    return this.create({
      title: `${source.title} - copia`,
      slug: `${source.slug}-copia-${Date.now()}`,
      summary: source.summary,
      description: source.description,
      objective: source.objective,
      problem: source.problem,
      playerBenefit: source.playerBenefit,
      scopeIncluded: source.scopeIncluded as string[] | undefined,
      scopeExcluded: source.scopeExcluded as string[] | undefined,
      category: source.category,
      horizon: source.horizon,
      status: source.status,
      priority: source.priority,
      progress: source.progress,
      image: source.image,
      icon: source.icon,
      tags: source.tags as string[] | undefined,
      dependencies: source.dependencies as string[] | undefined,
      visibility: source.visibility,
      workDescription: `${user.username} duplicou a iniciativa ${source.title}.`
    }, user)
  }

  async transition(id: string, payload: RoadmapTransitionPayload, user: AuthenticatedUser) {
    const permissionByAction: Record<RoadmapTransitionPayload['action'], string> = {
      SUBMIT_REVIEW: permissionKeys.adminRoadmapEdit,
      APPROVE: permissionKeys.adminRoadmapApprove,
      REJECT: permissionKeys.adminRoadmapReview,
      PUBLISH: permissionKeys.adminRoadmapPublish,
      SCHEDULE: permissionKeys.adminRoadmapPublish,
      UNPUBLISH: permissionKeys.adminRoadmapPublish,
      ARCHIVE: permissionKeys.adminRoadmapEdit,
      RESTORE: permissionKeys.adminRoadmapEdit,
      DELETE: permissionKeys.adminRoadmapDelete
    }
    const requiredPermission = permissionByAction[payload.action]
    if (!requiredPermission || (!user.permissions.includes('*') && !user.permissions.includes(requiredPermission))) {
      throw new ForbiddenException('Voce nao possui permissao para esta etapa do workflow.')
    }
    const before = await this.detail(id)
    const now = new Date()
    const data: Prisma.RoadmapItemUpdateInput = { updatedBy: user.id, version: { increment: 1 } }
    const target: Record<RoadmapTransitionPayload['action'], RoadmapWorkflowStatus> = {
      SUBMIT_REVIEW: 'IN_REVIEW', APPROVE: 'APPROVED', REJECT: 'REJECTED',
      PUBLISH: 'PUBLISHED', SCHEDULE: 'SCHEDULED', UNPUBLISH: 'UNPUBLISHED',
      ARCHIVE: 'ARCHIVED', RESTORE: 'DRAFT', DELETE: before.workflowStatus
    }
    if (payload.action === 'APPROVE' && before.workflowStatus !== 'IN_REVIEW') {
      throw new BadRequestException('Somente iniciativas em revisao podem ser aprovadas.')
    }
    if (payload.action === 'PUBLISH' && !['APPROVED', 'UNPUBLISHED'].includes(before.workflowStatus)) {
      throw new BadRequestException('A iniciativa precisa estar aprovada antes da publicacao.')
    }
    if (payload.action === 'SCHEDULE') {
      if (before.workflowStatus !== 'APPROVED') throw new BadRequestException('A iniciativa precisa estar aprovada antes do agendamento.')
      const scheduled = nullableDate(payload.scheduledPublishAt)
      if (!scheduled || scheduled <= now) throw new BadRequestException('Informe uma data futura para o agendamento.')
      data.scheduledPublishAt = scheduled
    }
    data.workflowStatus = target[payload.action]
    if (payload.action === 'SUBMIT_REVIEW') Object.assign(data, { reviewedBy: user.id, reviewedAt: now })
    if (payload.action === 'APPROVE') Object.assign(data, { approvedBy: user.id, approvedAt: now })
    if (payload.action === 'PUBLISH') Object.assign(data, { publishedBy: user.id, publishedAt: now, scheduledPublishAt: null })
    if (payload.action === 'ARCHIVE') data.archivedAt = now
    if (payload.action === 'RESTORE') Object.assign(data, { archivedAt: null, deletedAt: null, deletedBy: null, deletionReason: null })
    if (payload.action === 'REJECT') data.revisionReason = payload.reason?.trim() || 'Revisao rejeitada sem observacao.'
    if (payload.action === 'DELETE') Object.assign(data, {
      deletedAt: now, deletedBy: user.id,
      deletionReason: payload.reason?.trim() || 'Exclusao administrativa.'
    })
    try {
      const item = await this.prisma.roadmapItem.update({ where: { id }, data, include: roadmapInclude })
      await this.audit.record({
        ...actor(user), module: 'roadmap', action: `admin.roadmap.${payload.action.toLowerCase()}`,
        targetType: 'RoadmapItem', targetId: id, beforeData: before, afterData: item,
        reason: payload.reason, workEvidence: payload.evidence,
        workDescription: `${user.username} executou ${payload.action} na iniciativa ${item.title}.`
      })
      await this.observability.recordOperationalEvent({
        module: 'roadmap', eventType: `ROADMAP_${payload.action}`,
        entityType: 'RoadmapItem', entityId: id, actorUserId: user.id,
        description: `Roadmap ${item.title}: ${payload.action}.`,
        data: { oldWorkflow: before.workflowStatus, newWorkflow: item.workflowStatus }
      })
      return item
    } catch (error) {
      await this.recordFailure('ROADMAP_TRANSITION_FAILED', 'Falha ao alterar o fluxo da iniciativa.', error, id)
      throw error
    }
  }

  async reorder(payload: RoadmapReorderPayload, user: AuthenticatedUser) {
    if (!payload.items?.length) throw new BadRequestException('Informe os itens para ordenar.')
    await this.prisma.$transaction(payload.items.map((item) =>
      this.prisma.roadmapItem.update({ where: { id: item.id }, data: { sortOrder: item.order, updatedBy: user.id } })
    ))
    await this.audit.record({
      ...actor(user), module: 'roadmap', action: 'admin.roadmap.reordered',
      targetType: 'RoadmapItem', afterData: payload.items
    })
    return { updated: payload.items.length }
  }

  async addUpdate(id: string, payload: RoadmapUpdatePayload, user: AuthenticatedUser) {
    const item = await this.detail(id)
    if (!payload.title?.trim() || !payload.content?.trim()) throw new BadRequestException('Titulo e conteudo sao obrigatorios.')
    const newProgress = payload.newProgress === undefined ? item.progress : clampProgress(payload.newProgress)
    const update = await this.prisma.$transaction(async (tx) => {
      const created = await tx.roadmapUpdate.create({
        data: {
          roadmapItemId: id, title: payload.title.trim(), content: payload.content.trim(),
          updateType: payload.updateType || 'GENERAL', oldStatus: item.status,
          newStatus: payload.newStatus || item.status, oldProgress: item.progress,
          newProgress, createdBy: user.id, visibility: payload.visibility || 'PUBLIC',
          evidence: json(payload.evidence), durationMinutes: payload.durationMinutes
        }
      })
      await tx.roadmapItem.update({
        where: { id },
        data: {
          status: payload.newStatus || item.status,
          progress: newProgress,
          lastWorkAt: new Date(),
          updatedBy: user.id,
          version: { increment: 1 },
          ...(payload.newStatus === 'RELEASED' ? { completedAt: new Date(), horizon: 'COMPLETED' as const } : {})
        }
      })
      return created
    })
    await this.audit.record({
      ...actor(user), module: 'roadmap', action: 'admin.roadmap.update.created',
      targetType: 'RoadmapUpdate', targetId: update.id,
      beforeData: { status: item.status, progress: item.progress },
      afterData: { status: payload.newStatus || item.status, progress: newProgress },
      workDescription: `${user.username} registrou a atualizacao ${update.title} em ${item.title}.`,
      workEvidence: payload.evidence,
      workDurationMinutes: payload.durationMinutes,
      metadata: { roadmapItemId: id }
    })
    return update
  }

  async createTask(id: string, payload: RoadmapTaskPayload, user: AuthenticatedUser) {
    await this.detail(id)
    if (!payload.title?.trim()) throw new BadRequestException('Titulo da tarefa e obrigatorio.')
    const task = await this.prisma.roadmapTask.create({
      data: {
        roadmapItemId: id, title: payload.title.trim(), description: payload.description?.trim() || null,
        status: payload.status || 'PENDING', assigneeId: payload.assigneeId?.trim() || null,
        dueAt: nullableDate(payload.dueAt), createdBy: user.id, updatedBy: user.id
      }
    })
    const centralTask = await this.prisma.adminTask.create({
      data: {
        title: task.title, description: task.description || '', module: 'roadmap', type: 'ROADMAP_TASK',
        status: task.assigneeId ? 'ASSIGNED' : 'OPEN', assignedTo: task.assigneeId,
        assignedBy: task.assigneeId ? user.id : null, createdBy: user.id, dueAt: task.dueAt,
        entityType: 'RoadmapItem', entityId: id,
        sourceTaskType: 'RoadmapTask', sourceTaskId: task.id
      }
    })
    await this.audit.record({
      ...actor(user), module: 'roadmap', action: 'admin.roadmap.task.created',
      targetType: 'RoadmapTask', targetId: task.id, afterData: task,
      workTaskId: centralTask.id, metadata: { roadmapItemId: id, centralTaskId: centralTask.id }
    })
    return task
  }

  async updateTask(taskId: string, payload: Partial<RoadmapTaskPayload>, user: AuthenticatedUser) {
    const before = await this.prisma.roadmapTask.findUnique({ where: { id: taskId } })
    if (!before) throw new NotFoundException('Tarefa nao encontrada.')
    const task = await this.prisma.roadmapTask.update({
      where: { id: taskId },
      data: {
        ...(payload.title?.trim() ? { title: payload.title.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
        ...(payload.status ? { status: payload.status, completedAt: payload.status === 'DONE' ? new Date() : null } : {}),
        ...(payload.assigneeId !== undefined ? { assigneeId: payload.assigneeId?.trim() || null } : {}),
        ...(payload.dueAt !== undefined ? { dueAt: nullableDate(payload.dueAt) } : {}),
        updatedBy: user.id
      }
    })
    const centralStatus = task.status === 'DONE' ? 'COMPLETED'
      : task.status === 'IN_PROGRESS' ? 'IN_PROGRESS'
        : task.status === 'BLOCKED' ? 'WAITING'
          : task.status === 'CANCELLED' ? 'CANCELED'
            : task.assigneeId ? 'ASSIGNED' : 'OPEN'
    const centralTask = await this.prisma.adminTask.upsert({
      where: { sourceTaskType_sourceTaskId: { sourceTaskType: 'RoadmapTask', sourceTaskId: task.id } },
      create: {
        title: task.title, description: task.description || '', module: 'roadmap', type: 'ROADMAP_TASK',
        status: centralStatus, assignedTo: task.assigneeId, assignedBy: task.assigneeId ? user.id : null,
        createdBy: user.id, dueAt: task.dueAt, completedAt: task.completedAt,
        entityType: 'RoadmapItem', entityId: task.roadmapItemId,
        sourceTaskType: 'RoadmapTask', sourceTaskId: task.id
      },
      update: {
        title: task.title, description: task.description || '', status: centralStatus,
        assignedTo: task.assigneeId, assignedBy: task.assigneeId ? user.id : null,
        dueAt: task.dueAt, completedAt: task.completedAt
      }
    })
    await this.audit.record({
      ...actor(user), module: 'roadmap', action: 'admin.roadmap.task.updated',
      targetType: 'RoadmapTask', targetId: task.id, beforeData: before, afterData: task,
      workTaskId: centralTask.id, metadata: { roadmapItemId: before.roadmapItemId, centralTaskId: centralTask.id }
    })
    return task
  }

  async addRelation(id: string, payload: RoadmapRelationPayload, user: AuthenticatedUser) {
    await this.detail(id)
    const kind = payload.type === 'NEWS' ? 'NEWS' : undefined
    const related = await this.prisma.knowledgeEntry.findFirst({
      where: { id: payload.entityId, ...(kind ? { kind } : {}) },
      select: { id: true, title: true }
    })
    if (!related) {
      await this.recordFailure('ROADMAP_RELATION_NOT_FOUND', 'O conteudo relacionado nao foi encontrado.', new Error(`${payload.type}:${payload.entityId}`), id)
      throw new BadRequestException('O conteudo relacionado nao existe ou possui tipo incompativel.')
    }
    const relation = await this.prisma.roadmapRelation.create({
      data: {
        roadmapItemId: id, type: payload.type, entityId: payload.entityId,
        label: payload.label?.trim() || related.title.slice(0, 191), createdBy: user.id
      }
    })
    await this.audit.record({
      ...actor(user), module: 'roadmap', action: 'admin.roadmap.relation.created',
      targetType: 'RoadmapRelation', targetId: relation.id, afterData: relation,
      metadata: { roadmapItemId: id }
    })
    return relation
  }

  async removeRelation(relationId: string, user: AuthenticatedUser) {
    const before = await this.prisma.roadmapRelation.findUnique({ where: { id: relationId } })
    if (!before) throw new NotFoundException('Relacao nao encontrada.')
    await this.prisma.roadmapRelation.delete({ where: { id: relationId } })
    await this.audit.record({
      ...actor(user), module: 'roadmap', action: 'admin.roadmap.relation.deleted',
      targetType: 'RoadmapRelation', targetId: relationId, beforeData: before,
      metadata: { roadmapItemId: before.roadmapItemId }
    })
    return { deleted: true }
  }

  async history(id: string) {
    await this.detail(id)
    return this.prisma.auditEvent.findMany({
      where: {
        module: 'roadmap',
        OR: [
          { targetType: 'RoadmapItem', targetId: id },
          { metadata: { path: '$.roadmapItemId', equals: id } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })
  }
}
