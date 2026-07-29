import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import ExcelJS from 'exceljs'
import { createHash } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { permissionKeys } from '../auth/permissions'
import {
  adminReportCategories,
  type AdminReportCategory,
  type AdminReportExportQuery,
  type AdminReportQuery,
  type AdminReportResult,
  type ReportGroup,
  type ReportMetric
} from './admin-reports.contract'

const categoryTitles: Record<AdminReportCategory, string> = {
  team: 'Trabalho da equipe',
  roadmap: 'Roadmap',
  store: 'Loja',
  marketplace: 'Marketplace',
  community: 'Comunidade',
  audit: 'Auditoria',
  errors: 'Erros',
  security: 'Segurança'
}

const categoryPermissions: Record<AdminReportCategory, string> = {
  team: permissionKeys.adminTasksReportsView,
  roadmap: permissionKeys.adminRoadmapView,
  store: permissionKeys.adminStoreView,
  marketplace: permissionKeys.adminMarketplaceReportsView,
  community: permissionKeys.adminCommunityReportsView,
  audit: permissionKeys.adminAuditView,
  errors: permissionKeys.adminErrorsView,
  security: permissionKeys.adminReportsSecurityView
}

const hasPermission = (user: AuthenticatedUser, permission: string) =>
  user.permissions.includes('*') || user.permissions.includes(permission)

const canSeeFinancial = (user: AuthenticatedUser) =>
  user.role === 'SUPER_ADMIN' && hasPermission(user, permissionKeys.adminFinancialReportsView)

const parseDate = (value: string | undefined, fallback: Date, endOfDay = false) => {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`Data inválida: ${value}`)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    parsed.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
  }
  return parsed
}

const period = (query: AdminReportQuery) => {
  const now = new Date()
  const from = parseDate(query.dateFrom, new Date(now.getTime() - 30 * 86400000))
  const to = parseDate(query.dateTo, now, true)
  if (from > to) throw new BadRequestException('A data inicial não pode ser posterior à data final.')
  const maximum = 2 * 366 * 86400000
  if (to.getTime() - from.getTime() > maximum) {
    throw new BadRequestException('O intervalo máximo para um relatório é de dois anos.')
  }
  return { from, to, createdAt: { gte: from, lte: to } }
}

const metric = (key: string, label: string, value: number | string, sensitive = false): ReportMetric => ({
  key,
  label,
  value,
  ...(sensitive ? { sensitive: true } : {})
})

