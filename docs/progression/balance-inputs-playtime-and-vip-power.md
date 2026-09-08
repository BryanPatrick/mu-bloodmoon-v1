---
status: ACTIVE — arithmetic only, no XP/drop assumptions
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED for reset-stat-point arithmetic (real, deterministic config values); playtime scenarios explicitly illustrative
---

# Playtime model, reset-stat-point audit, VIP final-power audit — Phase W Parts 14-19

## Part 14 — Playtime balance model (arithmetic only)

Three scenarios, exactly as specified this phase (distinct labels from
Phase V's own illustrative CASUAL/REGULAR/HEAVY table in
`reset-audit-and-time-to-reset-model.md` — that table is not
superseded, it used different placeholder numbers; this is a fresh,
separately-requested scenario set):

| Scenario | Hours/day | Hours/week | Hours/reset at 2 resets/week | Hours/reset at 3 resets/week |
|---|---|---|---|---|
| CASUAL | 1h | 7h | 3.5h | 2.33h |
| REGULAR | 2h | 14h | 7h | 4.67h |
| HARDCORE | 4h | 28h | 14h | 9.33h |

Pure arithmetic (`hours/day × 7` for the weekly total; weekly total
÷ resets/week for the per-reset target). No XP rate, kill speed, or
formula assumption is used anywhere in this table — it says nothing
about whether a given scenario's implied hours/reset is actually
achievable, only what it would require if it were.

```
PLAYTIME_SCENARIO_MATH = READY (pure arithmetic, no XP assumption)
```

## Part 15 — Balance reference profile

```
BALANCE_REFERENCE_PROFILE = REGULAR (~2h/day, ~14h/week)
STATUS = ~~OWNER_APPROVAL_REQUIRED~~ CONFIRMED (Bryan, Phase X,
  2026-09-04, Decision 3) -- 2-3 resets/week now translates to
  approximately 7h/reset (2/week) to approximately 4h40/reset (3/week)
```

**Why REGULAR is proposed, not CASUAL or HARDCORE**: a reference
profile used for balance math should represent a realistic "normal
active player," not the lightest-touch player (which would make
every other player's progression feel too fast) or the heaviest
(which would make normal players feel the game is grindy). 2h/day is
a common mid-point assumption in this genre. **This is a proposal
only** — it has no effect on any config value, and per this project's
own discipline (matching how `reset.cap`'s policy was formalized in
Phase V), it must not be treated as final until Bryan explicitly
confirms it or picks a different reference point. Once confirmed, it
should be persisted as a real, dated decision the same way `reset.cap`
was.

## Part 16 — Reset stat-point accumulation audit

Real, deterministic values, already confirmed in
[`reset-audit-and-time-to-reset-model.md`](reset-audit-and-time-to-reset-model.md)
Part 11 (`Command.dat`, hash-unchanged since Phase 11): Free = 450
points/reset, Bronze/Silver/Gold = 500 points/reset.

| Resets | Free (AL0) | Bronze (AL1) | Silver (AL2) | Gold (AL3) |
|---|---|---|---|---|
| 1 | 450 | 500 | 500 | 500 |
| 5 | 2,250 | 2,500 | 2,500 | 2,500 |
| 10 | 4,500 | 5,000 | 5,000 | 5,000 |
| 20 | 9,000 | 10,000 | 10,000 | 10,000 |

(Computed via `totalResetStatPoints()`,
`apps/api/src/modules/progression/progression-simulator.ts` — real
code, no balance judgment made about whether these numbers are
"fine.")

## Part 17 — VIP final-power audit

Every confirmed progression tier difference, classified per the four
categories Bryan specified. **Two states are shown separately where
they differ** — CURRENT EFFECTIVE (what the GameServer does today) and
UNDER APPROVED POLICY (what Bryan's Phase V `reset.cap` ruling implies
once synced) — because conflating them would misclassify `reset.cap`.

