import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { ShopProductStatus, StoreDeliveryStatus } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { permissionKeys } from '../auth/permissions'
import { ObservabilityService } from '../observability/observability.service'
import type {
  CommerceQuery,
  ShopProductPayload,
  ShopProductVariantPayload,
  StoreCatalogImportPayload,
  StoreBulkProductPayload,
  StoreCategoryPayload,
  StoreDeliveryActionPayload,
  StoreOrderActionPayload,
  StoreOrderNotePayload,
  StoreProductTestPayload,
  StoreProductTransitionPayload,
  StoreReorderPayload
} from './commerce.contract'

const pageData = (query: CommerceQuery, defaultSize = 30) => {
  const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize || String(defaultSize), 10) || defaultSize))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/gi, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase()

const optionalDate = (value?: string | null) => value ? new Date(value) : null
const json = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined || value === null ? undefined : value as Prisma.InputJsonValue
const actor = (user: AuthenticatedUser) => ({
  actorId: user.id,
  actorUsername: user.username,
  actorRole: user.role
})
const hasPermission = (user: AuthenticatedUser, permission: string) =>
  user.permissions.includes('*') || user.permissions.includes(permission)
const requirePermission = (user: AuthenticatedUser, permission: string) => {
  if (!hasPermission(user, permission)) {
    throw new ForbiddenException('Voce nao possui permissao para esta operacao da loja.')
  }
}

const fixText = (value: unknown) => {
  const text = String(value || '').trim()
  return /Ã|Â/.test(text) ? Buffer.from(text, 'latin1').toString('utf8') : text
}

const productInclude = {
  categoryRecord: true,
  variants: { orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] }
}

type CatalogItem = {
  code?: number
  key?: string
  name?: string
  category?: string
  family?: string
  description?: string
  officialStore?: string
  commerceReason?: string
  source?: { file?: string, line?: number }
  [key: string]: unknown
}

type CommerceCatalog = {
  items?: CatalogItem[]
  cashShop?: {
    namedGroups?: Array<{ name?: string, variants?: number, durations?: number[], itemCodes?: number[] }>
    unresolvedProducts?: Array<Record<string, unknown>>
  }
}

