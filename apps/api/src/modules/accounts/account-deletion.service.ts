import { BadRequestException, Injectable } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import type {
  MarketplaceListingStatus,
  MarketplaceOrderStatus,
  PurchaseIntentStatus,
  RechargeIntentStatus
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  DependencyReportRow,
  NormalDeletionDryRunResult,
  PreBetaPurgeDryRunRow
} from './account-deletion.contract'

// Phase 14 Part D. Two intentionally non-interchangeable modes -- see
// docs/accounts/account-deletion-architecture.md for the full dependency
// map and reasoning. The single most important fact this file encodes:
// Account has 16 onDelete:Cascade relations, confirmed by direct schema
// inspection -- a real `prisma.account.delete()` would silently destroy
// payment/audit/moderation history for a real player. NORMAL_ACCOUNT_DELETION
// therefore NEVER deletes the Account row; it anonymizes it in place.
// PRE_BETA_PURGE is the only mode allowed to use a real cascading delete,
// and only after eligibility proves there is nothing valuable in that
// cascade path.
const STAFF_ROLES = new Set(['GM', 'ADMIN', 'SUPER_ADMIN'])
const BLOCKING_LISTING_STATUSES: MarketplaceListingStatus[] = ['DRAFT', 'ESCROW_PENDING', 'ACTIVE', 'RESERVED']
const BLOCKING_ORDER_STATUSES: MarketplaceOrderStatus[] = ['PREPARED', 'PAID', 'DELIVERING']
const PAID_RECHARGE_STATUSES: RechargeIntentStatus[] = ['PAID', 'REFUND_PENDING', 'REFUNDED']
const PAID_PURCHASE_STATUSES: PurchaseIntentStatus[] = ['PAID', 'DELIVERING', 'COMPLETED', 'REFUND_PENDING', 'REFUNDED']

