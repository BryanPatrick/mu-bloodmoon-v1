import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import type {
  Prisma,
  PurchaseIntentStatus,
  RechargeIntent,
  RechargeIntentStatus,
  RechargePackage,
  ShopProduct,
  ShopProductStatus
} from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { Logger } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider.interface'
import { PaymentWebhookEventService } from '../payments/payment-webhook-event.service'
import { AsaasPaymentProvider } from '../payments/asaas.provider'
import { BillingProfileService } from '../payments/billing-profile.service'
import { assertAsaasCreationEnabled, loadAsaasConfig } from '../payments/asaas.config'
import { mapAsaasPaymentStatus } from '../payments/asaas.status-map'
import { UnauthorizedException } from '@nestjs/common'
import { mapMercadoPagoOrderStatus } from '../payments/mercadopago.status-map'
import { WalletLedgerService } from '../wallet/wallet-ledger.service'
import { ChargebackCaseService } from './chargeback-case.service'
import { PaymentRiskService } from './payment-risk.service'
import type {
  CommerceQuery,
  CreatePurchaseIntentPayload,
  CreateRechargeIntentPayload,
  MercadoPagoWebhookInput,
  AsaasWebhookInput,
  RechargePackagePayload,
  ShopProductPayload,
  UpdatePurchaseStatusPayload,
  UpdateRechargeStatusPayload
} from './commerce.contract'

