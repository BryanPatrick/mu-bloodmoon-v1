---
status: ACTIVE — reset cap policy closed; XP formula remains open by design
category: decisions
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED (real code, real hash-verified config reads, no production change)
---

# ADR-0026: Progression Evidence + Balance Readiness

**DATE**: 2026-09-04 (Phase V)
**STATUS**: ACTIVE. Extends the Progression Control Plane (ADR-0025)
with a real business-approval axis, closes the reset-cap policy
question, and builds a real evidence base (XP formula investigation,
level/monster/map data, reload-mechanism findings) for a future
quantitative balance phase. Still no GameServer write capability
anywhere in this system.

## CONTEXT

Phase U built the technical control plane (desired/effective/drift) and
correctly reported real effective VIP-tier values without claiming they
were approved product policy. Bryan's own instruction this phase makes
that gap explicit and closes exactly one instance of it (reset cap)
while deliberately leaving the rest open (`EFFECTIVE_BUT_UNAPPROVED`)
until a real balance phase considers each one individually.

## DECISION 1 — Reset cap: closed, formalized, per-tier

Bryan's final ruling: reset cap = 20 for Free/Bronze/Silver/Gold, no
exception. Persisted as `ProgressionConfigItem`'s `reset.cap` row —
seed source of truth now uses an explicit per-tier `desiredValue`
(`{AL0:20,AL1:20,AL2:20,AL3:20}`, functionally identical to Phase U's
flat `20` under `valuesConflict()`'s own comparison rule, but now
literal and unambiguous rather than relying on the flat-vs-per-tier
comparison trick). The already-existing row in the working local
database was formalized through the real UI/service `update()` path
(not a silent reseed overwrite) with a reason citing this exact
decision, producing a real audit entry — matching how any future admin
would make the same change.

## DECISION 2 — `policyStatus`: a real, new axis, not folded into `driftStatus`

Bryan's instruction ("effective config values are NOT automatically
approved VIP benefits") is implemented as a genuinely separate
`ProgressionPolicyStatus` enum/column
(`NOT_EVALUATED`/`APPROVED`/`EFFECTIVE_BUT_UNAPPROVED`/`POLICY_DRIFT`/
`DISABLED`/`UNKNOWN`), not as a special case of `driftStatus`. The two
questions are genuinely different: `driftStatus` asks "does the
Portal's desired value match the GameServer's real value" (a technical
question, meaningless until someone forms a desired opinion);
`policyStatus` asks "has this specific value received real product
sign-off" (a business question, answerable even for rows with no
desired opinion at all — most rows today are `EFFECTIVE_BUT_UNAPPROVED`
while their `driftStatus` is `IN_SYNC`, because the Portal has no
opinion to conflict with). Collapsing these into one field would have
made it impossible to represent "this is live, unchanged, and nobody
has approved it" — exactly the state Bryan asked to make visible.

`policyStatus` is reconciled on every reseed (like `riskLevel`), unlike
`desiredValue` — it represents real product/business classification
work done this phase, not an individual admin's opinion, so it is
correctly NOT protected from reseed the way `desiredValue` is.

## DECISION 3 — Reload mechanism: real vendor evidence, real answer, still no sync

A pre-existing, hash-verified vendor tutorial extraction
(`Recarregando arquivos e configurações.htm`, `CONFIRMED_VENDOR_DOC`)
documents a real in-game/console "Reload" menu on `GameServer.exe`
naming 18 categories including `common` and `command`. "Reload Common"
rereads `Common.dat` (and 12 sibling files including `ExperienceTable.txt`/
`ResetTable.txt`/`MapManager.txt`); "Reload Command" rereads
`Command.dat` in full — both **explicitly documented as not requiring a
restart**. This resolves `RESTART_REQUIRED = NO` for the EXPERIENCE/
DROP/RESET/MASTER_RESET domains with real vendor-doc confidence, a
genuine upgrade from Phase T/U's complete `UNKNOWN`.

This does **not** unblock runtime sync. Per Bryan's Decision 2 this
phase, and consistent with the same discipline OQ-031 already
established for X-Shop/CashShop: the reload *trigger* itself is
documented as a GUI action inside an interactive `GameServer.exe`
console window, not confirmed remotely/programmatically scriptable via
RemoteOps/SSH. Reading vendor documentation is evidence-gathering, not
runtime testing — no reload, restart, or config write was performed or
requested against production. `PROGRESSION_RUNTIME_SYNC` stays
`BLOCKED_BY_RUNTIME_EVIDENCE`, now for a narrower, better-understood
reason than before.

## DECISION 4 — Real, pre-existing production drift found and reported, not caused

Re-reading `MapManager.txt`/`Monster.txt`/`MonsterSetBase.txt` (Part 8's
own deferred-from-Phase-U gap) surfaced real, substantial, **pre-existing**
changes since the last local snapshot (2026-08-17): map-level
`ItemDropRate` zeroed on all 67 maps, `ExcItemDropRate` cut 10x on all
67 maps, and 10 major boss monsters' own `ItemRate` cut from an
effective-always-drop sentinel to a normal value. **This session made
none of these changes** — they were found by hash-comparing a fresh,
read-only download against the last cached copy, the same discipline
every prior phase has used. Reported prominently in
`level-curve-monster-map-dataset.md` as a real fact Bryan should be
aware of, not silently absorbed into a dataset file as if it were
routine.