@Injectable()
export class StoreAdminService implements OnModuleInit, OnModuleDestroy {
  private scheduleTimer?: ReturnType<typeof setInterval>

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService
  ) {}

  onModuleInit() {
    this.scheduleTimer = setInterval(() => void this.publishDueProducts(), 60_000)
    this.scheduleTimer.unref()
  }

  onModuleDestroy() {
    if (this.scheduleTimer) clearInterval(this.scheduleTimer)
  }

  private async publishDueProducts() {
    try {
      const due = await this.prisma.shopProduct.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledPublishAt: { lte: new Date() },
          deletedAt: null,
          approvedAt: { not: null }
        }
      })
      for (const product of due) {
        const updated = await this.prisma.shopProduct.update({
          where: { id: product.id },
          data: {
            status: 'ACTIVE',
            publishedAt: new Date(),
            scheduledPublishAt: null,
            version: { increment: 1 }
          }
        })
        await this.audit.record({
          module: 'store',
          action: 'admin.store.product.scheduled-published',
          targetType: 'ShopProduct',
          targetId: product.id,
          beforeData: product,
          afterData: updated,
          reason: 'Agendamento automatico'
        })
        await this.observability.recordOperationalEvent({
          module: 'store',
          eventType: 'PRODUCT_PUBLISHED',
          entityType: 'ShopProduct',
          entityId: product.id,
          description: `Produto ${product.name} publicado por agendamento.`
        })
      }
    } catch (error) {
      await this.recordError('STORE_SCHEDULE_FAILED', 'Falha ao processar publicacoes agendadas.', error)
    }
  }

  private async recordError(code: string, message: string, error: unknown, entityType = 'ShopProduct', entityId?: string) {
    await this.observability.recordSystemError({
      module: 'store',
      severity: 'ERROR',
      errorCode: code,
      publicMessage: message,
      internalMessage: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : null,
      entityType,
      entityId
    })
  }

  async dashboard(user: AuthenticatedUser, query: CommerceQuery) {
    await this.publishDueProducts()
    const now = new Date()
    const periodStart = query.from ? new Date(query.from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const periodEnd = query.to ? new Date(query.to) : now
    const [
      active,
      inactive,
      review,
      withoutImage,
      withoutPrice,
      unidentified,
      pendingOrders,
      failedDeliveries,
      pendingRefunds,
      salesCount,
      revenue,
      topProducts,
      lowStock,
      assignedTasks
    ] = await Promise.all([
      this.prisma.shopProduct.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.shopProduct.count({ where: { status: { in: ['INACTIVE', 'ARCHIVED'] }, deletedAt: null } }),
      this.prisma.shopProduct.count({ where: { status: 'IN_REVIEW', deletedAt: null } }),
      this.prisma.shopProduct.count({ where: { deletedAt: null, OR: [{ images: { equals: Prisma.DbNull } }, { images: { equals: [] } }] } }),
      this.prisma.shopProduct.count({ where: { deletedAt: null, price: { lte: 0 }, variants: { none: { price: { gt: 0 } } } } }),
      this.prisma.shopProduct.count({ where: { deletedAt: null, OR: [{ ambiguous: true }, { status: 'BLOCKED' }] } }),
      this.prisma.purchaseIntent.count({ where: { status: { in: ['PREPARED', 'PENDING_PAYMENT', 'PAID', 'DELIVERING', 'MANUAL_REVIEW'] } } }),
      this.prisma.storeDelivery.count({ where: { status: 'FAILED' } }),
      this.prisma.purchaseIntent.count({ where: { status: 'REFUND_PENDING' } }),
      this.prisma.purchaseIntent.count({ where: { status: 'COMPLETED', completedAt: { gte: periodStart, lte: periodEnd } } }),
      this.prisma.purchaseIntent.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: periodStart, lte: periodEnd } },
        _sum: { price: true },
        _avg: { price: true }
      }),
      this.prisma.purchaseIntent.groupBy({
        by: ['productId'],
        where: { status: 'COMPLETED', completedAt: { gte: periodStart, lte: periodEnd } },
        _count: { productId: true },
        _sum: { price: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 5
      }),
      this.prisma.shopProductVariant.findMany({
        where: { available: true, stock: { not: null, lte: 10 } },
        select: { id: true, productId: true, name: true, sku: true, stock: true },
        orderBy: { stock: 'asc' },
        take: 12
      }),
      this.prisma.adminWorkLog.count({
        where: {
          module: 'store',
          userId: user.id,
          completedAt: null
        }
      })
    ])
    const productNames = await this.prisma.shopProduct.findMany({
      where: { id: { in: topProducts.map((row) => row.productId) } },
      select: { id: true, name: true }
    })
    const names = new Map(productNames.map((product) => [product.id, product.name]))
    const financial = user.role === 'SUPER_ADMIN'
      ? {
          sales: salesCount,
          revenue: revenue._sum.price || 0,
          averageTicket: Math.round(revenue._avg.price || 0),
          topRevenueProduct: topProducts
            .map((row) => ({ productId: row.productId, name: names.get(row.productId) || 'Produto removido', sales: row._count.productId, revenue: row._sum.price || 0 }))
        }
      : null
    return {
      products: { active, inactive, review, withoutImage, withoutPrice, unidentified },
      operations: { pendingOrders, failedDeliveries, pendingRefunds, assignedTasks },
      topProducts: topProducts.map((row) => ({ productId: row.productId, name: names.get(row.productId) || 'Produto removido', sales: row._count.productId })),
      lowStock,
      financial,
      period: { from: periodStart.toISOString(), to: periodEnd.toISOString() }
    }
  }

  async listCategories(query: CommerceQuery, publicOnly = false) {
    const where: Prisma.StoreCategoryWhereInput = {
      ...(publicOnly ? { active: true, deletedAt: null, archivedAt: null } : { deletedAt: query.includeDeleted === 'true' ? undefined : null }),
      ...(query.search ? { OR: [{ name: { contains: query.search } }, { description: { contains: query.search } }] } : {})
    }
    return this.prisma.storeCategory.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
  }

  async createCategory(payload: StoreCategoryPayload, user: AuthenticatedUser) {
    const category = await this.prisma.storeCategory.create({
      data: {
        name: payload.name.trim(),
        slug: payload.slug?.trim() || slugify(payload.name),
        description: payload.description?.trim() || null,
        image: payload.image?.trim() || null,
        sortOrder: Math.max(0, Number(payload.sortOrder) || 0),
        active: payload.active ?? true,
        createdBy: user.id,
        updatedBy: user.id
      }
    })
    await this.audit.record({ ...actor(user), action: 'admin.store.category.created', targetType: 'StoreCategory', targetId: category.id, afterData: category })
    return category
  }

  async updateCategory(id: string, payload: Partial<StoreCategoryPayload>, user: AuthenticatedUser) {
    const current = await this.prisma.storeCategory.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Categoria nao encontrada.')
    const category = await this.prisma.storeCategory.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.slug ? { slug: payload.slug.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
        ...(payload.image !== undefined ? { image: payload.image?.trim() || null } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: Math.max(0, Number(payload.sortOrder) || 0) } : {}),
        ...(payload.active !== undefined ? { active: Boolean(payload.active) } : {}),
        updatedBy: user.id
      }
    })
    await this.audit.record({ ...actor(user), action: 'admin.store.category.updated', targetType: 'StoreCategory', targetId: id, beforeData: current, afterData: category })
    return category
  }

  async categoryAction(id: string, action: 'archive' | 'restore' | 'delete', user: AuthenticatedUser, reason?: string) {
    if (!['archive', 'restore', 'delete'].includes(action)) throw new BadRequestException('Acao de categoria invalida.')
    const current = await this.prisma.storeCategory.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Categoria nao encontrada.')
    const data = action === 'archive'
      ? { active: false, archivedAt: new Date() }
      : action === 'restore'
        ? { active: true, archivedAt: null, deletedAt: null, deletedBy: null }
        : { active: false, deletedAt: new Date(), deletedBy: user.id }
    const category = await this.prisma.storeCategory.update({ where: { id }, data: { ...data, updatedBy: user.id } })
    await this.audit.record({ ...actor(user), action: `admin.store.category.${action}`, targetType: 'StoreCategory', targetId: id, beforeData: current, afterData: category, reason })
    return category
  }

  async listProducts(query: CommerceQuery) {
    await this.publishDueProducts()
    const { page, pageSize, skip } = pageData(query)
    const where: Prisma.ShopProductWhereInput = {
      deletedAt: query.includeDeleted === 'true' ? undefined : null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.featured === 'true' ? { featured: true } : {}),
      ...(query.ambiguous === 'true' ? { ambiguous: true } : {}),
      ...(query.missingPrice === 'true' ? { price: { lte: 0 }, variants: { none: { price: { gt: 0 } } } } : {}),
      ...(query.missingImage === 'true' ? { OR: [{ images: { equals: Prisma.DbNull } }, { images: { equals: [] } }] } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search } }, { key: { contains: query.search } }, { technicalCode: { contains: query.search } }] }
        : {})
    }
    const [total, items] = await Promise.all([
      this.prisma.shopProduct.count({ where }),
      this.prisma.shopProduct.findMany({ where, include: productInclude, orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }], skip, take: pageSize })
    ])
    return { data: items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async publicProduct(slug: string) {
    await this.publishDueProducts()
    const now = new Date()
    const product = await this.prisma.shopProduct.findFirst({
      where: {
        slug,
        status: 'ACTIVE',
        deletedAt: null,
        OR: [{ saleStartsAt: null }, { saleStartsAt: { lte: now } }],
        AND: [{ OR: [{ saleEndsAt: null }, { saleEndsAt: { gte: now } }] }]
      },
      include: {
        categoryRecord: { select: { name: true, slug: true } },
        variants: {
          where: { available: true },
          orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
          select: {
            id: true,
            name: true,
            durationSeconds: true,
            quantity: true,
            itemLevel: true,
            options: true,
            price: true,
            currency: true,
            stock: true,
            accountLimit: true,
            periodLimit: true,
            periodDays: true,
            deliveryTarget: true
          }
        }
      }
    })
    if (!product) throw new NotFoundException('Produto nao encontrado.')
    const {
      technicalCode,
      sourceOrigin,
      internalNotes,
      metadata,
      createdBy,
      updatedBy,
      reviewedBy,
      approvedBy,
      publishedBy,
      reviewedAt,
      approvedAt,
      scheduledPublishAt,
      archivedAt,
      deletedAt,
      deletedBy,
      deletionReason,
      revisionReason,
      version,
      sortOrder,
      key,
      ...publicData
    } = product
    return publicData
  }

  async productDetails(id: string) {
    const product = await this.prisma.shopProduct.findUnique({ where: { id }, include: { ...productInclude, purchases: { orderBy: { createdAt: 'desc' }, take: 10 } } })
    if (!product) throw new NotFoundException('Produto nao encontrado.')
    return product
  }

  async productHistory(id: string) {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id },
      select: { id: true, variants: { select: { id: true } } }
    })
    if (!product) throw new NotFoundException('Produto nao encontrado.')
    const variantIds = product.variants.map((variant) => variant.id)
    return this.prisma.auditEvent.findMany({
      where: {
        module: 'store',
        OR: [
          { targetType: 'ShopProduct', targetId: id },
          ...(variantIds.length ? [{ targetType: 'ShopProductVariant', targetId: { in: variantIds } }] : [])
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    })
  }

  async exportProducts(query: CommerceQuery, user: AuthenticatedUser) {
    const where: Prisma.ShopProductWhereInput = {
      deletedAt: query.includeDeleted === 'true' ? undefined : null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search } }, { key: { contains: query.search } }, { technicalCode: { contains: query.search } }] }
        : {})
    }
    const products = await this.prisma.shopProduct.findMany({
      where,
      include: { variants: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    })
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['id', 'name', 'slug', 'category', 'status', 'price', 'currency', 'stock', 'variants', 'technicalCode', 'sourceOrigin', 'updatedAt'],
      ...products.map((product) => [
        product.id,
        product.name,
        product.slug,
        product.category,
        product.status,
        product.price,
        product.currency,
        product.stock ?? '',
        product.variants.length,
        product.technicalCode ?? '',
        product.sourceOrigin ?? '',
        product.updatedAt.toISOString()
      ])
    ]
    const content = rows.map((row) => row.map(escape).join(',')).join('\r\n')
    await this.audit.record({
      ...actor(user),
      action: 'admin.store.product.exported',
      targetType: 'ShopProduct',
      metadata: { count: products.length, filters: query }
    })
    return {
      filename: `blood-moon-store-products-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv;charset=utf-8',
      content
    }
  }

  async bulkTransitionProducts(payload: StoreBulkProductPayload, user: AuthenticatedUser) {
    const ids = [...new Set(payload.ids.filter(Boolean))].slice(0, 100)
    if (!ids.length) throw new BadRequestException('Selecione ao menos um produto.')
    const results = []
    for (const id of ids) {
      try {
        const product = await this.transitionProduct(id, {
          action: payload.action,
          reason: payload.reason,
          scheduledPublishAt: payload.scheduledPublishAt
        }, user)
        results.push({ id, success: true, status: product.status })
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Falha desconhecida.'
        })
      }
    }
    await this.audit.record({
      ...actor(user),
      action: 'admin.store.product.bulk-transition',
      targetType: 'ShopProduct',
      metadata: {
        action: payload.action,
        requested: ids.length,
        succeeded: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success).length
      },
      reason: payload.reason
    })
    return {
      requested: ids.length,
      succeeded: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
      results
    }
  }

  async createProduct(payload: ShopProductPayload, user: AuthenticatedUser) {
    this.validateProduct(payload)
    const slug = payload.slug?.trim() || slugify(payload.name)
    try {
      const product = await this.prisma.shopProduct.create({
        data: {
          key: payload.key?.trim() || slug,
          slug,
          name: payload.name.trim(),
          short: (payload.short || payload.name.slice(0, 3)).trim().toUpperCase().slice(0, 8),
          category: payload.category.trim(),
          categoryId: payload.categoryId || null,
          summary: payload.summary?.trim() || null,
          description: payload.description.trim(),
          price: Math.max(0, Number(payload.price) || 0),
          currency: payload.currency || 'WCOIN',
          status: payload.status === 'ACTIVE' ? 'DRAFT' : payload.status || 'DRAFT',
          stock: payload.stock ?? null,
          images: json(payload.images),
          featured: Boolean(payload.featured),
          deliveryTarget: payload.deliveryTarget || 'ACCOUNT',
          accountLimit: payload.accountLimit ?? null,
          periodLimit: payload.periodLimit ?? null,
          periodDays: payload.periodDays ?? null,
          saleStartsAt: optionalDate(payload.saleStartsAt),
          saleEndsAt: optionalDate(payload.saleEndsAt),
          technicalCode: payload.technicalCode?.trim() || null,
          sourceOrigin: payload.sourceOrigin?.trim() || null,
          ambiguous: Boolean(payload.ambiguous),
          internalNotes: payload.internalNotes?.trim() || null,
          revisionReason: payload.revisionReason?.trim() || null,
          sortOrder: Math.max(0, Number(payload.sortOrder) || 0),
          createdBy: user.id,
          updatedBy: user.id
        },
        include: productInclude
      })
      await this.audit.record({
        ...actor(user),
        action: 'admin.store.product.created',
        targetType: 'ShopProduct',
        targetId: product.id,
        afterData: product,
        workDescription: payload.workDescription,
        workEvidence: payload.workEvidence,
        workDurationMinutes: payload.workDurationMinutes
      })
      return product
    } catch (error) {
      await this.recordError('STORE_PRODUCT_INCONSISTENT', 'Nao foi possivel criar o produto.', error)
      throw error
    }
  }

  async updateProduct(id: string, payload: Partial<ShopProductPayload>, user: AuthenticatedUser) {
    const current = await this.prisma.shopProduct.findUnique({ where: { id }, include: productInclude })
    if (!current) throw new NotFoundException('Produto nao encontrado.')
    if (payload.name !== undefined && !payload.name.trim()) throw new BadRequestException('O produto precisa de nome.')
    const updated = await this.prisma.shopProduct.update({
      where: { id },
      data: {
        ...(payload.key ? { key: payload.key.trim() } : {}),
        ...(payload.slug ? { slug: payload.slug.trim() } : {}),
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.short !== undefined ? { short: payload.short.trim().toUpperCase().slice(0, 8) } : {}),
        ...(payload.category ? { category: payload.category.trim() } : {}),
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId || null } : {}),
        ...(payload.summary !== undefined ? { summary: payload.summary?.trim() || null } : {}),
        ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
        ...(payload.price !== undefined ? { price: Math.max(0, Number(payload.price) || 0) } : {}),
        ...(payload.currency ? { currency: payload.currency } : {}),
        ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
        ...(payload.images !== undefined ? { images: json(payload.images) } : {}),
        ...(payload.featured !== undefined ? { featured: Boolean(payload.featured) } : {}),
        ...(payload.deliveryTarget ? { deliveryTarget: payload.deliveryTarget } : {}),
        ...(payload.accountLimit !== undefined ? { accountLimit: payload.accountLimit } : {}),
        ...(payload.periodLimit !== undefined ? { periodLimit: payload.periodLimit } : {}),
        ...(payload.periodDays !== undefined ? { periodDays: payload.periodDays } : {}),
        ...(payload.saleStartsAt !== undefined ? { saleStartsAt: optionalDate(payload.saleStartsAt) } : {}),
        ...(payload.saleEndsAt !== undefined ? { saleEndsAt: optionalDate(payload.saleEndsAt) } : {}),
        ...(payload.technicalCode !== undefined ? { technicalCode: payload.technicalCode?.trim() || null } : {}),
        ...(payload.sourceOrigin !== undefined ? { sourceOrigin: payload.sourceOrigin?.trim() || null } : {}),
        ...(payload.ambiguous !== undefined ? { ambiguous: Boolean(payload.ambiguous) } : {}),
        ...(payload.internalNotes !== undefined ? { internalNotes: payload.internalNotes?.trim() || null } : {}),
        ...(payload.revisionReason !== undefined ? { revisionReason: payload.revisionReason?.trim() || null } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: Math.max(0, Number(payload.sortOrder) || 0) } : {}),
        updatedBy: user.id,
        version: { increment: 1 }
      },
      include: productInclude
    })
    await this.audit.record({
      ...actor(user),
      action: 'admin.store.product.updated',
      targetType: 'ShopProduct',
      targetId: id,
      beforeData: current,
      afterData: updated,
      reason: payload.revisionReason,
      workDescription: payload.workDescription,
      workEvidence: payload.workEvidence,
      workDurationMinutes: payload.workDurationMinutes
    })
    return updated
  }

  async duplicateProduct(id: string, user: AuthenticatedUser) {
    const current = await this.productDetails(id)
    const suffix = randomUUID().slice(0, 8)
    const duplicate = await this.prisma.shopProduct.create({
      data: {
        key: `${current.key}-copy-${suffix}`,
        slug: `${current.slug}-copy-${suffix}`,
        name: `${current.name} (copia)`,
        short: current.short,
        category: current.category,
        categoryId: current.categoryId,
        summary: current.summary,
        description: current.description,
        price: current.price,
        currency: current.currency,
        status: 'DRAFT',
        stock: current.stock,
        images: json(current.images),
        featured: false,
        deliveryTarget: current.deliveryTarget,
        accountLimit: current.accountLimit,
        periodLimit: current.periodLimit,
        periodDays: current.periodDays,
        technicalCode: current.technicalCode,
        sourceOrigin: current.sourceOrigin,
        ambiguous: current.ambiguous,
        internalNotes: current.internalNotes,
        createdBy: user.id,
        updatedBy: user.id,
        variants: {
          create: current.variants.map((variant, index) => ({
            name: variant.name,
            sku: `${variant.sku}-copy-${suffix}-${index}`,
            durationSeconds: variant.durationSeconds,
            quantity: variant.quantity,
            itemLevel: variant.itemLevel,
            options: json(variant.options),
            price: variant.price,
            currency: variant.currency,
            stock: variant.stock,
            available: variant.available,
            accountLimit: variant.accountLimit,
            periodLimit: variant.periodLimit,
            periodDays: variant.periodDays,
            deliveryTarget: variant.deliveryTarget,
            sortOrder: variant.sortOrder,
            technicalData: json(variant.technicalData)
          }))
        }
      },
      include: productInclude
    })
    await this.audit.record({ ...actor(user), action: 'admin.store.product.duplicated', targetType: 'ShopProduct', targetId: duplicate.id, beforeData: { sourceId: id }, afterData: duplicate })
    return duplicate
  }

  async transitionProduct(id: string, payload: StoreProductTransitionPayload, user: AuthenticatedUser) {
    if (!['submit-review', 'approve', 'reject', 'publish', 'schedule', 'deactivate', 'archive', 'restore', 'delete'].includes(payload.action)) {
      throw new BadRequestException('Acao de workflow invalida.')
    }
    const current = await this.prisma.shopProduct.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Produto nao encontrado.')
    const required: Record<StoreProductTransitionPayload['action'], string> = {
      'submit-review': permissionKeys.adminStoreProducts,
      approve: permissionKeys.adminStoreReview,
      reject: permissionKeys.adminStoreReview,
      publish: permissionKeys.adminStorePublish,
      schedule: permissionKeys.adminStorePublish,
      deactivate: permissionKeys.adminStorePublish,
      archive: permissionKeys.adminStoreProducts,
      restore: permissionKeys.adminStoreProducts,
      delete: permissionKeys.adminStoreProducts
    }
    requirePermission(user, required[payload.action])
    const allowedFrom: Record<StoreProductTransitionPayload['action'], ShopProductStatus[]> = {
      'submit-review': ['DRAFT', 'BLOCKED'],
      approve: ['IN_REVIEW'],
      reject: ['IN_REVIEW'],
      publish: ['APPROVED'],
      schedule: ['APPROVED'],
      deactivate: ['ACTIVE', 'SCHEDULED'],
      archive: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'ACTIVE', 'INACTIVE', 'BLOCKED'],
      restore: ['ARCHIVED'],
      delete: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'BLOCKED']
    }
    if (!allowedFrom[payload.action].includes(current.status)) {
      throw new BadRequestException(`A acao ${payload.action} nao e permitida para um produto ${current.status}.`)
    }
    if (payload.action === 'approve' && current.createdBy === user.id && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('O criador do produto nao pode aprovar o proprio trabalho.')
    }
    if (['reject', 'archive', 'delete'].includes(payload.action) && !payload.reason?.trim()) {
      throw new BadRequestException('Informe uma justificativa para esta acao.')
    }
    if (['publish', 'schedule'].includes(payload.action)) {
      if (!current.name.trim()) throw new BadRequestException('Produtos sem nome nao podem ser publicados.')
      if (current.ambiguous || current.status === 'BLOCKED') throw new BadRequestException('Produtos ambiguos precisam de revisao antes da publicacao.')
      if (!current.approvedAt) throw new BadRequestException('O produto precisa ser aprovado antes de publicar.')
      if (current.price <= 0 && !await this.prisma.shopProductVariant.count({ where: { productId: id, price: { gt: 0 } } })) {
        throw new BadRequestException('Defina um preco antes da publicacao.')
      }
    }
    const now = new Date()
    const data: Prisma.ShopProductUpdateInput = {
      updatedBy: user.id,
      revisionReason: payload.reason || null,
      version: { increment: 1 }
    }
    switch (payload.action) {
      case 'submit-review':
        Object.assign(data, { status: 'IN_REVIEW', reviewedBy: null, reviewedAt: null })
        break
      case 'approve':
        Object.assign(data, { status: 'APPROVED', reviewedBy: user.id, reviewedAt: now, approvedBy: user.id, approvedAt: now })
        break
      case 'reject':
        Object.assign(data, { status: 'DRAFT', reviewedBy: user.id, reviewedAt: now })
        break
      case 'publish':
        Object.assign(data, { status: 'ACTIVE', publishedBy: user.id, publishedAt: now, scheduledPublishAt: null })
        break
      case 'schedule':
        if (!payload.scheduledPublishAt || new Date(payload.scheduledPublishAt) <= now) throw new BadRequestException('Informe uma data futura para o agendamento.')
        Object.assign(data, { status: 'SCHEDULED', scheduledPublishAt: new Date(payload.scheduledPublishAt) })
        break
      case 'deactivate':
        Object.assign(data, { status: 'INACTIVE' })
        break
      case 'archive':
        Object.assign(data, { status: 'ARCHIVED', archivedAt: now })
        break
      case 'restore':
        Object.assign(data, { status: 'DRAFT', archivedAt: null, deletedAt: null, deletedBy: null, deletionReason: null })
        break
      case 'delete':
        Object.assign(data, { status: 'ARCHIVED', deletedAt: now, deletedBy: user.id, deletionReason: payload.reason || 'Exclusao administrativa' })
        break
    }
    try {
      const updated = await this.prisma.shopProduct.update({ where: { id }, data, include: productInclude })
      await this.audit.record({
        ...actor(user),
        action: `admin.store.product.${payload.action}`,
        targetType: 'ShopProduct',
        targetId: id,
        beforeData: current,
        afterData: updated,
        reason: payload.reason,
        workDescription: payload.workDescription,
        workEvidence: payload.evidence,
        workDurationMinutes: payload.durationMinutes
      })
      await this.observability.recordOperationalEvent({
        module: 'store',
        eventType: `PRODUCT_${payload.action.replace('-', '_').toUpperCase()}`,
        entityType: 'ShopProduct',
        entityId: id,
        actorUserId: user.id,
        description: `Produto ${current.name} recebeu a acao ${payload.action}.`
      })
      return updated
    } catch (error) {
      await this.recordError('STORE_PRODUCT_WORKFLOW_FAILED', 'Falha no workflow do produto.', error, 'ShopProduct', id)
      throw error
    }
  }

  async reorderProducts(payload: StoreReorderPayload, user: AuthenticatedUser) {
    await this.prisma.$transaction(payload.ids.map((id, index) =>
      this.prisma.shopProduct.update({ where: { id }, data: { sortOrder: index, updatedBy: user.id } })
    ))
    await this.audit.record({ ...actor(user), action: 'admin.store.products.reordered', targetType: 'ShopProduct', afterData: { ids: payload.ids } })
    return { updated: payload.ids.length }
  }

  async createVariant(productId: string, payload: ShopProductVariantPayload, user: AuthenticatedUser) {
    await this.ensureProduct(productId)
    const variant = await this.prisma.shopProductVariant.create({ data: this.variantData(productId, payload) })
    await this.audit.record({ ...actor(user), action: 'admin.store.variant.created', targetType: 'ShopProductVariant', targetId: variant.id, afterData: variant })
    return variant
  }

  async updateVariant(id: string, payload: Partial<ShopProductVariantPayload>, user: AuthenticatedUser) {
    const current = await this.prisma.shopProductVariant.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Variante nao encontrada.')
    const variant = await this.prisma.shopProductVariant.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.sku ? { sku: payload.sku.trim() } : {}),
        ...(payload.durationSeconds !== undefined ? { durationSeconds: payload.durationSeconds } : {}),
        ...(payload.quantity !== undefined ? { quantity: Math.max(1, Number(payload.quantity) || 1) } : {}),
        ...(payload.itemLevel !== undefined ? { itemLevel: payload.itemLevel } : {}),
        ...(payload.options !== undefined ? { options: json(payload.options) } : {}),
        ...(payload.price !== undefined ? { price: Math.max(0, Number(payload.price) || 0) } : {}),
        ...(payload.currency ? { currency: payload.currency } : {}),
        ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
        ...(payload.available !== undefined ? { available: Boolean(payload.available) } : {}),
        ...(payload.accountLimit !== undefined ? { accountLimit: payload.accountLimit } : {}),
        ...(payload.periodLimit !== undefined ? { periodLimit: payload.periodLimit } : {}),
        ...(payload.periodDays !== undefined ? { periodDays: payload.periodDays } : {}),
        ...(payload.deliveryTarget !== undefined ? { deliveryTarget: payload.deliveryTarget } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: Math.max(0, Number(payload.sortOrder) || 0) } : {}),
        ...(payload.technicalData !== undefined ? { technicalData: json(payload.technicalData) } : {})
      }
    })
    await this.audit.record({ ...actor(user), action: 'admin.store.variant.updated', targetType: 'ShopProductVariant', targetId: id, beforeData: current, afterData: variant })
    return variant
  }

  async deleteVariant(id: string, user: AuthenticatedUser) {
    const current = await this.prisma.shopProductVariant.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Variante nao encontrada.')
    const variant = await this.prisma.shopProductVariant.update({ where: { id }, data: { available: false } })
    await this.audit.record({ ...actor(user), action: 'admin.store.variant.disabled', targetType: 'ShopProductVariant', targetId: id, beforeData: current, afterData: variant })
    return variant
  }

  async importCatalog(payload: StoreCatalogImportPayload, user: AuthenticatedUser) {
    const catalog = await this.readCatalog()
    const items = (catalog.items || []).slice(0, Math.max(1, Math.min(payload.limit || 1000, 2000)))
    const unresolved = catalog.cashShop?.unresolvedProducts || []
    const result = { candidates: items.length + unresolved.length, created: 0, skipped: 0, blocked: 0, variants: 0, dryRun: Boolean(payload.dryRun) }
    if (payload.dryRun) {
      result.blocked = items.filter((item) => this.catalogItemBlocked(item)).length + unresolved.length
      return result
    }
    try {
      for (const item of items) {
        const name = fixText(item.name)
        const key = `catalog-${item.key || item.code || slugify(name)}`
        const blocked = this.catalogItemBlocked(item)
        const categoryName = fixText(item.category) || 'Sem categoria'
        const category = await this.prisma.storeCategory.upsert({
          where: { slug: slugify(categoryName) },
          update: {},
          create: { name: categoryName, slug: slugify(categoryName), active: false, createdBy: user.id, updatedBy: user.id }
        })
        const existing = await this.prisma.shopProduct.findUnique({ where: { key } })
        if (existing) {
          result.skipped += 1
          continue
        }
        await this.prisma.shopProduct.create({
          data: {
            key,
            slug: `${slugify(name || 'produto-nao-identificado')}-${item.code || randomUUID().slice(0, 8)}`,
            name,
            short: name.slice(0, 3).toUpperCase() || '???',
            category: categoryName,
            categoryId: category.id,
            summary: fixText(item.family),
            description: fixText(item.description) || 'Produto importado aguardando descricao editorial.',
            price: 0,
            currency: 'WCOIN',
            status: blocked ? 'BLOCKED' : 'DRAFT',
            technicalCode: String(item.code ?? ''),
            sourceOrigin: item.source?.file || 'commerce-item-catalog',
            ambiguous: blocked,
            internalNotes: fixText(item.commerceReason),
            metadata: json(item),
            createdBy: user.id,
            updatedBy: user.id
          }
        })
        result.created += 1
        if (blocked) result.blocked += 1
      }
      for (const [index, unresolvedProduct] of unresolved.entries()) {
        const key = `catalog-unresolved-${String(unresolvedProduct.id || unresolvedProduct.index || index)}`
        const existing = await this.prisma.shopProduct.findUnique({ where: { key } })
        if (existing) {
          result.skipped += 1
          continue
        }
        await this.prisma.shopProduct.create({
          data: {
            key,
            slug: `${key}-${randomUUID().slice(0, 6)}`,
            name: '',
            short: '???',
            category: 'Nao identificado',
            description: 'Produto sem nome bloqueado para identificacao manual.',
            price: 0,
            currency: 'WCOIN',
            status: 'BLOCKED',
            ambiguous: true,
            sourceOrigin: 'commerce-item-catalog',
            metadata: json(unresolvedProduct),
            createdBy: user.id,
            updatedBy: user.id
          }
        })
        result.created += 1
        result.blocked += 1
      }
      const namedGroups = catalog.cashShop?.namedGroups || []
      for (const group of namedGroups) {
        const name = fixText(group.name)
        const product = await this.prisma.shopProduct.findFirst({ where: { name } })
        if (!product) continue
        const durations = group.durations?.length ? group.durations : [null]
        for (const [index, duration] of durations.entries()) {
          const sku = `${product.key}-${duration || 'default'}-${index}`
          await this.prisma.shopProductVariant.upsert({
            where: { sku },
            update: {},
            create: {
              productId: product.id,
              name: duration ? `${name} - ${Math.round(duration / 86400)} dia(s)` : name,
              sku,
              durationSeconds: duration,
              price: 0,
              currency: product.currency,
              available: false,
              technicalData: { itemCodes: group.itemCodes || [], catalogVariants: group.variants || 0 }
            }
          })
          result.variants += 1
        }
      }
      await this.audit.record({
        ...actor(user),
        action: 'admin.store.catalog.imported',
        targetType: 'ShopProduct',
        afterData: result,
        workDescription: `Catalogo comercial importado: ${result.created} produtos e ${result.variants} variantes.`
      })
      return result
    } catch (error) {
      await this.recordError('STORE_CATALOG_IMPORT_FAILED', 'Falha ao importar o catalogo.', error)
      throw error
    }
  }

  async listOrders(query: CommerceQuery) {
    const { page, pageSize, skip } = pageData(query)
    const where: Prisma.PurchaseIntentWhereInput = {
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.search
        ? { OR: [{ id: { contains: query.search } }, { correlationId: { contains: query.search } }, { account: { username: { contains: query.search } } }, { product: { name: { contains: query.search } } }] }
        : {}),
      ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {})
    }
    const [total, data] = await Promise.all([
      this.prisma.purchaseIntent.count({ where }),
      this.prisma.purchaseIntent.findMany({
        where,
        include: { account: true, product: true, variant: true, deliveries: true, notes: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async orderDetails(id: string) {
    const order = await this.prisma.purchaseIntent.findUnique({
      where: { id },
      include: { account: { include: { currencies: true } }, product: true, variant: true, deliveries: { orderBy: { createdAt: 'desc' } }, notes: { orderBy: { createdAt: 'desc' } } }
    })
    if (!order) throw new NotFoundException('Pedido nao encontrado.')
    const timeline = await this.prisma.operationalEvent.findMany({
      where: { module: 'store', entityType: { in: ['PurchaseIntent', 'StoreDelivery'] }, OR: [{ entityId: id }, { correlationId: order.correlationId }] },
      orderBy: { occurredAt: 'asc' }
    })
    return { ...order, timeline }
  }

  async orderAction(id: string, payload: StoreOrderActionPayload, user: AuthenticatedUser) {
    if (!['mark-paid', 'deliver', 'manual-review', 'cancel', 'refund'].includes(payload.action)) {
      throw new BadRequestException('Acao de pedido invalida.')
    }
    const order = await this.prisma.purchaseIntent.findUnique({ where: { id }, include: { product: true, variant: true, account: true, deliveries: true } })
    if (!order) throw new NotFoundException('Pedido nao encontrado.')
    if (order.status === 'COMPLETED' && !hasPermission(user, permissionKeys.adminStoreRefund)) {
      throw new ForbiddenException('Pedidos concluidos exigem permissao especifica para alteracao.')
    }
    if (payload.action === 'refund') requirePermission(user, permissionKeys.adminStoreRefund)
    const now = new Date()
    try {
      if (payload.action === 'mark-paid') {
        const updated = await this.prisma.purchaseIntent.update({ where: { id }, data: { status: 'PAID' } })
        await this.orderEvent(order, user, 'PAYMENT_CONFIRMED', 'Pagamento confirmado.')
        return updated
      }
      if (payload.action === 'deliver') {
        if (order.deliveries.some((delivery) => ['WAITING', 'PROCESSING', 'REPROCESSING', 'COMPLETED'].includes(delivery.status))) {
          throw new BadRequestException('Este pedido ja possui uma entrega ativa ou concluida.')
        }
        const delivery = await this.prisma.storeDelivery.create({
          data: {
            purchaseId: id,
            status: 'WAITING',
            target: order.variant?.deliveryTarget || order.product.deliveryTarget,
            accountId: order.accountId,
            characterId: order.destinationCharacterId,
            itemCode: order.product.technicalCode,
            itemName: order.product.name,
            quantity: order.quantity * (order.variant?.quantity || 1),
            correlationId: `${order.correlationId}-delivery-${order.deliveries.length + 1}`
          }
        })
        await this.prisma.purchaseIntent.update({ where: { id }, data: { status: 'DELIVERING' } })
        await this.orderEvent(order, user, 'DELIVERY_STARTED', 'Entrega adicionada a fila.')
        return delivery
      }
      if (payload.action === 'manual-review') {
        const updated = await this.prisma.purchaseIntent.update({ where: { id }, data: { status: 'MANUAL_REVIEW', manualReviewReason: payload.reason || null } })
        await this.orderEvent(order, user, 'ORDER_MANUAL_REVIEW', payload.reason || 'Pedido enviado para revisao manual.')
        return updated
      }
      if (payload.action === 'cancel') {
        if (!['PREPARED', 'PENDING_PAYMENT'].includes(order.status)) {
          throw new BadRequestException('Pedidos pagos devem ser estornados, nao cancelados.')
        }
        const updated = await this.prisma.purchaseIntent.update({ where: { id }, data: { status: 'CANCELLED', cancelledBy: user.id, cancelledAt: now, internalNotes: payload.note || order.internalNotes } })
        await this.orderEvent(order, user, 'ORDER_CANCELLED', payload.reason || 'Pedido cancelado.')
        return updated
      }
      if (order.status === 'REFUNDED') throw new BadRequestException('Este pedido ja foi estornado.')
      if (!['PAID', 'DELIVERING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW', 'REFUND_PENDING'].includes(order.status)) {
        throw new BadRequestException('O estado atual do pedido nao permite estorno.')
      }
      const updated = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.purchaseIntent.updateMany({
          where: { id, status: { notIn: ['REFUNDED', 'CANCELLED'] } },
          data: { status: 'REFUND_PENDING' }
        })
        if (!claimed.count) throw new BadRequestException('Este pedido ja foi encerrado.')
        const wallet = await tx.accountCurrency.findUnique({ where: { accountId_currency: { accountId: order.accountId, currency: order.currency } } })
        await tx.accountCurrency.upsert({
          where: { accountId_currency: { accountId: order.accountId, currency: order.currency } },
          create: { accountId: order.accountId, currency: order.currency, balance: order.price },
          update: { balance: { increment: order.price } }
        })
        if (order.variantId && order.variant?.stock !== null) {
          await tx.shopProductVariant.update({ where: { id: order.variantId }, data: { stock: { increment: order.quantity } } })
        } else if (order.product.stock !== null) {
          await tx.shopProduct.update({ where: { id: order.productId }, data: { stock: { increment: order.quantity } } })
        }
        await tx.storeDelivery.updateMany({
          where: { purchaseId: id, status: { not: 'REFUNDED' } },
          data: { status: 'REFUNDED', refundedAt: now }
        })
        return tx.purchaseIntent.update({
          where: { id },
          data: { status: 'REFUNDED', refundReason: payload.reason || null, refundedBy: user.id, refundedAt: now, internalNotes: `${order.internalNotes || ''}\nSaldo anterior: ${wallet?.balance || 0}`.trim() }
        })
      })
      await this.orderEvent(order, user, 'ORDER_REFUNDED', payload.reason || 'Pedido estornado.')
      return updated
    } catch (error) {
      const code = payload.action === 'refund' ? 'STORE_REFUND_FAILED' : 'STORE_ORDER_ACTION_FAILED'
      await this.recordError(code, 'Falha ao processar o pedido.', error, 'PurchaseIntent', id)
      throw error
    } finally {
      await this.audit.record({
        ...actor(user),
        action: `admin.store.order.${payload.action}`,
        targetType: 'PurchaseIntent',
        targetId: id,
        beforeData: order,
        reason: payload.reason,
        workDescription: payload.note,
        workEvidence: payload.evidence
      })
    }
  }

  async addOrderNote(id: string, payload: StoreOrderNotePayload, user: AuthenticatedUser) {
    await this.orderDetails(id)
    const note = await this.prisma.storeOrderNote.create({
      data: { purchaseId: id, authorId: user.id, authorName: user.username, content: payload.content.trim(), evidence: json(payload.evidence) }
    })
    await this.audit.record({ ...actor(user), action: 'admin.store.order.note-added', targetType: 'PurchaseIntent', targetId: id, afterData: note, workEvidence: payload.evidence })
    return note
  }

  async listDeliveries(query: CommerceQuery) {
    const { page, pageSize, skip } = pageData(query)
    const where: Prisma.StoreDeliveryWhereInput = {
      ...(query.status ? { status: query.status as StoreDeliveryStatus } : {}),
      ...(query.search ? { OR: [{ itemName: { contains: query.search } }, { correlationId: { contains: query.search } }, { accountId: { contains: query.search } }] } : {})
    }
    const [total, data] = await Promise.all([
      this.prisma.storeDelivery.count({ where }),
      this.prisma.storeDelivery.findMany({ where, include: { purchase: { include: { account: true, product: true } } }, orderBy: { createdAt: 'desc' }, skip, take: pageSize })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async deliveryAction(id: string, payload: StoreDeliveryActionPayload, user: AuthenticatedUser) {
    if (!['process', 'complete', 'fail', 'reprocess', 'manual-review', 'refund'].includes(payload.action)) {
      throw new BadRequestException('Acao de entrega invalida.')
    }
    const current = await this.prisma.storeDelivery.findUnique({ where: { id }, include: { purchase: true } })
    if (!current) throw new NotFoundException('Entrega nao encontrada.')
    if (payload.action === 'refund') {
      requirePermission(user, permissionKeys.adminStoreRefund)
      throw new BadRequestException('Realize o estorno pelo pedido para devolver saldo e estoque de forma atomica.')
    }
    const statusMap: Record<StoreDeliveryActionPayload['action'], StoreDeliveryStatus> = {
      process: 'PROCESSING',
      complete: 'COMPLETED',
      fail: 'FAILED',
      reprocess: 'REPROCESSING',
      'manual-review': 'MANUAL_REVIEW',
      refund: 'REFUNDED'
    }
    const now = new Date()
    try {
      if (payload.action === 'reprocess' && current.attempts >= current.maxAttempts) {
        throw new BadRequestException('A entrega atingiu o limite de tentativas e exige revisao manual.')
      }
      const delivery = await this.prisma.storeDelivery.update({
        where: { id },
        data: {
          status: statusMap[payload.action],
          attempts: ['process', 'reprocess'].includes(payload.action) ? { increment: 1 } : undefined,
          processingAt: ['process', 'reprocess'].includes(payload.action) ? now : undefined,
          completedAt: payload.action === 'complete' ? now : undefined,
          failedAt: payload.action === 'fail' ? now : undefined,
          lastError: payload.error || null,
          reprocessedBy: payload.action === 'reprocess' ? user.id : undefined,
          evidence: json(payload.evidence)
        }
      })
      if (payload.action === 'complete') {
        await this.prisma.purchaseIntent.update({ where: { id: current.purchaseId }, data: { status: 'COMPLETED', completedAt: now } })
      } else if (payload.action === 'fail') {
        await this.prisma.purchaseIntent.update({ where: { id: current.purchaseId }, data: { status: 'FAILED' } })
        await this.recordError('STORE_DELIVERY_FAILED', 'A entrega do pedido falhou.', new Error(payload.error || 'Falha sem detalhe'), 'StoreDelivery', id)
      }
      await this.audit.record({ ...actor(user), action: `admin.store.delivery.${payload.action}`, targetType: 'StoreDelivery', targetId: id, beforeData: current, afterData: delivery, workEvidence: payload.evidence })
      await this.observability.recordOperationalEvent({
        module: 'store',
        eventType: `DELIVERY_${payload.action.replace('-', '_').toUpperCase()}`,
        entityType: 'StoreDelivery',
        entityId: id,
        actorUserId: user.id,
        targetUserId: current.accountId,
        correlationId: current.correlationId,
        severity: payload.action === 'fail' ? 'ERROR' : 'INFO',
        description: `Entrega ${id}: ${payload.action}.`
      })
      return delivery
    } catch (error) {
      await this.recordError('STORE_DELIVERY_ACTION_FAILED', 'Falha ao atualizar a entrega.', error, 'StoreDelivery', id)
      throw error
    }
  }

  async reports(query: CommerceQuery, user: AuthenticatedUser) {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const to = query.to ? new Date(query.to) : new Date()
    const where = { createdAt: { gte: from, lte: to } }
    const [orders, deliveries, failures, products, refunds] = await Promise.all([
      this.prisma.purchaseIntent.count({ where }),
      this.prisma.storeDelivery.count({ where }),
      this.prisma.storeDelivery.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.shopProduct.count({ where: { createdAt: { lte: to }, deletedAt: null } }),
      this.prisma.purchaseIntent.count({ where: { ...where, status: 'REFUNDED' } })
    ])
    const operational = { period: { from: from.toISOString(), to: to.toISOString() }, orders, deliveries, failures, products }
    if (user.role !== 'SUPER_ADMIN') return operational
    const financial = await this.prisma.purchaseIntent.aggregate({
      where: { status: 'COMPLETED', completedAt: { gte: from, lte: to } },
      _sum: { price: true },
      _avg: { price: true },
      _count: { id: true }
    })
    return { ...operational, financial: { revenue: financial._sum.price || 0, averageTicket: Math.round(financial._avg.price || 0), sales: financial._count.id, refunds, discounts: 0 } }
  }

  async testProduct(payload: StoreProductTestPayload, user: AuthenticatedUser) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_STORE_DELIVERY_TESTS !== 'true') {
      throw new ForbiddenException('Testes de entrega estao bloqueados em producao.')
    }
    const product = await this.prisma.shopProduct.findUnique({ where: { id: payload.productId }, include: { variants: true } })
    if (!product) throw new NotFoundException('Produto de teste nao encontrado.')
    const account = await this.prisma.account.findUnique({ where: { id: payload.testAccountId } })
    if (!account) throw new NotFoundException('Conta de teste nao encontrada.')
    const correlationId = `store-test-${randomUUID()}`
    const report = {
      product: product.name,
      account: account.username,
      variantId: payload.variantId || null,
      simulatedPurchase: Boolean(payload.simulatePurchase),
      deliveryTested: Boolean(payload.testDelivery),
      rollbackRequested: Boolean(payload.rollback),
      executedAt: new Date().toISOString()
    }
    const test = await this.prisma.storeProductTest.create({
      data: {
        productId: product.id,
        variantId: payload.variantId || null,
        testAccountId: account.id,
        testCharacter: payload.testCharacter || null,
        environment: process.env.NODE_ENV || 'development',
        status: 'COMPLETED',
        result: report,
        rollbackData: payload.rollback ? { supported: false, reason: 'Simulacao nao alterou o servidor de jogo.' } : undefined,
        correlationId,
        createdBy: user.id,
        completedAt: new Date()
      }
    })
    await this.audit.record({ ...actor(user), action: 'admin.store.product.tested', targetType: 'StoreProductTest', targetId: test.id, afterData: report })
    return test
  }

  private validateProduct(payload: ShopProductPayload) {
    if (!payload.name?.trim()) throw new BadRequestException('O produto precisa de nome.')
    if (!payload.category?.trim()) throw new BadRequestException('Defina uma categoria.')
    if (!payload.description?.trim()) throw new BadRequestException('Informe a descricao.')
    const images = payload.images || []
    if (images.some((image) => !/^(https?:\/\/|\/)[^\s]+$/i.test(image))) {
      throw new BadRequestException('Todas as imagens precisam usar HTTPS ou caminho publico.')
    }
  }

  private async ensureProduct(id: string) {
    const product = await this.prisma.shopProduct.findUnique({ where: { id }, select: { id: true } })
    if (!product) throw new NotFoundException('Produto nao encontrado.')
  }

  private variantData(productId: string, payload: ShopProductVariantPayload): Prisma.ShopProductVariantUncheckedCreateInput {
    return {
      productId,
      name: payload.name.trim(),
      sku: payload.sku?.trim() || `${slugify(payload.name)}-${randomUUID().slice(0, 8)}`,
      durationSeconds: payload.durationSeconds ?? null,
      quantity: Math.max(1, Number(payload.quantity) || 1),
      itemLevel: payload.itemLevel ?? null,
      options: json(payload.options),
      price: Math.max(0, Number(payload.price) || 0),
      currency: payload.currency,
      stock: payload.stock ?? null,
      available: payload.available ?? true,
      accountLimit: payload.accountLimit ?? null,
      periodLimit: payload.periodLimit ?? null,
      periodDays: payload.periodDays ?? null,
      deliveryTarget: payload.deliveryTarget ?? null,
      sortOrder: Math.max(0, Number(payload.sortOrder) || 0),
      technicalData: json(payload.technicalData)
    }
  }

  private catalogItemBlocked(item: CatalogItem) {
    const name = fixText(item.name)
    const policy = fixText(item.officialStore).toLowerCase()
    return !name || policy.includes('revis') || policy.includes('nao recomendado') || policy.includes('não recomendado')
  }

  private async readCatalog(): Promise<CommerceCatalog> {
    const candidates = [
      path.resolve(process.cwd(), 'docs/catalogs/commerce-item-catalog.json'),
      path.resolve(process.cwd(), '../../docs/catalogs/commerce-item-catalog.json'),
      path.resolve(__dirname, '../../../../../docs/catalogs/commerce-item-catalog.json')
    ]
    let lastError: unknown
    for (const candidate of candidates) {
      try {
        return JSON.parse(await readFile(candidate, 'utf8')) as CommerceCatalog
      } catch (error) {
        lastError = error
      }
    }
    throw new NotFoundException(`Catalogo comercial nao encontrado: ${lastError instanceof Error ? lastError.message : 'caminhos verificados sem sucesso'}`)
  }

  private async orderEvent(
    order: { id: string, accountId: string, correlationId: string },
    user: AuthenticatedUser,
    eventType: string,
    description: string
  ) {
    await this.observability.recordOperationalEvent({
      module: 'store',
      eventType,
      entityType: 'PurchaseIntent',
      entityId: order.id,
      actorUserId: user.id,
      targetUserId: order.accountId,
      correlationId: order.correlationId,
      description
    })
  }
}
