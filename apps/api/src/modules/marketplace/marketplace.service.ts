import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Account, CurrencyCode, GameBridgeJob, GameBridgeStatus, MarketplaceListingStatus, MarketplaceOrderStatus, PlayerMarketListing, PlayerMarketOrder, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  CreateMarketplaceListingPayload,
  CreateMarketplaceOrderPayload,
  MarketplaceQuery,
  UpdateGameBridgeJobPayload,
  UpdateMarketplaceListingStatusPayload,
  UpdateMarketplaceOrderStatusPayload
} from './marketplace.contract'

const listingStatuses: MarketplaceListingStatus[] = ['PENDING_LOCK', 'ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED', 'FAILED']
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
    private readonly audit: AuditService
  ) {}

  async listPublic(query: MarketplaceQuery) {
    return this.listListings({ ...query, status: 'ACTIVE' })
  }

  async listListings(query: MarketplaceQuery) {
    const page = toPositiveInt(query.page, 1)
    const pageSize = Math.min(toPositiveInt(query.pageSize, 24), 100)
    const skip = (page - 1) * pageSize
    const where: Prisma.PlayerMarketListingWhereInput = {
      ...listSearch(query.search),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.status ? { status: enumOrFallback(query.status, listingStatuses, 'ACTIVE') } : {}),
      ...(query.seller ? { seller: { username: { contains: query.seller } } } : {})
    }

    const [total, rows] = await Promise.all([
      this.prisma.playerMarketListing.count({ where }),
      this.prisma.playerMarketListing.findMany({
        where,
        include: {
          seller: true,
          sellerCharacter: true,
          orders: { take: 1, orderBy: { createdAt: 'desc' } }
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: pageSize
      })
    ])

    return {
      data: rows.map((row) => this.mapListing(row)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
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

    if (payload.sellerCharacterId) {
      const character = await this.prisma.accountCharacter.findFirst({
        where: { id: payload.sellerCharacterId, accountId: user.id }
      })

      if (!character) {
        throw new BadRequestException('Personagem vendedor nao pertence a conta logada.')
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
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
          status: 'PENDING_LOCK',
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
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

    if (!['PENDING_LOCK', 'ACTIVE'].includes(listing.status)) {
      throw new BadRequestException('Somente anuncios pendentes ou ativos podem ser cancelados.')
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.playerMarketListing.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
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

      return row
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'marketplace.listing.cancelled',
      targetType: 'PlayerMarketListing',
      targetId: id,
      metadata: { itemName: listing.itemName, gameItemRef: listing.gameItemRef }
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

      await this.debitCurrency(tx, buyer, listing.currency, listing.price)

      const row = await tx.playerMarketOrder.create({
        data: {
          listingId: listing.id,
          buyerAccountId: user.id,
          price: listing.price,
          currency: listing.currency,
          status: 'DELIVERING',
          paidAt: new Date(),
          metadata: { escrow: true }
        },
        include: { buyer: true, listing: { include: { seller: true, sellerCharacter: true } } }
      })

      await tx.playerMarketListing.update({
        where: { id: listing.id },
        data: { status: 'SOLD', soldAt: new Date() }
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

    if (listing.status !== 'PENDING_LOCK') {
      throw new BadRequestException('Apenas anuncios aguardando lock podem ser ativados.')
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (listing.lockJobId) {
        await tx.gameBridgeJob.update({
          where: { id: listing.lockJobId },
          data: { status: 'COMPLETED', processedAt: new Date(), result: { devApprovedBy: user.username } }
        })
      }

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
      data: { status, ...(status === 'CANCELLED' ? { cancelledAt: new Date() } : {}) },
      include: { seller: true, sellerCharacter: true, orders: true }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.marketplace.listing.status',
      targetType: 'PlayerMarketListing',
      targetId: id,
      metadata: { previousStatus: listing.status, nextStatus: status, reason: payload.reason || null }
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
        await this.creditCurrency(tx, order.listing.sellerAccountId, order.currency, order.price)
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
