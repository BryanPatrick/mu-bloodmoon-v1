import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import type {
  Account,
  CurrencyCode,
  Prisma,
  PurchaseIntentStatus,
  RechargeIntent,
  RechargeIntentStatus,
  RechargePackage,
  ShopProduct,
  ShopProductStatus
} from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider.interface'
import { PaymentWebhookEventService } from '../payments/payment-webhook-event.service'
import { mapMercadoPagoOrderStatus } from '../payments/mercadopago.status-map'
import type {
  CommerceQuery,
  CreatePurchaseIntentPayload,
  CreateRechargeIntentPayload,
  MercadoPagoWebhookInput,
  RechargePackagePayload,
  ShopProductPayload,
  UpdatePurchaseStatusPayload,
  UpdateRechargeStatusPayload
} from './commerce.contract'

const rechargeTransitions: Record<RechargeIntentStatus, RechargeIntentStatus[]> = {
  PREPARED: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'MANUAL_REVIEW'],
  PENDING: ['PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'MANUAL_REVIEW'],
  PROCESSING: ['PAID', 'FAILED', 'CANCELLED', 'MANUAL_REVIEW'],
  PAID: ['REFUND_PENDING', 'REFUNDED', 'CANCELLED'],
  MANUAL_REVIEW: ['PAID', 'FAILED', 'CANCELLED', 'REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED', 'MANUAL_REVIEW'],
  FAILED: ['CANCELLED'],
  CANCELLED: [],
  REFUNDED: []
}

const defaultPageSize = 50
const maxPageSize = 100

// RechargePackage.price is a free-text BRL string ("39,90" or "39.90").
// Mercado Pago's Orders API wants a plain decimal string ("39.90").
export function parseBrlPrice(price: string): number {
  const normalized = price.trim().replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const seedProducts: ShopProductPayload[] = [
  {
    key: 'vip-bronze',
    name: 'Pacote VIP Bronze',
    short: 'VIP',
    category: 'VIP',
    description: 'Beneficios iniciais para evolucao e conforto.',
    price: 350,
    currency: 'WCOIN',
    status: 'DRAFT',
    stock: null
  },
  {
    key: 'rename-character',
    name: 'Troca de Nick',
    short: 'N',
    category: 'Servico',
    description: 'Servico de alteracao de nome de personagem.',
    price: 180,
    currency: 'WCOIN',
    status: 'DRAFT',
    stock: null
  },
  {
    key: 'extra-reset',
    name: 'Reset Extra',
    short: 'R',
    category: 'Servico',
    description: 'Credito de reset especial para temporada.',
    price: 120,
    currency: 'GOBLIN_POINT',
    status: 'DRAFT',
    stock: null
  },
  {
    key: 'blood-box',
    name: 'Box Blood Moon',
    short: 'B',
    category: 'Evento',
    description: 'Caixa promocional com itens rotativos.',
    price: 900,
    currency: 'HUNT_POINT',
    status: 'DRAFT',
    stock: 250
  }
]

const seedRechargePackages: RechargePackagePayload[] = [
  { key: 'wcoin-500', currency: 'WCOIN', amount: 500, bonus: 0, price: '19,90' },
  { key: 'wcoin-1200', currency: 'WCOIN', amount: 1200, bonus: 100, price: '39,90', highlight: true },
  { key: 'wcoin-2600', currency: 'WCOIN', amount: 2600, bonus: 300, price: '79,90' },
  { key: 'wcoin-5500', currency: 'WCOIN', amount: 5500, bonus: 800, price: '149,90' },
  { key: 'gp-340', currency: 'GOBLIN_POINT', amount: 340, bonus: 0, price: '19,90' },
  { key: 'gp-850', currency: 'GOBLIN_POINT', amount: 850, bonus: 50, price: '39,90' },
  { key: 'hp-1000', currency: 'HUNT_POINT', amount: 1000, bonus: 0, price: '14,90' },
  { key: 'hp-8750', currency: 'HUNT_POINT', amount: 8750, bonus: 1250, price: '99,90', highlight: true }
]

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const normalizeKey = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const pagination = (query: CommerceQuery) => {
  const page = toPositiveInt(query.page, 1)
  const pageSize = Math.min(toPositiveInt(query.pageSize, defaultPageSize), maxPageSize)
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize
  }
}

const productData = (payload: ShopProductPayload): Prisma.ShopProductUncheckedCreateInput => ({
  key: payload.key?.trim() || normalizeKey(payload.name),
  slug: payload.slug?.trim() || payload.key?.trim() || normalizeKey(payload.name),
  name: payload.name.trim(),
  short: (payload.short || payload.name.slice(0, 3)).trim().toUpperCase().slice(0, 8),
  category: payload.category.trim(),
  categoryId: payload.categoryId || null,
  summary: payload.summary?.trim() || null,
  description: payload.description.trim(),
  price: Math.max(0, Number(payload.price) || 0),
  currency: payload.currency || 'WCOIN',
  status: payload.status || 'DRAFT',
  stock: payload.stock ?? null,
  images: payload.images as Prisma.InputJsonValue | undefined,
  featured: Boolean(payload.featured),
  deliveryTarget: payload.deliveryTarget || 'ACCOUNT',
  accountLimit: payload.accountLimit ?? null,
  periodLimit: payload.periodLimit ?? null,
  periodDays: payload.periodDays ?? null,
  saleStartsAt: payload.saleStartsAt ? new Date(payload.saleStartsAt) : null,
  saleEndsAt: payload.saleEndsAt ? new Date(payload.saleEndsAt) : null,
  scheduledPublishAt: payload.scheduledPublishAt ? new Date(payload.scheduledPublishAt) : null,
  technicalCode: payload.technicalCode?.trim() || null,
  sourceOrigin: payload.sourceOrigin?.trim() || null,
  ambiguous: Boolean(payload.ambiguous),
  internalNotes: payload.internalNotes?.trim() || null,
  revisionReason: payload.revisionReason?.trim() || null,
  sortOrder: Math.max(0, Number(payload.sortOrder) || 0)
})

