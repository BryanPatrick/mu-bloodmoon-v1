import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { LegacyCatalogChannel, LegacyCatalogCommercialStatus, LegacyCommercialDecision, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { permissionKeys } from '../auth/permissions'
import {
  LEGACY_XSHOP_BALANCE_TEST_REQUIRED_KEYS,
  LEGACY_XSHOP_NOT_FOR_SALE_KEYS
} from './legacy-catalog-policy'
import { CASHSHOP_SEED_ENTRIES } from './legacy-catalog-seed-data.cashshop'
import { XSHOP_SEED_ENTRIES } from './legacy-catalog-seed-data.xshop'

// PHASE S (2026-09-02) -- the Portal-side "desired state" layer for the
// X-Shop/CashShop admin control plane Bryan asked to begin this phase.
// This service is deliberately Portal-local: it has NO GameServer write
// capability and NO live RemoteOps/SSH access. apps/api has never held
// production GameServer credentials directly (RemoteOps/bm-remote runs
// from this operator's own machine, outside the deployed API's runtime
// -- see docs/security/game-write-boundary.md's "GameBridge is the only
// write path" boundary, which this service does not attempt to widen).
// A real GameServer sync is intentionally NOT implemented here -- see
// docs/decisions/0023-store-catalog-decision-closure.md's "Sync
// architecture" section for why, and what would need to be true before
// it could be (Part F: DESIGN_READY, NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE).

const actor = (user: AuthenticatedUser) => ({ actorId: user.id, actorUsername: user.username, actorRole: user.role })
const hasPermission = (user: AuthenticatedUser, permission: string) => user.permissions.includes('*') || user.permissions.includes(permission)
const requirePermission = (user: AuthenticatedUser, permission: string) => {
  if (!hasPermission(user, permission)) throw new ForbiddenException('Voce nao possui permissao para esta operacao do catalogo legado.')
}

// Bryan's Decision 1 (153 X-Shop RED items) and Decision 3 (3 dead Axes
// rows) are FINAL commercial policy, not a pending review -- these two
// decisions may never resolve to APPROVED/PUBLISHED/purchasable through
// this service, full stop. This is deliberately a hardcoded, permanent
// block, not a permission an admin can grant themselves out of --
// per Part J's own explicit instruction not to build an override path
// unless the existing RBAC architecture makes one clearly appropriate,
// which this phase does not attempt to judge.
const PERMANENTLY_BLOCKED_DECISIONS: readonly LegacyCommercialDecision[] = ['NOT_FOR_COMMERCIAL_SALE', 'DEAD_UNRESOLVABLE_CATALOG_ROW']

export type LegacyCatalogItemUpdatePayload = {
  commercialStatus?: LegacyCatalogCommercialStatus
  visible?: boolean
  purchasable?: boolean
  desiredEnabled?: boolean
  priceDesired?: number | null
  currencyDesired?: 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT' | null
  durationDesiredDays?: number | null
  availableFrom?: string | null
  availableUntil?: string | null
  openBetaAllowed?: boolean
  fullReleaseAllowed?: boolean
  purchaseLimitDesired?: number | null
  internalNotes?: string | null
  blockReason?: string | null
  reason?: string
}

export type LegacyCatalogQuery = {
  channel?: LegacyCatalogChannel
  commercialStatus?: LegacyCatalogCommercialStatus
  bryanDecision?: LegacyCommercialDecision
  desiredEnabled?: boolean
  effectiveEnabled?: boolean
  currencyDesired?: 'WCOIN' | 'GOBLIN_POINT' | 'HUNT_POINT'
  openBetaAllowed?: boolean
  fullReleaseAllowed?: boolean
  driftStatus?: 'NOT_CHECKED' | 'IN_SYNC' | 'DRIFT_DETECTED' | 'CHECK_FAILED' | 'NOT_MANAGED'
  // Part 13 -- item name, technical ID (legacyKey), or category
  // (technicalIdentifiers.category, X-Shop only). The 3 dead Axes rows
  // (itemName="NOT_AVAILABLE") remain findable by legacyKey/category
  // even though their name search will never match anything meaningful.
  search?: string
  page?: number
  pageSize?: number
}

export type LegacyCatalogBulkAction = 'mark-blocked' | 'mark-review-required' | 'hide' | 'set-open-beta-allowed' | 'set-open-beta-disallowed' | 'set-full-release-allowed' | 'set-full-release-disallowed'

export type LegacyCatalogBulkPayload = {
  ids: string[]
  action: LegacyCatalogBulkAction
  reason: string
}

@Injectable()
export class LegacyCatalogConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // Idempotent -- safe to re-run. Upserts on the real @@unique([channel,
  // legacyKey]) constraint, so re-seeding after a future re-review never
  // duplicates rows, only updates itemName/technicalIdentifiers/bryanDecision
  // (never touches an admin's own desired-state fields once set -- the
  // update branch below deliberately never writes commercialStatus/
  // visible/purchasable/priceDesired/etc, only the identity fields that
  // come from the legacy source itself).
  async seedAll(user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminStoreLegacyCatalogEdit)
    const xshop = await this.seedXshop(user)
    const cashshop = await this.seedCashshop(user)
    await this.audit.record({
      ...actor(user),
      action: 'admin.store.legacy-catalog.seeded',
      targetType: 'LegacyCatalogItem',
      afterData: { xshop, cashshop },
      workDescription: `Catalogo legado semeado: X-Shop ${xshop.created} novos/${xshop.updated} atualizados, CashShop ${cashshop.created} novos/${cashshop.updated} atualizados.`
    })
    return { xshop, cashshop }
  }

  private async seedXshop(user: AuthenticatedUser) {
    let created = 0
    let updated = 0
    for (const row of XSHOP_SEED_ENTRIES) {
      const decision: LegacyCommercialDecision = LEGACY_XSHOP_NOT_FOR_SALE_KEYS.has(row.legacyKey)
        ? 'NOT_FOR_COMMERCIAL_SALE'
        : LEGACY_XSHOP_BALANCE_TEST_REQUIRED_KEYS.has(row.legacyKey)
          ? 'BALANCE_TEST_REQUIRED'
          : 'DEAD_UNRESOLVABLE_CATALOG_ROW'
      const existing = await this.prisma.legacyCatalogItem.findUnique({ where: { channel_legacyKey: { channel: 'XSHOP', legacyKey: row.legacyKey } } })
      if (existing) {
        await this.prisma.legacyCatalogItem.update({
          where: { id: existing.id },
          data: { itemName: row.itemName, technicalIdentifiers: row.technicalIdentifiers as Prisma.InputJsonValue, bryanDecision: decision, updatedBy: user.id, version: { increment: 1 } }
        })
        updated += 1
        continue
      }
      await this.prisma.legacyCatalogItem.create({
        data: {
          channel: 'XSHOP',
          legacyKey: row.legacyKey,
          itemName: row.itemName,
          technicalIdentifiers: row.technicalIdentifiers as Prisma.InputJsonValue,
          bryanDecision: decision,
          // PHASE T (2026-09-02), Part 10 -- explicit refinement of Phase
          // S's own initial-state choice for Decision 2 specifically:
          // accessories start REVIEW_REQUIRED (not BLOCKED like Decision
          // 1/3), reflecting that a real balance test could clear them --
          // BLOCKED implied a harder, more final hold than Bryan intended
          // for this bucket. Decision 1 and 3 remain BLOCKED (final,
          // Decision 1) / BLOCKED (dead row, Decision 3) -- never
          // silently changed, this correction is scoped to Decision 2
          // only, as Bryan's own instruction specified.
          commercialStatus: decision === 'BALANCE_TEST_REQUIRED' ? 'REVIEW_REQUIRED' : 'BLOCKED',
          blockReason: decision === 'NOT_FOR_COMMERCIAL_SALE'
            ? 'Decisao 1 (Fase S): +13 com todas as 6 opcoes excellent -- incompativel com a politica comercial atual.'
            : decision === 'BALANCE_TEST_REQUIRED'
              ? 'BALANCE_TEST_REQUIRED -- Decisao 2 (Fase S): pendente de teste empirico de balanceamento em jogo.'
              : 'Decisao 3 (Fase S): nenhuma definicao correspondente em Item.txt -- linha morta/nao resolvivel.',
          createdBy: user.id,
          updatedBy: user.id
        }
      })
      created += 1
    }
    return { created, updated, total: XSHOP_SEED_ENTRIES.length }
  }

  private async seedCashshop(user: AuthenticatedUser) {
    let created = 0
    let updated = 0
    for (const row of CASHSHOP_SEED_ENTRIES) {
      const existing = await this.prisma.legacyCatalogItem.findUnique({ where: { channel_legacyKey: { channel: 'CASHSHOP', legacyKey: row.legacyKey } } })
      if (existing) {
        await this.prisma.legacyCatalogItem.update({
          where: { id: existing.id },
          data: { itemName: row.itemName, technicalIdentifiers: row.technicalIdentifiers as Prisma.InputJsonValue, bryanDecision: row.decision, updatedBy: user.id, version: { increment: 1 } }
        })
        updated += 1
        continue
      }
      await this.prisma.legacyCatalogItem.create({
        data: {
          channel: 'CASHSHOP',
          legacyKey: row.legacyKey,
          itemName: row.itemName,
          technicalIdentifiers: row.technicalIdentifiers as Prisma.InputJsonValue,
          bryanDecision: row.decision,
          // Decision 4 (rentals) and Decision 7 (tickets) both start
          // REVIEW_REQUIRED, not BLOCKED -- unlike Decision 1/2/3, Bryan
          // did not say NOT_FOR_SALE for these, only "not yet approved"
          // (GREEN_CANDIDATE != APPROVED_FOR_SALE; rentals pending the
          // empirical test). REVIEW_REQUIRED reflects that honestly --
          // still not purchasable (default false) either way.
          commercialStatus: 'REVIEW_REQUIRED',
          blockReason: row.decision === 'RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST'
            ? 'EMPIRICAL_RENTAL_TEST_REQUIRED -- Decisao 4 (Fase S): mecanismo de expiracao confirmado, seguranca de ciclo de vida (warehouse/troca) ainda nao testada empiricamente.'
            : 'GREEN_CANDIDATE_NOT_APPROVED -- Decisao 7 (Fase S): GREEN_CANDIDATE nao significa aprovado para venda -- revisao de evento/economia pendente.',
          createdBy: user.id,
          updatedBy: user.id
        }
      })
      created += 1
    }
    return { created, updated, total: CASHSHOP_SEED_ENTRIES.length }
  }

  async list(user: AuthenticatedUser, query: LegacyCatalogQuery) {
    requirePermission(user, permissionKeys.adminStoreLegacyCatalogView)
    const page = Math.max(1, query.page || 1)
    const pageSize = Math.min(200, Math.max(1, query.pageSize || 50))
    const search = query.search?.trim()
    const where: Prisma.LegacyCatalogItemWhereInput = {
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.commercialStatus ? { commercialStatus: query.commercialStatus } : {}),
      ...(query.bryanDecision ? { bryanDecision: query.bryanDecision } : {}),
      ...(query.desiredEnabled !== undefined ? { desiredEnabled: query.desiredEnabled } : {}),
      ...(query.effectiveEnabled !== undefined ? { effectiveEnabled: query.effectiveEnabled } : {}),
      ...(query.currencyDesired ? { currencyDesired: query.currencyDesired } : {}),
      ...(query.openBetaAllowed !== undefined ? { openBetaAllowed: query.openBetaAllowed } : {}),
      ...(query.fullReleaseAllowed !== undefined ? { fullReleaseAllowed: query.fullReleaseAllowed } : {}),
      ...(query.driftStatus ? { driftStatus: query.driftStatus } : {}),
      ...(search
        ? { OR: [{ itemName: { contains: search } }, { legacyKey: { contains: search } }] }
        : {})
    }
    const [items, total] = await Promise.all([
      this.prisma.legacyCatalogItem.findMany({ where, orderBy: [{ channel: 'asc' }, { legacyKey: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.legacyCatalogItem.count({ where })
    ])
    return { items, total, page, pageSize }
  }

  async summary(user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminStoreLegacyCatalogView)
    const grouped = await this.prisma.legacyCatalogItem.groupBy({ by: ['channel', 'bryanDecision', 'commercialStatus'], _count: { _all: true } })
    return grouped.map((g) => ({ channel: g.channel, bryanDecision: g.bryanDecision, commercialStatus: g.commercialStatus, count: g._count._all }))
  }

  async update(id: string, payload: LegacyCatalogItemUpdatePayload, user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminStoreLegacyCatalogEdit)
    const current = await this.prisma.legacyCatalogItem.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Item do catalogo legado nao encontrado.')

    // The one real, hardcoded guardrail Part J asks for: Decision 1/3
    // items can NEVER become purchasable, APPROVED, or PUBLISHED through
    // this service, regardless of who is asking -- there is no override
    // permission that bypasses this check.
    const wantsUnlock = payload.purchasable === true || payload.commercialStatus === 'APPROVED' || payload.commercialStatus === 'PUBLISHED'
    if (wantsUnlock && PERMANENTLY_BLOCKED_DECISIONS.includes(current.bryanDecision)) {
      throw new ForbiddenException(
        `Este item esta classificado como ${current.bryanDecision} (decisao de produto da Fase S) -- nao pode se tornar comercializavel ou publicado por esta via.`
      )
    }
    if ((payload.commercialStatus === 'APPROVED' || payload.commercialStatus === 'PUBLISHED') && !payload.reason?.trim() && !current.internalNotes) {
      throw new BadRequestException('Informe uma justificativa para aprovar ou publicar um item do catalogo legado.')
    }

    const data: Prisma.LegacyCatalogItemUpdateInput = {
      updatedBy: user.id,
      version: { increment: 1 }
    }
    if (payload.commercialStatus !== undefined) data.commercialStatus = payload.commercialStatus
    if (payload.visible !== undefined) data.visible = payload.visible
    if (payload.purchasable !== undefined) data.purchasable = payload.purchasable
    // desiredEnabled is deliberately NOT gated by PERMANENTLY_BLOCKED_DECISIONS
    // -- ENABLED != APPROVED (Part T's own explicit semantic). A RED item
    // may legitimately need desiredEnabled=true for the exact future uses
    // Bryan named (technical testing, GM/admin use, a controlled event)
    // while staying commercially blocked; only purchasable/APPROVED/
    // PUBLISHED are hard-blocked above.
    if (payload.desiredEnabled !== undefined) data.desiredEnabled = payload.desiredEnabled
    if (payload.priceDesired !== undefined) data.priceDesired = payload.priceDesired
    if (payload.currencyDesired !== undefined) data.currencyDesired = payload.currencyDesired
    if (payload.durationDesiredDays !== undefined) data.durationDesiredDays = payload.durationDesiredDays
    if (payload.availableFrom !== undefined) data.availableFrom = payload.availableFrom ? new Date(payload.availableFrom) : null
    if (payload.availableUntil !== undefined) data.availableUntil = payload.availableUntil ? new Date(payload.availableUntil) : null
    if (payload.openBetaAllowed !== undefined) data.openBetaAllowed = payload.openBetaAllowed
    if (payload.fullReleaseAllowed !== undefined) data.fullReleaseAllowed = payload.fullReleaseAllowed
    if (payload.purchaseLimitDesired !== undefined) data.purchaseLimitDesired = payload.purchaseLimitDesired
    if (payload.internalNotes !== undefined) data.internalNotes = payload.internalNotes
    if (payload.blockReason !== undefined) data.blockReason = payload.blockReason

    const updated = await this.prisma.legacyCatalogItem.update({ where: { id }, data })
    await this.audit.record({
      ...actor(user),
      action: 'admin.store.legacy-catalog.updated',
      targetType: 'LegacyCatalogItem',
      targetId: id,
      beforeData: current,
      afterData: updated,
      reason: payload.reason
    })
    return updated
  }

  // PHASE T (2026-09-02), Part 16/17/18 -- the sync endpoint's real
  // shape is intentionally just a guard, not an implementation. No real
  // GameServer write exists (see legacy-catalog-effective-state.service.ts's
  // header comment for why) -- this proves NO_RUNTIME_SYNC_BY_DEFAULT
  // with real, executable code: the permission check AND the kill-switch
  // env flag both gate a path that, even if both passed, still returns
  // "not implemented" rather than mutating anything. Two independent
  // reasons this can never accidentally fire: the flag defaults off, and
  // there is no command execution behind it even when the flag is on.
  async sync(channel: LegacyCatalogChannel, user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminStoreLegacyCatalogSync)
    const flagName = channel === 'XSHOP' ? 'XSHOP_RUNTIME_SYNC_ENABLED' : 'CASHSHOP_RUNTIME_SYNC_ENABLED'
    if (process.env[flagName] !== 'true') {
      throw new ForbiddenException(`Sincronizacao de ${channel} desativada (${flagName} nao habilitada). Nenhuma sincronizacao real com o GameServer existe ainda -- ver ADR-0023/0024.`)
    }
    // Unreachable today (the flag above is never set to 'true' in any
    // real environment this project ships) -- kept as an explicit,
    // visible marker of exactly where a future real sync command would
    // be dispatched, rather than silently absent.
    throw new BadRequestException('NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE -- nenhum comando de sincronizacao real existe ainda.')
  }

  // Part 8 -- detail drawer's own history section reads this directly.
  async history(id: string, user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminStoreLegacyCatalogView)
    return this.prisma.auditEvent.findMany({
      where: { targetType: 'LegacyCatalogItem', targetId: id },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  }

  // Part 11 -- safe bulk desired-state operations only. Deliberately a
  // small, closed action enum (not a generic "bulk patch any field"
  // endpoint) -- price/currency/options are explicitly excluded from
  // bulk operations per Bryan's own instruction, and the per-row
  // PERMANENTLY_BLOCKED_DECISIONS guard from #update is re-applied here
  // too (a bulk "mark-blocked" is always safe; nothing here can ever
  // bulk-approve/publish/unlock a Decision 1/3 row, since none of the
  // 7 actions can set purchasable/APPROVED/PUBLISHED at all).
  async bulkUpdate(payload: LegacyCatalogBulkPayload, user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminStoreLegacyCatalogEdit)
    if (!payload.ids?.length) throw new BadRequestException('Selecione ao menos um item.')
    if (!payload.reason?.trim()) throw new BadRequestException('Informe uma justificativa para a acao em lote.')
    const ids = [...new Set(payload.ids)].slice(0, 500)

    const data: Prisma.LegacyCatalogItemUpdateManyMutationInput = { updatedBy: user.id, version: { increment: 1 } }
    switch (payload.action) {
      case 'mark-blocked':
        data.commercialStatus = 'BLOCKED'
        break
      case 'mark-review-required':
        data.commercialStatus = 'REVIEW_REQUIRED'
        break
      case 'hide':
        data.visible = false
        break
      case 'set-open-beta-allowed':
        data.openBetaAllowed = true
        break
      case 'set-open-beta-disallowed':
        data.openBetaAllowed = false
        break
      case 'set-full-release-allowed':
        data.fullReleaseAllowed = true
        break
      case 'set-full-release-disallowed':
        data.fullReleaseAllowed = false
        break
      default:
        throw new BadRequestException('Acao em lote invalida.')
    }

    const before = await this.prisma.legacyCatalogItem.findMany({ where: { id: { in: ids } } })
    const result = await this.prisma.legacyCatalogItem.updateMany({ where: { id: { in: ids } }, data })

    // One audit entry PER affected item (not one for the whole batch) --
    // a single batch-level entry would be invisible to #history(id) for
    // any individual row, since AuditEvent has one targetId, not a list.
    // A shared correlationId still lets an operator find every row a
    // given bulk action touched, without sacrificing per-row visibility.
    const correlationId = `legacy-catalog-bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    for (const item of before) {
      await this.audit.record({
        ...actor(user),
        action: `admin.store.legacy-catalog.bulk-${payload.action}`,
        targetType: 'LegacyCatalogItem',
        targetId: item.id,
        correlationId,
        beforeData: { commercialStatus: item.commercialStatus, visible: item.visible, openBetaAllowed: item.openBetaAllowed, fullReleaseAllowed: item.fullReleaseAllowed },
        afterData: { action: payload.action, batchSize: result.count },
        reason: payload.reason,
        workDescription: `Acao em lote "${payload.action}" aplicada a ${result.count} itens do catalogo legado.`
      })
    }
    return { affected: result.count }
  }
}
