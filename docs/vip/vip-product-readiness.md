---
status: DRAFT_FOR_REVIEW
category: vip
audience: internal (product + engineering)
lastVerified: 2026-08-30
---

# VIP Product Readiness — Phase 14 Part C

Direct answer to "make VIP fully technically ready, not postponed": everything on the *portal* side of a VIP purchase is now real, tested, and idempotent end-to-end. What remains withheld is exactly two things — real GameServer delivery, and Bryan's pricing/benefit numbers — both explicitly out of this phase's authority to supply.

## Ready today (built and tested, Phase 13 + Phase 14)

| Capability | Status | Evidence |
|---|---|---|
| Product catalog (tier × duration × price, per-currency) | READY | `VipProductConfig`, admin CRUD via `admin/vip/products` |
| Purchase flow (debit → entitlement → grant → bridge job, one transaction) | READY | `vip.service.ts#purchase()`, 11/11 tests in `vip-foundation.e2e-spec.ts` |
| Idempotency (duplicate purchase request never double-charges or double-grants) | READY | Client-supplied `idempotencyKey`, unique-constrained on `VipGrant` |
| Extend-while-active (repurchase before expiry adds days rather than resetting) | READY | `purchase()`'s `baseExpiry` logic, tested |
| Expiration (status flips to EXPIRED once `expiresAt` passes, no separate cron needed) | READY | `mapEntitlement()` computes `isActiveNow` from `expiresAt` at read time |
| Audit trail (every purchase, product change, benefit-config change) | READY | `AuditService.record()` calls on every mutating path |
| GameServer delivery queueing | READY | `GameBridgeJob(operation=GRANT_VIP)` created transactionally with the grant |
| **GameServer delivery worker** (new this phase) | READY (queue-processing side) | `VipDeliveryService` — claim/attempt/backoff/ceiling, crash-safe (stale-PROCESSING recovery), concurrency-safe (atomic claim), 7/7 tests in `vip-delivery.e2e-spec.ts` |
| **Failed-delivery visibility** (new this phase) | READY | `GET admin/vip/delivery` (jobs needing attention), manual retry endpoint |
| **Portal/GameServer state reconciliation** (new this phase) | READY | `GET admin/vip/delivery/drift` — flags any ACTIVE entitlement whose GameBridge sync never completed, without auto-"fixing" anything unsafe |
| Rollback safety (a failed purchase leaves no partial state) | READY | Whole purchase runs in one Prisma `$transaction` |

## Explicitly still withheld — genuine blockers, not deferred-for-convenience

| Gap | Why it's withheld | Blocker category |
|---|---|---|
| **Actual GameServer-side VIP grant** | `VipDeliveryService` is fully built against a `VipGameBridgeGateway` interface, but the only implementation (`UnconfiguredVipGameBridgeGateway`) honestly reports "not configured" — there is no real, sanctioned write path from apps/api (or any other project component, including the read-only-by-design Game Data Platform Agent) into the production MuOnline SQL Server today. | **Missing external credential / unavailable production access** — writing directly would also be exactly the "arbitrary SQL through GameBridge" every prior phase has explicitly forbidden. |
| **Pricing** (`VipProductConfig.price`) | Every row defaults to `price=0`/`enabled=false`. Setting a real price is Bryan's decision (Phase 11's `ECONOMY_PRODUCT_DECISIONS.md` explicitly names Bronze/Silver/Gold tiers and 7/15/30 day durations but never a price). | **Missing product decision.** |
| **Benefit values** (`VipBenefitConfig`) | `upsertBenefitConfig()` still hard-clamps every bonus to 0/disabled regardless of admin input, by explicit design carried over from Phase 13. This phase's benefit-matrix audit (`vip-benefit-matrix.md`) surfaced far more real, differentiated GameServer benefits than previously known (28 confirmed fields) — but surfacing what the engine *can* do is not the same as Bryan *approving* which of those apply to which paid tier. | **Missing product decision**, now with much better evidence to decide from. |
| Class-change command benefit (AL3-only, found this phase) | A structural, non-power-level benefit type Phase 11's VIP design docs never mentioned. Needs its own explicit yes/no. | **Missing product decision.** |

## What "fully technically ready" means here, precisely

If Bryan approves a price and flips `enabled=true` on a `VipProductConfig` row tomorrow, a real player could complete a real purchase, get a real, correctly-idempotent, correctly-extended `VipEntitlement`, and the system would correctly and visibly track that the GameServer side hasn't caught up yet (via the drift endpoint) rather than silently lying about it. The **only** thing standing between "config flip" and "fully working VIP, in-game effect included" is a real GameServer bridge write path — which is a separate, larger infrastructure project (see the Game Data Platform plan, which is deliberately read-only in its first phase) — not anything left unbuilt or half-finished in this phase's scope.