const rechargePackageData = (payload: RechargePackagePayload): Prisma.RechargePackageUncheckedCreateInput => ({
  key: payload.key?.trim() || `${payload.currency.toLowerCase()}-${payload.amount}`,
  currency: payload.currency,
  amount: Math.max(1, Number(payload.amount) || 1),
  bonus: Math.max(0, Number(payload.bonus) || 0),
  price: payload.price.trim(),
  highlight: Boolean(payload.highlight),
  active: payload.active ?? true
})

const mapProduct = (product: ShopProduct & { variants?: Array<Record<string, any>> }) => ({
  id: product.id,
  name: product.name,
  short: product.short,
  category: product.category,
  description: product.description,
  price: product.price,
  currency: product.currency,
  status: product.status,
  stock: product.stock,
  slug: product.slug,
  summary: product.summary,
  images: Array.isArray(product.images) ? product.images : [],
  featured: product.featured,
  deliveryTarget: product.deliveryTarget,
  accountLimit: product.accountLimit,
  periodLimit: product.periodLimit,
  periodDays: product.periodDays,
  saleStartsAt: product.saleStartsAt?.toISOString() || null,
  saleEndsAt: product.saleEndsAt?.toISOString() || null,
  variants: (product.variants || []).map((variant) => ({
    id: variant.id,
    name: variant.name,
    durationSeconds: variant.durationSeconds,
    quantity: variant.quantity,
    itemLevel: variant.itemLevel,
    options: variant.options,
    price: variant.price,
    currency: variant.currency,
    stock: variant.stock,
    available: variant.available,
    accountLimit: variant.accountLimit,
    periodLimit: variant.periodLimit,
    periodDays: variant.periodDays,
    deliveryTarget: variant.deliveryTarget
  })),
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString()
})

const mapRechargePackage = (pack: RechargePackage) => ({
  id: pack.id,
  key: pack.key,
  currency: pack.currency,
  amount: pack.amount,
  bonus: pack.bonus,
  price: pack.price,
  highlight: pack.highlight,
  active: pack.active,
  createdAt: pack.createdAt.toISOString(),
  updatedAt: pack.updatedAt.toISOString()
})

