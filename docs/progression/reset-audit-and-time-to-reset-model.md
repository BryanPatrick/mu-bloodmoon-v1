---
status: ACTIVE
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED for config values; explicit classification for every time-to-reset input
---

# Reset requirements audit + time-to-reset model — Phase V Parts 11-17

## Part 11 — Reset requirements, complete business-facing audit

All values re-confirmed this phase (`Command.dat` hash-identical to
Phase 11/U — zero drift). One new file checked and confirmed **not** to
add any per-reset-bracket override: `Data/Util/ResetTable.txt`
(170 bytes, hash-unchanged since Phase 11) has columns
`MinReset/MaxReset/Level_AL0-3/Money_AL0-3/Point_AL0-3` (a real,
vendor-documented — `ResetTable.htm` — mechanism for varying reset
level/cost/reward BY reset-count bracket, e.g. "resets 0-10 cost more
than resets 11-20") but is confirmed **empty** (header + `end` only).
**Reset cost and reward are NOT differentiated by reset count on this
server** — the flat `Command.dat` values below are the complete,
real picture.

| Field | Free | Bronze | Silver | Gold | Notes |
|---|---|---|---|---|---|
| Required level | 400 | 400 | 400 | 400 | Matches `MaxLevel` — reset is a "you've capped out" mechanic |
| Zen cost | 0 | 0 | 0 | 0 | Free for everyone, all tiers |
| Stat points awarded | 450 | 500 | 500 | 500 | Free tier gets 50 fewer points/reset — `EFFECTIVE_BUT_UNAPPROVED` |
| Level after reset | 1 | 1 | 1 | 1 | Full level reset, all tiers |
| **Reset cap (total lifetime)** | **20** | **20** | **20** | **50 → target 20 (`POLICY_DRIFT`)** | See `vip-progression-policy-drift-matrix.md` |
| Daily/weekly/monthly throttle | 10,000 (all tiers/periods) | — | — | — | Effectively unlimited; no real cadence throttle exists in config |
| Quest/item requirement | none | none | none | none | `CommandResetCheckItem_AL0-3`/`CommandResetQuest_AL0-3` all 0 |
| Class-specific stat-point rate | 100% (all 7 classes) | — | — | — | Flat, no class differentiation |
| Dark Lord command points | preserved across reset | — | — | — | `CommandResetKeepDLCommandPoint_AL0-3=1` for all tiers |
| Equipment behavior | not affected by reset config directly (level/stat reset only) | — | — | — | No equipment-clearing field found in `CommandReset*` |

## Part 12 — Time-to-reset model: input readiness

| Input | Classification | Why |
|---|---|---|
| XP required to reach level 400 | `UNKNOWN` | Level curve not found anywhere text-accessible (`level-curve-monster-map-dataset.md`, Part 6) |
| Effective XP multiplier (tier/map/event/party combined) | `UNKNOWN` | Individual components confirmed; combination formula not (`xp-formula-evidence-and-vendor-questions.md`) |
| Monster base XP by level | `UNKNOWN` | No per-monster XP column exists; presumed derived from `Level` via the same unresolved formula |
| Kills/hour at a given level/gear | `REQUIRES_EMPIRICAL_DATA` | No log or telemetry source exists; would need real play data or a controlled test |
| Map progression (which map at which level) | `DERIVABLE` (partial) | `progression-route-dataset.json` gives real level ranges for 15/67 maps; the rest are `UNKNOWN` (Part 9's own scope limit) |
| Travel time between maps/farming spots | `REQUIRES_EMPIRICAL_DATA` | Not config-derivable; would need real play observation |
| Gear progression assumptions | `REQUIRES_EMPIRICAL_DATA` / product input | Depends on Store/X-Shop/CashShop/drop availability, a cross-cutting question this doc doesn't resolve |
| Party effects on kill speed and XP | `KNOWN` (XP side only) | `PartyGeneralExperience*`/`PartySpecialExperience*` are real, confirmed values; the kill-speed side of party play is `REQUIRES_EMPIRICAL_DATA` |
| Reset stat-point value (how much a reset's 450-500 points matter to power) | `REQUIRES_EMPIRICAL_DATA` | Depends on the stat/damage formula, out of this phase's scope |

```
TIME_TO_RESET_MODEL_READINESS = NOT_READY
MISSING_INPUTS = [
  "effective XP formula (blocks everything downstream)",
  "level XP curve",
  "kills/hour empirical data",
  "travel-time empirical data",
  "gear-progression assumption (product input)",
  "reset stat-point power value"
]
```

The XP formula is the single highest-leverage blocking input — nearly
every other `REQUIRES_EMPIRICAL_DATA` row becomes meaningfully more
useful once it's resolved, because raw kill counts only translate into
"time to level" once the XP-per-kill number is known.

## Part 13 — 2-3 resets/week target, cadence translation only

Bryan's target, preserved exactly as a business fact (not converted
into a config number):

```
NORMAL_PLAYER_TARGET = approximately 2-3 resets/week
```

Pure cadence arithmetic (no playtime or XP assumption involved):

| Target | Cadence |
|---|---|
| 2 resets/week | ≈ 1 reset every 3.5 days |
| 3 resets/week | ≈ 1 reset every 2.33 days |
| 2.5 resets/week (midpoint) | ≈ 1 reset every 2.8 days |

**This table stops here deliberately.** Converting "1 reset every N
days" into an actual hours-to-reset (and from there, into an XP rate)
requires a playtime assumption (Part 14) this document does not supply
on its own authority.

## Part 14 — Playtime assumption scenarios (NOT chosen here)

```
DAILY_PLAYTIME_ASSUMPTION = OWNER_DECISION_REQUIRED
```

Illustrative scenarios only — none selected as the real target:

| Scenario | Hours/day (illustrative) | 2 resets/week implies | 3 resets/week implies |
|---|---|---|---|
| CASUAL | ~1h/day (~7h/week) | ~3.5h per reset | ~2.33h per reset |
| REGULAR | ~3h/day (~21h/week) | ~10.5h per reset | ~7h per reset |
| HEAVY | ~8h/day (~56h/week) | ~28h per reset | ~18.7h per reset |

The same "2-3 resets/week" phrase implies a roughly **8x** difference
in actual required per-reset efficiency between the CASUAL and HEAVY
scenarios above. No hours/day value is assumed as correct by this
document — that choice belongs to Bryan, once made it should be
persisted as a real, dated product decision the same way `reset.cap`
was this phase, not inferred from silence.

## Part 15 — Empirical XP test design (future, not executed)

A repeatable, controlled test that could derive effective XP once a
non-production instance is authorized (Bryan's Decision 2 — never
production):

1. **Fixture**: one character, known exact level, known `AccountLevel`
   (AL0/1/2/3), no party, no active buffs/seals/pet/event/quest state.
2. **Target**: one specific monster (known `Index`, known `Level` from
   `Monster.txt`), killed exactly once, with no other monster
   contributing.
3. **Measurement**: record the character's exact XP value immediately
   before the kill and immediately after (via `bm-sql` read-only query
   against `Character` — read-only, non-production only).
4. **Delta**: `xpGained = xpAfter - xpBefore` — this single number,
   cross-referenced against the monster's `Level` and the character's
   known `AccountLevel`, is the first real empirical data point this
   project would have for the formula.
5. **Repeat** varying exactly one variable at a time (see Part 17's
   matrix) to isolate each component's real contribution.

```
XP_EMPIRICAL_TEST_PLAN = PASS (designed; NOT executed — no
  non-production instance exists yet, per Bryan's Decision 2)
```

## Part 16 — Test character requirements (future, not created)

- Controlled, known stat allocation (documented before each test case).
- Known, fixed character level (reset to the same value between cases
  where the test requires it).
- Known, fixed map (no map-XP-modifier confound — confirmed flat 100
  across all 67 maps currently, so this is a non-issue today, but
  should still be pinned explicitly in the test protocol in case that
  changes).
- Known, fixed equipment (no set-bonus/socket/excellent-option XP
  interaction has been found, but pinning equipment removes it as a
  variable rather than assuming it's irrelevant).
- Known `AccountLevel` (AL0/1/2/3), toggled explicitly per test case.
- Full state reset between cases: same character level, same map, same
  gear, only the ONE variable under test (tier, party, event, quest)
  changed.

## Part 17 — XP stacking experiment matrix (future, not executed)

Only combinations corresponding to real, confirmed mechanisms —
nothing invented:

| Case | AL | Party | Event active | Quest kill |
|---|---|---|---|---|
| 1 | AL0 | no | no | no |
| 2 | AL1 | no | no | no |
| 3 | AL2 | no | no | no |
| 4 | AL3 | no | no | no |
| 5 | AL0 | normal (same class) | no | no |
| 6 | AL0 | special (mixed class) | no | no |
| 7 | AL0 | no | yes | no |
| 8 | AL0 | no | no | yes |
| 9 | AL3 | no | yes | no |
| 10 | AL0 | normal | yes | no |
| 11 | AL0 | no | yes | yes (if reachable — see vendor question #4) |
| 12 | AL0 | normal | yes | yes (if reachable) |

Cases 1-4 isolate the `AddExperienceRate_AL*` tier effect alone. Cases
5-6 isolate party stacking. Cases 7-8 isolate event/quest stacking.
Cases 9-12 test real combinations only after 1-8 establish each
component individually — running combined cases first would make
isolating any single variable's contribution impossible.

## Related systems

`docs/progression/progression-config-field-matrix.md` (Phase U),
`docs/progression/xp-formula-evidence-and-vendor-questions.md`,
`docs/progression/vip-progression-policy-drift-matrix.md`,
`docs/decisions/0026-progression-evidence-and-balance-readiness.md`.
