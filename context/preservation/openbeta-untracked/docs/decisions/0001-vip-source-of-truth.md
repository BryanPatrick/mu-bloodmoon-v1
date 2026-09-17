---
status: ACTIVE
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0001: Portal is the VIP source of truth, not the GameServer

**DATE**: 2026-08-31 (Phase L Decision Closure, Decision 2)
**STATUS**: ACTIVE

## CONTEXT

A critical bug was found and reproduced: `dbo.bm_GrantVip`/
`dbo.bm_SyncVipTier` (GameBridge's own VIP-writing procedures) wrote
`MEMB_INFO.AccountLevel` but never `AccountExpireDate`. The native
`dbo.WZ_GetAccountLevel` procedure — fired on every player login —
checks `AccountLevel <> 0 AND GETDATE() > AccountExpireDate` and silently
reverts `AccountLevel` to 0 if true. Since `AccountExpireDate` defaults to
`1900-01-01`, every GameBridge VIP grant would have been erased on the
player's very next login. Full technical detail:
`docs/vip/wz-setaccountlevel-coexistence.md`.

Separately, a legacy PHP admin panel (`hostbr-web`, see
`docs/legacy/provider-web/`) has its own VIP concept
(`tasks/RemoveExpiredVip.php` directly zeroes `AccountLevel`,
`SynchronizeVip.php` mirrors GameServer state into legacy bookkeeping
tables) — raising the question of whether the GameServer's own native
`WZ_SetAccountLevel` mechanism, or this legacy panel, should be treated as
authoritative alongside or instead of the Portal.

## DECISION

The Blood Moon **Portal** is the VIP source of truth. The GameServer is
**not** the commercial source of truth. The official architecture:

```
VipProduct → Order → Payment → Delivery → VipEntitlement (Portal, authoritative)
  → GameBridge (GRANT_VIP / SYNC_VIP_TIER)
  → AccountLevel + AccountExpireDate (GameServer, a projection, never the truth)
  → native login validation (WZ_GetAccountLevel)
  → reconciliation (vip-sync.service.ts, every 60s)
```

The GameBridge fix (write `AccountExpireDate` atomically with
`AccountLevel`, see `docs/vip/wz-setaccountlevel-coexistence.md`) is
**obligatory** — a VIP grant is not considered delivered if only
`AccountLevel` is correct.

`dbo.WZ_SetAccountLevel` must be **preserved** for native engine
compatibility (something in the compiled GameServer binary may call it;
this cannot be confirmed from source since the binaries are packed) but
must **never** become a second source of truth or be exposed as a new
commercial flow. Current status: **DORMANT / NO_CONFIRMED_CALLER**.
Preserve until there is sufficient evidence to justify removing it.

If any native mechanism alters `AccountLevel` outside the Portal's
knowledge, `VipEntitlement` remains authoritative and `bm_SyncVipTier`
must detect the divergence (via its `@PreviousLevel` OUTPUT) and restore
both the desired `AccountLevel` and `AccountExpireDate`. See ADR-0002 and
the "VIP native drift detection" section of
`docs/vip/wz-setaccountlevel-coexistence.md` for the implemented
observability (`VIP_NATIVE_DRIFT_DETECTED`/`REPAIRED`/`REPEATED` in
`vip-sync.service.ts`).

If any legacy VIP writer (the `hostbr-web` panel or another) is found to
be **really active** in production, silent coexistence is not permitted —
it must be mapped and a disposition chosen: DISABLE, ADAPT,
ROUTE_TO_PORTAL, or RETAIN_WITH_REASON, before production rollout of any
GameBridge VIP command.

## WHY

Two systems both believing they own the truth about a player's paid
entitlement is a direct path to silent data loss (the exact bug this
decision responds to) or, worse, a player losing a paid benefit with no
record of why. A single source of truth, with the GameServer treated as a
projection that gets *synced to* rather than *read from* for
authoritative state, eliminates that class of bug by construction — the
reconciler's job becomes "make the projection match the truth," not
"figure out which of two truths is correct."

## ALTERNATIVES CONSIDERED

- **GameServer as source of truth**: rejected — the native engine has no
  concept of orders, payments, or entitlements; `AccountLevel` alone
  cannot express "why" or "until when" in a commercially meaningful way,
  and the native login-check's own silent-revert behavior (the bug this
  fix closes) makes it actively hostile to being trusted as authoritative
  without constant, correct syncing from elsewhere anyway.
- **Dual source of truth with conflict resolution**: rejected as
  unnecessary complexity — see WHY above; a single owner with one-way
  sync is simpler and has no conflict-resolution logic to get wrong.
- **Remove `WZ_SetAccountLevel` entirely**: rejected for now — its real
  caller (if any) inside the compiled GameServer engine cannot be
  confirmed from source (binaries are packed), so removing it carries
  unknown risk for unclear benefit. Preserve-but-never-rely-on is the
  safer interim position.

## CONSEQUENCES

- `bm_GrantVip`/`bm_SyncVipTier` require `@ExpiresAt`/`@DesiredExpiresAt`
  as mandatory parameters — a caller that forgets one gets `INVALID_INPUT`
  immediately rather than silently reproducing the original bug.
- The Portal's reconciler (`vip-sync.service.ts`) is the only code
  permitted to decide desired VIP state; the GameServer is never queried
  as an input to that decision, only as a target to write to.
- Drift detection/repair logging exists (ADR-0002) specifically because
  this decision accepts that the GameServer's state *can* diverge (native
  writes, legacy writers, manual DBA action) — the design assumes
  divergence will happen occasionally and must be observable, not that it
  can be prevented outright.
- If `hostbr-web` or an equivalent legacy writer is ever found active in
  production, this decision requires an explicit disposition before any
  further GameBridge VIP rollout — it is not something a future session
  can silently work around.

## RELATED SYSTEMS

`apps/api/src/modules/vip-sync/vip-sync.service.ts`,
`apps/game-bridge-agent` (`bm_GrantVip`/`bm_SyncVipTier`),
`docs/vip/wz-setaccountlevel-coexistence.md`,
`docs/legacy/provider-web/vip-legacy.md`, ADR-0002.
