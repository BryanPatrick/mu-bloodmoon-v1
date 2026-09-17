---
status: ACTIVE — structural calculator foundation shipped, stack formula and level curve remain open by design
category: decisions
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED (real code, real production config reads, no production write)
---

# ADR-0028: XP Stack + Progression Calculator Foundation

**DATE**: 2026-09-04 (Phase X)
**STATUS**: ACTIVE. Builds the data and calculator foundation Bryan
requested for a future real progression calculator, closes the
`reset.stat_points` VIP-power question the same way `reset.cap` was
closed in Phase V, and formalizes the BASE_SERVER_RATE=50x product
decision. No GameServer write capability was added, used, or attempted.

## CONTEXT

Phase W closed the OR-023 forensics investigation. Bryan's Phase X
instruction opens a new, related but distinct effort: build the real
data/domain foundation for a progression calculator (XP items, buffs,
seals, party/event/quest/map modifiers, monster/level data, spawn
spots), while making two new authoritative product decisions (base
server rate terminology; reset stat-point equality) and explicitly
forbidding invented formulas anywhere in the result.

## DECISION 1 — Base server rate = 50x, separate from the account-level VIP config value

```
BASE_SERVER_RATE = 50x (Bryan's final product terminology)
CAN_CALL_BASE_SERVER_50X = YES
CAN_CLAIM_EFFECTIVE_XP_WITH_ALL_BONUSES = NO, until the stack formula is known
```

