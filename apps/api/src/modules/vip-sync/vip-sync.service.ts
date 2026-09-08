import { randomUUID } from 'node:crypto'
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaClient, type VipEntitlement } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { GameCommandTransportClient } from '../game-account-identity/game-command-transport.client'

// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// Part 3B, decision E. Mirrors the claim/lock/tick pattern already proven in
// game-provisioning-reconciliation.service.ts and vip-delivery.service.ts,
// but this one is NOT a one-shot "deliver this specific grant" job queue --
// it's an ongoing "keep this account's tier in sync forever" loop, so its
// state (VipSyncState) is a single row per account, not a job history.
//
// The Portal is the source of truth. This service only ever tells the
// GameServer what the Portal has already decided (VipEntitlement's
// computed effective tier) -- it never asks the GameServer for its current
// state and never guesses. Re-sending the same desiredLevel is always a
// safe no-op (dbo.bm_SyncVipTier's own idempotency, Part 3B), so this
// service never needs to track "did I already send this" beyond avoiding
// redundant chatter -- correctness does not depend on it.
const DEFAULT_INTERVAL_MS = 60_000
const RECONCILIATION_LOCK_NAME = 'bloodmoon:vip-sync-reconciliation'
// Short-lived on purpose -- a single-column UPDATE, no reason to reuse
// CREATE_GAME_ACCOUNT's full 24h window (plan Part 2's GRANT_VIP/SYNC_VIP_TIER
// timeout row: "no reason to differ" from the existing default, but shorter
// is safe and reduces how long a stale command can sit AVAILABLE).
const COMMAND_EXPIRY_MS = 60 * 60_000
const TIER_TO_LEVEL: Record<string, 1 | 2 | 3> = { BRONZE: 1, SILVER: 2, GOLD: 3 }
// Every GameCommandState.status except the two terminal-success/terminal-
// failure-with-nothing-more-to-poll shapes (SUCCEEDED is handled
// separately; FAILED_FINAL/EXPIRED are terminal-but-divergence-remains).
const IN_FLIGHT_STATUSES = ['CREATED', 'QUEUED', 'AVAILABLE', 'CLAIMED', 'FAILED_RETRYABLE']

export interface VipSyncTickResult {
  scanned: number
  reconciledInFlight: number
  synced: number
  alreadyInSync: number
  errors: number
}

export interface VipSyncDivergenceRow {
  accountId: string
  legacyLogin: string
  effectiveLevel: number
  lastSyncedLevel: number | null
  lastSyncStatus: string | null
  lastSyncCommandId: string | null
  lastSyncedAt: string | null
}

type EntitlementWithIdentity = VipEntitlement & {
  account: { gameIdentity: { legacyLogin: string | null; provisioningStatus: string } | null }
}