| Setting | Tier difference | Current effective example | Classification | Reasoning |
|---|---|---|---|---|
| `xp.rate` (50/60/60/60) | speed multiplier | affects time-to-level only | `ACCELERATION_ONLY` | A rate multiplier changes how fast any tier reaches a given state, not what state is ultimately reachable — assuming no other mechanism caps total achievable level (none found; `MaxLevel=400` is flat for all tiers) |
| `xp.master_rate` (20/22/22/22) | speed multiplier | Master Reset mechanism itself `DISABLED` | `ACCELERATION_ONLY` | Same reasoning as `xp.rate`; currently has zero live effect since Master Reset is off |
| `drop.item_rate` (100/120/120/120) | drop-frequency multiplier | unknown point value — items, not points | `UNKNOWN` | Genuinely depends on whether any droppable item is supply-constrained (limited-run, one-of-a-kind, bind-on-pickup with no re-source) in this economy — not established either way this phase. If every item is inexhaustibly available given enough time to any tier, this is `ACCELERATION_ONLY`; if any item has real scarcity, faster acquisition is a real edge. Not resolved — flagged, not guessed |
| `drop.zen_rate` (10/12/12/12) | currency-generation multiplier | Zen has no confirmed supply cap in this config | `CONVENIENCE` | A faster Zen rate only saves time; nothing in the confirmed config makes Zen a scarce, capped resource a Free player could be permanently locked out of |
| `reset.cap` — **CURRENT EFFECTIVE** (20/20/20/**50**) | hard ceiling on total resets | Gold could reach 50 resets vs. 20 for every other tier | **`FINAL_POWER_ADVANTAGE`** | A hard per-tier ceiling on a stat-generating action is a final-power gap by definition, not a speed gap — this is exactly why Bryan classified it `POLICY_DRIFT` in Phase V and ruled it should not exist |
| `reset.cap` — **UNDER APPROVED POLICY** (20/20/20/20) | none (equalized) | all tiers reach the same 20 | N/A | Once synced (still `BLOCKED_BY_RUNTIME_EVIDENCE`), this setting stops differentiating tiers at all |
| **`reset.stat_points`** (450/500/500/500) | **per-reset point YIELD, not speed** | at 20 resets each: Free=9,000, others=10,000 | **`FINAL_POWER_ADVANTAGE`** | **The one confirmed VIP advantage that survives the reset-cap fix.** This is not a rate multiplier — it changes the actual yield per action. A Free-tier player who reaches all 20 resets, matching a paying player's effort and cadence exactly, is still permanently 1,000 stat points behind. No amount of additional playtime closes this specific gap for a Free player, unlike every `ACCELERATION_ONLY`/`CONVENIENCE` row above |

```
CONFIRMED_FINAL_POWER_ADVANTAGES = [reset.cap (current effective state
  only, resolves once policy syncs), reset.stat_points (persists even
  after reset.cap syncs)]
CONFIRMED_ACCELERATION_ONLY = [xp.rate, xp.master_rate]
CONFIRMED_CONVENIENCE = [drop.zen_rate]
UNKNOWN = [drop.item_rate]
```

**This is a real, previously-unstated finding**: even after the
`reset.cap` policy drift is fixed exactly as Bryan ordered, Blood
Moon's VIP tiers still confer a genuine, permanent power ceiling
difference via `reset.stat_points` — not a convenience or acceleration
effect. Whether that's the intended design (VIP giving *some* real
final-power edge, just a bounded one) or something Bryan would also
want flagged as `POLICY_DRIFT` the way `reset.cap` was is a real
product question this document surfaces but does not answer — no
recommendation is made here about whether 450 vs. 500 is acceptable.

## Part 18 — 20-reset end-state comparison, exact stat-point totals only

| Tier | Stat points at 20 resets (approved-policy state, all capped at 20) | Stat points at current effective cap (Gold=50) |
|---|---|---|
| Free (AL0) | 9,000 | 9,000 (cap already 20) |
| Bronze (AL1) | 10,000 | 10,000 (cap already 20) |
| Silver (AL2) | 10,000 | 10,000 (cap already 20) |
| Gold (AL3) | 10,000 (once synced) | **25,000** (50 resets × 500 — current real ceiling) |

```
GAP_UNDER_APPROVED_POLICY = Free vs Bronze/Silver/Gold: 1,000 points (11.1% relative to Free's 9,000)
GAP_UNDER_CURRENT_EFFECTIVE_STATE = Free vs Gold: 16,000 points (178% relative to Free's 9,000)
```

No XP or drop assumption is used anywhere in this table — every number
comes directly from `reset.cap` and `reset.stat_points`'s own confirmed
`Command.dat` values (Part 16/17) and simple multiplication.

## Part 19 — Consolidated balance-input readiness

| Input | Status | Source | Blocker | Next action |
|---|---|---|---|---|
| XP formula | `UNKNOWN` | `xp-formula-evidence-and-vendor-questions.md` | vendor input, or a running non-production instance | send `xp-vendor-package-pt-br.md`; or use `non-production-test-instance-status.md`'s lab once a human wires the DSN |
| Level XP curve | `UNKNOWN` | same | same | same |
| Monster dataset (stats) | `CONFIRMED` | `Monster.txt`, `or-023-forensics.md` | none | ready to use |
| Monster dataset (XP contribution) | `UNKNOWN` | same | XP formula | blocked on XP formula |
| Map dataset (rates) | `CONFIRMED`, 67/67 maps | `level-curve-monster-map-dataset.md`, `or-023-forensics.md` | none | ready to use |
| Spawn/route coverage | `PARTIAL` (15/67 maps mapped; 4 new monsters' single spawns confirmed) | `progression-route-dataset.json` | none blocking, just incomplete | extend only if/when balance work needs the remaining 52 maps |
| Kills/hour | `REQUIRES_EMPIRICAL_DATA` | `reset-audit-and-time-to-reset-model.md` | non-production instance | `non-production-test-instance-status.md` |
| Travel time between farm spots | `REQUIRES_EMPIRICAL_DATA` | same | non-production instance | same |
| Gear progression assumption | `REQUIRES_EMPIRICAL_DATA` / product input | same | cross-cutting Store/X-Shop/CashShop decision | separate product scoping, not this phase |
| Playtime reference profile | `CONFIRMED` (REGULAR≈2h/day, Bryan Phase X Decision 3) | this document, Part 15 | none | ready to use now |
| Reset stat points | `CONFIRMED`, deterministic | `reset-audit-and-time-to-reset-model.md`, this document Part 16-18 | none | ready to use now |
| Reset cap sync | `POLICY SET` (target 20/20/20/20), not yet applied to GameServer | `vip-progression-policy-drift-matrix.md` | `PROGRESSION_RUNTIME_SYNC = BLOCKED_BY_RUNTIME_EVIDENCE` | Decision 2 — authorized non-production reload test, or authoritative engine evidence |
| Drop runtime semantics (OR-023 Part 8) | `UNKNOWN_RUNTIME_EFFECT` | `or-023-forensics.md` | engine source, or a running non-production instance | `non-production-test-instance-status.md` |
| Reload/restart trigger remote-scriptability | `PARTIALLY RESOLVED` (`RESTART_REQUIRED=NO`; remote-trigger `UNKNOWN`) | `xp-formula-evidence-and-vendor-questions.md` | remote-trigger confirmation | vendor question, or non-production test |

```
READY_FOR_NUMERIC_PROGRESSION_BALANCE = NOT_READY
  (unchanged conclusion from Phase V -- Phase X (2026-09-04) confirmed
  the playtime reference profile, updated from "5 of 13 CONFIRMED, 1
  pending owner decision" to 5 of 13 CONFIRMED with ZERO pending owner
  decisions remaining in this table; the rest still genuinely require
  either the XP stack formula/level curve or a running non-production
  instance)
```

## Related systems

`docs/progression/reset-audit-and-time-to-reset-model.md`,
`docs/progression/vip-progression-policy-drift-matrix.md`,
`docs/progression/xp-formula-evidence-and-vendor-questions.md`,
`docs/drop/or-023-forensics.md`,
`docs/gameserver/non-production-test-instance-status.md`,
`apps/api/src/modules/progression/progression-simulator.ts`,
`docs/decisions/0026-progression-evidence-and-balance-readiness.md`.
