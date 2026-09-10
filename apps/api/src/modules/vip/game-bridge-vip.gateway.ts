import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { GameCommandTransportClient } from '../game-account-identity/game-command-transport.client'
import type { GrantVipDeliveryPayload, VipDeliveryResult, VipGameBridgeGateway } from './vip-delivery.gateway'

// PHASE O (2026-08-31): the real GameBridge-backed implementation of
// VipGameBridgeGateway, using the least-privilege command channel built
// and tested in Phase L/M (docs/decisions/0002-gamebridge-least-privilege-and-sql-audit.md,
// docs/decisions/0010-vip-tier-product-naming-abstraction.md). See
// vip-delivery.gateway.ts's header comment for why this supersedes the
// original "no real bridge exists" assumption.
//
// Two-phase submit-then-poll, because a GameCommandTransportClient.create()
// call only enqueues the command -- the GameBridge Agent picks it up
// asynchronously (its own poll interval), so the command is essentially
// never SUCCEEDED by the time this method could check. Phase 1 (no
// gameCommandId in payload yet): submit, return delivered:false with the
// new commandId carried forward (never claims success it hasn't seen).
// Phase 2 (gameCommandId present, a retry): poll that SAME command's
// state via GameCommandTransportClient.get() -- SUCCEEDED becomes
// delivered:true, FAILED_FINAL/EXPIRED becomes a final failure (the
// worker's own MAX_ATTEMPTS ceiling still applies on top of this),
// anything else (CREATED/QUEUED/AVAILABLE/CLAIMED/FAILED_RETRYABLE)
// keeps carrying the same commandId forward and retries later.
//
// Resubmitting a fresh GRANT_VIP instead of polling would ALSO be safe
// (dbo.bm_GrantVip's MAX-rule makes repeat grants idempotent, see
// ADR-0002) -- polling the same commandId first is purely to avoid
// piling up redundant commands/audit rows on every retry tick, not a
// correctness requirement.
const TIER_TO_LEVEL: Record<string, 1 | 2 | 3> = { BRONZE: 1, SILVER: 2, GOLD: 3 }
const COMMAND_EXPIRY_MS = 60 * 60_000

@Injectable()
export class GameBridgeVipGateway implements VipGameBridgeGateway {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transport: GameCommandTransportClient
  ) {}

  async deliver(payload: GrantVipDeliveryPayload): Promise<VipDeliveryResult> {
    if (!process.env.GAME_DATA_WORKER_URL || !process.env.GAME_COMMAND_PORTAL_SECRET) {
      return { delivered: false, reason: 'GAME_BRIDGE_NOT_CONFIGURED' }
    }

    const targetLevel = TIER_TO_LEVEL[payload.tier]
    if (!targetLevel) {
      // Not retryable -- a tier name that never maps to AL1-3 will never
      // start mapping on a later attempt. The worker still applies its own
      // MAX_ATTEMPTS ceiling on top of repeated non-retryable failures,
      // but there is no reason to wait for it here.
      return { delivered: false, reason: `UNKNOWN_VIP_TIER:${payload.tier}` }
    }

    const identity = await this.prisma.gameAccountIdentity.findUnique({ where: { accountId: payload.accountId } })
    if (!identity?.legacyLogin || identity.provisioningStatus !== 'ACTIVE') {
      // Genuinely retryable -- provisioning can still be in flight when a
      // VIP purchase happens close to registration.
      return { delivered: false, reason: 'GAME_ACCOUNT_NOT_PROVISIONED' }
    }

    if (payload.gameCommandId) {
      return this.pollExisting(payload.gameCommandId)
    }
    return this.submitNew(identity.legacyLogin, targetLevel, payload.expiresAt)
  }

  private async submitNew(legacyLogin: string, targetLevel: 1 | 2 | 3, expiresAt: string): Promise<VipDeliveryResult> {
    const commandId = randomUUID()
    try {
      await this.transport.create({
        commandId,
        provisioningRequestId: randomUUID(),
        commandType: 'GRANT_VIP',
        environment: process.env.GAME_COMMAND_ENVIRONMENT || 'production',
        serverId: process.env.GAME_COMMAND_SERVER_ID || 'bloodmoon-s6',
        legacyLogin,
        // Command queue TTL (the envelope's own expiresAt, unrelated to
        // the VIP entitlement's expiresAt -- see game-command-transport.client.ts's
        // naming-collision comment for why vipExpiresAt is a separate field).
        expiresAt: new Date(Date.now() + COMMAND_EXPIRY_MS).toISOString(),
        payload: { targetLevel, vipExpiresAt: expiresAt }
      })
    } catch (error) {
      return { delivered: false, reason: safeMessage(error) }
    }
    return { delivered: false, reason: 'GAME_COMMAND_SUBMITTED_AWAITING_CONFIRMATION', detail: { gameCommandId: commandId } }
  }

  private async pollExisting(commandId: string): Promise<VipDeliveryResult> {
    let state: Awaited<ReturnType<GameCommandTransportClient['get']>>
    try {
      state = await this.transport.get(commandId)
    } catch (error) {
      // Transport/network failure polling a real in-flight command --
      // keep carrying the same commandId forward, do not resubmit.
      return { delivered: false, reason: safeMessage(error), detail: { gameCommandId: commandId } }
    }

    if (state.status === 'SUCCEEDED') {
      return { delivered: true, detail: { gameCommandId: commandId, resultCode: state.resultCode, membGuid: state.membGuid } }
    }
    if (state.status === 'FAILED_FINAL' || state.status === 'EXPIRED') {
      // Terminal failure for THIS command -- but GRANT_VIP is idempotent
      // (ADR-0002's MAX-rule), so if the worker still has retry budget, the
      // next attempt is safe to submit a brand-new command rather than
      // being stuck polling a command that will never succeed.
      //
      // REAL BUG found and fixed during this phase's own review (before
      // any test caught it): omitting `detail` entirely here does NOT
      // clear the dead commandId -- vip-delivery.service.ts's merge
      // (`{...payload, ...outcome.detail}`) only overwrites keys actually
      // present in `detail`; an absent `detail` leaves the stale
      // gameCommandId from the PRIOR attempt's payload untouched, which
      // would make every future retry poll the same permanently-dead
      // command forever instead of ever submitting a fresh one.
      // Explicitly setting gameCommandId: undefined here overwrites the
      // key (JSON serialization then drops it), which is what actually
      // makes submitNew() run again next attempt.
      return { delivered: false, reason: `GAME_COMMAND_${state.status}:${state.resultCode ?? 'UNKNOWN'}`, detail: { gameCommandId: undefined } }
    }
    // CREATED / QUEUED / AVAILABLE / CLAIMED / FAILED_RETRYABLE -- still
    // genuinely in flight or the Agent's own retry is still working on it.
    return { delivered: false, reason: `GAME_COMMAND_${state.status}`, detail: { gameCommandId: commandId } }
  }
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 500)
}