@Injectable()
export class VipSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VipSyncService.name)
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly transport: GameCommandTransportClient
  ) {}

  onModuleInit() {
    // Plan Part 14: this reconciler is gated behind its OWN env flag,
    // independent of the Agent-side GAME_BRIDGE_SYNC_VIP_TIER_ENABLED kill
    // switch -- if this is off, the reconciler must not even attempt to
    // generate SYNC_VIP_TIER commands (defense in depth at both ends of the
    // pipe, not just the Agent refusing after the fact).
    if (process.env.VIP_SYNC_RECONCILIATION_ENABLED !== 'true') return
    const intervalMs = Number(process.env.VIP_SYNC_RECONCILIATION_INTERVAL_MS) || DEFAULT_INTERVAL_MS
    this.timer = setInterval(() => {
      void this.runOnce().catch((error) => this.logger.error(`VIP sync tick failed: ${safeMessage(error)}`))
    }, intervalMs)
    this.timer.unref?.()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  async runOnce(): Promise<VipSyncTickResult> {
    return this.withReconciliationLock(
      () => this.runOnceWithLock(),
      () => ({ scanned: 0, reconciledInFlight: 0, synced: 0, alreadyInSync: 0, errors: 0 })
    )
  }

  private async runOnceWithLock(): Promise<VipSyncTickResult> {
    const result: VipSyncTickResult = { scanned: 0, reconciledInFlight: 0, synced: 0, alreadyInSync: 0, errors: 0 }

    // Phase 1: poll every sync still in flight for a terminal result before
    // deciding, in Phase 2, whether a real divergence remains.
    const inFlight = await this.prisma.vipSyncState.findMany({ where: { lastSyncStatus: { in: IN_FLIGHT_STATUSES } } })
    for (const state of inFlight) {
      try {
        await this.reconcileInFlight(state)
        result.reconciledInFlight++
      } catch (error) {
        result.errors++
        this.logger.warn(`VIP sync in-flight reconciliation failed for ${state.accountId}: ${safeMessage(error)}`)
      }
    }

    // Phase 2: divergence detection. Only accounts with a real VIP history
    // (a VipEntitlement row exists) and an already-provisioned GameServer
    // account (legacyLogin assigned, ACTIVE) are ever considered -- an
    // account that never purchased VIP and was never provisioned has
    // nothing to sync.
    const entitlements = await this.prisma.vipEntitlement.findMany({
      include: { account: { include: { gameIdentity: true } } }
    })
    result.scanned = entitlements.length

    for (const entitlement of entitlements) {
      try {
        const outcome = await this.considerOne(entitlement)
        if (outcome === 'SYNCED') result.synced++
        else if (outcome === 'ALREADY_IN_SYNC') result.alreadyInSync++
      } catch (error) {
        result.errors++
        this.logger.warn(`VIP sync failed for account ${entitlement.accountId}: ${safeMessage(error)}`)
      }
    }
    return result
  }

  private async considerOne(entitlement: EntitlementWithIdentity): Promise<'SYNCED' | 'ALREADY_IN_SYNC' | 'SKIPPED'> {
    const identity = entitlement.account.gameIdentity
    if (!identity || identity.provisioningStatus !== 'ACTIVE' || !identity.legacyLogin) return 'SKIPPED'

    const state = await this.prisma.vipSyncState.findUnique({ where: { accountId: entitlement.accountId } })
    // An in-flight command for this account was already handled in Phase 1
    // of this same tick -- never queue a second one on top of it.
    if (state && IN_FLIGHT_STATUSES.includes(state.lastSyncStatus ?? '')) return 'SKIPPED'

    const effectiveLevel = computeEffectiveLevel(entitlement)
    const lastSyncedLevel = state?.lastSyncedLevel ?? null
    if (lastSyncedLevel === effectiveLevel) return 'ALREADY_IN_SYNC'

    const reason: 'PURCHASE' | 'EXPIRY' | 'RECONCILIATION_DIVERGENCE' =
      effectiveLevel === 0 && (lastSyncedLevel ?? 0) > 0
        ? 'EXPIRY'
        : lastSyncedLevel === null
          ? 'PURCHASE'
          : 'RECONCILIATION_DIVERGENCE'

    const commandId = randomUUID()
    await this.transport.create({
      commandId,
      provisioningRequestId: randomUUID(),
      commandType: 'SYNC_VIP_TIER',
      environment: process.env.GAME_COMMAND_ENVIRONMENT || 'production',
      serverId: process.env.GAME_COMMAND_SERVER_ID || 'bloodmoon-s6',
      legacyLogin: identity.legacyLogin,
      expiresAt: new Date(Date.now() + COMMAND_EXPIRY_MS).toISOString(),
      // Phase L fix: desiredVipExpiresAt required whenever effectiveLevel > 0
      // -- dbo.bm_SyncVipTier now writes MEMB_INFO.AccountExpireDate in the
      // same statement as AccountLevel, closing a real reproduced bug where
      // the native dbo.WZ_GetAccountLevel procedure silently reverted every
      // GameBridge VIP grant on the player's next login (see
      // docs/vip/wz-setaccountlevel-coexistence.md). entitlement.expiresAt
      // is already the Portal's own real, authoritative expiry -- passed
      // through as-is, never recomputed here.
      payload: {
        desiredLevel: effectiveLevel,
        ...(effectiveLevel > 0 && entitlement.expiresAt ? { desiredVipExpiresAt: entitlement.expiresAt.toISOString() } : {})
      }
    })

    await this.prisma.vipSyncState.upsert({
      where: { accountId: entitlement.accountId },
      create: { accountId: entitlement.accountId, lastSyncCommandId: commandId, lastSyncStatus: 'CREATED', lastSyncReason: reason, pendingDesiredLevel: effectiveLevel },
      update: { lastSyncCommandId: commandId, lastSyncStatus: 'CREATED', lastSyncReason: reason, pendingDesiredLevel: effectiveLevel }
    })
    return 'SYNCED'
  }

  // Promotes pendingDesiredLevel -> lastSyncedLevel only once the Worker
  // reports the command SUCCEEDED -- state-transition decisions never
  // depend on detailJson (which is for audit, not a guaranteed-stable
  // machine-readable contract for this service to depend on). Drift
  // OBSERVABILITY is the one deliberate exception (Decision 2): a
  // best-effort log signal, never a state-transition input -- a missing or
  // malformed detailJson degrades to "no drift check this tick", never a
  // thrown error that would break the reconciliation loop.
  private async reconcileInFlight(state: {
    accountId: string
    lastSyncCommandId: string | null
    pendingDesiredLevel: number | null
    lastSyncedLevel: number | null
    driftCount: number
  }) {
    if (!state.lastSyncCommandId) return
    const commandState = await this.transport.get(state.lastSyncCommandId)

    if (commandState.status === 'SUCCEEDED') {
      const drift = this.checkNativeDrift(state, commandState.detailJson)
      await this.prisma.vipSyncState.update({
        where: { accountId: state.accountId },
        data: {
          lastSyncStatus: 'SUCCEEDED',
          lastSyncedLevel: state.pendingDesiredLevel,
          lastSyncedAt: new Date(),
          driftCount: drift.detected ? state.driftCount + 1 : 0,
          lastDriftAt: drift.detected ? new Date() : null
        }
      })
    } else if (commandState.status === 'FAILED_FINAL' || commandState.status === 'EXPIRED') {
      // Left terminal-but-not-synced -- the NEXT tick's Phase 2 will see the
      // still-real divergence (lastSyncedLevel unchanged) and issue a fresh
      // command. No separate retry/backoff bookkeeping needed: re-sending
      // the same desiredLevel is always a safe no-op (plan Part 3B).
      await this.prisma.vipSyncState.update({
        where: { accountId: state.accountId },
        data: { lastSyncStatus: commandState.status }
      })
    }
    // else: still genuinely in flight -- leave as is, poll again next tick.
  }

  // PHASE L DECISION CLOSURE, Decision 2: compares dbo.bm_SyncVipTier's
  // @PreviousLevel (the true AccountLevel the SQL procedure found on the
  // GameServer immediately before this sync's own unconditional overwrite,
  // reported back via detailJson -- see GameCommandProcessor.cs's
  // SerializeVipDetail) against lastSyncedLevel (the level the Portal
  // itself last confirmed synced). A mismatch means something other than
  // this reconciler changed AccountLevel between the two ticks -- the
  // native dbo.WZ_SetAccountLevel coexistence path (currently
  // DORMANT/NO_CONFIRMED_CALLER, docs/vip/wz-setaccountlevel-coexistence.md),
  // a legacy writer, or a manual DBA action. Never throws: a missing/
  // malformed detailJson, or a never-synced-before account
  // (lastSyncedLevel === null, nothing to compare against), both degrade
  // to "no drift check possible this tick" rather than breaking the
  // reconciliation loop over an observability concern.
  //
  // Repair is intrinsic to this same operation, not a separate action --
  // bm_SyncVipTier already unconditionally set AccountLevel back to the
  // Portal's desired state as part of the very sync command whose result
  // we're reading here, so VIP_NATIVE_DRIFT_REPAIRED is logged immediately
  // alongside VIP_NATIVE_DRIFT_DETECTED, never as a delayed follow-up.
  private checkNativeDrift(
    state: { accountId: string; lastSyncedLevel: number | null; driftCount: number },
    detailJson: string | null
  ): { detected: boolean } {
    if (state.lastSyncedLevel === null || !detailJson) return { detected: false }

    let previousLevel: unknown
    try {
      previousLevel = JSON.parse(detailJson)?.previousLevel
    } catch {
      return { detected: false }
    }
    if (typeof previousLevel !== 'number' || previousLevel === state.lastSyncedLevel) return { detected: false }

    const nextDriftCount = state.driftCount + 1
    this.logger.warn(
      `VIP_NATIVE_DRIFT_DETECTED account=${state.accountId} expectedLevel=${state.lastSyncedLevel} actualLevelFound=${previousLevel} occurrence=${nextDriftCount}`
    )
    this.logger.warn(
      `VIP_NATIVE_DRIFT_REPAIRED account=${state.accountId} restoredLevel=${state.lastSyncedLevel} (bm_SyncVipTier's own unconditional overwrite, same command)`
    )
    // Repeated divergence for the same account is a distinct signal from a
    // one-off (a single native write, corrected once): a genuinely
    // recurring pattern means something is repeatedly re-writing
    // AccountLevel out from under the Portal, which this reconciler will
    // keep silently papering over forever unless someone investigates the
    // actual source. Threshold of 3 is a deliberate first cut -- documented
    // as a starting point in docs/vip/wz-setaccountlevel-coexistence.md,
    // not empirically tuned (no real drift has ever been observed; there is
    // no confirmed-active legacy writer today, see Decision 1).
    if (nextDriftCount >= 3) {
      this.logger.error(
        `VIP_NATIVE_DRIFT_REPEATED account=${state.accountId} occurrence=${nextDriftCount} -- recurring native AccountLevel divergence, investigate the source (see docs/vip/wz-setaccountlevel-coexistence.md)`
      )
    }
    return { detected: true }
  }

  // Admin observability (plan Part 3B step 6). Never exposes anything
  // beyond the already-non-sensitive level/status/timestamps -- no price,
  // no payment reference, no entitlement id.
  async listDivergent(): Promise<VipSyncDivergenceRow[]> {
    const entitlements = await this.prisma.vipEntitlement.findMany({
      include: { account: { include: { gameIdentity: true } } }
    })
    const rows: VipSyncDivergenceRow[] = []
    for (const entitlement of entitlements) {
      const identity = entitlement.account.gameIdentity
      if (!identity?.legacyLogin) continue
      const state = await this.prisma.vipSyncState.findUnique({ where: { accountId: entitlement.accountId } })
      const effectiveLevel = computeEffectiveLevel(entitlement)
      const inSync = (state?.lastSyncedLevel ?? null) === effectiveLevel && !IN_FLIGHT_STATUSES.includes(state?.lastSyncStatus ?? '')
      if (inSync) continue
      rows.push({
        accountId: entitlement.accountId,
        legacyLogin: identity.legacyLogin,
        effectiveLevel,
        lastSyncedLevel: state?.lastSyncedLevel ?? null,
        lastSyncStatus: state?.lastSyncStatus ?? null,
        lastSyncCommandId: state?.lastSyncCommandId ?? null,
        lastSyncedAt: state?.lastSyncedAt?.toISOString() ?? null
      })
    }
    return rows
  }

  // Manual admin trigger -- always goes through the same considerOne()
  // divergence-detection logic, never a raw/forced command (mirrors
  // GameProvisioningReconciliationService.manualRetry()'s discipline).
  async manualSync(accountId: string): Promise<{ outcome: string }> {
    return this.withReconciliationLock(
      async () => {
        const entitlement = await this.prisma.vipEntitlement.findUnique({
          where: { accountId },
          include: { account: { include: { gameIdentity: true } } }
        })
        if (!entitlement) throw new Error('VIP_ENTITLEMENT_NOT_FOUND')
        const outcome = await this.considerOne(entitlement)
        return { outcome }
      },
      () => { throw new Error('VIP_SYNC_RECONCILIATION_BUSY') }
    )
  }

  // Same MySQL named-lock pattern as vip-delivery.service.ts /
  // game-provisioning-reconciliation.service.ts -- see either for the full
  // rationale (connection-scoped lock, crash-safe release).
  private async withReconciliationLock<T>(work: () => Promise<T>, whenBusy: () => T): Promise<T> {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('DATABASE_URL_NOT_CONFIGURED')

    const lockUrl = new URL(databaseUrl)
    lockUrl.searchParams.set('connection_limit', '1')
    const lockClient = new PrismaClient({ datasources: { db: { url: lockUrl.toString() } } })
    let acquired = false

    try {
      await lockClient.$connect()
      const rows = await lockClient.$queryRaw<Array<{ acquired: number | bigint | null }>>`
        SELECT GET_LOCK(${RECONCILIATION_LOCK_NAME}, 0) AS acquired
      `
      if (Number(rows[0]?.acquired ?? 0) !== 1) return whenBusy()
      acquired = true

      return await work()
    } finally {
      if (acquired) {
        await lockClient.$queryRaw`
          SELECT RELEASE_LOCK(${RECONCILIATION_LOCK_NAME})
        `
      }
      await lockClient.$disconnect()
    }
  }
}

function computeEffectiveLevel(entitlement: VipEntitlement): 0 | 1 | 2 | 3 {
  if (!entitlement.tier || !entitlement.expiresAt || entitlement.expiresAt.getTime() <= Date.now()) return 0
  return TIER_TO_LEVEL[entitlement.tier] ?? 0
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 191)
}