const countBy = <T>(rows: T[], field: (row: T) => string | null | undefined) => {
  const result = new Map<string, number>()
  for (const row of rows) {
    const key = field(row) || 'Não informado'
    result.set(key, (result.get(key) || 0) + 1)
  }
  return [...result.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
}

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : 0

const normalize = (value: string | undefined) => value?.trim().toUpperCase()

const safeCell = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  const text = String(value)
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

const csvCell = (value: unknown) => `"${safeCell(value).replace(/"/g, '""')}"`

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private assertCategory(category: string | undefined, user: AuthenticatedUser): AdminReportCategory {
    const normalized = String(category || 'team').toLowerCase() as AdminReportCategory
    if (!adminReportCategories.includes(normalized)) throw new BadRequestException('Categoria de relatório inválida.')
    if (!hasPermission(user, categoryPermissions[normalized])) {
      throw new ForbiddenException('Você não possui permissão para esta categoria de relatório.')
    }
    return normalized
  }

  async options(user: AuthenticatedUser) {
    const categories = adminReportCategories
      .filter((category) => hasPermission(user, categoryPermissions[category]))
      .map((key) => ({ key, label: categoryTitles[key] }))
    const administrators = await this.prisma.account.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true, username: true, name: true, role: true },
      orderBy: { name: 'asc' }
    })
    return {
      categories,
      administrators,
      formats: [
        { key: 'csv', label: 'CSV', available: true },
        { key: 'xlsx', label: 'XLSX', available: true },
        { key: 'pdf', label: 'PDF', available: false, note: 'Formato planejado para uma etapa futura.' }
      ],
      financialVisible: canSeeFinancial(user)
    }
  }

  async report(query: AdminReportQuery, user: AuthenticatedUser): Promise<AdminReportResult> {
    const category = this.assertCategory(query.category, user)
    const range = period(query)
    const content = category === 'team'
      ? await this.team(query, range)
      : category === 'roadmap'
        ? await this.roadmap(query, range)
        : category === 'store'
          ? await this.store(query, range, user)
          : category === 'marketplace'
            ? await this.marketplace(query, range, user)
            : category === 'community'
              ? await this.community(query, range)
              : category === 'audit'
                ? await this.auditReport(query, range)
                : category === 'errors'
                  ? await this.errors(query, range)
                  : await this.security(query, range)
    return {
      category,
      title: categoryTitles[category],
      generatedAt: new Date().toISOString(),
      period: { from: range.from.toISOString(), to: range.to.toISOString() },
      financialVisible: canSeeFinancial(user),
      ...content
    }
  }

  private async team(query: AdminReportQuery, range: ReturnType<typeof period>) {
    const [logs, tasks, audits, errors, accounts] = await Promise.all([
      this.prisma.adminWorkLog.findMany({
        where: {
          createdAt: range.createdAt,
          ...(query.userId ? { userId: query.userId } : {}),
          ...(query.module ? { module: query.module } : {}),
          ...(query.result ? { result: normalize(query.result) as never } : {})
        },
        select: { userId: true, username: true, module: true, action: true, durationMinutes: true, result: true }
      }),
      this.prisma.adminTask.findMany({
        where: {
          createdAt: range.createdAt,
          ...(query.userId ? { assignedTo: query.userId } : {}),
          ...(query.module ? { module: query.module } : {}),
          ...(query.status ? { status: normalize(query.status) as never } : {}),
          ...(query.priority ? { priority: normalize(query.priority) as never } : {}),
          ...(query.type ? { type: query.type } : {})
        },
        select: { assignedTo: true, status: true, dueAt: true, completedAt: true, actualMinutes: true, reopenedCount: true, rejectedCount: true, module: true }
      }),
      this.prisma.auditEvent.findMany({
        where: {
          createdAt: range.createdAt,
          ...(query.userId ? { actorId: query.userId } : {}),
          ...(query.module ? { module: query.module } : {}),
          ...(query.result ? { result: normalize(query.result) as never } : {})
        },
        select: { actorId: true, actorUsername: true, module: true, action: true, result: true }
      }),
      this.prisma.systemError.findMany({
        where: {
          resolvedAt: range.createdAt,
          ...(query.userId ? { resolvedBy: query.userId } : {}),
          ...(query.module ? { module: query.module } : {})
        },
        select: { resolvedBy: true }
      }),
      this.prisma.account.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true, username: true, name: true, role: true }
      })
    ])
    const now = new Date()
    const rows = accounts
      .filter((account) => !query.userId || account.id === query.userId)
      .map((account) => {
        const userLogs = logs.filter((item) => item.userId === account.id)
        const userTasks = tasks.filter((item) => item.assignedTo === account.id)
        const userAudits = audits.filter((item) => item.actorId === account.id)
        const actionCount = (expression: RegExp) => userAudits.filter((item) => expression.test(item.action)).length
        return {
          userId: account.id,
          collaborator: account.name || account.username,
          role: account.role,
          activities: userLogs.length,
          tasksCompleted: userTasks.filter((item) => item.status === 'COMPLETED').length,
          tasksOverdue: userTasks.filter((item) => item.dueAt && item.dueAt < now && !['COMPLETED', 'CANCELED'].includes(item.status)).length,
          tasksReopened: userTasks.reduce((sum, item) => sum + item.reopenedCount, 0),
          rejected: userTasks.reduce((sum, item) => sum + item.rejectedCount, 0),
          minutes: userLogs.reduce((sum, item) => sum + (item.durationMinutes || 0), 0),
          averageTaskMinutes: average(userTasks.map((item) => item.actualMinutes || 0).filter(Boolean)),
          reviews: actionCount(/review|revis/i),
          approvals: actionCount(/approve|aprovar/i),
          publications: actionCount(/publish|public/i),
          moderations: actionCount(/moderat|suspend|hide|remove/i),
          errorsResolved: errors.filter((item) => item.resolvedBy === account.id).length
        }
      })
    return {
      summary: [
        metric('activities', 'Atividades', logs.length),
        metric('completed', 'Tarefas concluídas', tasks.filter((item) => item.status === 'COMPLETED').length),
        metric('overdue', 'Tarefas atrasadas', rows.reduce((sum, item) => sum + item.tasksOverdue, 0)),
        metric('reopened', 'Reaberturas', rows.reduce((sum, item) => sum + item.tasksReopened, 0)),
        metric('minutes', 'Minutos registrados', logs.reduce((sum, item) => sum + (item.durationMinutes || 0), 0))
      ],
      groups: [
        { key: 'collaborators', label: 'Atividades por colaborador', rows },
        { key: 'modules', label: 'Ações por módulo', rows: countBy(logs, (item) => item.module) }
      ],
      notes: ['Quantidade isolada não representa desempenho; complexidade, rejeições, reaberturas e tempo devem ser analisados em conjunto.']
    }
  }

  private async roadmap(query: AdminReportQuery, range: ReturnType<typeof period>) {
    const [items, updates] = await Promise.all([
      this.prisma.roadmapItem.findMany({
        where: {
          deletedAt: null,
          createdAt: range.createdAt,
          ...(query.userId ? { ownerId: query.userId } : {}),
          ...(query.status ? { status: normalize(query.status) as never } : {}),
          ...(query.priority ? { priority: normalize(query.priority) as never } : {}),
          ...(query.type ? { category: query.type } : {})
        },
        select: {
          id: true, title: true, status: true, workflowStatus: true, ownerId: true, internalDeadline: true,
          completedAt: true, createdAt: true, progress: true, workSituation: true
        }
      }),
      this.prisma.roadmapUpdate.findMany({
        where: { createdAt: range.createdAt, ...(query.userId ? { createdBy: query.userId } : {}) },
        select: { updateType: true, createdBy: true, durationMinutes: true, oldStatus: true, newStatus: true }
      })
    ])
    const ownerIds = [...new Set(items.map((item) => item.ownerId).filter(Boolean))] as string[]
    const owners = await this.prisma.account.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, username: true } })
    const ownerNames = new Map(owners.map((item) => [item.id, item.name || item.username]))
    const now = new Date()
    const rows = items.map((item) => ({
      id: item.id,
      initiative: item.title,
      status: item.status,
      workflow: item.workflowStatus,
      owner: item.ownerId ? ownerNames.get(item.ownerId) || item.ownerId : 'Sem responsável',
      progress: item.progress,
      overdue: Boolean(item.internalDeadline && item.internalDeadline < now && !item.completedAt),
      cycleDays: item.completedAt ? Math.round((item.completedAt.getTime() - item.createdAt.getTime()) / 86400000 * 10) / 10 : null
    }))
    return {
      summary: [
        metric('initiatives', 'Iniciativas', items.length),
        metric('updates', 'Atualizações', updates.length),
        metric('overdue', 'Atrasadas', rows.filter((item) => item.overdue).length),
        metric('completed', 'Concluídas', items.filter((item) => item.status === 'RELEASED' || item.status === 'READY').length),
        metric('canceled', 'Canceladas', items.filter((item) => item.status === 'CANCELLED').length)
      ],
      groups: [
        { key: 'initiatives', label: 'Iniciativas', rows },
        { key: 'statuses', label: 'Por status', rows: countBy(items, (item) => item.status) },
        { key: 'owners', label: 'Por responsável', rows: countBy(rows, (item) => item.owner) },
        { key: 'stages', label: 'Tempo registrado por etapa', rows: countBy(updates, (item) => item.updateType).map((row) => ({ ...row, minutes: updates.filter((item) => item.updateType === row.key).reduce((sum, item) => sum + (item.durationMinutes || 0), 0) })) }
      ]
    }
  }

  private async store(query: AdminReportQuery, range: ReturnType<typeof period>, user: AuthenticatedUser) {
    const [products, orders, deliveries] = await Promise.all([
      this.prisma.shopProduct.findMany({
        where: { createdAt: range.createdAt, deletedAt: null, ...(query.status ? { status: normalize(query.status) as never } : {}), ...(query.type ? { category: query.type } : {}) },
        select: { id: true, name: true, status: true, category: true }
      }),
      this.prisma.purchaseIntent.findMany({
        where: { createdAt: range.createdAt, ...(query.status ? { status: normalize(query.status) as never } : {}), ...(query.userId ? { accountId: query.userId } : {}) },
        select: { id: true, status: true, price: true, quantity: true, currency: true, productId: true, refundedAt: true, product: { select: { name: true } } }
      }),
      this.prisma.storeDelivery.findMany({
        where: { createdAt: range.createdAt, ...(query.userId ? { assignedTo: query.userId } : {}) },
        select: { status: true, attempts: true, assignedTo: true }
      })
    ])
    const financial = canSeeFinancial(user)
    const completed = orders.filter((item) => item.status === 'COMPLETED')
    const revenueByCurrency = financial
      ? countBy(completed, (item) => item.currency).map((row) => ({
          currency: row.key,
          sales: row.count,
          revenue: completed.filter((item) => item.currency === row.key).reduce((sum, item) => sum + item.price * item.quantity, 0),
          averageTicket: average(completed.filter((item) => item.currency === row.key).map((item) => item.price * item.quantity))
        }))
      : []
    const profitable = financial
      ? [...new Set(completed.map((item) => item.productId))].map((productId) => {
          const selected = completed.filter((item) => item.productId === productId)
          return {
            product: selected[0]?.product.name || productId,
            sales: selected.length,
            revenue: selected.reduce((sum, item) => sum + item.price * item.quantity, 0),
            currencies: [...new Set(selected.map((item) => item.currency))].join(', ')
          }
        }).sort((left, right) => right.revenue - left.revenue)
      : []
    return {
      summary: [
        metric('products', 'Produtos', products.length),
        metric('orders', 'Pedidos', orders.length),
        metric('deliveries', 'Entregas', deliveries.length),
        metric('failures', 'Falhas', deliveries.filter((item) => item.status === 'FAILED').length),
        metric('reprocessed', 'Reprocessamentos', deliveries.filter((item) => item.attempts > 1).length),
        metric('refunds', 'Estornos', orders.filter((item) => item.refundedAt || item.status === 'REFUNDED').length)
      ],
      groups: [
        { key: 'products', label: 'Produtos por status', rows: countBy(products, (item) => item.status) },
        { key: 'orders', label: 'Pedidos por status', rows: countBy(orders, (item) => item.status) },
        { key: 'deliveries', label: 'Entregas por status', rows: countBy(deliveries, (item) => item.status) },
        ...(financial ? [{ key: 'financial', label: 'Financeiro por moeda', rows: revenueByCurrency }, { key: 'profitability', label: 'Produtos mais rentáveis', rows: profitable }] : [])
      ],
      notes: financial ? ['Valores são mantidos separados por moeda.'] : ['Dados financeiros ocultados por permissão.']
    }
  }

  private async marketplace(query: AdminReportQuery, range: ReturnType<typeof period>, user: AuthenticatedUser) {
    const [listings, orders, escrows, reports] = await Promise.all([
      this.prisma.playerMarketListing.findMany({
        where: { createdAt: range.createdAt, ...(query.status ? { status: normalize(query.status) as never } : {}), ...(query.type ? { itemCategory: query.type } : {}), ...(query.userId ? { sellerAccountId: query.userId } : {}) },
        select: { status: true, itemCategory: true, itemName: true, price: true, currency: true, createdAt: true, soldAt: true }
      }),
      this.prisma.playerMarketOrder.findMany({
        where: { createdAt: range.createdAt, ...(query.userId ? { buyerAccountId: query.userId } : {}) },
        select: { status: true, price: true, fee: true, currency: true }
      }),
      this.prisma.marketplaceEscrow.findMany({
        where: { createdAt: range.createdAt },
        select: { status: true, attempts: true, lastError: true }
      }),
      this.prisma.marketplaceReport.findMany({
        where: { createdAt: range.createdAt, ...(query.userId ? { assignedTo: query.userId } : {}) },
        select: { status: true, reason: true }
      })
    ])
    const financial = canSeeFinancial(user)
    const sold = listings.filter((item) => item.soldAt)
    const saleHours = sold.map((item) => (item.soldAt!.getTime() - item.createdAt.getTime()) / 3600000)
    return {
      summary: [
        metric('listings', 'Anúncios', listings.length),
        metric('sales', 'Vendas', orders.filter((item) => item.status === 'COMPLETED').length),
        metric('escrow', 'Itens em escrow', escrows.length),
        metric('failures', 'Falhas de escrow', escrows.filter((item) => item.lastError).length),
        metric('reports', 'Denúncias', reports.length),
        metric('saleTime', 'Tempo médio de venda (h)', average(saleHours))
      ],
      groups: [
        { key: 'listings', label: 'Anúncios por status', rows: countBy(listings, (item) => item.status) },
        { key: 'categories', label: 'Itens por categoria', rows: countBy(listings, (item) => item.itemCategory) },
        { key: 'escrow', label: 'Escrow por status', rows: countBy(escrows, (item) => item.status) },
        { key: 'reports', label: 'Denúncias por status', rows: countBy(reports, (item) => item.status) },
        ...(financial ? [{
          key: 'financial',
          label: 'Preços e taxas por moeda',
          rows: countBy(orders, (item) => item.currency).map((row) => ({
            currency: row.key,
            orders: row.count,
            averagePrice: average(orders.filter((item) => item.currency === row.key).map((item) => item.price)),
            fees: orders.filter((item) => item.currency === row.key).reduce((sum, item) => sum + item.fee, 0)
          }))
        }] : [])
      ],
      notes: financial ? ['Preços e taxas são separados por moeda.'] : ['Preços consolidados e taxas ocultados por permissão.']
    }
  }

  private async community(query: AdminReportQuery, range: ReturnType<typeof period>) {
    const now = new Date()
    const [posts, comments, reactions, reports, profiles, grants, quests] = await Promise.all([
      this.prisma.communityPost.findMany({ where: { createdAt: range.createdAt, ...(query.status ? { status: normalize(query.status) as never } : {}), ...(query.userId ? { authorId: query.userId } : {}) }, select: { status: true, authorId: true } }),
      this.prisma.communityComment.findMany({ where: { createdAt: range.createdAt, ...(query.status ? { status: normalize(query.status) as never } : {}), ...(query.userId ? { authorId: query.userId } : {}) }, select: { status: true, authorId: true } }),
      this.prisma.communityReaction.findMany({ where: { createdAt: range.createdAt, ...(query.userId ? { accountId: query.userId } : {}) }, select: { type: true, accountId: true } }),
      this.prisma.communityReport.findMany({ where: { createdAt: range.createdAt, ...(query.status ? { status: normalize(query.status) as never } : {}), ...(query.priority ? { priority: normalize(query.priority) as never } : {}), ...(query.userId ? { assigneeId: query.userId } : {}) }, select: { status: true, priority: true } }),
      this.prisma.communityProfile.findMany({ where: { OR: [{ socialSuspendedUntil: { gt: now } }, { postBlockedUntil: { gt: now } }, { commentBlockedUntil: { gt: now } }] }, select: { accountId: true } }),
      this.prisma.communityAchievementGrant.findMany({ where: { grantedAt: range.createdAt }, select: { achievementId: true, revokedAt: true } }),
      this.prisma.communityQuest.findMany({ where: { createdAt: range.createdAt, ...(query.status ? { status: normalize(query.status) as never } : {}) }, select: { status: true } })
    ])
    const activeUsers = new Set([...posts.map((item) => item.authorId), ...comments.map((item) => item.authorId), ...reactions.map((item) => item.accountId)])
    return {
      summary: [
        metric('activeUsers', 'Usuários ativos', activeUsers.size),
        metric('posts', 'Publicações', posts.length),
        metric('comments', 'Comentários', comments.length),
        metric('reactions', 'Reações', reactions.length),
        metric('reports', 'Denúncias', reports.length),
        metric('suspensions', 'Suspensões vigentes', profiles.length),
        metric('achievements', 'Conquistas atribuídas', grants.filter((item) => !item.revokedAt).length),
        metric('quests', 'Quests', quests.length)
      ],
      groups: [
        { key: 'posts', label: 'Publicações por status', rows: countBy(posts, (item) => item.status) },
        { key: 'reactions', label: 'Reações por tipo', rows: countBy(reactions, (item) => item.type) },
        { key: 'reports', label: 'Denúncias por status', rows: countBy(reports, (item) => item.status) },
        { key: 'quests', label: 'Quests por status', rows: countBy(quests, (item) => item.status) }
      ]
    }
  }

  private async auditReport(query: AdminReportQuery, range: ReturnType<typeof period>) {
    const events = await this.prisma.auditEvent.findMany({
      where: {
        createdAt: range.createdAt,
        ...(query.module ? { module: query.module } : {}),
        ...(query.userId ? { actorId: query.userId } : {}),
        ...(query.result ? { result: normalize(query.result) as never } : {}),
        ...(query.type ? { action: { contains: query.type } } : {})
      },
      select: { module: true, action: true, actorId: true, actorUsername: true, result: true, severity: true }
    })
    return {
      summary: [
        metric('events', 'Eventos auditados', events.length),
        metric('success', 'Sucessos', events.filter((item) => item.result === 'SUCCESS').length),
        metric('failures', 'Falhas', events.filter((item) => item.result === 'FAILURE').length),
        metric('denied', 'Negadas', events.filter((item) => item.result === 'DENIED').length)
      ],
      groups: [
        { key: 'modules', label: 'Eventos por módulo', rows: countBy(events, (item) => item.module) },
        { key: 'actions', label: 'Ações', rows: countBy(events, (item) => item.action) },
        { key: 'results', label: 'Resultados', rows: countBy(events, (item) => item.result) },
        { key: 'actors', label: 'Ações por colaborador', rows: countBy(events, (item) => item.actorUsername || item.actorId) }
      ]
    }
  }

  private async errors(query: AdminReportQuery, range: ReturnType<typeof period>) {
    const errors = await this.prisma.systemError.findMany({
      where: {
        lastOccurredAt: range.createdAt,
        ...(query.module ? { module: query.module } : {}),
        ...(query.userId ? { assignedTo: query.userId } : {}),
        ...(query.status ? { status: normalize(query.status) as never } : {}),
        ...(query.type ? { errorCode: query.type } : {})
      },
      select: { module: true, severity: true, status: true, occurrenceCount: true, firstOccurredAt: true, resolvedAt: true, assignedTo: true }
    })
    const resolutionHours = errors
      .filter((item) => item.resolvedAt)
      .map((item) => (item.resolvedAt!.getTime() - item.firstOccurredAt.getTime()) / 3600000)
    return {
      summary: [
        metric('errors', 'Erros agrupados', errors.length),
        metric('occurrences', 'Ocorrências', errors.reduce((sum, item) => sum + item.occurrenceCount, 0)),
        metric('critical', 'Críticos', errors.filter((item) => item.severity === 'CRITICAL').length),
        metric('reopened', 'Reabertos', errors.filter((item) => item.status === 'REOPENED').length),
        metric('resolution', 'Tempo médio de resolução (h)', average(resolutionHours))
      ],
      groups: [
        { key: 'modules', label: 'Erros por módulo', rows: countBy(errors, (item) => item.module) },
        { key: 'severity', label: 'Por severidade', rows: countBy(errors, (item) => item.severity) },
        { key: 'status', label: 'Por status', rows: countBy(errors, (item) => item.status) },
        { key: 'owners', label: 'Por responsável', rows: countBy(errors, (item) => item.assignedTo || 'Sem responsável') }
      ]
    }
  }

  private async security(query: AdminReportQuery, range: ReturnType<typeof period>) {
    const [events, sessions, moderations] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where: {
          createdAt: range.createdAt,
          OR: [{ module: { in: ['auth', 'security', 'accounts'] } }, { action: { contains: 'permission' } }, { result: 'DENIED' }],
          ...(query.userId ? { actorId: query.userId } : {}),
          ...(query.result ? { result: normalize(query.result) as never } : {})
        },
        select: { module: true, action: true, result: true, severity: true }
      }),
      this.prisma.accountSession.findMany({
        where: { createdAt: range.createdAt, ...(query.userId ? { accountId: query.userId } : {}) },
        select: { revokedAt: true, expiresAt: true, revokeReason: true }
      }),
      this.prisma.accountModeration.findMany({
        where: { createdAt: range.createdAt, ...(query.userId ? { accountId: query.userId } : {}) },
        select: { type: true, expiresAt: true }
      })
    ])
    const now = new Date()
    return {
      summary: [
        metric('events', 'Eventos de segurança', events.length),
        metric('denied', 'Acessos negados', events.filter((item) => item.result === 'DENIED').length),
        metric('sessions', 'Sessões criadas', sessions.length),
        metric('revoked', 'Sessões revogadas', sessions.filter((item) => item.revokedAt).length),
        metric('active', 'Sessões ainda válidas', sessions.filter((item) => !item.revokedAt && item.expiresAt > now).length),
        metric('moderations', 'Ações de conta', moderations.length)
      ],
      groups: [
        { key: 'events', label: 'Eventos por ação', rows: countBy(events, (item) => item.action) },
        { key: 'results', label: 'Resultados', rows: countBy(events, (item) => item.result) },
        { key: 'revocations', label: 'Motivos de revogação', rows: countBy(sessions.filter((item) => item.revokedAt), (item) => item.revokeReason) },
        { key: 'moderations', label: 'Moderações de conta', rows: countBy(moderations, (item) => item.type) }
      ],
      notes: ['Endereços IP, agentes de usuário, tokens e dados pessoais não são incluídos neste relatório.']
    }
  }

  private exportRows(report: AdminReportResult) {
    const rows: Array<Record<string, unknown>> = report.summary.map((item) => ({
      section: 'Resumo',
      group: report.title,
      key: item.key,
      label: item.label,
      value: item.value
    }))
    for (const group of report.groups) {
      for (const row of group.rows) rows.push({ section: 'Detalhes', group: group.label, ...row })
    }
    return rows
  }

  async exportReport(query: AdminReportExportQuery, user: AuthenticatedUser) {
    const format = String(query.format || 'csv').toLowerCase()
    if (format === 'pdf') throw new BadRequestException('A exportação PDF está planejada para uma etapa futura.')
    if (!['csv', 'xlsx'].includes(format)) throw new BadRequestException('Formato de exportação inválido.')
    const report = await this.report(query, user)
    const rows = this.exportRows(report)
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]
    let content: string
    let contentType: string
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Blood Moon'
      workbook.created = new Date()
      const sheet = workbook.addWorksheet(report.title.slice(0, 31))
      sheet.columns = keys.map((key) => ({ header: key, key, width: Math.min(42, Math.max(14, key.length + 4)) }))
      sheet.addRows(rows.map((row) => Object.fromEntries(keys.map((key) => [key, safeCell(row[key])]))))
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F1D1D' } }
      sheet.views = [{ state: 'frozen', ySplit: 1 }]
      const buffer = await workbook.xlsx.writeBuffer()
      content = Buffer.from(buffer).toString('base64')
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else {
      content = `\uFEFF${[keys.map(csvCell).join(','), ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(','))].join('\r\n')}`
      contentType = 'text/csv;charset=utf-8'
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `bloodmoon-${report.category}-${stamp}.${format}`
    const checksum = createHash('sha256').update(content).digest('hex')
    const exportRecord = await this.prisma.adminLogExport.create({
      data: {
        requestedBy: user.id,
        requestedByName: user.name || user.username,
        source: `reports:${report.category}`,
        format,
        filters: query as Prisma.InputJsonValue,
        status: 'COMPLETED',
        recordCount: rows.length,
        fileName: filename,
        checksum,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 86400000)
      }
    })
    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      module: 'reports',
      action: 'admin.reports.export',
      targetType: 'AdminLogExport',
      targetId: exportRecord.id,
      afterData: { category: report.category, format, recordCount: rows.length, financialVisible: report.financialVisible },
      reason: 'Relatório administrativo exportado.',
      workDescription: `${user.username} exportou o relatório ${report.title} em ${format.toUpperCase()}.`
    })
    return {
      filename,
      contentType,
      encoding: format === 'xlsx' ? 'base64' : 'utf8',
      content,
      recordCount: rows.length,
      checksum
    }
  }
}