## DECISION 5 — Simulator: structural-only, one real refusal path

`progression-simulator.ts` implements exactly `STRUCTURAL_SIMULATOR`
mode (Part 21): real arithmetic on real, known numbers (reset cadence,
reset stat-point totals, an already-empirically-measured XP rate the
caller supplies), plus a mandatory, tested refusal
(`XpFormulaUnknownError`) for any attempt to derive XP from account
tier and monster level alone — because that derivation requires the
unresolved formula. No `FORMULA_VALIDATED` mode exists; building one
requires actually answering the vendor question package
(`xp-formula-evidence-and-vendor-questions.md`), not estimating around
it.

## DECISION 6 — Changeset model: designed, deliberately not built this phase

Part 26 explicitly makes this optional ("may implement... if it
helps"). This phase's real, concrete deliverable was the reset-cap
policy closure itself — a single, direct, Bryan-approved edit through
the existing `ProgressionConfigItem`/`update()` path, which needed no
changeset wrapper. Building a full multi-setting
draft/review/approved/superseded/cancelled changeset CRUD + preview UI
for a domain that currently has exactly one closed policy decision
would be premature scope, not evidence-gathering. The lifecycle this
phase would use if built: `DRAFT` (proposed, not reviewed) →
`UNDER_REVIEW` (visible to Bryan, not yet acted on) → `APPROVED` (Bryan
has signed off on the *desired-state* change — explicitly **never**
"applied to GameServer," per Part 26's own warning) → `SUPERSEDED` (a
later changeset replaces it) → `CANCELLED`. A changeset would group N
`ProgressionConfigItem` desired-value proposals under one review unit
with a single preview table (setting/effective/current desired/
proposed/unit/risk/reason, per Part 27's own example shape). Documented
here as the shape a future multi-setting balance phase should build,
not implemented.

## ALTERNATIVES CONSIDERED

- **Folding `policyStatus` into `driftStatus`** (e.g. a `POLICY_UNAPPROVED`
  drift value): rejected per Decision 2 — the two questions are
  independent and a row can be `IN_SYNC` (technically) while
  `EFFECTIVE_BUT_UNAPPROVED` (commercially), which a single combined
  enum cannot represent without an explosion of compound states.
- **Guessing the XP formula from the vendor's `MaxLevel=1000` example
  to at least produce approximate numbers**: rejected — the example's
  own max-level doesn't match this server's real 400, and Bryan's own
  instruction is explicit that discovery is not approval and unproven
  formulas must never produce precise-looking fake numbers.
- **Building the full changeset model now, since Part 26 allows it**:
  rejected this phase — see Decision 6. Revisit once a real
  multi-setting balance proposal exists to actually exercise it against.
- **Treating map `ItemDropRate=0` as "no change, ignore"**: rejected —
  this is a real, current, server-wide fact with real gameplay
  consequences (per the confirmed base-100 multiplier convention);
  under-reporting it to keep this phase's scope narrow would have
  contradicted the evidence-gathering mandate.

## CONSEQUENCES

- Bryan now has one real, closed progression policy decision
  (`reset.cap`) that behaves identically to how the eventual
  X-Shop/CashShop policy closures worked in ADR-0023/0024 — same
  discipline, second domain.
- Every other VIP-tiered progression setting is now honestly labeled
  `EFFECTIVE_BUT_UNAPPROVED` rather than silently implying approval —
  a real, visible to-do list for a future balance phase, not a decided
  question.
- The reload-mechanism finding (Decision 3) means a future runtime-sync
  phase's remaining real question is narrower and more specific
  ("can Reload Common/Command be triggered outside the interactive
  console") rather than the complete unknown Phase T/U left behind.
- The map/monster drift finding (Decision 4) is real, current
  operational information Bryan did not otherwise have — independent
  of anything else in this ADR, worth acting on or explaining on its
  own.
- The structural simulator (Decision 5) gives future balance work a
  real, honest starting point without ever producing a precise-looking
  number the formula can't back up.

## RELATED SYSTEMS

`apps/api/src/modules/progression/progression-simulator.ts`,
`apps/api/prisma/schema.prisma` (`ProgressionPolicyStatus`),
`apps/api/prisma/migrations/20260904090000_phase_v_progression_policy_status/`,
`docs/progression/vip-progression-policy-drift-matrix.md`,
`docs/progression/xp-formula-evidence-and-vendor-questions.md`,
`docs/progression/level-curve-monster-map-dataset.md`,
`docs/progression/reset-audit-and-time-to-reset-model.md`,
`docs/progression/balance-simulator-and-telemetry-readiness.md`,
`docs/progression/progression-route-dataset.json`,
`apps/api/test/progression-policy-phase-v.e2e-spec.ts`,
`apps/api/test/progression-simulator.e2e-spec.ts`,
`docs/decisions/0025-progression-control-plane.md`.
