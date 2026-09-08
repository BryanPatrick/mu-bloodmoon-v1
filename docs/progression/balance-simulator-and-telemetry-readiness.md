---
status: ACTIVE
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: DESIGN + real code for the simulator's structural mode; no fabricated estimates anywhere
---

# Balance simulator + telemetry readiness — Phase V Parts 19-25

## Part 20 — Master Reset: kept inactive, understood only enough to scope it out

No new investigation was performed beyond confirming the Phase U
findings are still current (`CommandMasterResetSwitch=0`, hash-identical
`Command.dat`). Restated plainly, per this phase's own instruction not
to design a Master Reset economy unless asked:

```
MASTER_RESET_STATUS = INACTIVE (unchanged)
MASTER_RESET_RESET_REQUIREMENT = 1000 resets (real, deliberately
  customized value — not a template default)
MASTER_RESET_STAT_POINT_REWARD = 0 (zero, all tiers)
```

**Whether Master Reset should stay outside current Blood Moon
progression planning**: yes, for now — it grants zero direct stat
reward, requires 1000 resets (50x the entire new reset cap policy of
20), and every one of its ~40 config sub-fields has zero VIP-tier
differentiation. Activating it would need its own real design pass
(what does entering "Master Level" actually give a player?), which is
explicitly out of scope this phase. No further action taken.

## Part 21/22 — Simulator foundation: STRUCTURAL_SIMULATOR only

```
SIMULATOR_FOUNDATION = PASS (structural mode)
SIMULATOR_VALIDATED = NO
```

A real, working simulator was built —
`apps/api/src/modules/progression/progression-simulator.ts` — but it
implements exactly one mode: `STRUCTURAL_SIMULATOR`. It accepts
explicit assumptions (never hardcoded guesses) for account tier, party
state, event/quest state, and a caller-supplied XP-per-kill estimate
**if the caller already has one from some other source** — the
simulator itself never invents monster-kill-to-XP math, because the
formula needed to do that (`xp-formula-evidence-and-vendor-questions.md`)
is `UNKNOWN`.

**What it can compute today** (real math, no invented numbers):
- Real reset-cap/cost/reward lookups per tier, straight from
  `ProgressionConfigItem`'s own effective values — e.g. "how many stat
  points would N resets grant a Bronze player" is real arithmetic on
  real, confirmed numbers (500 points × N).
- Cadence translation (the same math as Part 13's table) — "N
  resets/week" → "1 reset every X days," independent of any unknown
  formula.
- If (and only if) the caller supplies an already-known `xpPerKill`
  and `killsPerHour` (e.g. from a future empirical test, Part 15),
  it can project hours-to-level/hours-to-reset from those inputs —
  clearly labeled as depending on caller-supplied, not derived, numbers.

**What it explicitly refuses to compute**: any estimate that would
require knowing the real XP formula (monster level → base XP,
tier-rate application, stacking order) without the caller supplying
that number directly. Calling the "estimate hours to level from account
tier and monster alone" path throws a real, typed refusal rather than
silently falling back to a guess:

```
SIMULATOR_REFUSES_AUTHORITATIVE_OUTPUT_WITH_UNKNOWN_FORMULA = CONFIRMED
  (real thrown error: XpFormulaUnknownError, tested)
```

## Part 23 — Balance dashboard readiness

The existing `/painel/admin/progressao` page (Phase U, extended this
phase with `policyStatus`) already structurally supports the first two
of the four columns Part 23 asks about:

| Column | Status this phase |
|---|---|
| Current effective | **Built** (Phase U, live) |
| Proposed (desired) | **Built** (Phase U, live) |
| Estimated impact | **NOT built** — correctly, per Part 23's own instruction not to fake this before simulator validity. The `STRUCTURAL_SIMULATOR` above cannot honestly produce this for any XP-dependent setting yet. |
| Observed telemetry | **NOT built** — no telemetry pipeline exists (Part 24 below is a design only) |

No fake "estimated impact" number was added to the UI or the data
model this phase — a deliberate omission, not an oversight.

## Part 24 — Minimal future telemetry model (design only, nothing collected)

Aggregated-only, never per-player-surveillance, matching Bryan's
explicit instruction:

| Metric | Aggregation | Why it validates balance |
|---|---|---|
| Median/P25/P50/P75 time to first reset | server-wide, weekly rollup | Directly tests whether real players are converging on the "2-3 resets/week" cadence once XP/reset are eventually tuned |
| Resets/account/week (rolling) | server-wide + per VIP tier | The single most direct validation metric for Bryan's own target |
| Active hours before reset | server-wide distribution | Cross-checks the playtime assumption (Part 14) against real behavior instead of guessing it forever |
| Map progression (which maps see real playtime) | aggregate counts per map | Validates whether `progression-route-dataset.json`'s 15-map coverage matches where players actually are |
| Death rate | aggregate, not per-player | Sanity-checks whether monster/map difficulty (Part 7/8 data) matches real survivability |
| Party participation rate | aggregate percentage | Tests whether the real party-XP bonus (`PartyGeneralExperience*`) meaningfully changes play patterns |

No collection code, schema, or pipeline was built this phase — this is
a design inventory only, per Part 24's own "avoid unnecessary tracking"
instruction. Building it would be a real, separate architecture
decision (likely extending or complementing the GameBridge Agent,
`docs/gamebridge/`), not an incidental addition here.

## Part 25 — Current player data: not read, would-be-useful noted only

No new production player-progression data was read this phase — Part
25's own instruction. For a future phase, if telemetry (Part 24) is
ever built, the existing read-only `bm-sql` boundary
(`docs/security/game-write-boundary.md`) already supports the kind of
aggregate query (e.g. `SELECT AVG(ResetCount) ...`) that would compute
these metrics without touching any single player's identity — worth
noting as a real, already-available boundary for later, not exercised
this phase.

## Related systems

`apps/api/src/modules/progression/progression-simulator.ts`,
`apps/api/test/progression-simulator.spec.ts`,
`docs/progression/reset-audit-and-time-to-reset-model.md`,
`docs/decisions/0026-progression-evidence-and-balance-readiness.md`,
`docs/gamebridge/`, `docs/security/game-write-boundary.md`.
