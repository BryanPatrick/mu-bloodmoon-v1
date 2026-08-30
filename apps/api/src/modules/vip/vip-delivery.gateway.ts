import { Injectable } from '@nestjs/common'

// Phase 14 Part C. There is no real GameServer bridge connection anywhere
// in this codebase yet -- MU_BRIDGE_ENABLED today only gates a manual
// admin-approval endpoint (marketplace-bridge-dev.controller.ts), and the
// only other project with a real GameServer-facing agent (the Game Data
// Platform plan) is explicitly read-only by construction. Writing directly
// to the production MuOnline SQL Server from apps/api would be exactly the
// "arbitrary SQL through GameBridge" this project has repeatedly forbidden.
//
// So this gateway is honest about what exists: ONE implementation, which
// always reports "not configured" rather than fabricating a fake success.
// The delivery worker (vip-delivery.service.ts) is fully built against this
// interface -- claim/attempt/backoff/ceiling/reconciliation all work today
// against this gateway -- so the day a real GameServer-write path is
// approved and built, only a new class implementing this interface needs
// to be swapped in; nothing about the worker, the retry state machine, or
// the admin visibility endpoints needs to change.

export interface GrantVipDeliveryPayload {
  accountId: string
  tier: string
  expiresAt: string
}

export interface VipDeliveryResult {
  delivered: boolean
  reason?: string
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
