---
status: ACTIVE — current, authoritative ruling; supersedes conflicting parts of ADR-0025/0026/0028
category: decisions
audience: internal (product + engineering)
lastVerified: 2026-09-08
confidence: CONFIRMED (product owner ruling, this date)
---

# ADR-0029: Progression Reset Policy — Current Ruling

**DATE**: 2026-09-08
**STATUS**: ACTIVE. Consolidates and formalizes the project owner's
current position on reset stat points and reset cap, during the
Feature Recovery & Extraction effort that first surfaced these two
domain-model rows as in need of an explicit, dated ruling.

## Why this ADR exists

`docs/decisions/0025-progression-control-plane.md` and
`0026-progression-evidence-and-balance-readiness.md` (Phase V,
2026-09-04) recorded "reset cap = 20 for all tiers, no exception" as a
**final, closed** decision. `0028-xp-stack-and-progression-calculator.md`
(Phase X, same date) recorded "reset stat points = 450 for all tiers"
as a separate final decision. Neither ADR's own text has been edited —
per this project's permanent "never silently overwrite history" rule,
both remain exactly as originally written, as the real historical
record of what was decided at the time.

This ADR exists because the project owner's current position, as of
2026-09-08, differs from both of those in a way that needs its own
dated, discoverable record — not a silent edit to the old ADRs, and not
an assumption carried forward uncorrected into new code.

## DECISION 1 — Reset stat points: Free = 450, VIP = 500 (SUPERSEDES ADR-0028 Decision 2)

```
RESET_STAT_POINTS_FREE (AL0) = 450
RESET_STAT_POINTS_VIP (AL1/AL2/AL3 — Bronze/Silver/Gold) = 500
STATUS = CURRENT RULING, APPROVED
```

This **supersedes** ADR-0028's Decision 2 ("reset stat points = 450 for
every tier, no exception"). The seed data itself already recorded this
supersede inline (`progression-config-seed-data.ts`'s `reset.stat_points`
entry, `desiredReason` field, dated "Fase AD, 2026-09-05") — this ADR
is the first time it is recorded in `docs/decisions/` itself, closing a
real gap: a genuine product-policy reversal had existed only as a code
comment, invisible to anyone reading the ADR log alone. `effectiveValue`
and `desiredValue` both already equal `{AL0:450, AL1:500, AL2:500,
AL3:500}` in the current seed data — `policyStatus = APPROVED`,
correctly, no drift.

## DECISION 2 — Reset cap: UNRESOLVED (SUPERSEDES ADR-0025/0026's "cap = 20" ruling)

```
RESET_CAP_STATUS = UNRESOLVED
RESET_CAP_VALUE = none — do not infer, do not substitute a number
STATUS = CURRENT RULING, REOPENED
```

This **supersedes** the "cap = 20 for all tiers, no exception" ruling
ADR-0025/0026 recorded as final (Phase V, 2026-09-04). The project
owner has reopened this question; no replacement value has been
decided. Until a future, dated ADR records a real ruling:

- `ProgressionConfigItem` for `domain: RESET, key: 'reset.cap'` carries
  **no `desiredValue`** (`null`) — the Portal has no policy opinion,
  using this project's own established "no opinion ≠ false drift" rule
  (the same one `LegacyCatalogEffectiveStateService` already uses).
- `policyStatus = NOT_EVALUATED` (the schema's own default for "no
  approval decision made"), not `POLICY_DRIFT`.
- `driftStatus` computes to `IN_SYNC` on refresh (no desired value to
  conflict with) — confirmed via `ProgressionConfigService.valuesConflict()`'s
  own short-circuit for a null desired value, not a special case
  invented for this ADR.
- `effectiveValue` remains `{AL0:20, AL1:20, AL2:20, AL3:50}` — this is
  the real, current GameServer configuration, an observed fact, and is
  untouched by this ruling; only the Portal's *opinion* about what it
  should be is reopened.

**No new architecture was introduced to represent this.** The existing
nullable `desiredValue` field and the existing `NOT_EVALUATED` enum
value already covered this exact case — this ADR is a policy
correction, not a schema or model change.

## What does NOT change

- GameServer sync for progression remains **not implemented** — the
  `sync()` endpoint is still a permanent, triple-guarded stub
  (`PROGRESSION_RUNTIME_SYNC_ENABLED` off by default; even when set,
  it unconditionally throws `NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE`).
  Nothing in this ADR authorizes building that sync path.
- "Effective state" remains a manually-regenerated, committed JSON
  snapshot (`docs/progression/progression-effective-state-snapshot.json`),
  never a live GameServer read. This ADR does not change that.
- No other `ProgressionConfigItem` row is affected by this ADR.

## Historical record integrity

`0025-progression-control-plane.md`, `0026-progression-evidence-and-balance-readiness.md`,
and `0028-xp-stack-and-progression-calculator.md` are **not edited** by
this ADR — they remain the accurate record of what was decided on
2026-09-04, by whom, and why. This ADR supersedes their *current
applicability* for the two specific decisions above, not their
historical accuracy.
