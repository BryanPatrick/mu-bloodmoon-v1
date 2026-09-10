---
status: SUPERSEDED (partially) — see 2026-09-08 note below; original
  Phase V content preserved as historical record, never deleted
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED (effective values) / real product classification (policy status) — AT PHASE V TIME ONLY, see below
---

**SUPERSEDES note (2026-09-08)**: two real changes since this document
was written have NOT been reflected in the tables below (kept as
historical record, not edited in place):

1. **Reset cap** (Part 1, and the `reset.cap` row further down): the
   "CLOSED decision... reset cap = 20 for all four tiers" ruling this
   document presents as final was **reopened by the project owner**.
   Current status: `RESET_CAP_STATUS = UNRESOLVED`. No cap value should
   be treated as decided. See
   `docs/decisions/0029-progression-reset-policy-current-ruling.md` for
   the current, authoritative ruling.
2. **Reset stat points** (the `reset.stat_points` row further down,
   shown here as `EFFECTIVE_BUT_UNAPPROVED`): this was superseded in
   Fase AD (2026-09-05) — the current, approved policy is Free (AL0) =
   450, Bronze/Silver/Gold (AL1-3) = 500, `policyStatus = APPROVED`.
   Also formalized in ADR-0029.

Everything else in this document (the underlying effective GameServer
values, the general policyStatus/driftStatus distinction it explains)
remains accurate.

# VIP progression policy drift matrix — Phase V Parts 1/2

## Why this document exists

Phase U built a real, working Portal control plane for progression
settings and correctly reported the *effective* GameServer values for
every AL0-3 tier. It did **not** claim any of those values were
approved Blood Moon product policy — but nothing forced that
distinction to be explicit anywhere. Bryan's own instruction this
phase: *"Phase U confirmed effective AccountLevel values... These are
EFFECTIVE CONFIG VALUES. They are NOT automatically approved Blood
Moon VIP benefits."* This matrix is the explicit, persisted answer to
that instruction — every progression setting now carries a real
`policyStatus` column, separate from its technical `driftStatus`, in
`ProgressionConfigItem` (`docs/decisions/0026-progression-evidence-and-balance-readiness.md`).

## Part 1 — Reset cap, formalized (the one CLOSED decision this phase)

| Tier | Effective (GameServer) | Approved product policy | Status |
|---|---|---|---|
| Free (AL0) | 20 | 20 | `APPROVED` (matches) |
| Bronze (AL1) | 20 | 20 | `APPROVED` (matches) |
| Silver (AL2) | 20 | 20 | `APPROVED` (matches) |
| **Gold (AL3)** | **50** | **20** | **`POLICY_DRIFT`** |

