import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type {
  MarketplaceEscrowStatus,
  MarketplaceListingStatus,
  MarketplaceReportStatus,
  Prisma
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import type {
  MarketplaceAdminActionPayload,
  MarketplaceAdminQuery,
  MarketplaceBulkActionPayload,
  MarketplaceEconomyPayload,
  MarketplaceEscrowActionPayload,
  MarketplaceReportPayload,
  MarketplaceReportUpdatePayload,
  MarketplaceTaskPayload
} from './marketplace.contract'

const listingStatuses: MarketplaceListingStatus[] = [
  'DRAFT', 'ESCROW_PENDING', 'ACTIVE', 'RESERVED', 'SOLD', 'CANCELED',
  'EXPIRED', 'SUSPENDED', 'RETURN_PENDING', 'RETURNED', 'MANUAL_REVIEW', 'FAILED'
]
const reportStatuses: MarketplaceReportStatus[] = [
  'NEW', 'ASSIGNED', 'INVESTIGATING', 'WAITING_FOR_USER',
  'RESOLVED', 'REJECTED', 'ESCALATED'
]

const pageValues = (query: MarketplaceAdminQuery) => {
  const page = Math.max(1, Math.floor(Number(query.page) || 1))
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(query.pageSize) || 30)))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue

const requiredReason = (reason?: string) => {
  const normalized = reason?.trim()
  if (!normalized || normalized.length < 4) {
    throw new BadRequestException('Informe uma justificativa com pelo menos 4 caracteres.')
  }
  return normalized
}

