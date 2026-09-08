import { Injectable } from '@nestjs/common'

// Phase 14 Part C originally found no real GameServer bridge connection
// anywhere in this codebase. ~~Writing directly to the production MuOnline
// SQL Server from apps/api would be exactly the "arbitrary SQL through
// GameBridge" this project has repeatedly forbidden.~~ **CORRECTION,
// Phase O (2026-08-31)**: that concern no longer applies -- a real,
// least-privilege GameBridge command channel was built and tested in
// Phase L/M (docs/decisions/0002-gamebridge-least-privilege-and-sql-audit.md):
// GameCommandTransportClient sends HMAC-signed GRANT_VIP/SYNC_VIP_TIER
// commands through the Cloudflare Worker to the GameBridge Agent, which
// calls EXECUTE-only, named stored procedures (bm_GrantVip/bm_SyncVipTier)
// -- never arbitrary SQL. GameBridgeVipGateway (game-bridge-vip.gateway.ts)
// is the real implementation using this exact channel, wired in as of this
// phase. UnconfiguredVipGameBridgeGateway (below) remains as the honest
// fallback this file always used when the transport isn't configured
// (GAME_DATA_WORKER_URL/GAME_COMMAND_PORTAL_SECRET unset) -- reporting
// "not configured" rather than fabricating a fake success, exactly as
// originally designed.
//
// The delivery worker (vip-delivery.service.ts) is built against this
// interface -- claim/attempt/backoff/ceiling/reconciliation all work
// unchanged regardless of which gateway implementation is behind it.

export interface GrantVipDeliveryPayload {
  accountId: string
  tier: string
  expiresAt: string
  // Set by the gateway itself on a first submission attempt that hasn't
  // yet confirmed completion (see GameBridgeVipGateway) -- carried forward
  // by vip-delivery.service.ts's retry-persistence so a later attempt polls
  // the SAME in-flight GameBridge command instead of submitting a new one.
  // Submitting a fresh GRANT_VIP is also safe on its own (bm_GrantVip's
  // MAX-rule makes repeat grants idempotent) -- this field exists to avoid
  // needlessly piling up redundant commands/audit rows, not for
  // correctness.
  gameCommandId?: string
}

export interface VipDeliveryResult {
  delivered: boolean
  reason?: string
  // On a terminal outcome (delivered:true, or a final failure), this is
  // stored as the GameBridgeJob's own result/error detail for admin
  // visibility. On a non-terminal "still working on it" outcome
  // (delivered:false with an in-flight command), the gateway may set
  // `carryForward` fields here (see gameCommandId above) that
  // vip-delivery.service.ts merges back into the job's payload so the
  // NEXT retry attempt can resume rather than starting over.
  detail?: Record<string, unknown>
}

export interface VipGameBridgeGateway {
  deliver(payload: GrantVipDeliveryPayload): Promise<VipDeliveryResult>
}

@Injectable()
export class UnconfiguredVipGameBridgeGateway implements VipGameBridgeGateway {
  async deliver(): Promise<VipDeliveryResult> {
    return { delivered: false, reason: 'GAME_BRIDGE_NOT_CONFIGURED' }
  }
}
