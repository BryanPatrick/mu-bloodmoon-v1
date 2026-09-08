---
status: LIVING_DOCUMENT
category: vip
audience: internal (engineering)
lastVerified: 2026-08-30
---

# VIP — end-to-end data flow (Phase K, Part 10)

Traces the real, already-implemented pipeline from a Portal VIP purchase
to the GameServer's own `AccountLevel` column, end to end, using the
real code (`apps/api/src/modules/vip-sync/`) and the real GameServer
schema (`docs/gameserver/database/`).

## The pipeline (CONFIRMED, real code at every stage)

```
1. Portal VipProductConfig      -- the purchasable VIP product/tier definition (Portal-side)
2. Order / Delivery              -- vip-delivery.service.ts fulfills a paid order
3. VipEntitlement                -- Prisma model: { tier: BRONZE|SILVER|GOLD, expiresAt }
4. VipSyncService (60s poll)     -- computeEffectiveLevel(entitlement): 0-3, 0 if expired/absent
5. GameCommandTransportClient    -- creates a SYNC_VIP_TIER command via the Worker
6. Cloudflare Worker + D1        -- durable command queue (apps/game-data-worker)
7. GameBridge Agent               -- polls, dispatches to the local SQL Server writer
8. dbo.bm_SyncVipTier             -- writes GameServer MEMB_INFO.AccountLevel (0-3)
9. VipSyncState (Portal)          -- lastSyncedLevel promoted only on a real SUCCEEDED report
10. Reconciliation                -- every tick re-detects divergence and re-syncs, forever
```

**Step 4's tier→level mapping** (CONFIRMED, `vip-sync.service.ts`):
`BRONZE=1, SILVER=2, GOLD=3`, and `0` whenever `tier` is null OR
`expiresAt` has passed — expiration is handled by *not finding* an
active entitlement, not by a separate "expired" state machine.

## AL0-3 (CONFIRMED, cross-referenced against `vip-benefit-matrix.md`)

The GameServer engine differentiates exactly **28 of 28** checked
`Common.dat`/`Custom.dat` fields across the four brackets — full detail
in `docs/vip/vip-benefit-matrix.md`; not repeated here. `AL0` is the
GameBridge default/no-VIP state — the same value `SYNC_VIP_TIER` writes
on expiry.

## GRANT_VIP vs. SYNC_VIP_TIER — two different write paths, same column

- **GRANT_VIP** (`bm_GrantVip`): MAX-rule, never downgrades. Used for a
  one-shot "grant this player VIP" action (e.g. an admin grant, a
  purchase-fulfillment event) where the caller wants "at least this
  tier," not "exactly this tier."
- **SYNC_VIP_TIER** (`bm_SyncVipTier`): reconciliation — can raise OR
  lower `AccountLevel` to match the Portal's `computeEffectiveLevel()`
  exactly, including down to 0 on expiry. This is the ONLY path that
  ever downgrades a player's tier, and it is driven exclusively by
  `VipSyncService`'s 60-second poll loop, gated behind
  `VIP_SYNC_RECONCILIATION_ENABLED` (Portal-side) AND the Agent's own
  `GAME_BRIDGE_SYNC_VIP_TIER_ENABLED` kill switch — defense in depth at
  both ends, confirmed in the service's own code comment.

## Real coexistence risk found this round (Phase K, `stored-procedures.md`)

The native GameServer engine has its OWN procedure,
`WZ_SetAccountLevel`/`WZ_GetAccountLevel`, writing/reading the SAME
`MEMB_INFO.AccountLevel` column GameBridge governs. **This was not
resolved this round** — if anything in the live game (an in-game GM
command, a legacy admin tool) ever calls `WZ_SetAccountLevel` directly,
it would silently diverge from the Portal's VIP state until the next
reconciliation tick corrects it (SYNC_VIP_TIER's 60-second loop would
eventually overwrite it back to the Portal-authoritative value — so the
window of divergence is bounded, not permanent, but a real player could
see their VIP tier "flicker" during that window). **REVIEW_REQUIRED**:
confirm with Bryan/product whether any live tooling still calls
`WZ_SetAccountLevel` directly; if so, that tooling needs to be updated
to go through the Portal instead, or the reconciliation window needs to
be tightened.

## Status classification (Bryan's exact taxonomy)

| Stage | Status | Note |
|---|---|---|
| Portal VipProductConfig → Order/Delivery → VipEntitlement | **APPROVED** (already shipped, Phase 13-14) | Not touched this round |
| GameBridge SYNC_VIP_TIER pipeline (steps 4-9 above) | **APPROVED** (already shipped, validated this round against real 138-table schema — `account-data-map.md`) | |
| `WZ_SetAccountLevel` coexistence risk | **PENDING_BALANCE_DECISION** | Needs a product/engineering decision, not a code change made unilaterally this round |
| Multi-agent/multi-server VIP sync | **DISABLED** (by design — Phase 1 has exactly one Agent; the `source`/`server_id`-scoped sequence guard exists in the schema but is untested-by-design) | See `apps/game-data-worker` docs |
| A second, independent legacy VIP system (`DmN_Vip_*`) | **REJECTED** (dormant, zero real rows, not wired into anything — `legacy-unknown-structures.md`) | No action needed unless revived |

## What this document does NOT claim

This traces the pipeline's real, already-built shape — it does not
re-derive or re-verify the 28-field benefit matrix (`vip-benefit-matrix.md`
already did that work) and does not resolve the `WZ_SetAccountLevel`
coexistence risk, which is reported as an open finding for Bryan/product,
not silently closed here.