Bryan's final, dated ruling (Fase V, 2026-09-04): **reset cap = 20 for
all four tiers, no exception.** Gold's real, current GameServer value
(50) is 2.5x the approved policy. This is now persisted as
`ProgressionConfigItem`'s `reset.cap` row: `desiredValue =
{AL0:20,AL1:20,AL2:20,AL3:20}`, `policyStatus = POLICY_DRIFT`. **No
GameServer sync was performed** — the real value stays 50 for Gold
until a future, separately-authorized runtime-sync phase (blocked on
`PROGRESSION_RUNTIME_SYNC = BLOCKED_BY_RUNTIME_EVIDENCE`, see Decision
2 below). Bryan's own stated reason, preserved verbatim in the row's
`desiredReason`: *"VIP pode oferecer aceleração/conveniência
controlada, mas não pode oferecer um destino de progressão permanente
indisponível ao F2P."*

## Part 2 — Full VIP progression policy matrix

Every progression-relevant tiered setting, real effective values
(re-confirmed this phase — `Common.dat`/`Command.dat` hash-checked live
against production), and its real business-approval status. **Discovery
is not approval** — a row only becomes `APPROVED` when Bryan makes a
real, dated decision about it, exactly as happened for `reset.cap`
above. No other row was silently promoted.

| Setting | Free (AL0) | Bronze (AL1) | Silver (AL2) | Gold (AL3) | Approved product policy | Status |
|---|---|---|---|---|---|---|
| XP rate (`xp.rate`) | 50 | 60 | 60 | 60 | none yet | `EFFECTIVE_BUT_UNAPPROVED` |
| Master XP rate (`xp.master_rate`) | 20 | 22 | 22 | 22 | none yet | `EFFECTIVE_BUT_UNAPPROVED` |
| Item drop rate (`drop.item_rate`) | 100 | 120 | 120 | 120 | none yet | `EFFECTIVE_BUT_UNAPPROVED` |
| Zen drop rate (`drop.zen_rate`) | 10 | 12 | 12 | 12 | none yet | `EFFECTIVE_BUT_UNAPPROVED` |
| **Reset cap (`reset.cap`)** | 20 | 20 | 20 | **50** | **20 (all tiers)** | **`POLICY_DRIFT`** |
| Reset stat points (`reset.stat_points`) | 450 | 500 | 500 | 500 | none yet | `EFFECTIVE_BUT_UNAPPROVED` |
| Reset cost (`reset.money_cost`) | 0 | 0 | 0 | 0 | none yet (not differentiated today) | `NOT_EVALUATED` |
| Event XP rate (`xp.event_rate`) | 300 | 300 | 300 | 300 | none yet (flat, not a VIP benefit) | `NOT_EVALUATED` |
| Quest XP rate (`xp.quest_rate`) | 100 | 100 | 100 | 100 | none yet (flat) | `NOT_EVALUATED` |
| Reset level required (`reset.level_required`) | 400 | 400 | 400 | 400 | none yet (flat) | `NOT_EVALUATED` |
| Reset start level (`reset.start_level`) | 1 | 1 | 1 | 1 | none yet (flat) | `NOT_EVALUATED` |
| Master Reset (all 7 tiered fields) | — | — | — | — | not a current product decision | `DISABLED` (mechanism off) |

**Reading this table correctly**: `EFFECTIVE_BUT_UNAPPROVED` is not a
problem to fix — it is the honest, correct default state for every
real VIP-differentiated setting that Bryan has not yet made a specific
product ruling about. It means exactly what it says: this is what the
GameServer currently does, and product has not yet said whether that's
the intended final policy. Only `reset.cap` has moved past that state,
because only `reset.cap` received an explicit, dated decision this
phase.

## Part 19 — the same distinction applies to DROP, not just XP

Per Bryan's explicit instruction, `drop.item_rate` and `drop.zen_rate`
are governed by the identical rule: their real, current tier
differentiation (Free 100/10 vs Gold 120/12) is `EFFECTIVE_BUT_UNAPPROVED`,
not a silently-inherited VIP benefit. No drop value was reclassified
`APPROVED` this phase — only `reset.cap`'s policy conflict was resolved,
because only `reset.cap` had a real Bryan ruling behind it.

## What would need to happen for a row to move to APPROVED

A `ProgressionConfigItem` row's `policyStatus` becomes `APPROVED` only
when: (1) Bryan makes a real, dated product decision about that
specific setting (matching the reset.cap precedent above), and (2) that
decision is persisted with a real `desiredReason` citing the decision.
No automated process, reseed, or "it's already live" reasoning may set
`APPROVED` — enforced by `progression-config-seed-data.ts`'s own seed
classifications (every seeded default is `NOT_EVALUATED`,
`EFFECTIVE_BUT_UNAPPROVED`, or `DISABLED`, never `APPROVED`), and by
this phase's own live test (`VIP_EFFECTIVE_CONFIG_NOT_AUTO_APPROVED`).

## Related systems

`docs/decisions/0026-progression-evidence-and-balance-readiness.md`,
`docs/progression/progression-config-field-matrix.md` (Phase U's
original field matrix — technical values unchanged, this document adds
the business-approval axis on top),
`apps/api/src/modules/progression/progression-config-seed-data.ts`,
`apps/api/test/progression-policy-phase-v.e2e-spec.ts`.
