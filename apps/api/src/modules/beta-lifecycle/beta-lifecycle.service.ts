import { BadRequestException, Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import {
  currentAccountPhase,
  getOpenBetaWindow,
  OPEN_BETA_NOTICE_TERMS_KEY,
  OPEN_BETA_NOTICE_TEXT_PT_BR,
  OPEN_BETA_NOTICE_VERSION
} from './open-beta-window.config'

// Same normalization auth.service.ts's register() already applies to
// email before storing it -- must match exactly, or a real account's
// hash would never line up with its own entitlement rows.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function hashNormalizedEmail(normalizedEmail: string): string {
  return createHash('sha256').update(normalizedEmail).digest('hex')
}

// Roles that must NEVER be swept by Beta cleanup, regardless of
// accountPhase -- "ADMIN"/"STAFF" from the instruction map to this
// schema's real Role enum (GM is the closest real equivalent of
// "STAFF"; there is no separate SYSTEM/service-account role in the
// current schema, so no such exclusion is needed here -- not omitted by
// oversight, there's simply nothing to exclude).
const CLEANUP_BLOCKED_ROLES = new Set(['GM', 'ADMIN', 'SUPER_ADMIN'])

export type CleanupDisposition = 'WOULD_DELETE' | 'WOULD_PRESERVE' | 'BLOCKED' | 'UNKNOWN_DEPENDENCY'

@Injectable()
export class BetaLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  getRegistrationNotice() {
    const window = getOpenBetaWindow()
    return {
      termsKey: OPEN_BETA_NOTICE_TERMS_KEY,
      termsVersion: OPEN_BETA_NOTICE_VERSION,
      text: OPEN_BETA_NOTICE_TEXT_PT_BR,
      currentPhase: currentAccountPhase(),
      openBetaStartAt: window.startAt.toISOString(),
      openBetaEndAt: window.endAt.toISOString(),
      legalReviewRequired: true
    }
  }

  /**
   * Claims every ELIGIBLE BetaRewardEntitlement whose normalizedEmailHash
   * matches this account's own email -- the durable link Part K's design
   * relies on (survives the original Beta account's deletion, since
   * nothing here depends on originalAccountId still resolving).
   * ONE_TIME_REWARD_CLAIM: each row's status transition is an atomic
   * updateMany gated on status='ELIGIBLE', so a concurrent duplicate
   * request can claim a given row at most once.
   */
  async claimMyEntitlements(user: AuthenticatedUser) {
    const emailHash = hashNormalizedEmail(normalizeEmail(user.email))
    const eligible = await this.prisma.betaRewardEntitlement.findMany({
      where: { normalizedEmailHash: emailHash, status: 'ELIGIBLE' }
    })

    if (!eligible.length) {
      return { claimed: [] as Array<{ id: string, rewardType: string, rewardAmount: number }> }
    }

    const claimed: Array<{ id: string, rewardType: string, rewardAmount: number }> = []
    for (const entitlement of eligible) {
      const result = await this.prisma.betaRewardEntitlement.updateMany({
        where: { id: entitlement.id, status: 'ELIGIBLE' },
        data: { status: 'CLAIMED', claimedAt: new Date(), claimedByAccountId: user.id }
      })
      if (result.count === 1) {
        claimed.push({ id: entitlement.id, rewardType: entitlement.rewardType, rewardAmount: entitlement.rewardAmount })
      }
      // count === 0 means another concurrent request already claimed
      // this exact row first -- DUPLICATE_REWARD_CLAIM_REJECTED for this
      // caller on this row, silently skipped rather than erroring the
      // whole batch (the other rows may still be legitimately claimable).
    }

    if (claimed.length) {
      await this.audit.record({
        actorId: user.id,
        actorUsername: user.username,
        action: 'beta.reward.claimed',
        targetType: 'BetaRewardEntitlement',
        targetId: user.id,
        metadata: { claimed }
      })
    }

    return { claimed }
  }

  /**
   * Read-only. Never deletes anything -- classifies every OPEN_BETA
   * account for what cleanup WOULD do, per the exact required output
   * shape. Explicitly refuses to even consider PRE_BETA/OFFICIAL
   * accounts or blocked roles as candidates -- ABSOLUTE DELETION SAFETY:
   * "Never delete based only on createdAt range" and "Require explicit
   * Beta classification" are honored by construction, since the query
   * itself is scoped to accountPhase = 'OPEN_BETA' and nothing else.
   */
  async cleanupDryRun(betaCycleId: string) {
    if (!betaCycleId?.trim()) {
      throw new BadRequestException('betaCycleId e obrigatorio para o dry-run de limpeza do Beta.')
    }

    const candidates = await this.prisma.account.findMany({
      where: { accountPhase: 'OPEN_BETA' },
      select: { id: true, username: true, email: true, role: true, createdAt: true, _count: { select: { characters: true } } }
    })

    const rows: Array<{
      accountId: string
      username: string
      disposition: CleanupDisposition
      reason: string
      characterCount: number
      hasEligibleEntitlementSnapshot: boolean
    }> = []

    for (const account of candidates) {
      if (CLEANUP_BLOCKED_ROLES.has(account.role)) {
        rows.push({
          accountId: account.id,
          username: account.username,
          disposition: 'BLOCKED',
          reason: `role=${account.role} is never eligible for Beta cleanup, regardless of accountPhase`,
          characterCount: account._count.characters,
          hasEligibleEntitlementSnapshot: false
        })
        continue
      }

      const emailHash = hashNormalizedEmail(normalizeEmail(account.email))
      const existingSnapshot = await this.prisma.betaRewardEntitlement.findFirst({
        where: { normalizedEmailHash: emailHash, betaCycleId, originalAccountId: account.id }
      })

      if (!existingSnapshot) {
        // Part J's hard sequencing rule: snapshot/preserve (steps 2-4)
        // must complete before delete (steps 5-6) even runs as a real
        // action -- surfaced here as UNKNOWN_DEPENDENCY rather than
        // WOULD_DELETE, since deleting this account today, before any
        // entitlement snapshot exists for it, would violate that
        // precondition.
        rows.push({
          accountId: account.id,
          username: account.username,
          disposition: 'UNKNOWN_DEPENDENCY',
          reason: 'no BetaRewardEntitlement snapshot exists yet for this account in this betaCycleId -- snapshot step has not run',
          characterCount: account._count.characters,
          hasEligibleEntitlementSnapshot: false
        })
        continue
      }

      rows.push({
        accountId: account.id,
        username: account.username,
        disposition: 'WOULD_DELETE',
        reason: 'accountPhase=OPEN_BETA, role=PLAYER, entitlement snapshot present -- eligible once real deletion is implemented (not this phase)',
        characterCount: account._count.characters,
        hasEligibleEntitlementSnapshot: true
      })
    }

    const preBetaAndOfficialCount = await this.prisma.account.count({
      where: { accountPhase: { in: ['PRE_BETA', 'OFFICIAL'] } }
    })

    return {
      betaCycleId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalOpenBetaAccounts: candidates.length,
        wouldDelete: rows.filter((r) => r.disposition === 'WOULD_DELETE').length,
        blocked: rows.filter((r) => r.disposition === 'BLOCKED').length,
        unknownDependency: rows.filter((r) => r.disposition === 'UNKNOWN_DEPENDENCY').length,
        // Never counted as candidates at all -- shown for visibility only.
        preBetaAndOfficialAccountsExcludedByConstruction: preBetaAndOfficialCount
      },
      rows
    }
  }
}