@Injectable()
export class CommerceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly webhookEvents: PaymentWebhookEventService
  ) {}

  async ensureSeeded() {
    const [productCount, packageCount] = await Promise.all([
      this.prisma.shopProduct.count(),
      this.prisma.rechargePackage.count()
    ])

    if (!productCount) {
      await Promise.all(seedProducts.map((product) =>
        this.prisma.shopProduct.upsert({
          where: { key: product.key || normalizeKey(product.name) },
          update: {},
          create: productData(product)
        })
      ))
    }

    if (!packageCount) {
      await Promise.all(seedRechargePackages.map((pack) =>
        this.prisma.rechargePackage.upsert({
          where: { key: pack.key || `${pack.currency.toLowerCase()}-${pack.amount}` },
          update: {},
          create: rechargePackageData(pack)
        })
      ))
    }
  }

  async listProducts(query: CommerceQuery, publicOnly = false) {
    await this.ensureSeeded()
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.ShopProductWhereInput = {
      ...(publicOnly
        ? {
            status: 'ACTIVE',
            deletedAt: null,
            OR: [{ saleStartsAt: null }, { saleStartsAt: { lte: new Date() } }],
            AND: [{ OR: [{ saleEndsAt: null }, { saleEndsAt: { gte: new Date() } }] }]
          }
        : { deletedAt: query.includeDeleted === 'true' ? undefined : null }),
      ...(query.status && !publicOnly ? { status: query.status } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { category: { contains: query.search } },
              { description: { contains: query.search } }
            ]
          }
        : {})
    }

    const [total, items] = await Promise.all([
      this.prisma.shopProduct.count({ where }),
      this.prisma.shopProduct.findMany({
        where,
        include: {
          variants: {
            where: publicOnly ? { available: true } : undefined,
            orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }]
          }
        },
        orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize
      })
    ])

    return {
      data: items.map(mapProduct),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async createProduct(payload: ShopProductPayload, user: AuthenticatedUser) {
    const product = await this.prisma.shopProduct.create({ data: productData(payload) })
    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.shop.product.created',
      targetType: 'ShopProduct',
      targetId: product.id,
      metadata: { key: product.key, name: product.name, currency: product.currency }
    })
    return mapProduct(product)
  }

  async updateProduct(id: string, payload: Partial<ShopProductPayload>, user: AuthenticatedUser) {
    const current = await this.prisma.shopProduct.findUnique({ where: { id } })
    if (!current) {
      throw new NotFoundException(`Product not found: ${id}`)
    }

    const product = await this.prisma.shopProduct.update({
      where: { id },
      data: {
        ...(payload.key ? { key: payload.key.trim() } : {}),
        ...(payload.slug ? { slug: payload.slug.trim() } : {}),
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.short ? { short: payload.short.trim().toUpperCase().slice(0, 8) } : {}),
        ...(payload.category ? { category: payload.category.trim() } : {}),
        ...(payload.description ? { description: payload.description.trim() } : {}),
        ...(payload.price !== undefined ? { price: Math.max(0, Number(payload.price) || 0) } : {}),
        ...(payload.currency ? { currency: payload.currency } : {}),
        ...(payload.status ? { status: payload.status as ShopProductStatus } : {}),
        ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
        ...(payload.summary !== undefined ? { summary: payload.summary?.trim() || null } : {}),
        ...(payload.images !== undefined ? { images: payload.images as Prisma.InputJsonValue } : {}),
        ...(payload.featured !== undefined ? { featured: Boolean(payload.featured) } : {}),
        ...(payload.deliveryTarget ? { deliveryTarget: payload.deliveryTarget } : {}),
        ...(payload.accountLimit !== undefined ? { accountLimit: payload.accountLimit } : {}),
        ...(payload.periodLimit !== undefined ? { periodLimit: payload.periodLimit } : {}),
        ...(payload.periodDays !== undefined ? { periodDays: payload.periodDays } : {}),
        ...(payload.saleStartsAt !== undefined ? { saleStartsAt: payload.saleStartsAt ? new Date(payload.saleStartsAt) : null } : {}),
        ...(payload.saleEndsAt !== undefined ? { saleEndsAt: payload.saleEndsAt ? new Date(payload.saleEndsAt) : null } : {}),
        ...(payload.technicalCode !== undefined ? { technicalCode: payload.technicalCode?.trim() || null } : {}),
        ...(payload.sourceOrigin !== undefined ? { sourceOrigin: payload.sourceOrigin?.trim() || null } : {}),
        ...(payload.ambiguous !== undefined ? { ambiguous: Boolean(payload.ambiguous) } : {}),
        ...(payload.internalNotes !== undefined ? { internalNotes: payload.internalNotes?.trim() || null } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: Math.max(0, Number(payload.sortOrder) || 0) } : {}),
        updatedBy: user.id,
        version: { increment: 1 }
      }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.shop.product.updated',
      targetType: 'ShopProduct',
      targetId: product.id,
      metadata: { key: product.key, name: product.name, previousStatus: current.status, nextStatus: product.status }
    })
    return mapProduct(product)
  }

  async archiveProduct(id: string, user: AuthenticatedUser) {
    const product = await this.updateProduct(id, { status: 'ARCHIVED' }, user)
    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.shop.product.archived',
      targetType: 'ShopProduct',
      targetId: product.id,
      metadata: { name: product.name }
    })
    return product
  }

  async listRechargePackages(query: CommerceQuery, publicOnly = false) {
    await this.ensureSeeded()
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.RechargePackageWhereInput = {
      ...(publicOnly ? { active: true } : {}),
      ...(query.currency ? { currency: query.currency } : {})
    }

    const [total, items] = await Promise.all([
      this.prisma.rechargePackage.count({ where }),
      this.prisma.rechargePackage.findMany({
        where,
        orderBy: [{ currency: 'asc' }, { amount: 'asc' }],
        skip,
        take: pageSize
      })
    ])

    return {
      data: items.map(mapRechargePackage),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async createRechargePackage(payload: RechargePackagePayload, user: AuthenticatedUser) {
    const pack = await this.prisma.rechargePackage.create({ data: rechargePackageData(payload) })
    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.recharge.package.created',
      targetType: 'RechargePackage',
      targetId: pack.id,
      metadata: { key: pack.key, currency: pack.currency, amount: pack.amount }
    })
    return mapRechargePackage(pack)
  }

  async updateRechargePackage(id: string, payload: Partial<RechargePackagePayload>, user: AuthenticatedUser) {
    const current = await this.prisma.rechargePackage.findUnique({ where: { id } })
    if (!current) {
      throw new NotFoundException(`Recharge package not found: ${id}`)
    }

    const pack = await this.prisma.rechargePackage.update({
      where: { id },
      data: {
        ...(payload.key ? { key: payload.key.trim() } : {}),
        ...(payload.currency ? { currency: payload.currency } : {}),
        ...(payload.amount !== undefined ? { amount: Math.max(1, Number(payload.amount) || 1) } : {}),
        ...(payload.bonus !== undefined ? { bonus: Math.max(0, Number(payload.bonus) || 0) } : {}),
        ...(payload.price ? { price: payload.price.trim() } : {}),
        ...(payload.highlight !== undefined ? { highlight: Boolean(payload.highlight) } : {}),
        ...(payload.active !== undefined ? { active: Boolean(payload.active) } : {})
      }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.recharge.package.updated',
      targetType: 'RechargePackage',
      targetId: pack.id,
      metadata: { key: pack.key, previousActive: current.active, nextActive: pack.active }
    })
    return mapRechargePackage(pack)
  }

  async disableRechargePackage(id: string, user: AuthenticatedUser) {
    return this.updateRechargePackage(id, { active: false }, user)
  }

  async createPurchaseIntent(payload: CreatePurchaseIntentPayload, user: AuthenticatedUser) {
    const now = new Date()

    // Part V/W -- enforced only once an operator has actually configured a
    // Purchase Terms version (StorePurchaseTerms via Launcher Studio). A
    // deployment/test DB that has never created one behaves exactly as
    // before this phase; once one exists, every new purchase must name the
    // currently active version -- the checkout checkbox is never trusted
    // on its own.
    const activeTerms = await this.prisma.storePurchaseTerms.findFirst({
      where: { active: true },
      orderBy: { version: 'desc' }
    })
    if (activeTerms) {
      if (payload.termsVersion !== activeTerms.version) {
        throw new BadRequestException('You must accept the current Purchase Terms before checking out')
      }
    }

    const quantity = Math.max(1, Math.min(100, Number(payload.quantity) || 1))
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: payload.productId },
      include: { variants: true }
    })
    if (
      !product ||
      product.status !== 'ACTIVE' ||
      product.deletedAt ||
      (product.saleStartsAt && product.saleStartsAt > now) ||
      (product.saleEndsAt && product.saleEndsAt < now)
    ) {
      throw new NotFoundException('Product not available')
    }

    const variant = payload.variantId
      ? product.variants.find((item) => item.id === payload.variantId && item.available)
      : product.variants.filter((item) => item.available).sort((a, b) => a.sortOrder - b.sortOrder)[0]
    if (payload.variantId && !variant) throw new BadRequestException('Selected product variant is not available')

    const unitPrice = variant?.price ?? product.price
    const currency = variant?.currency ?? product.currency
    const totalPrice = unitPrice * quantity
    const target = variant?.deliveryTarget ?? product.deliveryTarget
    const accountLimit = variant?.accountLimit ?? product.accountLimit
    const periodLimit = variant?.periodLimit ?? product.periodLimit
    const periodDays = variant?.periodDays ?? product.periodDays

    if (unitPrice <= 0) throw new BadRequestException('Product does not have a valid price')
    if (target !== 'ACCOUNT') {
      if (!payload.destinationCharacterId) throw new BadRequestException('Select the destination character')
      const character = await this.prisma.accountCharacter.findFirst({
        where: { id: payload.destinationCharacterId, accountId: user.id }
      })
      if (!character) throw new BadRequestException('Destination character does not belong to this account')
    }

    const countedStatuses: PurchaseIntentStatus[] = ['PREPARED', 'PENDING_PAYMENT', 'PAID', 'DELIVERING', 'COMPLETED']
    if (accountLimit) {
      const previous = await this.prisma.purchaseIntent.aggregate({
        where: { accountId: user.id, productId: product.id, status: { in: countedStatuses } },
        _sum: { quantity: true }
      })
      if ((previous._sum.quantity || 0) + quantity > accountLimit) {
        throw new BadRequestException('Account purchase limit exceeded')
      }
    }
    if (periodLimit && periodDays) {
      const periodStart = new Date(now.getTime() - periodDays * 86_400_000)
      const previous = await this.prisma.purchaseIntent.aggregate({
        where: { accountId: user.id, productId: product.id, status: { in: countedStatuses }, createdAt: { gte: periodStart } },
        _sum: { quantity: true }
      })
      if ((previous._sum.quantity || 0) + quantity > periodLimit) {
        throw new BadRequestException('Purchase limit for this period exceeded')
      }
    }

    const correlationId = randomUUID()
    const purchase = await this.prisma.$transaction(async (tx) => {
      // Recheck limits inside the serializable transaction so concurrent clicks
      // cannot both pass the preflight validation.
      if (accountLimit) {
        const previous = await tx.purchaseIntent.aggregate({
          where: { accountId: user.id, productId: product.id, status: { in: countedStatuses } },
          _sum: { quantity: true }
        })
        if ((previous._sum.quantity || 0) + quantity > accountLimit) {
          throw new BadRequestException('Account purchase limit exceeded')
        }
      }
      if (periodLimit && periodDays) {
        const periodStart = new Date(now.getTime() - periodDays * 86_400_000)
        const previous = await tx.purchaseIntent.aggregate({
          where: { accountId: user.id, productId: product.id, status: { in: countedStatuses }, createdAt: { gte: periodStart } },
          _sum: { quantity: true }
        })
        if ((previous._sum.quantity || 0) + quantity > periodLimit) {
          throw new BadRequestException('Purchase limit for this period exceeded')
        }
      }
      if (variant?.stock !== null && variant?.stock !== undefined) {
        const reserved = await tx.shopProductVariant.updateMany({
          where: { id: variant.id, available: true, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } }
        })
        if (!reserved.count) throw new BadRequestException('Insufficient variant stock')
      } else if (product.stock !== null) {
        const reserved = await tx.shopProduct.updateMany({
          where: { id: product.id, status: 'ACTIVE', stock: { gte: quantity } },
          data: { stock: { decrement: quantity } }
        })
        if (!reserved.count) throw new BadRequestException('Insufficient product stock')
      }

      const charged = await tx.accountCurrency.updateMany({
        where: { accountId: user.id, currency, balance: { gte: totalPrice } },
        data: { balance: { decrement: totalPrice } }
      })
      if (!charged.count) throw new BadRequestException('Insufficient balance')

      return tx.purchaseIntent.create({
        data: {
          accountId: user.id,
          productId: product.id,
          variantId: variant?.id || null,
          destinationCharacterId: payload.destinationCharacterId || null,
          quantity,
          price: totalPrice,
          currency,
          status: 'PAID',
          correlationId,
          termsVersion: activeTerms ? activeTerms.version : null,
          termsAcceptedAt: activeTerms ? now : null,
          deliveries: {
            create: {
              status: 'WAITING',
              target,
              accountId: user.id,
              characterId: payload.destinationCharacterId || null,
              itemCode: product.technicalCode,
              itemName: variant ? `${product.name} - ${variant.name}` : product.name,
              quantity: (variant?.quantity || 1) * quantity,
              correlationId: `${correlationId}:delivery`
            }
          }
        },
        include: { product: true, variant: true, account: true, deliveries: true }
      })
    }, { isolationLevel: 'Serializable' })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'shop.purchase.intent',
      targetType: 'PurchaseIntent',
      targetId: purchase.id,
      metadata: { product: product.name, variant: variant?.name, quantity, price: totalPrice, currency, correlationId }
    })
    await this.observability.recordOperationalEvent({
      module: 'store',
      eventType: 'ORDER_CREATED',
      entityType: 'PurchaseIntent',
      entityId: purchase.id,
      actorUserId: user.id,
      correlationId,
      description: `Pedido ${purchase.id} criado para ${product.name}.`,
      data: { productId: product.id, variantId: variant?.id, quantity, price: totalPrice, currency }
    })

    return this.mapPurchase(purchase)
  }

  async createRechargeIntent(payload: CreateRechargeIntentPayload, user: AuthenticatedUser) {
    this.assertRealMoneyPaymentsEnabled()
    const pack = await this.prisma.rechargePackage.findUnique({ where: { id: payload.packageId } })
    if (!pack || !pack.active) {
      throw new NotFoundException('Recharge package not available')
    }

    const recharge = await this.prisma.rechargeIntent.create({
      data: {
        accountId: user.id,
        packageId: pack.id,
        currency: pack.currency,
        amount: pack.amount,
        bonus: pack.bonus,
        price: pack.price,
        correlationId: randomUUID()
      },
      include: {
        package: true,
        account: true
      }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'recharge.payment.intent',
      targetType: 'RechargeIntent',
      targetId: recharge.id,
      correlationId: recharge.correlationId,
      metadata: { currency: pack.currency, amount: pack.amount, bonus: pack.bonus }
    })
    await this.observability.recordOperationalEvent({
      module: 'store',
      eventType: 'PAYMENT_INTENT_CREATED',
      entityType: 'RechargeIntent',
      entityId: recharge.id,
      actorUserId: user.id,
      correlationId: recharge.correlationId,
      description: `Intencao de recarga ${recharge.id} criada.`,
      data: { currency: pack.currency, amount: pack.amount, bonus: pack.bonus }
    })

    return this.mapRecharge(recharge)
  }

  // Starts (or safely re-runs) the Mercado Pago checkout for an existing
  // recharge intent. Always calls the provider with the SAME
  // paymentIdempotencyKey once one exists -- Mercado Pago itself guarantees
  // an idempotent replay returns the original order (including the Pix QR
  // code) rather than creating a duplicate charge, so a double-click or a
  // page refresh is safe without any extra short-circuit logic here.
  async createRechargeCheckout(id: string, user: AuthenticatedUser) {
    this.assertRealMoneyPaymentsEnabled()
    const recharge = await this.prisma.rechargeIntent.findUnique({ where: { id }, include: { account: true, package: true } })
    if (!recharge) {
      throw new NotFoundException(`Recharge not found: ${id}`)
    }
    if (recharge.accountId !== user.id) {
      throw new ForbiddenException('Access denied')
    }
    const payableStatuses: RechargeIntentStatus[] = ['PREPARED', 'PENDING', 'PROCESSING']
    if (!payableStatuses.includes(recharge.status)) {
      throw new BadRequestException('Esta recarga nao pode mais ser paga -- inicie uma nova.')
    }

    const externalReference = recharge.externalReference || recharge.correlationId || randomUUID()
    const paymentIdempotencyKey = recharge.paymentIdempotencyKey || externalReference
    const amountBRL = parseBrlPrice(recharge.price)

    let order: Awaited<ReturnType<PaymentProvider['createOrder']>>
    try {
      order = await this.paymentProvider.createOrder({
        correlationId: recharge.correlationId || externalReference,
        externalReference,
        idempotencyKey: paymentIdempotencyKey,
        amountBRL,
        description: `Recarga Blood Moon -- ${recharge.package.key}`,
        payerEmail: recharge.account.email
      })
    } catch (error) {
      await this.observability.recordOperationalEvent({
        module: 'store',
        eventType: 'PAYMENT_CHECKOUT_FAILED',
        entityType: 'RechargeIntent',
        entityId: recharge.id,
        actorUserId: user.id,
        correlationId: recharge.correlationId,
        description: `Falha ao criar checkout Mercado Pago para recarga ${recharge.id}.`,
        data: { error: error instanceof Error ? error.message : 'unknown' }
      })
      throw error
    }

    const mapped = mapMercadoPagoOrderStatus(order.status, order.statusDetail)
    const updated = await this.prisma.rechargeIntent.updateMany({
      where: { id, status: { in: ['PREPARED', 'PENDING', 'PROCESSING'] } },
      data: {
        externalReference,
        paymentIdempotencyKey,
        externalOrderId: order.externalOrderId,
        externalStatus: order.status,
        externalStatusDetail: order.statusDetail,
        paymentMethod: order.paymentMethod,
        status: mapped.status === 'PAID' ? recharge.status : mapped.status
      }
    })
    if (updated.count === 0) {
      throw new BadRequestException('Esta recarga ja foi processada.')
    }

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'recharge.checkout.created',
      targetType: 'RechargeIntent',
      targetId: recharge.id,
      correlationId: recharge.correlationId,
      metadata: { externalOrderId: order.externalOrderId, externalReference }
    })
    await this.observability.recordOperationalEvent({
      module: 'store',
      eventType: 'PAYMENT_ORDER_CREATED',
      entityType: 'RechargeIntent',
      entityId: recharge.id,
      actorUserId: user.id,
      correlationId: recharge.correlationId,
      description: `Order Mercado Pago ${order.externalOrderId} criada para recarga ${recharge.id}.`,
      data: { externalOrderId: order.externalOrderId }
    })

    return {
      id: recharge.id,
      status: mapped.status === 'PAID' ? recharge.status : mapped.status,
      externalOrderId: order.externalOrderId,
      paymentMethod: order.paymentMethod,
      qrCode: order.qrCode,
      qrCodeBase64: order.qrCodeBase64,
      ticketUrl: order.ticketUrl
    }
  }

  async getRechargeForAccount(id: string, user: AuthenticatedUser) {
    const recharge = await this.prisma.rechargeIntent.findUnique({ where: { id }, include: { account: true, package: true } })
    if (!recharge || recharge.accountId !== user.id) {
      throw new NotFoundException(`Recharge not found: ${id}`)
    }
    return this.mapRecharge(recharge)
  }

  private assertRealMoneyPaymentsEnabled(): void {
    if (process.env.REAL_MONEY_PAYMENTS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({
        code: 'PAYMENTS_DISABLED',
        message: 'Recargas pagas estao temporariamente indisponiveis nesta versao de avaliacao.'
      })
    }
  }

  async getRechargeDetail(id: string) {
    const recharge = await this.prisma.rechargeIntent.findUnique({
      where: { id },
      include: {
        account: true,
        package: true,
        webhookEvents: { orderBy: { receivedAt: 'desc' } }
      }
    })
    if (!recharge) {
      throw new NotFoundException(`Recharge not found: ${id}`)
    }
    return {
      ...this.mapRecharge(recharge),
      provider: recharge.provider,
      correlationId: recharge.correlationId,
      externalReference: recharge.externalReference,
      externalOrderId: recharge.externalOrderId,
      externalStatus: recharge.externalStatus,
      externalStatusDetail: recharge.externalStatusDetail,
      paymentMethod: recharge.paymentMethod,
      failureReason: recharge.failureReason,
      manualReviewReason: recharge.manualReviewReason,
      refundReason: recharge.refundReason,
      approvedAt: recharge.approvedAt?.toISOString() || null,
      refundedAt: recharge.refundedAt?.toISOString() || null,
      lastWebhookAt: recharge.lastWebhookAt?.toISOString() || null,
      timeline: recharge.webhookEvents.map((event) => ({
        id: event.id,
        topic: event.topic,
        status: event.status,
        signatureValid: event.signatureValid,
        receivedAt: event.receivedAt.toISOString(),
        processedAt: event.processedAt?.toISOString() || null,
        processingError: event.processingError
      }))
    }
  }

  // Admin "force re-sync" button -- runs the exact same reconciliation logic
  // as a real webhook, just triggered manually instead of by a notification.
  async resyncRechargeFromProvider(id: string, user: AuthenticatedUser) {
    const recharge = await this.prisma.rechargeIntent.findUnique({ where: { id } })
    if (!recharge) {
      throw new NotFoundException(`Recharge not found: ${id}`)
    }
    if (!recharge.externalOrderId) {
      throw new BadRequestException('Esta recarga ainda nao tem uma order no Mercado Pago.')
    }
    const order = await this.paymentProvider.getOrder(recharge.externalOrderId)
    return this.reconcileWithProvider(order, recharge, { source: 'admin', actorId: user.id, actorUsername: user.username })
  }

  // Mercado Pago webhook entrypoint. Signature is verified first; the
  // webhook body's own status is never trusted -- the order is always
  // re-queried directly from Mercado Pago before any state transition.
  async handleMercadoPagoWebhook(input: MercadoPagoWebhookInput) {
    const valid = this.paymentProvider.validateWebhookSignature({
      signatureHeader: input.signature,
      requestId: input.requestId,
      dataId: input.dataId
    })

    const claim = await this.webhookEvents.recordAndClaim({
      provider: 'mercadopago',
      topic: input.body?.type || 'unknown',
      eventId: input.body?.data?.id ? `${input.body.data.id}:${input.requestId || 'no-request-id'}` : randomUUID(),
      externalOrderId: input.dataId,
      signatureValid: valid,
      signatureHeader: input.signature,
      rawPayload: input.body
    })

    if (claim.outcome === 'duplicate-processed') {
      return { received: true, duplicate: true }
    }

    if (!valid) {
      await this.webhookEvents.markFailed(claim.eventId, 'invalid_signature')
      await this.observability.recordOperationalEvent({
        module: 'store',
        severity: 'CRITICAL',
        eventType: 'PAYMENT_WEBHOOK_INVALID_SIGNATURE',
        entityType: 'PaymentWebhookEvent',
        entityId: claim.eventId,
        description: 'Webhook Mercado Pago recebido com assinatura invalida.',
        data: { dataId: input.dataId }
      })
      return { received: true, valid: false }
    }

    const dataId = input.dataId || input.body?.data?.id
    if (!dataId) {
      await this.webhookEvents.markFailed(claim.eventId, 'missing_data_id')
      return { received: true }
    }

    let order: Awaited<ReturnType<PaymentProvider['getOrder']>>
    try {
      order = await this.paymentProvider.getOrder(dataId)
    } catch (error) {
      if (error instanceof NotFoundException) {
        // The order will never start existing -- retrying via a redelivery
        // would never help, so acknowledge with 200 instead of asking
        // Mercado Pago to keep retrying forever.
        await this.webhookEvents.markIgnored(claim.eventId, 'mercadopago_order_not_found')
        await this.observability.recordOperationalEvent({
          module: 'store',
          severity: 'CRITICAL',
          eventType: 'PAYMENT_WEBHOOK_ORDER_NOT_FOUND',
          entityType: 'PaymentWebhookEvent',
          entityId: claim.eventId,
          description: `Webhook Mercado Pago referencia uma order inexistente: ${dataId}.`,
          data: { dataId }
        })
        return { received: true }
      }
      // A transient failure (timeout, provider unavailable) -- worth a 5xx
      // so Mercado Pago retries the delivery later.
      await this.webhookEvents.markFailed(claim.eventId, error instanceof Error ? error.message : 'get_order_failed')
      throw error
    }

    const recharge = order.externalReference
      ? await this.prisma.rechargeIntent.findUnique({ where: { externalReference: order.externalReference } })
      : null

    if (!recharge) {
      await this.webhookEvents.markFailed(claim.eventId, 'recharge_not_found')
      await this.observability.recordOperationalEvent({
        module: 'store',
        severity: 'CRITICAL',
        eventType: 'PAYMENT_WEBHOOK_UNMATCHED_ORDER',
        entityType: 'PaymentWebhookEvent',
        entityId: claim.eventId,
        description: `Webhook Mercado Pago referencia uma order sem RechargeIntent correspondente: ${order.externalOrderId}.`,
        data: { externalOrderId: order.externalOrderId, externalReference: order.externalReference }
      })
      return { received: true }
    }

    try {
      await this.reconcileWithProvider(order, recharge, { source: 'webhook' })
      await this.webhookEvents.markProcessed(claim.eventId, recharge.id)
    } catch (error) {
      await this.webhookEvents.markFailed(claim.eventId, error instanceof Error ? error.message : 'reconcile_failed')
      throw error
    }

    return { received: true }
  }

  // Shared by the webhook path and the admin manual re-sync button. Always
  // works from an order already fetched directly from Mercado Pago -- never
  // from a webhook body's own fields.
  private async reconcileWithProvider(
    order: Awaited<ReturnType<PaymentProvider['getOrder']>>,
    recharge: RechargeIntent,
    actor: { source: 'admin' | 'webhook'; actorId?: string; actorUsername?: string }
  ) {
    if (recharge.externalOrderId && order.externalOrderId !== recharge.externalOrderId) {
      return this.transitionRechargeStatus(recharge.id, 'MANUAL_REVIEW', {
        ...actor,
        reason: 'external_order_id_mismatch',
        extra: { externalStatus: order.status, externalStatusDetail: order.statusDetail }
      })
    }

    const expectedAmount = parseBrlPrice(recharge.price)
    const amountMatches = Math.abs(order.totalAmountBRL - expectedAmount) < 0.01
    if (!amountMatches) {
      await this.observability.recordOperationalEvent({
        module: 'store',
        severity: 'CRITICAL',
        eventType: 'PAYMENT_AMOUNT_MISMATCH',
        entityType: 'RechargeIntent',
        entityId: recharge.id,
        correlationId: recharge.correlationId,
        description: `Divergencia de valor na recarga ${recharge.id}: esperado ${expectedAmount}, recebido ${order.totalAmountBRL}.`,
        data: { expected: expectedAmount, received: order.totalAmountBRL }
      })
      return this.transitionRechargeStatus(recharge.id, 'MANUAL_REVIEW', {
        ...actor,
        reason: 'amount_mismatch',
        extra: { externalStatus: order.status, externalStatusDetail: order.statusDetail }
      })
    }

    const mapped = mapMercadoPagoOrderStatus(order.status, order.statusDetail)
    return this.transitionRechargeStatus(recharge.id, mapped.status, {
      ...actor,
      reason: mapped.failureReason,
      extra: {
        paymentMethod: order.paymentMethod,
        externalStatus: order.status,
        externalStatusDetail: order.statusDetail,
        lastWebhookAt: actor.source === 'webhook' ? new Date() : undefined
      }
    })
  }

  async listPurchases() {
    const items = await this.prisma.purchaseIntent.findMany({
      include: { account: true, product: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    })
    return items.map((item) => this.mapPurchase(item))
  }

  async listPurchasesForAccount(accountId: string) {
    const items = await this.prisma.purchaseIntent.findMany({
      where: { accountId },
      include: { account: true, product: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return items.map((item) => this.mapPurchase(item))
  }

  async listRecharges() {
    const items = await this.prisma.rechargeIntent.findMany({
      include: { account: true, package: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    })
    return items.map((item) => this.mapRecharge(item))
  }

  async listRechargesForAccount(accountId: string) {
    const items = await this.prisma.rechargeIntent.findMany({
      where: { accountId },
      include: { account: true, package: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return items.map((item) => this.mapRecharge(item))
  }

  async updatePurchaseStatus(id: string, payload: UpdatePurchaseStatusPayload, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseIntent.findUnique({ where: { id }, include: { account: true, product: true } })
      if (!purchase) {
        throw new NotFoundException(`Purchase not found: ${id}`)
      }

      if (payload.status === 'COMPLETED' && purchase.status !== 'COMPLETED') {
        await this.debitCurrency(tx, purchase.account, purchase.currency, purchase.price)
      }

      if (purchase.status === 'COMPLETED' && payload.status === 'CANCELLED') {
        await this.creditCurrency(tx, purchase.accountId, purchase.currency, purchase.price)
      }

      const updated = await tx.purchaseIntent.update({
        where: { id },
        data: { status: payload.status },
        include: { account: true, product: true }
      })

      await this.audit.record({
        actorId: user.id,
        actorUsername: user.username,
        action: 'admin.finance.purchase.status',
        targetType: 'PurchaseIntent',
        targetId: id,
        metadata: { previousStatus: purchase.status, nextStatus: payload.status, username: updated.account.username }
      })
      await this.observability.recordOperationalEvent({
        module: 'store',
        eventType:
          payload.status === 'COMPLETED'
            ? 'ORDER_COMPLETED'
            : payload.status === 'CANCELLED'
              ? 'ORDER_CANCELLED'
              : 'ORDER_STATUS_CHANGED',
        entityType: 'PurchaseIntent',
        entityId: id,
        actorUserId: user.id,
        targetUserId: purchase.accountId,
        description: `Pedido ${id} alterado de ${purchase.status} para ${payload.status}.`,
        data: { previousStatus: purchase.status, nextStatus: payload.status }
      })

      return this.mapPurchase(updated)
    })
  }

  async updateRechargeStatus(id: string, payload: UpdateRechargeStatusPayload, user: AuthenticatedUser) {
    if (['CANCELLED', 'REFUNDED', 'MANUAL_REVIEW'].includes(payload.status) && !payload.reason?.trim()) {
      throw new BadRequestException('Informe um motivo para esta alteracao de status.')
    }
    return this.transitionRechargeStatus(id, payload.status, {
      source: 'admin',
      actorId: user.id,
      actorUsername: user.username,
      reason: payload.reason
    })
  }

  // Shared by the admin manual-override path (updateRechargeStatus) and the
  // webhook/resync reconciliation path (reconcileWithProvider) -- this is
  // the one place that actually credits/debits AccountCurrency for a
  // recharge, so both paths get the same double-credit guard for free.
  private async transitionRechargeStatus(
    id: string,
    nextStatus: RechargeIntentStatus,
    options: {
      source: 'admin' | 'webhook'
      actorId?: string
      actorUsername?: string
      reason?: string
      extra?: Partial<{
        externalStatus: string
        externalStatusDetail: string
        paymentMethod: string
        lastWebhookAt: Date | undefined
      }>
    }
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const recharge = await tx.rechargeIntent.findUnique({ where: { id }, include: { account: true, package: true } })
        if (!recharge) {
          throw new NotFoundException(`Recharge not found: ${id}`)
        }
        if (recharge.status === nextStatus) {
          return this.mapRecharge(recharge)
        }
        if (!rechargeTransitions[recharge.status].includes(nextStatus)) {
          throw new BadRequestException(`Transicao invalida: ${recharge.status} -> ${nextStatus}`)
        }

        const amount = recharge.amount + recharge.bonus
        let refundClawbackFailed = false

        if (nextStatus === 'PAID' && recharge.status !== 'PAID') {
          await this.creditCurrency(tx, recharge.accountId, recharge.currency, amount)
        }

        if (recharge.status === 'PAID' && nextStatus === 'CANCELLED') {
          await this.debitCurrency(tx, recharge.account, recharge.currency, amount)
        }

        if (recharge.status === 'PAID' && nextStatus === 'REFUNDED') {
          // The player may have already spent the credited WCoin in-game.
          // Never let that silently corrupt the transition -- fall back to
          // REFUND_PENDING and raise a CRITICAL alert for a human instead.
          try {
            await this.debitCurrency(tx, recharge.account, recharge.currency, amount)
          } catch {
            refundClawbackFailed = true
          }
        }

        const effectiveStatus = refundClawbackFailed ? 'REFUND_PENDING' : nextStatus
        const updated = await tx.rechargeIntent.update({
          where: { id },
          data: {
            status: effectiveStatus,
            ...options.extra,
            ...(effectiveStatus === 'PAID' ? { approvedAt: new Date() } : {}),
            ...(effectiveStatus === 'REFUNDED' ? { refundedAt: new Date() } : {}),
            ...(effectiveStatus === 'MANUAL_REVIEW' ? { manualReviewReason: options.reason } : {}),
            ...(effectiveStatus === 'REFUND_PENDING'
              ? { refundReason: refundClawbackFailed ? 'insufficient_balance_for_clawback' : options.reason }
              : {}),
            ...(effectiveStatus === 'FAILED' ? { failureReason: options.reason } : {})
          },
          include: { account: true, package: true }
        })

        const action = options.source === 'admin' ? 'admin.finance.recharge.status' : 'recharge.webhook.status'
        await this.audit.record({
          actorId: options.actorId,
          actorUsername: options.actorUsername,
          action,
          targetType: 'RechargeIntent',
          targetId: id,
          correlationId: recharge.correlationId,
          reason: options.reason,
          severity: refundClawbackFailed ? 'critical' : 'info',
          metadata: { previousStatus: recharge.status, nextStatus: effectiveStatus, username: updated.account.username }
        })
        await this.observability.recordOperationalEvent({
          module: 'store',
          severity: refundClawbackFailed ? 'CRITICAL' : undefined,
          eventType: refundClawbackFailed
            ? 'PAYMENT_REFUND_CLAWBACK_FAILED'
            : effectiveStatus === 'PAID'
              ? 'PAYMENT_CONFIRMED'
              : effectiveStatus === 'CANCELLED'
                ? 'PAYMENT_CANCELLED'
                : effectiveStatus === 'REFUNDED'
                  ? 'PAYMENT_REFUNDED'
                  : 'PAYMENT_STATUS_CHANGED',
          entityType: 'RechargeIntent',
          entityId: id,
          actorUserId: options.actorId,
          targetUserId: recharge.accountId,
          correlationId: recharge.correlationId,
          description: `Recarga ${id} alterada de ${recharge.status} para ${effectiveStatus}.`,
          data: { previousStatus: recharge.status, nextStatus: effectiveStatus, amount }
        })

        return this.mapRecharge(updated)
      },
      { isolationLevel: 'Serializable' }
    )
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
      throw new BadRequestException('Saldo insuficiente para concluir a operacao.')
    }
    await tx.accountCurrency.update({
      where: { accountId_currency: { accountId: account.id, currency } },
      data: { balance: { decrement: amount } }
    })
  }

  private mapPurchase(item: Prisma.PurchaseIntentGetPayload<{ include: { account: true, product: true } }>) {
    return {
      id: item.id,
      username: item.account.username,
      productId: item.productId,
      productName: item.product.name,
      price: item.price,
      currency: item.currency,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }
  }

  private mapRecharge(item: Prisma.RechargeIntentGetPayload<{ include: { account: true, package: true } }>) {
    return {
      id: item.id,
      username: item.account.username,
      packageId: item.packageId,
      currency: item.currency,
      amount: item.amount,
      bonus: item.bonus,
      price: item.price,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }
  }
}
