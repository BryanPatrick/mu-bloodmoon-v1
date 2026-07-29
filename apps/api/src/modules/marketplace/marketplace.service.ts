import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import type { Account, CurrencyCode, GameBridgeJob, GameBridgeStatus, MarketplaceListingStatus, MarketplaceOrderStatus, PlayerMarketListing, PlayerMarketOrder, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import type {
  CreateMarketplaceListingPayload,
  CreateMarketplaceOrderPayload,
  MarketplaceQuery,
  UpdateGameBridgeJobPayload,
  UpdateMarketplaceListingStatusPayload,
  UpdateMarketplaceOrderStatusPayload
} from './marketplace.contract'

const listingStatuses: MarketplaceListingStatus[] = [
  'DRAFT', 'ESCROW_PENDING', 'ACTIVE', 'RESERVED', 'SOLD', 'CANCELED',
  'EXPIRED', 'SUSPENDED', 'RETURN_PENDING', 'RETURNED', 'MANUAL_REVIEW', 'FAILED'
]
const orderStatuses: MarketplaceOrderStatus[] = ['PREPARED', 'PAID', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED']

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function enumOrFallback<T extends string>(value: T | undefined, allowed: readonly T[], fallback: T) {
  return value && allowed.includes(value) ? value : fallback
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === undefined || value === null) {
    return {}
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function listSearch(search?: string): Prisma.PlayerMarketListingWhereInput {
  if (!search?.trim()) {
    return {}
  }

  return {
    OR: [
      { itemName: { contains: search.trim() } },
      { itemCategory: { contains: search.trim() } },
      { gameItemRef: { contains: search.trim() } }
    ]
  }
}

function auditActor(user: AuthenticatedUser) {
  return {
    actorId: user.id,
    actorUsername: user.username
  }
}

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService
  ) {}

  async listPublic(query: MarketplaceQuery) {
    return this.listListings({ ...query, status: 'ACTIVE' }, true)
  }

  async listListings(query: MarketplaceQuery, hideExpired = false) {
    const page = toPositiveInt(query.page, 1)
    const pageSize = Math.min(toPositiveInt(query.pageSize, 24), 100)
    const skip = (page - 1) * pageSize
    const baseWhere: Prisma.PlayerMarketListingWhereInput = {
      ...(hideExpired
        ? {
            AND: [
              listSearch(query.search),
              {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } }
                ]
              }
            ]
          }
        : listSearch(query.search)),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.status ? { status: enumOrFallback(query.status, listingStatuses, 'ACTIVE') } : {}),
      ...(query.seller ? { seller: { username: { contains: query.seller } } } : {})
    }
    const where: Prisma.PlayerMarketListingWhereInput = {
      ...baseWhere,
      ...(query.category?.trim() ? { itemCategory: { contains: query.category.trim() } } : {})
    }
    const orderBy: Prisma.PlayerMarketListingOrderByWithRelationInput[] = query.sort === 'priceAsc'
      ? [{ price: 'asc' }, { createdAt: 'desc' }]
      : query.sort === 'priceDesc'
        ? [{ price: 'desc' }, { createdAt: 'desc' }]
        : query.sort === 'oldest'
          ? [{ createdAt: 'asc' }]
          : [{ createdAt: 'desc' }]

    const [total, rows, categoryRows] = await Promise.all([
      this.prisma.playerMarketListing.count({ where }),
      this.prisma.playerMarketListing.findMany({
        where,
        include: {
          seller: true,
          sellerCharacter: true,
          orders: { take: 1, orderBy: { createdAt: 'desc' } }
        },
        orderBy,
        skip,
        take: pageSize
      }),
      this.prisma.playerMarketListing.groupBy({
        by: ['itemCategory'],
        where: baseWhere,
        _count: { _all: true },
        orderBy: { itemCategory: 'asc' }
      })
    ])

    return {
      data: rows.map((row) => this.mapListing(row)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      facets: {
        categories: categoryRows.map((row) => ({ value: row.itemCategory, count: row._count._all }))
      }
    }
  }

  async listMyListings(user: AuthenticatedUser) {
    const rows = await this.prisma.playerMarketListing.findMany({
      where: { sellerAccountId: user.id },
      include: { seller: true, sellerCharacter: true, orders: { take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: [{ createdAt: 'desc' }]
    })

    return rows.map((row) => this.mapListing(row))
  }

  async listMyOrders(user: AuthenticatedUser) {
    const rows = await this.prisma.playerMarketOrder.findMany({
      where: { buyerAccountId: user.id },
      include: { buyer: true, listing: { include: { seller: true, sellerCharacter: true } } },
      orderBy: [{ createdAt: 'desc' }]
    })

    return rows.map((row) => this.mapOrder(row))
  }

  async createListing(payload: CreateMarketplaceListingPayload, user: AuthenticatedUser) {
    const gameItemRef = payload.gameItemRef?.trim()
    const itemName = payload.itemName?.trim()
    const itemCategory = payload.itemCategory?.trim()
    const price = Math.floor(Number(payload.price))

    if (!gameItemRef || !itemName || !itemCategory || !payload.currency || !payload.itemData || !Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Dados invalidos para anunciar item.')
    }

    const economy = await this.prisma.marketplaceEconomyConfig.findUnique({ where: { id: 'default' } })
    const acceptedCurrencies = Array.isArray(economy?.acceptedCurrencies)
      ? economy.acceptedCurrencies.map(String)
      : ['WCOIN', 'GOBLIN_POINT', 'HUNT_POINT']
    const allowedCategories = Array.isArray(economy?.allowedCategories)
      ? economy.allowedCategories.map(String)
      : []
    if (!acceptedCurrencies.includes(payload.currency)) {
      throw new BadRequestException('Moeda nao aceita pelo marketplace.')
    }
    if (economy && (price < economy.minimumPrice || price > economy.maximumPrice)) {
      throw new BadRequestException(`O preco deve ficar entre ${economy.minimumPrice} e ${economy.maximumPrice}.`)
    }
    if (allowedCategories.length && !allowedCategories.includes(itemCategory)) {
      throw new BadRequestException('Categoria nao permitida no marketplace.')
    }
    const activeListings = await this.prisma.playerMarketListing.count({
      where: {
        sellerAccountId: user.id,
        status: { in: ['DRAFT', 'ESCROW_PENDING', 'ACTIVE', 'RESERVED', 'MANUAL_REVIEW'] }
      }
    })
    if (economy && activeListings >= economy.maxListings) {
      throw new BadRequestException('Limite de anuncios ativos atingido.')
    }
    if (economy?.cooldownMinutes) {
      const lastListing = await this.prisma.playerMarketListing.findFirst({
        where: { sellerAccountId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
      const cooldownEnds = lastListing
        ? lastListing.createdAt.getTime() + economy.cooldownMinutes * 60_000
        : 0
      if (cooldownEnds > Date.now()) {
        throw new BadRequestException('Aguarde o cooldown antes de criar outro anuncio.')
      }
    }

    if (payload.sellerCharacterId) {
      const character = await this.prisma.accountCharacter.findFirst({
        where: { id: payload.sellerCharacterId, accountId: user.id }
      })

      if (!character) {
        throw new BadRequestException('Personagem vendedor nao pertence a conta logada.')
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const seller = await tx.account.findUnique({ where: { id: user.id } })
      if (!seller) throw new BadRequestException('Conta vendedora invalida.')
      if (economy?.publicationFee) {
        await this.debitCurrency(tx, seller, payload.currency, economy.publicationFee)
      }
      const listing = await tx.playerMarketListing.create({
        data: {
          sellerAccountId: user.id,
          sellerCharacterId: payload.sellerCharacterId?.trim() || null,
          gameItemRef,
          itemName,
          itemCategory,
          itemData: jsonValue(payload.itemData),
          price,
          currency: payload.currency,
          status: 'ESCROW_PENDING',
          expiresAt: payload.expiresAt
            ? new Date(payload.expiresAt)
            : economy
              ? new Date(Date.now() + economy.listingDurationHours * 3_600_000)
              : null,
          metadata: {
            source: 'player-marketplace',
            lockRequired: true
          }
        }
      })

      const job = await tx.gameBridgeJob.create({
        data: {
          accountId: user.id,
          listingId: listing.id,
          operation: 'LOCK_ITEM',
          idempotencyKey: `market-lock:${listing.id}:${gameItemRef}`,
          payload: {
            listingId: listing.id,
            accountUsername: user.username,
            sellerCharacterId: payload.sellerCharacterId || null,
            gameItemRef,
            itemName,
            itemData: jsonValue(payload.itemData)
          }
        }
      })

      const serial = typeof payload.itemData === 'object' && payload.itemData
        && typeof (payload.itemData as { serial?: unknown }).serial === 'string'
        ? (payload.itemData as { serial: string }).serial
        : null
      await tx.marketplaceEscrow.create({
        data: {
          listingId: listing.id,
          gameItemRef,
          itemSerial: serial,
          originalOwnerId: user.id,
          status: 'ENTRY_PENDING',
          location: 'GAME_INVENTORY',
          internalHash: createHash('sha256')
            .update(`${listing.id}:${gameItemRef}:${user.id}`)
            .digest('hex'),
          metadata: { lockJobId: job.id }
        }
      })

      const updated = await tx.playerMarketListing.update({
        where: { id: listing.id },
        data: { lockJobId: job.id },
        include: { seller: true, sellerCharacter: true, orders: true }
      })

      return { listing: updated, job }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'marketplace.listing.created',
      targetType: 'PlayerMarketListing',
      targetId: result.listing.id,
      metadata: { itemName, price, currency: payload.currency, gameItemRef, bridgeJobId: result.job.id }
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType: 'ITEM_ESCROW_LOCK_REQUESTED',
      entityType: 'PlayerMarketListing',
      entityId: result.listing.id,
      actorUserId: user.id,
      description: `Item ${itemName} enviado para bloqueio de escrow.`,
      data: { gameItemRef, bridgeJobId: result.job.id }
    })

    return this.mapListing(result.listing)
  }

  async cancelListing(id: string, user: AuthenticatedUser) {
    const listing = await this.prisma.playerMarketListing.findUnique({ where: { id }, include: { seller: true } })
    if (!listing) {
      throw new NotFoundException('Anuncio nao encontrado.')
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
    if (!isAdmin && listing.sellerAccountId !== user.id) {
      throw new NotFoundException('Anuncio nao encontrado.')
    }

    if (!['DRAFT', 'ESCROW_PENDING', 'ACTIVE', 'SUSPENDED', 'MANUAL_REVIEW'].includes(listing.status)) {
      throw new BadRequestException('Somente anuncios pendentes ou ativos podem ser cancelados.')
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.playerMarketListing.update({
        where: { id },
        data: { status: 'CANCELED', cancelledAt: new Date() },
        include: { seller: true, sellerCharacter: true, orders: true }
      })

      await tx.gameBridgeJob.create({
        data: {
          accountId: listing.sellerAccountId,
          listingId: listing.id,
          operation: 'RELEASE_ITEM',
          idempotencyKey: `market-release:${listing.id}:${Date.now()}`,
          payload: { listingId: listing.id, gameItemRef: listing.gameItemRef, reason: 'listing-cancelled' }
        }
      })

      await tx.marketplaceEscrow.updateMany({
        where: { listingId: listing.id },
        data: { status: 'RETURN_PENDING', manualReviewReason: 'listing-canceled' }
      })

      return row
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'marketplace.listing.cancelled',
      targetType: 'PlayerMarketListing',
      targetId: id,
      metadata: { itemName: listing.itemName, gameItemRef: listing.gameItemRef }
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType: 'ITEM_RETURN_REQUESTED',
      entityType: 'PlayerMarketListing',
      entityId: id,
      actorUserId: user.id,
      targetUserId: listing.sellerAccountId,
      description: `Retorno do item ${listing.itemName} solicitado apos cancelamento.`,
      data: { gameItemRef: listing.gameItemRef }
    })

    return this.mapListing(updated)
  }

  async createOrder(payload: CreateMarketplaceOrderPayload, user: AuthenticatedUser) {
    if (!payload.listingId?.trim()) {
      throw new BadRequestException('listingId e obrigatorio.')
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.playerMarketListing.findUnique({
        where: { id: payload.listingId },
        include: { seller: true }
      })

      if (!listing || listing.status !== 'ACTIVE') {
        throw new BadRequestException('Anuncio indisponivel para compra.')
      }

      if (listing.sellerAccountId === user.id) {
        throw new BadRequestException('Voce nao pode comprar o proprio item.')
      }

      const buyer = await tx.account.findUnique({ where: { id: user.id } })
      if (!buyer) {
        throw new BadRequestException('Conta compradora invalida.')
      }

      const reserved = await tx.playerMarketListing.updateMany({
        where: { id: listing.id, status: 'ACTIVE' },
        data: { status: 'RESERVED' }
      })
      if (reserved.count !== 1) {
        throw new BadRequestException('Outro comprador reservou este item.')
      }

      const economy = await tx.marketplaceEconomyConfig.findUnique({ where: { id: 'default' } })
      const fee = Math.floor(
        listing.price * Math.max(0, Math.min(100, economy?.saleFeePercent || 0)) / 100
      )
      const correlationId = randomUUID()
      await this.debitCurrency(tx, buyer, listing.currency, listing.price)

      const row = await tx.playerMarketOrder.create({
        data: {
          listingId: listing.id,
          buyerAccountId: user.id,
          price: listing.price,
          currency: listing.currency,
          status: 'DELIVERING',
          fee,
          sellerAmount: listing.price - fee,
          correlationId,
          paidAt: new Date(),
          metadata: { escrow: true }
        },
        include: { buyer: true, listing: { include: { seller: true, sellerCharacter: true } } }
      })

      await tx.marketplaceEscrow.update({
        where: { listingId: listing.id },
        data: {
          status: 'TRANSFER_PENDING',
          buyerAccountId: user.id,
          location: 'ESCROW_VAULT',
          attempts: { increment: 1 }
        }
      })

      await tx.gameBridgeJob.create({
        data: {
          accountId: user.id,
          listingId: listing.id,
          orderId: row.id,
          operation: 'TRANSFER_ITEM',
          idempotencyKey: `market-transfer:${row.id}:${listing.gameItemRef}`,
          payload: {
            orderId: row.id,
            listingId: listing.id,
            sellerUsername: listing.seller.username,
            buyerUsername: user.username,
            gameItemRef: listing.gameItemRef,
            itemName: listing.itemName,
            itemData: listing.itemData
          }
        }
      })

      return row
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'marketplace.order.created',
      targetType: 'PlayerMarketOrder',
      targetId: order.id,
      metadata: { listingId: order.listingId, price: order.price, currency: order.currency }
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType: 'DELIVERY_STARTED',
      entityType: 'PlayerMarketOrder',
      entityId: order.id,
      actorUserId: user.id,
      description: `Entrega do pedido ${order.id} iniciada via escrow.`,
      data: { listingId: order.listingId, price: order.price, currency: order.currency }
    })

    return this.mapOrder(order)
  }

  async listBridgeJobs(query: { status?: GameBridgeStatus, operation?: string }) {
    const rows = await this.prisma.gameBridgeJob.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.operation ? { operation: query.operation as never } : {})
      },
      include: { account: true, listing: true, order: true },
      orderBy: [{ createdAt: 'desc' }],
      take: 100
    })

    return rows.map((row) => this.mapBridgeJob(row))
  }

  async activateListing(id: string, user: AuthenticatedUser) {
    const listing = await this.prisma.playerMarketListing.findUnique({ where: { id } })
    if (!listing) {
      throw new NotFoundException('Anuncio nao encontrado.')
    }

    if (listing.status !== 'ESCROW_PENDING') {
      throw new BadRequestException('Apenas anuncios aguardando lock podem ser ativados.')
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (listing.lockJobId) {
        await tx.gameBridgeJob.update({
          where: { id: listing.lockJobId },
          data: { status: 'COMPLETED', processedAt: new Date(), result: { devApprovedBy: user.username } }
        })
      }

      await tx.marketplaceEscrow.update({
        where: { listingId: id },
        data: { status: 'HELD', location: 'ESCROW_VAULT', enteredAt: new Date() }
      })

      return tx.playerMarketListing.update({
        where: { id },
        data: { status: 'ACTIVE', lockedAt: new Date() },
        include: { seller: true, sellerCharacter: true, orders: true }
      })
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'marketplace.listing.activated',
      targetType: 'PlayerMarketListing',
      targetId: id,
      metadata: { itemName: listing.itemName, gameItemRef: listing.gameItemRef }
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType: 'ITEM_ENTERED_ESCROW',
      entityType: 'PlayerMarketListing',
      entityId: id,
      actorUserId: user.id,
      targetUserId: listing.sellerAccountId,
      description: `Item ${listing.itemName} confirmado no escrow e anuncio ativado.`,
      data: { gameItemRef: listing.gameItemRef }
    })

    return this.mapListing(updated)
  }

  async updateListingStatus(id: string, payload: UpdateMarketplaceListingStatusPayload, user: AuthenticatedUser) {
    const listing = await this.prisma.playerMarketListing.findUnique({ where: { id } })
    if (!listing) {
      throw new NotFoundException('Anuncio nao encontrado.')
    }

    const status = enumOrFallback(payload.status, listingStatuses, listing.status)
    const updated = await this.prisma.playerMarketListing.update({
      where: { id },
      data: { status, ...(status === 'CANCELED' ? { cancelledAt: new Date() } : {}) },
      include: { seller: true, sellerCharacter: true, orders: true }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.marketplace.listing.status',
      targetType: 'PlayerMarketListing',
      targetId: id,
      metadata: { previousStatus: listing.status, nextStatus: status, reason: payload.reason || null }
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType:
        status === 'EXPIRED'
          ? 'LISTING_EXPIRED'
          : status === 'CANCELED'
            ? 'LISTING_CANCELLED'
            : 'LISTING_STATUS_CHANGED',
      entityType: 'PlayerMarketListing',
      entityId: id,
      actorUserId: user.id,
      targetUserId: listing.sellerAccountId,
      description: `Anuncio ${id} alterado de ${listing.status} para ${status}.`,
      data: { reason: payload.reason || null }
    })

    return this.mapListing(updated)
  }

  async updateOrderStatus(id: string, payload: UpdateMarketplaceOrderStatusPayload, user: AuthenticatedUser) {
    const order = await this.prisma.playerMarketOrder.findUnique({
      where: { id },
      include: { listing: true }
    })
    if (!order) {
      throw new NotFoundException('Pedido nao encontrado.')
    }

    const status = enumOrFallback(payload.status, orderStatuses, order.status)
    const updated = await this.prisma.$transaction(async (tx) => {
      if (status === 'COMPLETED' && order.status !== 'COMPLETED') {
        await this.creditCurrency(
          tx,
          order.listing.sellerAccountId,
          order.currency,
          order.sellerAmount || order.price
        )
        await tx.playerMarketListing.update({
          where: { id: order.listingId },
          data: { status: 'SOLD', soldAt: new Date() }
        })
        await tx.marketplaceEscrow.update({
          where: { listingId: order.listingId },
          data: {
            status: 'RELEASED_TO_BUYER',
            location: 'BUYER_INVENTORY',
            exitedAt: new Date()
          }
        })
      }

      if (status === 'REFUNDED' && order.status !== 'REFUNDED') {
        await this.creditCurrency(tx, order.buyerAccountId, order.currency, order.price)
      }

      return tx.playerMarketOrder.update({
        where: { id },
        data: {
          status,
          ...(status === 'COMPLETED' ? { deliveredAt: new Date() } : {}),
          ...(status === 'CANCELLED' || status === 'REFUNDED' ? { cancelledAt: new Date() } : {})
        },
        include: { buyer: true, listing: { include: { seller: true, sellerCharacter: true } } }
      })
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.marketplace.order.status',
      targetType: 'PlayerMarketOrder',
      targetId: id,
      metadata: { previousStatus: order.status, nextStatus: status, reason: payload.reason || null }
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType:
        status === 'COMPLETED'
          ? 'DELIVERY_COMPLETED'
          : status === 'FAILED'
            ? 'DELIVERY_FAILED'
            : status === 'REFUNDED'
              ? 'ORDER_REFUNDED'
              : 'ORDER_STATUS_CHANGED',
      severity: status === 'FAILED' ? 'ERROR' : 'INFO',
      entityType: 'PlayerMarketOrder',
      entityId: id,
      actorUserId: user.id,
      targetUserId: order.buyerAccountId,
      description: `Pedido ${id} alterado de ${order.status} para ${status}.`,
      data: { listingId: order.listingId, reason: payload.reason || null }
    })

    return this.mapOrder(updated)
  }

  async updateBridgeJob(id: string, payload: UpdateGameBridgeJobPayload, user: AuthenticatedUser) {
    const job = await this.prisma.gameBridgeJob.findUnique({ where: { id } })
    if (!job) {
      throw new NotFoundException('Job de integracao nao encontrado.')
    }

    const updated = await this.prisma.gameBridgeJob.update({
      where: { id },
      data: {
        status: payload.status,
        result: payload.result === undefined ? job.result as Prisma.InputJsonValue : jsonValue(payload.result),
        error: payload.error === undefined ? job.error : payload.error,
        attempts: { increment: payload.status === 'FAILED' ? 1 : 0 },
        processedAt: ['COMPLETED', 'FAILED', 'CANCELLED'].includes(payload.status) ? new Date() : null
      },
      include: { account: true, listing: true, order: true }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.game-bridge.job.updated',
      targetType: 'GameBridgeJob',
      targetId: id,
      metadata: { previousStatus: job.status, nextStatus: payload.status, operation: job.operation }
    })
    await this.observability.recordOperationalEvent({
      module: 'marketplace',
      eventType:
        payload.status === 'COMPLETED'
          ? 'INTEGRATION_JOB_COMPLETED'
          : payload.status === 'FAILED'
            ? 'INTEGRATION_JOB_FAILED'
            : 'INTEGRATION_JOB_UPDATED',
      severity: payload.status === 'FAILED' ? 'ERROR' : 'INFO',
      entityType: 'GameBridgeJob',
      entityId: id,
      actorUserId: user.id,
      description: `Job ${job.operation} alterado de ${job.status} para ${payload.status}.`,
      data: { operation: job.operation, error: payload.error || null }
    })

    if (payload.status === 'FAILED') {
      const errorCodeByOperation: Partial<Record<GameBridgeJob['operation'], string>> = {
        LOCK_ITEM: 'MARKETPLACE_ESCROW_LOCK_FAILED',
        RELEASE_ITEM: 'MARKETPLACE_ITEM_RETURN_FAILED',
        TRANSFER_ITEM: 'MARKETPLACE_DELIVERY_FAILED',
        CREDIT_CURRENCY: 'MARKETPLACE_SELLER_CREDIT_FAILED'
      }
      const errorCode = errorCodeByOperation[job.operation] || 'MARKETPLACE_INTEGRATION_FAILED'
      await this.observability.recordSystemError({
        module: 'marketplace',
        severity: job.operation === 'RELEASE_ITEM' ? 'CRITICAL' : 'ERROR',
        errorCode,
        publicMessage: 'Uma operacao do marketplace precisa de revisao manual.',
        internalMessage: payload.error || `Falha no job ${job.operation}.`,
        correlationId: updated.order?.correlationId || null,
        userId: user.id,
        accountId: job.accountId,
        entityType: 'GameBridgeJob',
        entityId: id,
        metadata: {
          operation: job.operation,
          listingId: job.listingId,
          orderId: job.orderId,
          attempts: updated.attempts
        }
      })
    }

    return this.mapBridgeJob(updated)
  }

  private async creditCurrency(tx: Prisma.TransactionClient, accountId: string, currency: CurrencyCode, amount: number) {
    await tx.accountCurrency.upsert({
      where: { accountId_currency: { accountId, currency } },
      create: { accountId, currency, balance: Math.max(0, amount) },
      update: { balance: { increment: Math.max(0, amount) } }
    })
  }

  private async debitCurrency(tx: Prisma.TransactionClient, account: Account, currency: CurrencyCode, amount: number) {
    const wallet = await tx.accountCurrency.findUnique({ where: { accountId_currency: { accountId: account.id, currency } } })
    const balance = wallet?.balance || 0
    if (balance < amount) {
      throw new BadRequestException('Saldo insuficiente para comprar este item.')
    }
    await tx.accountCurrency.update({
      where: { accountId_currency: { accountId: account.id, currency } },
      data: { balance: { decrement: amount } }
    })
  }

  private mapListing(row: PlayerMarketListing & { seller?: Account, sellerCharacter?: { name: string, className: string } | null, orders?: PlayerMarketOrder[] }) {
    return {
      id: row.id,
      sellerUsername: row.seller?.username || null,
      sellerCharacter: row.sellerCharacter ? { name: row.sellerCharacter.name, className: row.sellerCharacter.className } : null,
      gameItemRef: row.gameItemRef,
      itemName: row.itemName,
      itemCategory: row.itemCategory,
      itemData: row.itemData,
      price: row.price,
      currency: row.currency,
      status: row.status,
      adminNotes: row.adminNotes,
      moderationReason: row.moderationReason,
      lockedAt: row.lockedAt?.toISOString() || null,
      expiresAt: row.expiresAt?.toISOString() || null,
      soldAt: row.soldAt?.toISOString() || null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      latestOrderId: row.orders?.[0]?.id || null
    }
  }

  private mapOrder(row: PlayerMarketOrder & { buyer?: Account, listing?: PlayerMarketListing & { seller?: Account, sellerCharacter?: { name: string, className: string } | null } }) {
    return {
      id: row.id,
      listingId: row.listingId,
      buyerUsername: row.buyer?.username || null,
      sellerUsername: row.listing?.seller?.username || null,
      itemName: row.listing?.itemName || null,
      gameItemRef: row.listing?.gameItemRef || null,
      price: row.price,
      currency: row.currency,
      status: row.status,
      fee: row.fee,
      sellerAmount: row.sellerAmount,
      correlationId: row.correlationId,
      paidAt: row.paidAt?.toISOString() || null,
      deliveredAt: row.deliveredAt?.toISOString() || null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }
  }

  private mapBridgeJob(row: GameBridgeJob & { account?: Account | null, listing?: PlayerMarketListing | null, order?: PlayerMarketOrder | null }) {
    return {
      id: row.id,
      accountUsername: row.account?.username || null,
      listingId: row.listingId,
      orderId: row.orderId,
      operation: row.operation,
      status: row.status,
      idempotencyKey: row.idempotencyKey,
      attempts: row.attempts,
      payload: row.payload,
      result: row.result,
      error: row.error,
      availableAt: row.availableAt.toISOString(),
      processedAt: row.processedAt?.toISOString() || null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }
  }
}
