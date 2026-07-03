import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  Account,
  CurrencyCode,
  Prisma,
  PurchaseIntentStatus,
  RechargeIntentStatus,
  RechargePackage,
  ShopProduct,
  ShopProductStatus
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  CommerceQuery,
  CreatePurchaseIntentPayload,
  CreateRechargeIntentPayload,
  RechargePackagePayload,
  ShopProductPayload,
  UpdatePurchaseStatusPayload,
  UpdateRechargeStatusPayload
} from './commerce.contract'

const defaultPageSize = 50
const maxPageSize = 100

const seedProducts: ShopProductPayload[] = [
  {
    key: 'vip-bronze',
    name: 'Pacote VIP Bronze',
    short: 'VIP',
    category: 'VIP',
    description: 'Beneficios iniciais para evolucao e conforto.',
    price: 350,
    currency: 'WCOIN',
    status: 'ACTIVE',
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
    status: 'ACTIVE',
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
    status: 'ACTIVE',
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
  name: payload.name.trim(),
  short: payload.short.trim().toUpperCase().slice(0, 8),
  category: payload.category.trim(),
  description: payload.description.trim(),
  price: Math.max(0, Number(payload.price) || 0),
  currency: payload.currency,
  status: payload.status || 'ACTIVE',
  stock: payload.stock ?? null
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

const mapProduct = (product: ShopProduct) => ({
  id: product.id,
  key: product.key,
  name: product.name,
  short: product.short,
  category: product.category,
  description: product.description,
  price: product.price,
  currency: product.currency,
  status: product.status,
  stock: product.stock,
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
    private readonly audit: AuditService
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
      ...(publicOnly ? { status: 'ACTIVE' } : {}),
      ...(query.status && !publicOnly ? { status: query.status } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [total, items] = await Promise.all([
      this.prisma.shopProduct.count({ where }),
      this.prisma.shopProduct.findMany({
        where,
        orderBy: [{ status: 'asc' }, { category: 'asc' }, { name: 'asc' }],
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
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.short ? { short: payload.short.trim().toUpperCase().slice(0, 8) } : {}),
        ...(payload.category ? { category: payload.category.trim() } : {}),
        ...(payload.description ? { description: payload.description.trim() } : {}),
        ...(payload.price !== undefined ? { price: Math.max(0, Number(payload.price) || 0) } : {}),
        ...(payload.currency ? { currency: payload.currency } : {}),
        ...(payload.status ? { status: payload.status as ShopProductStatus } : {}),
        ...(payload.stock !== undefined ? { stock: payload.stock } : {})
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
      metadata: { key: product.key, name: product.name }
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
    const product = await this.prisma.shopProduct.findUnique({ where: { id: payload.productId } })
    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundException('Product not available')
    }

    const purchase = await this.prisma.purchaseIntent.create({
      data: {
        accountId: user.id,
        productId: product.id,
        price: product.price,
        currency: product.currency
      },
      include: {
        product: true,
        account: true
      }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'shop.purchase.intent',
      targetType: 'PurchaseIntent',
      targetId: purchase.id,
      metadata: { product: product.name, price: product.price, currency: product.currency }
    })

    return this.mapPurchase(purchase)
  }

  async createRechargeIntent(payload: CreateRechargeIntentPayload, user: AuthenticatedUser) {
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
        price: pack.price
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
      metadata: { currency: pack.currency, amount: pack.amount, bonus: pack.bonus }
    })

    return this.mapRecharge(recharge)
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

      return this.mapPurchase(updated)
    })
  }

  async updateRechargeStatus(id: string, payload: UpdateRechargeStatusPayload, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const recharge = await tx.rechargeIntent.findUnique({ where: { id }, include: { account: true, package: true } })
      if (!recharge) {
        throw new NotFoundException(`Recharge not found: ${id}`)
      }

      const amount = recharge.amount + recharge.bonus
      if (payload.status === 'PAID' && recharge.status !== 'PAID') {
        await this.creditCurrency(tx, recharge.accountId, recharge.currency, amount)
      }

      if (recharge.status === 'PAID' && payload.status === 'CANCELLED') {
        await this.debitCurrency(tx, recharge.account, recharge.currency, amount)
      }

      const updated = await tx.rechargeIntent.update({
        where: { id },
        data: { status: payload.status },
        include: { account: true, package: true }
      })

      await this.audit.record({
        actorId: user.id,
        actorUsername: user.username,
        action: 'admin.finance.recharge.status',
        targetType: 'RechargeIntent',
        targetId: id,
        metadata: { previousStatus: recharge.status, nextStatus: payload.status, username: updated.account.username }
      })

      return this.mapRecharge(updated)
    })
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