This does not reverse Phase U's technical finding
(`xp-stacking-investigation.md`'s `CAN_CALL_SERVER_50X = NO`) — that
finding was about whether `AddExperienceRate_AL0=50` alone proves a
literal multiplier, and it still doesn't. What changes is that "50x"
is now Bryan's own product-policy label for the base rate, independent
of that unresolved config-to-formula question. Both facts are
persisted as separate, non-conflicting rows — see
`docs/progression/xp-stack-inventory.md`'s Part 4/5 correction
(struck through and corrected, not silently overwritten) and the
matching correction to `docs/open-risks.md`'s OR-021 below.

## DECISION 2 — Reset stat points: desired policy is equal for all tiers (450), a new POLICY_DRIFT

Bryan's final ruling: reset stat-point reward must be identical across
Free/Bronze/Silver/Gold. Current effective values (450/500/500/500)
give VIP tiers a **permanent** 1,000-point advantage at 20 resets each
— a real `FINAL_POWER_POLICY_CONFLICT` first surfaced in Phase W's own
VIP final-power audit. Persisted exactly like `reset.cap`'s Phase V
closure: `reset.stat_points`'s `desiredValue` is now
`{AL0:450,AL1:450,AL2:450,AL3:450}`, `policyStatus=POLICY_DRIFT`, with
Bryan's reason quoted verbatim in `desiredReason`
(`progression-config-seed-data.ts`). **No GameServer sync was
performed** — the real values stay 450/500/500/500 until a future,
separately-authorized runtime-sync phase (still
`BLOCKED_BY_RUNTIME_EVIDENCE`, ADR-0026 Decision 2, unchanged). Real
tests: `RESET_POINTS_DESIRED_EQUAL_ALL_TIERS`,
`VIP_RESET_POINT_DRIFT_DETECTED`
(`apps/api/test/progression-phase-x-policy.e2e-spec.ts`).

## DECISION 3 — Real XP item/seal/buff inventory, with the actual stacking mechanism proven

Real, current production `Effect.txt` (172 rows, downloaded read-only
this phase) plus a real vendor tutorial (`Effect.htm`,
`CONFIRMED_VENDOR_DOC`: *"Group: só um efeito ativo por grupo"*) gives
this project its first **proven** XP-item stacking rule — not
inferred. New findings not previously documented: Seal of Ascension
and Master Seal of Ascension share the same Group (60) and are
therefore mutually exclusive with each other; Talisman of Ascension
(a real, undocumented-by-vendor item family, Group 115) can coexist
with any Seal; a real "Party Experience Bonus" consumable item (6759,
Group 24) is a separate mechanism from the config-based
`PartyGeneralExperience`/`PartySpecialExperience` percentage table and
must not be conflated with it. Full inventory:
`docs/progression/xp-stack-inventory.md`,
`docs/progression/xp-modifier-dataset.json`.

## DECISION 4 — Monster XP, level curve: still UNKNOWN, no formula invented

`CustomMonster.txt` (real, current, 12 boss rows) confirms an
`ExperienceRate` per-monster override mechanism exists but is unused
(every row leaves it `*`). No level-XP-curve source was found anywhere
accessible this phase (files, the local SQL lab schema, 49 vendor
tutorials, or this project's own 330-page harvested external reference
library). Rather than assert a "well-known MU Season 6 formula" from
uncertain memory, the calculator's `LevelCurveProvider` interface
accepts only `BLOOD_MOON_CONFIRMED` (none exists) or an explicitly
future-supplied `EXTERNAL_REFERENCE_ONLY` dataset — reusing this
project's own pre-existing `references/game-data/source-collection-policy.md`
classification discipline rather than inventing a parallel one.

## DECISION 5 — Real spot/spawn dataset, honest about its own coverage limits

`spot-dataset.json` (real, 58 spots, 407 monsters, 15 of 67 maps) is
built from `MonsterSetBase.txt`'s `scriptType=2` rows, grouped by
`(map, monster)` — the natural, non-arbitrary unit in the source data,
with no invented spatial-clustering radius. The dataset is explicit
that the 52 "missing" maps most likely have their spawns defined
elsewhere (probably compiled into the GameServer binary) rather than
implying those maps have no monsters. `Monster.txt`'s `RegenTime`
column is captured but its meaning (respawn interval vs. self-regen
tick) is not vendor-documented — `spawnCapacityPerHour()` refuses via
`RespawnTimeUnknownError` rather than assuming a reading. Full detail:
`docs/progression/spot-dataset-analysis.md`.

## DECISION 6 — The calculator refuses to fabricate combined percentages, time-to-level, or time-to-reset

`progression-calculator.ts` (`apps/api/src/modules/progression/`) is
built on the same discipline as Phase V's `progression-simulator.ts`:
real arithmetic only on real, known/caller-supplied numbers.
`computeEffectiveMultiplier()` always throws
`XpStackFormulaUnknownError`. `bestCaseStack()` returns the largest
set of modifiers *proven* mutually compatible
(`maximumConfirmedStack`) and a separate, explicitly-labeled
theoretical upper bound including inactive mechanisms
(`maximumPossibleButUnverifiedStack`) — neither ever states a combined
XP percentage. A minimal structural admin page
(`/painel/admin/calculadora-progressao`, live-verified end-to-end
against a real running API this phase) surfaces all of this,
including a permanent, explicit `CALCULATION_BLOCKED_BY: XP_STACK_FORMULA,
LEVEL_CURVE` for time-to-level/reset. `CALCULATOR_REFERENCE_FOUND = NO`
— a full repo search found only an unrelated prior reference to a
*socket-item* calculator (`references/game-data/muonlinefanz-socket-items-reference.md`),
confirmed out of scope, not reused.

## DECISION 7 — Admin-only this phase; player-facing split deferred

The new calculator page is admin-only (`admin.progression.view`,
reused rather than a new permission — no new sensitive capability was
added, since every endpoint is read-only computation with no
GameServer/DB write). A future player-facing variant (Part 29) would
need its own visibility split (hiding internal risk levels, config
paths, and unapproved balance proposals) — not built this phase, since
nothing here is yet approved product balance a player should see.

## Related systems

`docs/progression/xp-stack-inventory.md`,
`docs/progression/spot-dataset-analysis.md`,
`docs/progression/xp-modifier-dataset.json`, `docs/progression/spot-dataset.json`,
`apps/api/src/modules/progression/progression-calculator.ts`,
`apps/web/pages/painel/admin/calculadora-progressao.vue`,
`docs/decisions/0025-progression-control-plane.md`,
`docs/decisions/0026-progression-evidence-and-balance-readiness.md`,
`docs/decisions/0027-or-023-forensics-and-balance-inputs.md`.