const rechargeTransitions: Record<RechargeIntentStatus, RechargeIntentStatus[]> = {
  PREPARED: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'MANUAL_REVIEW'],
  PENDING: ['PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'MANUAL_REVIEW'],
  PROCESSING: ['PAID', 'FAILED', 'CANCELLED', 'MANUAL_REVIEW'],
  // PHASE P (2026-08-31): a real bug this phase's own testing surfaced --
  // PAID -> MANUAL_REVIEW was missing, which structurally blocked the
  // ONE realistic chargeback scenario (Mercado Pago reports
  // status=charged_back on an order well AFTER the original approval
  // webhook already moved this recharge to PAID). Without this,
  // reconcileWithProvider's own mapMercadoPagoOrderStatus('charged_back')
  // -> transitionRechargeStatus(..., 'MANUAL_REVIEW') call would have
  // thrown "Transicao invalida: PAID -> MANUAL_REVIEW" for every real
  // chargeback, silently preventing ChargebackCaseService from ever
  // running. Deliberately NOT paired with a clawback in this branch (see
  // the transaction body below) -- WC stays exactly where it is while a
  // human reviews the case; an explicit REFUNDED transition (which
  // already claws back, with the REFUND_PENDING fallback) is a separate,
  // deliberate later decision, matching "no automatic clawback."
  PAID: ['REFUND_PENDING', 'REFUNDED', 'CANCELLED', 'MANUAL_REVIEW'],
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

// The legacy parser above accepts both separators ambiguously. Asaas PIX
// accepts only an unambiguous whole-BRL representation ("10"/"10,00").
function asaasWholeBrl(price: string): number | null {
  const match = /^([1-9]\d*)(?:,00)?$/.exec(price.trim())
  if (!match) return null
  const amount = Number(match[1])
  return Number.isSafeInteger(amount) ? amount : null
}

// ADR-0008: WCoin pegged 1:1 with R$ -- the universal Blood Moon
// commercial peg. wcoinBaseForBrl() is the single place that rate is
// expressed in code -- every WCOIN RechargePackage's base `amount` must
// equal this, computed from its own `price`, never hand-typed
// separately (a real historical incident sold 500 WC for R$19,90, ~25x
// off this peg, because the amount and price were independently
// hand-authored and silently drifted).
export const WCOIN_TO_BRL_RATE = 1
export function wcoinBaseForBrl(priceBrl: string): number {
  return Math.round(parseBrlPrice(priceBrl) * WCOIN_TO_BRL_RATE)
}

// Re-validated on every create AND update (using the EFFECTIVE
// currency/amount/price -- current values merged with whatever the
// payload actually changes), not just at creation -- so changing only
// `bonus` or `active` on an existing WCOIN package still re-proves the
// base amount still matches its price, and a currency/amount/price
// edit can never drift the peg even partially. Deliberately rejects
// non-integer BRL prices for WCOIN packages too (Option A of three
// alternatives, see docs/open-questions.md OQ-022) -- a reversible,
// conservative default, not a final product decision on fractional
// pricing. Only applies to currency === 'WCOIN'; GOBLIN_POINT/HUNT_POINT
// packages have no peg rule and are unaffected.
function assertWcoinPackageInvariant(currency: string, amount: number, price: string) {
  if (currency !== 'WCOIN') return
  const priceBrl = parseBrlPrice(price)
  if (!Number.isInteger(priceBrl)) {
    throw new BadRequestException(`Pacotes WCOIN devem ter preco em reais inteiros (recebido: R$${priceBrl}). Ver docs/open-questions.md OQ-022 para a decisao de politica pendente sobre precos fracionados.`)
  }
  const expectedAmount = wcoinBaseForBrl(price)
  if (amount !== expectedAmount) {
    throw new BadRequestException(`Pacote WCOIN fora do peg 1:1: preco R$${priceBrl} deveria conceder ${expectedAmount} WC base, recebido ${amount}.`)
  }
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

export const seedRechargePackages: RechargePackagePayload[] = [
  // PHASE N (2026-08-31): the previous seed data here (wcoin-500/1200/
  // 2600/5500) hand-typed its `amount` independently of `price` and
  // drifted ~25x off the 1:1 peg (500 WC for R$19,90) -- the exact real
  // incident assertWcoinPackageInvariant above exists to prevent from
  // recurring. Replaced with these peg-correct values (computed via
  // wcoinBaseForBrl, never hand-typed) to actually satisfy the guard;
  // this is Bryan's own already-resolved Phase N decision, not a new
  // price-point choice made here.
  { key: 'wcoin-10', currency: 'WCOIN', amount: wcoinBaseForBrl('10,00'), bonus: 0, price: '10,00' },
  { key: 'wcoin-20', currency: 'WCOIN', amount: wcoinBaseForBrl('20,00'), bonus: 0, price: '20,00' },
  { key: 'wcoin-50', currency: 'WCOIN', amount: wcoinBaseForBrl('50,00'), bonus: 5, price: '50,00', highlight: true },
  { key: 'wcoin-100', currency: 'WCOIN', amount: wcoinBaseForBrl('100,00'), bonus: 0, price: '100,00' },
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
  private readonly logger = new Logger(CommerceService.name)
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly webhookEvents: PaymentWebhookEventService,
    private readonly walletLedger: WalletLedgerService,
    private readonly paymentRisk: PaymentRiskService,
    private readonly chargebackCase: ChargebackCaseService,
    private readonly asaas: AsaasPaymentProvider,
    private readonly billingProfile: BillingProfileService
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
    assertWcoinPackageInvariant(payload.currency, Math.max(1, Number(payload.amount) || 1), payload.price)
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

    const effectiveCurrency = payload.currency ?? current.currency
    const effectiveAmount = payload.amount !== undefined ? Math.max(1, Number(payload.amount) || 1) : current.amount
    const effectivePrice = payload.price ? payload.price.trim() : current.price
    assertWcoinPackageInvariant(effectiveCurrency, effectiveAmount, effectivePrice)

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
    // PHASE Q (2026-08-31), Part 5 -- ACCOUNT_RESTRICTION covers store
    // purchases too (commercial action), never login/game access.
    await this.paymentRisk.assertNoActiveAccountRestriction(user.id, 'criacao de compra na loja')

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

      // Buying FROM the platform, not another player -- STORE_PURCHASE,
      // never P2P-taxed.
      await this.walletLedger.debit(tx, user.id, currency, totalPrice, {
        idempotencyKey: `store-purchase-debit:${correlationId}`,
        type: 'STORE_PURCHASE',
        sourceType: 'PurchaseIntent',
        metadata: { productId: product.id, variantId: variant?.id || null, quantity }
      })

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
    const asaasConfig = loadAsaasConfig()
    const asaasSelected = asaasConfig.enabled
    if (asaasSelected) {
      this.logger.log('ASAAS_CREATE_ATTEMPT stage=intent')
      try { assertAsaasCreationEnabled() }
      catch (error) {
        this.logger.warn('ASAAS_CREATE_BLOCKED stage=intent')
        throw error
      }
    } else this.assertRealMoneyPaymentsEnabled()
    const pack = await this.prisma.rechargePackage.findUnique({ where: { id: payload.packageId } })
    if (!pack || !pack.active) {
      throw new NotFoundException('Recharge package not available')
    }
    if (asaasSelected && (pack.currency !== 'WCOIN' || pack.bonus !== 0 ||
      asaasWholeBrl(pack.price) === null || pack.amount !== asaasWholeBrl(pack.price))) {
      throw new BadRequestException('Pacote incompativel com a regra Asaas: R$1 = 1 WC, sem bonus.')
    }

    const recharge = await this.prisma.rechargeIntent.create({
      data: {
        accountId: user.id,
        packageId: pack.id,
        currency: pack.currency,
        amount: pack.amount,
        bonus: pack.bonus,
        price: pack.price,
        provider: asaasSelected ? 'asaas' : 'mercadopago',
        providerEnvironment: asaasSelected ? asaasConfig.environment : 'production',
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
    // PHASE P/Q (2026-08-31): the real enforcement point for
    // PAYMENT_RESTRICTION and ACCOUNT_RESTRICTION -- see
    // payment-risk.service.ts's own header comment. Checked before any
    // provider call, never inside the webhook/reconciliation paths (those
    // only ever move an ALREADY-created order forward, never start a new
    // charge).
    await this.paymentRisk.assertNoActivePaymentRestriction(user.id)
    await this.paymentRisk.assertNoActiveAccountRestriction(user.id, 'criacao de checkout de recarga')
    const recharge = await this.prisma.rechargeIntent.findUnique({ where: { id }, include: { account: true, package: true } })
    if (!recharge) {
      throw new NotFoundException(`Recharge not found: ${id}`)
    }
    if (recharge.accountId !== user.id) {
      throw new ForbiddenException('Access denied')
    }
    if (recharge.provider === 'asaas') {
      this.logger.log('ASAAS_CREATE_ATTEMPT stage=checkout')
      try { assertAsaasCreationEnabled() }
      catch (error) {
        this.logger.warn('ASAAS_CREATE_BLOCKED stage=checkout')
        throw error
      }
      return this.createAsaasCheckout(recharge)
    }
    if (loadAsaasConfig().enabled) {
      throw new ServiceUnavailableException('MERCADO_PAGO_CHECKOUT_DISABLED_WHILE_ASAAS_SELECTED')
    }
    this.assertRealMoneyPaymentsEnabled()
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

  private async createAsaasCheckout(
    recharge: RechargeIntent & { account: { email: string }; package: { key: string } }
  ) {
    const asaasConfig = assertAsaasCreationEnabled()
    const amountBRL = asaasWholeBrl(recharge.price)
    if (recharge.providerEnvironment !== asaasConfig.environment || recharge.currency !== 'WCOIN' ||
      recharge.bonus !== 0 || amountBRL === null || recharge.amount !== amountBRL) {
      throw new BadRequestException('Recarga Asaas fora do contrato 1 WC = R$1, sem bonus.')
    }
    if (!(['PREPARED', 'PENDING', 'PROCESSING'] as RechargeIntentStatus[]).includes(recharge.status)) {
      throw new BadRequestException('Esta recarga nao pode mais ser paga.')
    }
    const reference = recharge.externalReference || recharge.correlationId || recharge.id
    const customerId = await this.billingProfile.ensureAsaasCustomer(recharge.accountId)
    const mapping = await this.prisma.providerCustomer.findUniqueOrThrow({
      where: { accountId_provider_environment: { accountId: recharge.accountId, provider: 'asaas', environment: asaasConfig.environment } }
    })
    if (mapping.providerCustomerId !== customerId) throw new ServiceUnavailableException('ASAAS_CUSTOMER_MAPPING_MISMATCH')

    if (recharge.externalOrderId) {
      const order = await this.asaas.getOrder(recharge.externalOrderId)
      this.assertAsaasOrderMatches(order, recharge, customerId, reference)
      const checkout = await this.asaas.getCheckout(order.externalOrderId)
      return { ...checkout, id: recharge.id, status: recharge.status }
    }

    if (recharge.providerCreateState !== 'NONE') {
      if (recharge.providerCreateState === 'RESERVED' && Date.now() - recharge.updatedAt.getTime() < 30_000) {
        throw new ServiceUnavailableException('ASAAS_PAYMENT_CREATION_IN_PROGRESS')
      }
      const recovered = await this.asaas.findPaymentByExternalReference(reference)
      if (!recovered) {
        await this.prisma.rechargeIntent.updateMany({
          where: { id: recharge.id, externalOrderId: null }, data: { providerCreateState: 'RECONCILE_REQUIRED' }
        })
        this.logger.warn('ASAAS_RECONCILE_REQUIRED source=checkout_recovery')
        throw new ServiceUnavailableException('ASAAS_PAYMENT_RECONCILE_REQUIRED')
      }
      this.assertAsaasOrderMatches(recovered, recharge, customerId, reference)
      await this.prisma.rechargeIntent.updateMany({
        where: { id: recharge.id, externalOrderId: null },
        data: { externalOrderId: recovered.externalOrderId, providerCreateState: 'CREATED', externalStatus: recovered.status, paymentMethod: 'PIX' }
      })
      const checkout = await this.asaas.getCheckout(recovered.externalOrderId)
      return { ...checkout, id: recharge.id, status: recharge.status }
    }

    const reserved = await this.prisma.rechargeIntent.updateMany({
      where: { id: recharge.id, provider: 'asaas', providerEnvironment: asaasConfig.environment, providerCreateState: 'NONE', externalOrderId: null },
      data: { providerCreateState: 'RESERVED', externalReference: reference }
    })
    if (reserved.count !== 1) throw new ServiceUnavailableException('ASAAS_PAYMENT_CREATION_IN_PROGRESS')

    try {
      const order = await this.asaas.createOrder({
        correlationId: recharge.correlationId || reference, externalReference: reference,
        idempotencyKey: reference, amountBRL: amountBRL!,
        description: `Recarga Blood Moon -- ${recharge.package.key}`,
        payerEmail: recharge.account.email, payerCustomerId: customerId
      })
      const verified = await this.asaas.getOrder(order.externalOrderId)
      if (verified.externalOrderId !== order.externalOrderId) {
        throw new ServiceUnavailableException('ASAAS_PAYMENT_RESPONSE_MISMATCH')
      }
      this.assertAsaasOrderMatches(verified, recharge, customerId, reference)
      const saved = await this.prisma.rechargeIntent.updateMany({
        where: { id: recharge.id, providerCreateState: 'RESERVED', externalOrderId: null },
        data: { externalOrderId: order.externalOrderId, providerCreateState: 'CREATED',
          externalStatus: verified.status, paymentMethod: 'PIX', status: 'PENDING' }
      })
      if (saved.count !== 1) throw new ServiceUnavailableException('ASAAS_PAYMENT_SAVE_CONFLICT')
      this.logger.log('ASAAS_CREATE_SUCCEEDED stage=checkout')
      return { ...order, id: recharge.id, status: 'PENDING' }
    } catch {
      await this.prisma.rechargeIntent.updateMany({
        where: { id: recharge.id, providerCreateState: 'RESERVED', externalOrderId: null },
        data: { providerCreateState: 'RECONCILE_REQUIRED' }
      })
      this.logger.warn('ASAAS_RECONCILE_REQUIRED source=checkout_failure')
      throw new ServiceUnavailableException('ASAAS_PAYMENT_RECONCILE_REQUIRED')
    }
  }

  private assertAsaasOrderMatches(
    order: Awaited<ReturnType<AsaasPaymentProvider['getOrder']>>,
    recharge: RechargeIntent,
    customerId: string,
    reference: string
  ) {
    if ((recharge.externalOrderId && recharge.externalOrderId !== order.externalOrderId) ||
      order.externalReference !== reference || order.providerCustomerId !== customerId ||
      order.totalAmountBRL !== asaasWholeBrl(recharge.price) || order.paymentMethod !== 'PIX') {
      throw new ServiceUnavailableException('ASAAS_PAYMENT_RECONCILE_REQUIRED')
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
    if (process.env.REAL_MONEY_PAYMENTS_ENABLED !== 'true' || process.env.MERCADO_PAGO_ENABLED !== 'true') {
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
    if (recharge.provider === 'asaas') {
      if (!loadAsaasConfig().reconciliationEnabled) throw new ServiceUnavailableException('ASAAS_RECONCILIATION_DISABLED')
      let order: Awaited<ReturnType<AsaasPaymentProvider['getOrder']>> | null
      if (recharge.externalOrderId) {
        order = await this.asaas.getOrder(recharge.externalOrderId)
      } else {
        if (recharge.providerCreateState !== 'RECONCILE_REQUIRED' || !recharge.externalReference)
          throw new BadRequestException('Recarga Asaas sem referencia recuperavel.')
        order = await this.asaas.findPaymentByExternalReference(recharge.externalReference)
        if (!order) throw new ServiceUnavailableException('ASAAS_PAYMENT_RECONCILE_REQUIRED')
      }
      return this.reconcileAsaasOrder(order, recharge, 'admin', true, undefined, user)
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
  // PHASE P (2026-08-31), Part 13 -- the thin entry point
  // PaymentReconciliationService.pollProviderForStuckPayments() calls per
  // candidate. Reuses the exact same reconcileWithProvider ->
  // transitionRechargeStatus idempotent path a real webhook or the
  // manual admin resync already goes through -- a 'system-poll' source
  // keeps its own audit trail distinguishable, never a new code path.
  async reconcileFromProviderPoll(id: string) {
    const recharge = await this.prisma.rechargeIntent.findUnique({ where: { id } })
    if (!recharge || !recharge.externalOrderId) return null
    if (recharge.provider === 'asaas') {
      if (!loadAsaasConfig().reconciliationEnabled) throw new ServiceUnavailableException('ASAAS_RECONCILIATION_DISABLED')
      const order = await this.asaas.getOrder(recharge.externalOrderId)
      return this.reconcileAsaasOrder(order, recharge, 'system-poll')
    }
    const order = await this.paymentProvider.getOrder(recharge.externalOrderId)
    return this.reconcileWithProvider(order, recharge, { source: 'system-poll' })
  }

  async handleAsaasWebhook(input: AsaasWebhookInput) {
    if (!loadAsaasConfig().enabled || !loadAsaasConfig().webhookProcessingEnabled)
      throw new ServiceUnavailableException('ASAAS_WEBHOOK_PROCESSING_DISABLED')
    if (!this.asaas.validateWebhookSignature({ signatureHeader: input.token, requestId: undefined, dataId: undefined })) {
      this.logger.warn('ASAAS_WEBHOOK_AUTH_REJECTED')
      throw new UnauthorizedException('Webhook nao autorizado.')
    }
    const eventId = input.body?.id
    const topic = input.body?.event
    const paymentId = input.body?.payment?.id
    if (!eventId || !topic || !paymentId || eventId.length > 190 || topic.length > 80 || paymentId.length > 190) {
      throw new BadRequestException('Evento Asaas invalido.')
    }
    const claim = await this.webhookEvents.recordAndClaim({
      provider: 'asaas', topic, eventId, externalOrderId: paymentId,
      signatureValid: true, rawPayload: { id: eventId, event: topic, payment: { id: paymentId } }
      // Never pass asaas-access-token as signatureHeader: it is a secret.
    })
    this.logger.log('ASAAS_WEBHOOK_ACCEPTED')
    if (claim.outcome === 'duplicate-processed') return { received: true, duplicate: true }
    const recognized = new Set([
      'PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED',
      'PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUND_IN_PROGRESS',
      'PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED',
      'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE',
      'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
    ])
    if (!recognized.has(topic)) {
      await this.webhookEvents.markIgnored(claim.eventId, 'unknown_asaas_event')
      return { received: true, ignored: true }
    }
    try {
      const order = await this.asaas.getOrder(paymentId)
      if (order.externalOrderId !== paymentId) {
        await this.webhookEvents.markIgnored(claim.eventId, 'provider_payment_id_mismatch')
        await this.observability.recordOperationalEvent({
          module: 'store', severity: 'CRITICAL', eventType: 'ASAAS_PAYMENT_ID_MISMATCH',
          entityType: 'PaymentWebhookEvent', entityId: claim.eventId,
          description: 'Webhook Asaas divergiu do ID retornado na consulta ao provedor.',
          data: { eventId, paymentId }
        })
        return { received: true, ignored: true }
      }
      const recharge = order.externalReference
        ? await this.prisma.rechargeIntent.findUnique({ where: { externalReference: order.externalReference } })
        : null
      if (!recharge || recharge.provider !== 'asaas' || recharge.providerEnvironment !== loadAsaasConfig().environment) {
        await this.webhookEvents.markIgnored(claim.eventId, 'unmatched_asaas_payment')
        await this.observability.recordOperationalEvent({
          module: 'store', severity: 'CRITICAL', eventType: 'ASAAS_UNMATCHED_PAYMENT',
          entityType: 'PaymentWebhookEvent', entityId: claim.eventId,
          description: 'Pagamento Asaas sem recarga sandbox correspondente.',
          data: { eventId, paymentId }
        })
        return { received: true, ignored: true }
      }
      await this.reconcileAsaasOrder(order, recharge, 'webhook', topic === 'PAYMENT_RECEIVED', topic)
      await this.webhookEvents.markProcessed(claim.eventId, recharge.id)
      return { received: true }
    } catch (error) {
      await this.webhookEvents.markFailed(claim.eventId, 'asaas_reconcile_failed')
      this.logger.error('ASAAS_WEBHOOK_PROCESSING_FAILED')
      throw error
    }
  }

  private async reconcileAsaasOrder(
    order: Awaited<ReturnType<AsaasPaymentProvider['getOrder']>>,
    recharge: RechargeIntent,
    source: 'admin' | 'webhook' | 'system-poll',
    allowAutomaticCredit = true,
    eventType?: string,
    actor?: AuthenticatedUser
  ) {
    const asaasEnvironment = loadAsaasConfig().environment
    if (recharge.provider !== 'asaas' || recharge.providerEnvironment !== asaasEnvironment) {
      throw new ServiceUnavailableException('ASAAS_PROVIDER_ENVIRONMENT_MISMATCH')
    }
    const mapping = await this.prisma.providerCustomer.findUnique({
      where: { accountId_provider_environment: { accountId: recharge.accountId, provider: 'asaas', environment: asaasEnvironment } }
    })
    const mismatch = !order.externalReference || order.externalReference !== recharge.externalReference ||
      !mapping?.providerCustomerId || order.providerCustomerId !== mapping.providerCustomerId ||
      (recharge.externalOrderId && recharge.externalOrderId !== order.externalOrderId) ||
      order.paymentMethod !== 'PIX' || recharge.currency !== 'WCOIN' || recharge.bonus !== 0 ||
      asaasWholeBrl(recharge.price) === null ||
      recharge.amount !== asaasWholeBrl(recharge.price) ||
      order.totalAmountBRL !== asaasWholeBrl(recharge.price)
    if (mismatch) {
      return this.transitionRechargeStatus(recharge.id, 'MANUAL_REVIEW', {
        source, actorId: actor?.id, actorUsername: actor?.username,
        reason: 'asaas_payment_contract_mismatch'
      })
    }
    if (!recharge.externalOrderId) {
      await this.prisma.rechargeIntent.updateMany({
        where: { id: recharge.id, externalOrderId: null },
        data: { externalOrderId: order.externalOrderId, providerCreateState: 'CREATED' }
      })
    }
    const mapped = mapAsaasPaymentStatus(order.status)
    if (eventType?.startsWith('PAYMENT_REFUND') || eventType === 'PAYMENT_PARTIALLY_REFUNDED') {
      mapped.status = 'MANUAL_REVIEW'
      mapped.reason = 'asaas_refund_review'
    }
    if (eventType?.startsWith('PAYMENT_CHARGEBACK') || eventType === 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL') {
      mapped.status = 'MANUAL_REVIEW'
      mapped.reason = `charged_back:asaas:${eventType.toLowerCase()}`
    }
    if (!allowAutomaticCredit && mapped.status === 'PAID') mapped.status = 'PROCESSING'
    if (recharge.status === 'PAID' && ['PENDING', 'PROCESSING'].includes(mapped.status)) {
      return this.transitionRechargeStatus(recharge.id, recharge.status, { source })
    }
    if (recharge.status === 'MANUAL_REVIEW' && ['PENDING', 'PROCESSING'].includes(mapped.status)) {
      return this.transitionRechargeStatus(recharge.id, recharge.status, { source })
    }
    return this.transitionRechargeStatus(recharge.id, mapped.status, {
      source, actorId: actor?.id, actorUsername: actor?.username, reason: mapped.reason,
      extra: { externalStatus: order.status, paymentMethod: order.paymentMethod, lastWebhookAt: source === 'webhook' ? new Date() : undefined }
    })
  }

  // Read-only wrapper around WalletLedgerService.traceChargebackDispersal --
  // the admin "Rastrear dispersao" UI action and ChargebackCaseService's
  // own snapshot-at-open-time both go through the same tracer.
  async getChargebackDispersalTrace(rechargeIntentId: string) {
    const recharge = await this.prisma.rechargeIntent.findUnique({ where: { id: rechargeIntentId } })
    if (!recharge) {
      throw new NotFoundException(`Recharge not found: ${rechargeIntentId}`)
    }
    return this.walletLedger.traceChargebackDispersal(rechargeIntentId)
  }

  private async reconcileWithProvider(
    order: Awaited<ReturnType<PaymentProvider['getOrder']>>,
    recharge: RechargeIntent,
    actor: { source: 'admin' | 'webhook' | 'system-poll'; actorId?: string; actorUsername?: string }
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
        await this.walletLedger.debit(tx, purchase.accountId, purchase.currency, purchase.price, {
          idempotencyKey: `admin-purchase-complete-debit:${purchase.id}`,
          type: 'ADMIN_ADJUSTMENT',
          sourceType: 'PurchaseIntent',
          sourceId: purchase.id,
          metadata: { actorId: user.id, actorUsername: user.username, previousStatus: purchase.status }
        })
      }

      if (purchase.status === 'COMPLETED' && payload.status === 'CANCELLED') {
        await this.walletLedger.credit(tx, purchase.accountId, purchase.currency, purchase.price, {
          idempotencyKey: `admin-purchase-cancel-credit:${purchase.id}`,
          type: 'ADMIN_ADJUSTMENT',
          sourceType: 'PurchaseIntent',
          sourceId: purchase.id,
          metadata: { actorId: user.id, actorUsername: user.username, previousStatus: purchase.status }
        })
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
    const target = await this.prisma.rechargeIntent.findUnique({ where: { id }, select: { provider: true } })
    if (target?.provider === 'asaas' && payload.status !== 'MANUAL_REVIEW') {
      throw new ServiceUnavailableException('ASAAS_ADMIN_FINANCIAL_OVERRIDE_DISABLED')
    }
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
      source: 'admin' | 'webhook' | 'system-poll'
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
    // PHASE P (2026-08-31): captured inside the transaction below, then
    // used to fire risk/chargeback hooks AFTER it commits -- these are
    // advisory (never allowed to affect the financial transaction's own
    // atomicity or roll it back), so they deliberately run outside it.
    let hook: { kind: 'PAID' | 'FAILED' | 'MANUAL_REVIEW'; recharge: { id: string; accountId: string; price: string; createdAt: Date }; reason?: string } | null = null
    let asaasCommittedTransition: 'PAID' | 'MANUAL_REVIEW' | null = null

    const result = await this.prisma.$transaction(
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
          // The real-money -> WC provenance link (Part E/F traceability):
          // this ledger row's paymentProvenanceRef is the RechargeIntent
          // itself, answering "which payment created this WC credit?"
          // directly from the ledger, not by cross-referencing tables.
          try {
            await this.walletLedger.credit(tx, recharge.accountId, recharge.currency, amount, {
              idempotencyKey: `recharge-credit:${recharge.id}`,
              type: 'WC_PURCHASE_CREDIT',
              sourceType: 'RechargeIntent',
              sourceId: recharge.id,
              paymentProvenanceRef: recharge.id,
              // LEDGER_PROVENANCE: the credit's own row is self-describing
              // (base/bonus/gross/provider), not just reconstructable via a
              // join back to RechargeIntent.
              metadata: { baseAmount: recharge.amount, bonusAmount: recharge.bonus, grossPaidBRL: recharge.price, provider: recharge.provider }
            })
          } catch (error) {
            if (recharge.provider === 'asaas') this.logger.error('ASAAS_WALLET_CREDIT_FAILED')
            throw error
          }
        }

        if (recharge.status === 'PAID' && nextStatus === 'CANCELLED') {
          await this.walletLedger.debit(tx, recharge.accountId, recharge.currency, amount, {
            idempotencyKey: `recharge-cancel-clawback:${recharge.id}`,
            type: 'PAYMENT_REVERSAL',
            sourceType: 'RechargeIntent',
            sourceId: recharge.id,
            paymentProvenanceRef: recharge.id
          })
        }

        if (recharge.status === 'PAID' && nextStatus === 'REFUNDED') {
          // The player may have already spent the credited WCoin in-game.
          // Never let that silently corrupt the transition -- fall back to
          // REFUND_PENDING and raise a CRITICAL alert for a human instead.
          try {
            await this.walletLedger.debit(tx, recharge.accountId, recharge.currency, amount, {
              idempotencyKey: `recharge-refund-clawback:${recharge.id}`,
              type: 'PAYMENT_REVERSAL',
              sourceType: 'RechargeIntent',
              sourceId: recharge.id,
              paymentProvenanceRef: recharge.id
            })
          } catch {
            refundClawbackFailed = true
          }
        }

        const effectiveStatus = refundClawbackFailed ? 'REFUND_PENDING' : nextStatus
        if (recharge.provider === 'asaas' && (effectiveStatus === 'PAID' || effectiveStatus === 'MANUAL_REVIEW')) {
          asaasCommittedTransition = effectiveStatus
        }

        // PHASE P (2026-08-31): capture for the risk/chargeback hooks
        // fired after this transaction commits -- see this method's own
        // opening comment for why they run outside it.
        if (effectiveStatus === 'PAID' || effectiveStatus === 'FAILED' || effectiveStatus === 'MANUAL_REVIEW') {
          hook = {
            kind: effectiveStatus,
            recharge: { id: recharge.id, accountId: recharge.accountId, price: recharge.price, createdAt: recharge.createdAt },
            reason: options.reason
          }
        }

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

        const action =
          options.source === 'admin'
            ? 'admin.finance.recharge.status'
            : options.source === 'system-poll'
              ? 'system.finance.recharge.provider-poll-status'
              : 'recharge.webhook.status'
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

    if (asaasCommittedTransition === 'PAID') this.logger.log('ASAAS_WALLET_CREDIT_SUCCEEDED')
    if (asaasCommittedTransition === 'MANUAL_REVIEW') this.logger.warn('ASAAS_MANUAL_REVIEW_TRANSITION')

    if (hook) {
      await this.fireRiskHooks(hook)
    }

    return result
  }

  // PHASE P (2026-08-31) -- the one dispatcher every recharge status
  // transition's risk/chargeback consequence flows through. Advisory
  // only: a failure here is caught and reported, never re-thrown, so a
  // risk-service outage can never break a real payment transition.
  private async fireRiskHooks(hook: {
    kind: 'PAID' | 'FAILED' | 'MANUAL_REVIEW'
    recharge: { id: string; accountId: string; price: string; createdAt: Date }
    reason?: string
  }) {
    try {
      if (hook.kind === 'PAID') {
        await this.paymentRisk.evaluateOnRechargePaid({
          id: hook.recharge.id,
          accountId: hook.recharge.accountId,
          amountBRL: parseBrlPrice(hook.recharge.price),
          paidAt: new Date()
        })
      } else if (hook.kind === 'FAILED') {
        await this.paymentRisk.evaluateOnRechargeFailed({ id: hook.recharge.id, accountId: hook.recharge.accountId, createdAt: new Date() })
      } else if (hook.kind === 'MANUAL_REVIEW') {
        if (hook.reason?.startsWith('charged_back:')) {
          await this.chargebackCase.openCaseForRecharge(hook.recharge.id, { providerChargebackReason: hook.reason })
          await this.paymentRisk.evaluateOnChargeback({ id: hook.recharge.id, accountId: hook.recharge.accountId })
        } else {
          await this.paymentRisk.evaluateOnManualReview({ id: hook.recharge.id, accountId: hook.recharge.accountId }, hook.reason)
        }
      }
    } catch (error) {
      await this.observability.recordOperationalEvent({
        module: 'payment-risk',
        severity: 'CRITICAL',
        eventType: 'PAYMENT_RISK_HOOK_FAILED',
        entityType: 'RechargeIntent',
        entityId: hook.recharge.id,
        description: `Falha ao avaliar sinais de risco para a recarga ${hook.recharge.id}.`,
        data: { kind: hook.kind, error: error instanceof Error ? error.message : 'unknown' }
      })
    }
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