@Injectable()
export class MarketplaceAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService
  ) {}

  async dashboard(user: AuthenticatedUser) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [
      activeListings,
      createdToday,
      soldListings,
      expiredListings,
      suspendedListings,
      transactionsInProgress,
      escrowHeld,
      returnFailures,
      pendingReports,
      suspendedUsers,
      criticalErrors,
      assignedTasks
    ] = await Promise.all([
      this.prisma.playerMarketListing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.playerMarketListing.count({ where: { createdAt: { gte: today } } }),
      this.prisma.playerMarketListing.count({ where: { status: 'SOLD' } }),
      this.prisma.playerMarketListing.count({ where: { status: 'EXPIRED' } }),
      this.prisma.playerMarketListing.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.playerMarketOrder.count({ where: { status: { in: ['PREPARED', 'PAID', 'DELIVERING'] } } }),
      this.prisma.marketplaceEscrow.count({ where: { status: { in: ['HELD', 'TRANSFER_PENDING', 'FROZEN'] } } }),
      this.prisma.marketplaceEscrow.count({ where: { status: 'FAILED', lastError: { not: null } } }),
      this.prisma.marketplaceReport.count({ where: { status: { in: ['NEW', 'ASSIGNED', 'INVESTIGATING', 'WAITING_FOR_USER', 'ESCALATED'] } } }),
      this.prisma.account.count({ where: { status: 'BLOCKED' } }),
      this.prisma.systemError.count({ where: { module: 'marketplace', severity: 'CRITICAL', status: { notIn: ['RESOLVED', 'IGNORED'] } } }),
      this.prisma.marketplaceTask.count({ where: { assigneeId: user.id, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } } })
    ])

    const operational = {
      activeListings,
      createdToday,
      soldListings,
      expiredListings,
      suspendedListings,
      transactionsInProgress,
      escrowHeld,
      returnFailures,
      pendingReports,
      suspendedUsers,
      criticalErrors,
      assignedTasks
    }
    if (user.role !== 'SUPER_ADMIN') return operational

    const financial = await this.prisma.playerMarketOrder.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { price: true, fee: true },
      _avg: { price: true },
      _count: { id: true }
    })
    return {
      ...operational,
      financial: {
        volume: financial._sum.price || 0,
        fees: financial._sum.fee || 0,
        averagePrice: Math.round(financial._avg.price || 0),
        completedSales: financial._count.id
      }
    }
  }

  async listings(query: MarketplaceAdminQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const status = listingStatuses.includes(query.status as MarketplaceListingStatus)
      ? query.status as MarketplaceListingStatus
      : undefined
    const search = query.search?.trim()
    const where: Prisma.PlayerMarketListingWhereInput = {
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { itemName: { contains: search } },
          { gameItemRef: { contains: search } },
          { seller: { username: { contains: search } } }
        ]
      } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.playerMarketListing.findMany({
        where,
        include: {
          seller: { select: { id: true, username: true, status: true } },
          sellerCharacter: { select: { id: true, name: true, className: true } },
          escrow: true,
          _count: { select: { orders: true, reports: true, tasks: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.playerMarketListing.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async listingAction(id: string, payload: MarketplaceAdminActionPayload, user: AuthenticatedUser) {
    const reason = requiredReason(payload.reason)
    const before = await this.prisma.playerMarketListing.findUnique({
      where: { id },
      include: { escrow: true }
    })
    if (!before) throw new NotFoundException('Anuncio nao encontrado.')

    const statusByAction: Record<string, MarketplaceListingStatus> = {
      SUSPEND: 'SUSPENDED',
      REACTIVATE: 'ACTIVE',
      CANCEL: 'CANCELED',
      MANUAL_REVIEW: 'MANUAL_REVIEW',
      RETURN_ITEM: 'RETURN_PENDING'
    }
    const nextStatus = statusByAction[payload.action]
    if (!nextStatus) throw new BadRequestException('Acao administrativa invalida.')
    const allowedFrom: Record<string, MarketplaceListingStatus[]> = {
      SUSPEND: ['ACTIVE', 'MANUAL_REVIEW'],
      REACTIVATE: ['SUSPENDED', 'MANUAL_REVIEW'],
      CANCEL: ['DRAFT', 'ESCROW_PENDING', 'ACTIVE', 'SUSPENDED', 'MANUAL_REVIEW'],
      MANUAL_REVIEW: ['ESCROW_PENDING', 'ACTIVE', 'RESERVED', 'SUSPENDED', 'FAILED'],
      RETURN_ITEM: ['ESCROW_PENDING', 'ACTIVE', 'CANCELED', 'EXPIRED', 'SUSPENDED', 'MANUAL_REVIEW', 'FAILED']
    }
    if (!allowedFrom[payload.action]?.includes(before.status)) {
      throw new BadRequestException(`A acao ${payload.action} nao pode partir do estado ${before.status}.`)
    }
    if (payload.action === 'REACTIVATE' && before.escrow?.status !== 'HELD') {
      throw new BadRequestException('Somente anuncio com item confirmado no escrow pode ser reativado.')
    }

    const after = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.playerMarketListing.update({
        where: { id },
        data: {
          status: nextStatus,
          adminNotes: payload.notes?.trim() || before.adminNotes,
          moderationReason: reason,
          ...(nextStatus === 'SUSPENDED' ? { suspendedAt: new Date(), suspendedBy: user.id } : {}),
          ...(nextStatus === 'CANCELED' ? { cancelledAt: new Date() } : {})
        }
      })
      if (nextStatus === 'RETURN_PENDING' || nextStatus === 'CANCELED') {
        await tx.marketplaceEscrow.update({
          where: { listingId: id },
          data: { status: 'RETURN_PENDING', manualReviewReason: reason }
        })
        await tx.gameBridgeJob.create({
          data: {
            accountId: before.sellerAccountId,
            listingId: id,
            operation: 'RELEASE_ITEM',
            idempotencyKey: `market-admin-return:${id}:${randomUUID()}`,
            payload: { listingId: id, gameItemRef: before.gameItemRef, reason }
          }
        })
      }
      return listing
    })

    await this.audit.record({
      module: 'marketplace',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: `admin.marketplace.listing.${payload.action.toLowerCase()}`,
      targetType: 'PlayerMarketListing',
      targetId: id,
      targetUserId: before.sellerAccountId,
      beforeData: { status: before.status, adminNotes: before.adminNotes },
      afterData: { status: after.status, adminNotes: after.adminNotes },
      reason,
      workDescription: `${user.username} executou ${payload.action} no anuncio ${id}.`,
      workEvidence: payload.evidence
    })
    return after
  }

  async listingBulkAction(payload: MarketplaceBulkActionPayload, user: AuthenticatedUser) {
    const ids = [...new Set(payload.ids || [])].filter(Boolean)
    if (!ids.length || ids.length > 100) {
      throw new BadRequestException('Selecione entre 1 e 100 anuncios.')
    }
    const results: Array<{ id: string, success: boolean, error?: string }> = []
    for (const id of ids) {
      try {
        await this.listingAction(id, payload, user)
        results.push({ id, success: true })
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Falha desconhecida.'
        })
      }
    }
    return {
      total: ids.length,
      succeeded: results.filter(result => result.success).length,
      failed: results.filter(result => !result.success).length,
      results
    }
  }

  async exportListings(query: MarketplaceAdminQuery) {
    const page = await this.listings({ ...query, page: '1', pageSize: '100' })
    return {
      exportedAt: new Date().toISOString(),
      total: page.total,
      truncated: page.total > page.data.length,
      rows: page.data.map(row => ({
        id: row.id,
        itemName: row.itemName,
        category: row.itemCategory,
        seller: row.seller.username,
        status: row.status,
        price: row.price,
        currency: row.currency,
        escrowStatus: row.escrow?.status || null,
        orders: row._count.orders,
        reports: row._count.reports,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt
      }))
    }
  }

  async orders(query: MarketplaceAdminQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.PlayerMarketOrderWhereInput = {
      ...(query.status ? { status: query.status as never } : {}),
      ...(search ? {
        OR: [
          { id: { contains: search } },
          { correlationId: { contains: search } },
          { listing: { itemName: { contains: search } } },
          { buyer: { username: { contains: search } } }
        ]
      } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.playerMarketOrder.findMany({
        where,
        include: {
          buyer: { select: { id: true, username: true } },
          listing: {
            include: {
              seller: { select: { id: true, username: true } },
              escrow: true
            }
          },
          bridgeJobs: { orderBy: { createdAt: 'desc' } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.playerMarketOrder.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async orderAction(id: string, payload: MarketplaceAdminActionPayload, user: AuthenticatedUser) {
    const reason = requiredReason(payload.reason)
    const order = await this.prisma.playerMarketOrder.findUnique({
      where: { id },
      include: { listing: true }
    })
    if (!order) throw new NotFoundException('Transacao nao encontrada.')

    if (payload.action === 'REPROCESS') {
      if (!['FAILED', 'DELIVERING'].includes(order.status)) {
        throw new BadRequestException('Somente transacoes com falha ou entrega pendente podem ser reprocessadas.')
      }
      const job = await this.prisma.gameBridgeJob.create({
        data: {
          accountId: order.buyerAccountId,
          listingId: order.listingId,
          orderId: order.id,
          operation: 'TRANSFER_ITEM',
          idempotencyKey: `market-reprocess:${order.id}:${randomUUID()}`,
          payload: {
            orderId: order.id,
            listingId: order.listingId,
            gameItemRef: order.listing.gameItemRef,
            reason,
            reprocessedBy: user.id
          }
        }
      })
      await this.auditAction(user, 'transaction.reprocessed', 'PlayerMarketOrder', id, reason, { bridgeJobId: job.id })
      return job
    }

    if (payload.action === 'MANUAL_REVIEW') {
      const updated = await this.prisma.playerMarketOrder.update({
        where: { id },
        data: {
          status: 'FAILED',
          metadata: json({ previous: order.metadata, adminReason: reason, adminAction: payload.action })
        }
      })
      await this.auditAction(user, 'transaction.manual_review', 'PlayerMarketOrder', id, reason, {
        beforeStatus: order.status,
        afterStatus: updated.status
      })
      return updated
    }
    if (!['CANCEL', 'COMPENSATE'].includes(payload.action)) {
      throw new BadRequestException('Acao de transacao invalida.')
    }
    if (['COMPLETED', 'REFUNDED'].includes(order.status)) {
      throw new BadRequestException('Transacao concluida ou ja estornada exige fluxo financeiro especializado.')
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.playerMarketOrder.updateMany({
        where: { id, status: order.status },
        data: {
          status: order.paidAt ? 'REFUNDED' : 'CANCELLED',
          cancelledAt: new Date(),
          metadata: json({ previous: order.metadata, adminReason: reason, adminAction: payload.action })
        }
      })
      if (claimed.count !== 1) {
        throw new BadRequestException('A transacao mudou enquanto era processada. Recarregue a tela.')
      }
      if (order.paidAt) {
        await tx.accountCurrency.upsert({
          where: {
            accountId_currency: {
              accountId: order.buyerAccountId,
              currency: order.currency
            }
          },
          create: {
            accountId: order.buyerAccountId,
            currency: order.currency,
            balance: order.price
          },
          update: { balance: { increment: order.price } }
        })
      }
      await tx.playerMarketListing.update({
        where: { id: order.listingId },
        data: { status: 'RETURN_PENDING', moderationReason: reason }
      })
      await tx.marketplaceEscrow.update({
        where: { listingId: order.listingId },
        data: { status: 'RETURN_PENDING', manualReviewReason: reason }
      })
      await tx.gameBridgeJob.create({
        data: {
          accountId: order.listing.sellerAccountId,
          listingId: order.listingId,
          orderId: order.id,
          operation: 'RELEASE_ITEM',
          idempotencyKey: `market-order-refund:${order.id}`,
          payload: {
            orderId: order.id,
            listingId: order.listingId,
            gameItemRef: order.listing.gameItemRef,
            reason,
            refundedBy: user.id
          }
        }
      })
      return tx.playerMarketOrder.findUniqueOrThrow({ where: { id } })
    })
    await this.auditAction(user, `transaction.${payload.action.toLowerCase()}`, 'PlayerMarketOrder', id, reason, {
      beforeStatus: order.status,
      afterStatus: updated.status
    })
    return updated
  }

  async escrow(query: MarketplaceAdminQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.MarketplaceEscrowWhereInput = {
      ...(query.status ? { status: query.status as MarketplaceEscrowStatus } : {}),
      ...(search ? {
        OR: [
          { gameItemRef: { contains: search } },
          { itemSerial: { contains: search } },
          { internalHash: { contains: search } },
          { listing: { itemName: { contains: search } } }
        ]
      } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.marketplaceEscrow.findMany({
        where,
        include: {
          listing: {
            include: {
              seller: { select: { id: true, username: true } },
              orders: {
                where: { status: { in: ['PAID', 'DELIVERING', 'COMPLETED'] } },
                include: { buyer: { select: { id: true, username: true } } },
                take: 1,
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.marketplaceEscrow.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async escrowAction(id: string, payload: MarketplaceEscrowActionPayload, user: AuthenticatedUser) {
    const reason = requiredReason(payload.reason)
    const escrow = await this.prisma.marketplaceEscrow.findUnique({
      where: { id },
      include: { listing: { include: { orders: { orderBy: { createdAt: 'desc' }, take: 1 } } } }
    })
    if (!escrow) throw new NotFoundException('Registro de escrow nao encontrado.')
    if (['RELEASED_TO_BUYER', 'RETURNED_TO_SELLER'].includes(escrow.status)) {
      throw new BadRequestException('Escrow finalizado nao aceita acao manual.')
    }
    if (payload.action === 'SEND_TO_BUYER' && !escrow.buyerAccountId) {
      throw new BadRequestException('Nao existe comprador vinculado a este escrow.')
    }

    const statusByAction: Record<string, MarketplaceEscrowStatus> = {
      RETURN_TO_SELLER: 'RETURN_PENDING',
      SEND_TO_BUYER: 'TRANSFER_PENDING',
      REENQUEUE: escrow.buyerAccountId ? 'TRANSFER_PENDING' : 'RETURN_PENDING',
      MANUAL_REVIEW: 'MANUAL_REVIEW',
      FREEZE: 'FROZEN'
    }
    const nextStatus = statusByAction[payload.action]
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.marketplaceEscrow.update({
        where: { id },
        data: {
          status: nextStatus,
          attempts: { increment: ['REENQUEUE', 'RETURN_TO_SELLER', 'SEND_TO_BUYER'].includes(payload.action) ? 1 : 0 },
          manualReviewReason: reason,
          ...(payload.action === 'FREEZE' ? { frozenAt: new Date(), frozenBy: user.id } : {})
        }
      })
      if (['RETURN_TO_SELLER', 'SEND_TO_BUYER', 'REENQUEUE'].includes(payload.action)) {
        const order = escrow.listing.orders[0]
        const shouldReturn = payload.action === 'RETURN_TO_SELLER' ||
          (payload.action === 'REENQUEUE' && !escrow.buyerAccountId)
        await tx.gameBridgeJob.create({
          data: {
            accountId: shouldReturn ? escrow.originalOwnerId : escrow.buyerAccountId,
            listingId: escrow.listingId,
            orderId: order?.id || null,
            operation: shouldReturn ? 'RELEASE_ITEM' : 'TRANSFER_ITEM',
            idempotencyKey: `market-escrow:${payload.action}:${escrow.id}:${randomUUID()}`,
            payload: {
              escrowId: escrow.id,
              listingId: escrow.listingId,
              gameItemRef: escrow.gameItemRef,
              reason
            }
          }
        })
      }
      return row
    })
    await this.auditAction(user, `escrow.${payload.action.toLowerCase()}`, 'MarketplaceEscrow', id, reason, {
      beforeStatus: escrow.status,
      afterStatus: updated.status
    })
    return updated
  }

  async createReport(payload: MarketplaceReportPayload, user: AuthenticatedUser) {
    const reason = requiredReason(payload.reason)
    if (!payload.description?.trim()) throw new BadRequestException('Descreva a denuncia.')
    if (!payload.listingId && !payload.orderId) {
      throw new BadRequestException('Informe o anuncio ou a transacao denunciada.')
    }
    const listing = payload.listingId
      ? await this.prisma.playerMarketListing.findUnique({ where: { id: payload.listingId } })
      : null
    const order = payload.orderId
      ? await this.prisma.playerMarketOrder.findUnique({
          where: { id: payload.orderId },
          include: { listing: true }
        })
      : null
    if (payload.listingId && !listing) throw new NotFoundException('Anuncio denunciado nao encontrado.')
    if (payload.orderId && !order) throw new NotFoundException('Transacao denunciada nao encontrada.')
    if (order && order.buyerAccountId !== user.id && order.listing.sellerAccountId !== user.id) {
      throw new BadRequestException('Somente comprador ou vendedor pode denunciar esta transacao.')
    }
    const reportedUserId = listing?.sellerAccountId ||
      (order?.buyerAccountId === user.id ? order.listing.sellerAccountId : order?.buyerAccountId) ||
      null
    if (reportedUserId === user.id) {
      throw new BadRequestException('Voce nao pode denunciar a propria conta.')
    }
    const duplicate = await this.prisma.marketplaceReport.findFirst({
      where: {
        reporterId: user.id,
        listingId: payload.listingId || null,
        orderId: payload.orderId || null,
        status: { in: ['NEW', 'ASSIGNED', 'INVESTIGATING', 'WAITING_FOR_USER', 'ESCALATED'] }
      }
    })
    if (duplicate) throw new BadRequestException('Ja existe uma denuncia aberta para este registro.')
    const report = await this.prisma.marketplaceReport.create({
      data: {
        listingId: payload.listingId || null,
        orderId: payload.orderId || null,
        reporterId: user.id,
        reportedUserId,
        reason,
        description: payload.description.trim(),
        evidence: json(payload.evidence)
      }
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType: 'MARKETPLACE_REPORT_CREATED',
      entityType: 'MarketplaceReport',
      entityId: report.id,
      actorUserId: user.id,
      description: `Denuncia ${report.id} criada para analise.`,
      data: { listingId: report.listingId, orderId: report.orderId }
    })
    return report
  }

  async reports(query: MarketplaceAdminQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const status = reportStatuses.includes(query.status as MarketplaceReportStatus)
      ? query.status as MarketplaceReportStatus
      : undefined
    const where: Prisma.MarketplaceReportWhereInput = {
      ...(status ? { status } : {}),
      ...(query.assignee ? { assignedTo: query.assignee } : {}),
      ...(query.search?.trim() ? {
        OR: [
          { reason: { contains: query.search.trim() } },
          { description: { contains: query.search.trim() } },
          { reporter: { username: { contains: query.search.trim() } } },
          { listing: { itemName: { contains: query.search.trim() } } }
        ]
      } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.marketplaceReport.findMany({
        where,
        include: {
          reporter: { select: { id: true, username: true } },
          listing: { select: { id: true, itemName: true, sellerAccountId: true, status: true } },
          order: { select: { id: true, status: true, buyerAccountId: true } },
          tasks: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.marketplaceReport.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async updateReport(id: string, payload: MarketplaceReportUpdatePayload, user: AuthenticatedUser) {
    const reason = requiredReason(payload.reason)
    if (payload.action === 'SUSPEND_USER') {
      throw new BadRequestException('Use a acao protegida de suspensao de usuario.')
    }
    const before = await this.prisma.marketplaceReport.findUnique({
      where: { id },
      include: { listing: true }
    })
    if (!before) throw new NotFoundException('Denuncia nao encontrada.')

    if (payload.action === 'SUSPEND_LISTING' && before.listingId) {
      await this.prisma.playerMarketListing.update({
        where: { id: before.listingId },
        data: { status: 'SUSPENDED', moderationReason: reason, suspendedAt: new Date(), suspendedBy: user.id }
      })
    }
    const actionStatus: Partial<Record<NonNullable<MarketplaceReportUpdatePayload['action']>, MarketplaceReportStatus>> = {
      RESOLVE: 'RESOLVED',
      REJECT: 'REJECTED',
      ESCALATE: 'ESCALATED'
    }
    const status = payload.status || (payload.action ? actionStatus[payload.action] : undefined) || before.status
    const updated = await this.prisma.marketplaceReport.update({
      where: { id },
      data: {
        status,
        assignedTo: payload.assignedTo === undefined ? before.assignedTo : payload.assignedTo,
        resolution: payload.resolution === undefined ? before.resolution : payload.resolution,
        decisionReason: payload.decisionReason || reason,
        ...(status === 'RESOLVED' || status === 'REJECTED'
          ? { resolvedBy: user.id, resolvedAt: new Date() }
          : {})
      }
    })
    await this.auditAction(user, `report.${(payload.action || 'updated').toLowerCase()}`, 'MarketplaceReport', id, reason, {
      beforeStatus: before.status,
      afterStatus: updated.status,
      assignedTo: updated.assignedTo
    })
    return updated
  }

  async suspendReportedUser(id: string, rawReason: string, user: AuthenticatedUser) {
    const reason = requiredReason(rawReason)
    const report = await this.prisma.marketplaceReport.findUnique({ where: { id } })
    if (!report) throw new NotFoundException('Denuncia nao encontrada.')
    if (!report.reportedUserId) {
      throw new BadRequestException('A denuncia nao possui usuario denunciado.')
    }

    const account = await this.prisma.account.findUnique({ where: { id: report.reportedUserId } })
    if (!account) throw new NotFoundException('Usuario denunciado nao encontrado.')

    const [updated] = await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: account.id },
        data: { status: 'BLOCKED' }
      }),
      this.prisma.marketplaceReport.update({
        where: { id },
        data: {
          status: 'ESCALATED',
          assignedTo: user.id,
          decisionReason: reason
        }
      }),
      this.prisma.playerMarketListing.updateMany({
        where: {
          sellerAccountId: account.id,
          status: { in: ['DRAFT', 'ESCROW_PENDING', 'ACTIVE', 'RESERVED'] }
        },
        data: {
          status: 'SUSPENDED',
          moderationReason: reason,
          suspendedAt: new Date(),
          suspendedBy: user.id
        }
      })
    ])

    await this.auditAction(user, 'report.user_suspended', 'Account', account.id, reason, {
      reportId: id,
      previousStatus: account.status,
      nextStatus: updated.status
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType: 'MARKETPLACE_USER_SUSPENDED',
      severity: 'WARNING',
      entityType: 'Account',
      entityId: account.id,
      actorUserId: user.id,
      targetUserId: account.id,
      description: `Usuario ${account.id} suspenso a partir da denuncia ${id}.`,
      data: { reportId: id, reason }
    })

    return updated
  }

  async tasks(query: MarketplaceAdminQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const where: Prisma.MarketplaceTaskWhereInput = {
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.assignee ? { assigneeId: query.assignee } : {}),
      ...(query.type ? { type: query.type } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.marketplaceTask.findMany({
        where,
        include: {
          listing: { select: { id: true, itemName: true } },
          order: { select: { id: true, status: true } },
          report: { select: { id: true, reason: true, status: true } }
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize
      }),
      this.prisma.marketplaceTask.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async createTask(payload: MarketplaceTaskPayload, user: AuthenticatedUser) {
    if (!payload.title?.trim() || !payload.type?.trim()) {
      throw new BadRequestException('Titulo e tipo da tarefa sao obrigatorios.')
    }
    const task = await this.prisma.marketplaceTask.create({
      data: {
        listingId: payload.listingId || null,
        orderId: payload.orderId || null,
        reportId: payload.reportId || null,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        type: payload.type.trim(),
        status: payload.status || 'PENDING',
        priority: payload.priority || 'MEDIUM',
        assigneeId: payload.assigneeId || null,
        dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
        createdBy: user.id,
        updatedBy: user.id
      }
    })
    const centralTask = await this.prisma.adminTask.create({
      data: {
        title: task.title, description: task.description || '', module: 'marketplace', type: task.type,
        priority: task.priority === 'CRITICAL' ? 'CRITICAL' : task.priority === 'HIGH' ? 'HIGH' : task.priority === 'LOW' ? 'LOW' : 'NORMAL',
        complexity: task.priority === 'CRITICAL' ? 'CRITICAL' : 'STANDARD',
        status: task.assigneeId ? 'ASSIGNED' : 'OPEN', assignedTo: task.assigneeId,
        assignedBy: task.assigneeId ? user.id : null, createdBy: user.id, dueAt: task.dueAt,
        entityType: task.listingId ? 'PlayerMarketListing' : task.orderId ? 'PlayerMarketOrder' : 'MarketplaceReport',
        entityId: task.listingId || task.orderId || task.reportId, reportId: task.reportId,
        sourceTaskType: 'MarketplaceTask', sourceTaskId: task.id
      }
    })
    await this.auditAction(user, 'task.created', 'MarketplaceTask', task.id, 'Tarefa operacional criada.', {
      type: task.type,
      assigneeId: task.assigneeId,
      centralTaskId: centralTask.id
    })
    return task
  }

  async updateTask(id: string, payload: Partial<MarketplaceTaskPayload>, user: AuthenticatedUser) {
    const before = await this.prisma.marketplaceTask.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('Tarefa nao encontrada.')
    const updated = await this.prisma.marketplaceTask.update({
      where: { id },
      data: {
        title: payload.title?.trim() || undefined,
        description: payload.description === undefined ? undefined : payload.description?.trim() || null,
        status: payload.status,
        priority: payload.priority,
        assigneeId: payload.assigneeId === undefined ? undefined : payload.assigneeId,
        dueAt: payload.dueAt === undefined ? undefined : payload.dueAt ? new Date(payload.dueAt) : null,
        completedAt: payload.status === 'DONE' ? new Date() : undefined,
        updatedBy: user.id
      }
    })
    const centralStatus = updated.status === 'DONE' ? 'COMPLETED'
      : updated.status === 'IN_PROGRESS' ? 'IN_PROGRESS'
        : updated.status === 'BLOCKED' ? 'WAITING'
          : updated.status === 'CANCELED' ? 'CANCELED'
            : updated.assigneeId ? 'ASSIGNED' : 'OPEN'
    const centralTask = await this.prisma.adminTask.upsert({
      where: { sourceTaskType_sourceTaskId: { sourceTaskType: 'MarketplaceTask', sourceTaskId: updated.id } },
      create: {
        title: updated.title, description: updated.description || '', module: 'marketplace', type: updated.type,
        priority: updated.priority === 'CRITICAL' ? 'CRITICAL' : updated.priority === 'HIGH' ? 'HIGH' : updated.priority === 'LOW' ? 'LOW' : 'NORMAL',
        status: centralStatus, assignedTo: updated.assigneeId, assignedBy: updated.assigneeId ? user.id : null,
        createdBy: user.id, dueAt: updated.dueAt, completedAt: updated.completedAt,
        entityType: updated.listingId ? 'PlayerMarketListing' : updated.orderId ? 'PlayerMarketOrder' : 'MarketplaceReport',
        entityId: updated.listingId || updated.orderId || updated.reportId, reportId: updated.reportId,
        sourceTaskType: 'MarketplaceTask', sourceTaskId: updated.id
      },
      update: {
        title: updated.title, description: updated.description || '', status: centralStatus,
        assignedTo: updated.assigneeId, assignedBy: updated.assigneeId ? user.id : null,
        dueAt: updated.dueAt, completedAt: updated.completedAt
      }
    })
    await this.auditAction(user, 'task.updated', 'MarketplaceTask', id, 'Tarefa operacional atualizada.', {
      beforeStatus: before.status,
      afterStatus: updated.status,
      centralTaskId: centralTask.id
    })
    return updated
  }

  async economy() {
    return this.prisma.marketplaceEconomyConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        acceptedCurrencies: ['WCOIN', 'GOBLIN_POINT', 'HUNT_POINT']
      },
      update: {}
    })
  }

  async updateEconomy(payload: MarketplaceEconomyPayload, user: AuthenticatedUser) {
    const reason = requiredReason(payload.reason)
    if (payload.minimumPrice < 1 || payload.maximumPrice < payload.minimumPrice) {
      throw new BadRequestException('Faixa de preco invalida.')
    }
    const acceptedCurrencies = [...new Set(payload.acceptedCurrencies || [])]
    if (!acceptedCurrencies.length) {
      throw new BadRequestException('Selecione ao menos uma moeda aceita.')
    }
    const before = await this.economy()
    const after = await this.prisma.marketplaceEconomyConfig.update({
      where: { id: 'default' },
      data: {
        publicationFee: Math.max(0, Math.floor(payload.publicationFee)),
        saleFeePercent: Math.max(0, Math.min(100, Math.floor(payload.saleFeePercent))),
        listingDurationHours: Math.max(1, Math.floor(payload.listingDurationHours)),
        maxListings: Math.max(1, Math.floor(payload.maxListings)),
        vipDiscountPercent: Math.max(0, Math.min(100, Math.floor(payload.vipDiscountPercent))),
        acceptedCurrencies: json(acceptedCurrencies),
        minimumPrice: Math.floor(payload.minimumPrice),
        maximumPrice: Math.floor(payload.maximumPrice),
        cooldownMinutes: Math.max(0, Math.floor(payload.cooldownMinutes)),
        allowedCategories: payload.allowedCategories ? json(payload.allowedCategories) : undefined,
        updatedBy: user.id
      }
    })
    await this.audit.record({
      module: 'marketplace',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'admin.marketplace.economy.updated',
      targetType: 'MarketplaceEconomyConfig',
      targetId: 'default',
      beforeData: before,
      afterData: after,
      reason
    })
    return after
  }

  async analytics(user: AuthenticatedUser) {
    const [statusRows, categoryRows, sales, reports, sellers] = await Promise.all([
      this.prisma.playerMarketListing.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.playerMarketListing.groupBy({ by: ['itemCategory'], _count: { _all: true }, _avg: { price: true }, orderBy: { _count: { itemCategory: 'desc' } }, take: 20 }),
      this.prisma.playerMarketOrder.aggregate({ where: { status: 'COMPLETED' }, _count: { id: true }, _avg: { price: true } }),
      this.prisma.marketplaceReport.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.playerMarketListing.groupBy({ by: ['sellerAccountId'], _count: { _all: true }, orderBy: { _count: { sellerAccountId: 'desc' } }, take: 10 })
    ])
    const operational = {
      listingsByStatus: statusRows,
      categories: categoryRows,
      sales: { count: sales._count.id, averagePrice: Math.round(sales._avg.price || 0) },
      reportsByStatus: reports,
      activeSellers: sellers
    }
    if (user.role !== 'SUPER_ADMIN') return operational
    const financial = await this.prisma.playerMarketOrder.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { price: true, fee: true, sellerAmount: true }
    })
    return { ...operational, financial: financial._sum }
  }

  private async auditAction(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    reason: string,
    data: Record<string, unknown>
  ) {
    await this.audit.record({
      module: 'marketplace',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: `admin.marketplace.${action}`,
      targetType: entityType,
      targetId: entityId,
      reason,
      metadata: data
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType: `MARKETPLACE_${action.replace(/\W/g, '_').toUpperCase()}`,
      entityType,
      entityId,
      actorUserId: user.id,
      description: `${user.username} executou ${action} em ${entityType} ${entityId}.`,
      data: { reason, ...data }
    })
  }
}