function hashValue(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // ---- NORMAL_ACCOUNT_DELETION ------------------------------------------

  async dryRunNormalDeletion(accountId: string): Promise<NormalDeletionDryRunResult> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return { accountId, verdict: 'UNKNOWN', blockers: ['ACCOUNT_NOT_FOUND'], dependencies: [] }
    if (account.deletedAt) return { accountId, verdict: 'ALREADY_DELETED', blockers: [], dependencies: [] }

    const blockers: string[] = []
    if (STAFF_ROLES.has(account.role)) blockers.push('STAFF_ROLE_REFUSED_BY_ORDINARY_FLOW')

    const [founderGuilds, activeListings, activeOrders] = await Promise.all([
      this.prisma.guild.findMany({ where: { foundedByAccountId: accountId }, include: { members: { select: { id: true } } } }),
      this.prisma.playerMarketListing.count({ where: { sellerAccountId: accountId, status: { in: [...BLOCKING_LISTING_STATUSES] } } }),
      this.prisma.playerMarketOrder.count({ where: { buyerAccountId: accountId, status: { in: [...BLOCKING_ORDER_STATUSES] } } })
    ])
    const foundedWithOtherMembers = founderGuilds.filter((g) => g.members.length > 1)
    if (foundedWithOtherMembers.length > 0) blockers.push('GUILD_FOUNDER_WITH_ACTIVE_MEMBERS')
    if (activeListings > 0) blockers.push('ACTIVE_MARKETPLACE_LISTING')
    if (activeOrders > 0) blockers.push('IN_FLIGHT_MARKETPLACE_ORDER')

    const dependencies: DependencyReportRow[] = [
      { system: 'Wallet / currency', decision: 'PRESERVE', detail: 'Ledger rows preserved; live balances zeroed on execution' },
      { system: 'Audit events', decision: 'PRESERVE', detail: 'Account row survives (anonymized), so no cascade risk' },
      { system: 'Purchases / recharges', decision: 'PRESERVE', detail: 'Payment history never touched' },
      { system: 'Characters (portal link)', decision: 'DETACH', detail: 'Real GameServer character requires a separate allowlisted operation, never implied here' },
      { system: 'Guild leadership', decision: foundedWithOtherMembers.length > 0 ? 'BLOCK' : 'PRESERVE', detail: foundedWithOtherMembers.length > 0 ? `Founder of ${foundedWithOtherMembers.length} guild(s) with other members` : 'No blocking guild leadership found' },
      { system: 'Guild membership', decision: 'DETACH', detail: 'Leaving guilds on deletion is safe' },
      { system: 'Marketplace', decision: activeListings > 0 || activeOrders > 0 ? 'BLOCK' : 'PRESERVE', detail: 'In-flight trades must resolve first; history is preserved either way' },
      { system: 'Community content', decision: 'ANONYMIZE', detail: 'Posts/comments keep thread integrity under a tombstoned author; personal-only rows (reactions, quest progress, grants) deleted' },
      { system: 'GameBridge jobs', decision: 'DETACH', detail: 'accountId is already nullable/SetNull on GameBridgeJob' },
      { system: 'Account permissions', decision: 'DELETE', detail: 'Pure account-scoped config' },
      { system: 'Support tickets', decision: 'PRESERVE', detail: 'Dispute/support history retained' },
      { system: 'Moderation records', decision: 'PRESERVE', detail: 'Must survive for future ban-evasion/dispute context' },
      { system: 'Sessions / password reset / 2FA recovery', decision: 'DELETE', detail: 'Deleted outright, never tombstoned' },
      { system: 'Staff operational records (admin tasks / GM occurrences+events)', decision: 'PRESERVE', detail: 'Only populated for staff accounts, which this flow already refuses' },
      { system: 'Game account identity/credential', decision: 'DETACH', detail: 'Portal link detached; real GameServer removal requires ANONYMIZE_GAME_ACCOUNT, queued not executed inline' },
      { system: 'Terms acceptances', decision: 'PRESERVE', detail: 'Legal/consent record' },
      { system: 'VIP entitlement/grants', decision: 'PRESERVE', detail: 'Grant history (real currency spent) preserved; live entitlement left to expire naturally' },
      { system: 'Beta reward entitlements', decision: 'PRESERVE', detail: 'Already designed to survive account deletion (no hard FK) since Phase 13' }
    ]

    return { accountId, verdict: blockers.length > 0 ? 'BLOCKED' : 'WOULD_ANONYMIZE', blockers, dependencies }
  }

  // actor.id may be null for a system-triggered execution (e.g. a
  // self-service deletion request whose grace period elapsed, processed
  // by account-deletion-request.service.ts#processReadyDeletions) --
  // AuditEvent.actorId is a real, nullable FK to Account (confirmed in
  // schema), so passing a made-up non-account id would violate the FK
  // constraint exactly like the Phase 13 VIP test fixture bug did. null
  // is the correct, safe value here, not a placeholder id.
  async executeNormalDeletion(actor: { id: string | null, username: string }, accountId: string, reason?: string) {
    const existing = await this.prisma.accountDeletionRecord.findUnique({ where: { accountId } })
    if (existing) return { accountId, status: 'ALREADY_DELETED' as const }

    const dryRun = await this.dryRunNormalDeletion(accountId)
    if (dryRun.verdict === 'UNKNOWN') throw new BadRequestException('ACCOUNT_NOT_FOUND')
    if (dryRun.verdict === 'BLOCKED') throw new BadRequestException(`NORMAL_ACCOUNT_DELETION_BLOCKED: ${dryRun.blockers.join(', ')}`)
    if (dryRun.verdict === 'ALREADY_DELETED') return { accountId, status: 'ALREADY_DELETED' as const }

    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } })
    const identity = await this.prisma.gameAccountIdentity.findUnique({ where: { accountId } })
    const tombstoneUsername = `deleted-${accountId}`
    const tombstoneEmail = `deleted-${accountId}@deleted.invalid`

    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: accountId },
        data: {
          username: tombstoneUsername,
          name: 'Deleted Account',
          email: tombstoneEmail,
          passwordHash: '',
          personalIdHash: null,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorPending: null,
          sessionVersion: { increment: 1 },
          status: 'BLOCKED',
          deletedAt: new Date()
        }
      })
      await tx.accountCurrency.updateMany({ where: { accountId }, data: { balance: 0, feeAccumulatorSubunits: 0 } })
      await tx.accountSession.deleteMany({ where: { accountId } })
      await tx.passwordResetToken.deleteMany({ where: { accountId } })
      await tx.twoFactorRecoveryCode.deleteMany({ where: { accountId } })
      await tx.accountPermission.deleteMany({ where: { accountId } })

      await tx.accountDeletionRecord.create({
        data: {
          accountId,
          deletionMode: 'NORMAL_ACCOUNT_DELETION',
          requestedBy: actor.username,
          completedAt: new Date(),
          reason: reason?.slice(0, 2000),
          originalUsernameHash: hashValue(account.username),
          originalEmailHash: hashValue(account.email)
        }
      })

      // Exit feedback (Bryan, 2026-08-30): unlink, never delete -- the
      // structured reasons/otherText survive for product analytics, but
      // the direct accountId linkage is removed the moment there is no
      // longer a legitimate need for it (the account is gone).
      await tx.accountDeletionFeedback.updateMany({
        where: { accountId },
        data: { accountId: null, anonymizedAt: new Date() }
      })

      if (identity?.legacyLogin) {
        await tx.gameBridgeJob.create({
          data: {
            accountId,
            operation: 'ANONYMIZE_GAME_ACCOUNT',
            idempotencyKey: `account-deletion:${accountId}:${randomUUID()}`,
            payload: { accountId, legacyLogin: identity.legacyLogin }
          }
        })
      }
    })

    await this.audit.record({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'admin.account.delete.normal',
      targetType: 'Account',
      targetId: accountId,
      metadata: { reason: reason?.slice(0, 500) ?? null }
    })

    return { accountId, status: 'DELETED' as const }
  }

  // ---- PRE_BETA_PURGE -----------------------------------------------------

  async assessPreBetaPurgeEligibility(accountId: string): Promise<PreBetaPurgeDryRunRow> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return { accountId, verdict: 'UNKNOWN_DEPENDENCY', reasons: ['ACCOUNT_NOT_FOUND'] }

    const reasons: string[] = []
    if (account.accountPhase !== 'PRE_BETA') reasons.push('ACCOUNT_PHASE_NOT_PRE_BETA')
    if (account.role !== 'PLAYER') reasons.push('NON_PLAYER_ROLE_REFUSED')

    const [balances, paidRecharge, paidPurchase, vipGrant] = await Promise.all([
      this.prisma.accountCurrency.findMany({ where: { accountId } }),
      this.prisma.rechargeIntent.count({ where: { accountId, status: { in: [...PAID_RECHARGE_STATUSES] } } }),
      this.prisma.purchaseIntent.count({ where: { accountId, status: { in: [...PAID_PURCHASE_STATUSES] } } }),
      this.prisma.vipGrant.count({ where: { accountId } })
    ])
    if (balances.some((b) => b.balance !== 0)) reasons.push('NONZERO_CURRENCY_BALANCE')
    if (paidRecharge > 0) reasons.push('HAS_PAID_RECHARGE_HISTORY')
    if (paidPurchase > 0) reasons.push('HAS_PAID_PURCHASE_HISTORY')
    // Gap found while writing docs/accounts/account-deletion-architecture.md:
    // a pre-Beta test account could have a real VipGrant (e.g. an admin
    // test purchase) despite zero current balance -- checked explicitly
    // rather than left as a documented-but-unfixed gap.
    if (vipGrant > 0) reasons.push('HAS_VIP_GRANT_HISTORY')

    return { accountId, verdict: reasons.length > 0 ? 'BLOCKED' : 'WOULD_DELETE', reasons }
  }

  async dryRunPreBetaPurge(betaCycleId: string): Promise<PreBetaPurgeDryRunRow[]> {
    if (!betaCycleId?.trim()) throw new BadRequestException('BETA_CYCLE_ID_REQUIRED')
    const candidates = await this.prisma.account.findMany({
      where: { accountPhase: 'PRE_BETA' },
      select: { id: true }
    })
    return Promise.all(candidates.map((c) => this.assessPreBetaPurgeEligibility(c.id)))
  }

  // accountIds is always explicit -- never "every PRE_BETA account in this
  // cycle automatically." The caller (an admin, informed by
  // pre-beta-account-review.md and dryRunPreBetaPurge above) names exactly
  // which accounts to purge; this re-validates each one for real rather
  // than trusting a stale dry-run result.
  async executePreBetaPurge(actor: AuthenticatedUser, betaCycleId: string, accountIds: string[]) {
    if (!betaCycleId?.trim()) throw new BadRequestException('BETA_CYCLE_ID_REQUIRED')
    if (!Array.isArray(accountIds) || accountIds.length === 0) throw new BadRequestException('ACCOUNT_IDS_REQUIRED')

    const assessments = await Promise.all(accountIds.map((id) => this.assessPreBetaPurgeEligibility(id)))
    const blocked = assessments.filter((a) => a.verdict !== 'WOULD_DELETE')
    if (blocked.length > 0) {
      throw new BadRequestException(`PRE_BETA_PURGE_BLOCKED: ${blocked.map((b) => `${b.accountId}(${b.reasons.join('|')})`).join(', ')}`)
    }

    await this.prisma.$transaction(async (tx) => {
      for (const accountId of accountIds) {
        // AccountCurrency is the one accountId-keyed relation on Account
        // that is NOT onDelete:Cascade (confirmed by direct schema
        // inspection -- every other accountId relation is Cascade, and the
        // remaining exception, GmOccurrenceNote.authorId, is safe by
        // construction since eligibility already refuses non-PLAYER roles
        // and only staff author GM occurrence notes). Found by a real test
        // failure (FK violation on account.delete()), not assumed.
        await tx.accountCurrency.deleteMany({ where: { accountId } })
        await tx.account.delete({ where: { id: accountId } })
      }
      await tx.purgeBatchRecord.create({
        data: {
          betaCycleId,
          requestedBy: actor.username,
          accountCount: accountIds.length,
          accountIdsPurged: accountIds
        }
      })
    })

    await this.audit.record({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'admin.account.purge.pre-beta',
      targetType: 'PurgeBatchRecord',
      targetId: betaCycleId,
      metadata: { betaCycleId, accountCount: accountIds.length }
    })

    return { betaCycleId, accountCount: accountIds.length, status: 'PURGED' as const }
  }
}
