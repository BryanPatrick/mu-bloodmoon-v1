---
status: ACTIVE — desired-state + effective-state layers implemented and tested locally; no runtime sync
category: decisions
audience: internal (product + engineering)
lastVerified: 2026-09-03
confidence: CONFIRMED (real code, real hash-verified config reads, no production change)
---

# ADR-0025: Progression Control Plane — XP/Drop/Reset/Master Reset foundation

**DATE**: 2026-09-03 (Phase U)
**STATUS**: ACTIVE. Second major domain built on the Control Plane
architecture ADR-0024 established (Portal desired state vs. effective
GameServer state, RBAC, audit, drift detection, runtime sync default
OFF). Still no GameServer write capability anywhere in this system.

## CONTEXT

Phase T proved the pattern on X-Shop/CashShop. Bryan's direction for
Phase U: extend the same architecture to Progression (XP, Master XP,
Drop, Reset, Master Reset) — not to rebalance the server, but to
discover the real configuration model and make it safely manageable
through the Portal. This ADR also carries Bryan's own authoritative
closure of OQ-032 (from Phase T), which sets the **standing policy**
for every future control-plane domain, not just this one.

## DECISION 0 — OQ-032 closure: RBAC for access, permission+flag for mutation

Bryan's ruling, verbatim in intent: do not build separate
`*_PORTAL_MANAGEMENT_ENABLED` kill switches merely to duplicate RBAC.
**Admin control-plane access = RBAC** (`admin.progression.view`/`.edit`
gate who can see and propose desired-state changes — no separate flag
layer). **Runtime GameServer mutation = a dedicated sensitive permission
PLUS a runtime kill switch** (`admin.progression.sync` +
`PROGRESSION_RUNTIME_SYNC_ENABLED`, mirroring the X-Shop/CashShop
`.sync` + `*_RUNTIME_SYNC_ENABLED` shape exactly). This is now the
preferred pattern for every future control-plane domain — applied here
from day one rather than retrofitted later.

## DECISION 1 — Reused desired/effective/drift shape, not reinvented

`ProgressionConfigItem` mirrors `LegacyCatalogItem`'s shape
(`desiredValue`/`effectiveValue`/`driftStatus`/`sourceLastReadAt`/
`sourceFingerprint`) rather than inventing a new model shape for a new
domain. The one real structural difference: `desiredValue`/
`effectiveValue` are `Json`, not scalar columns, because progression
settings are frequently **per-account-tier** (`{AL0,AL1,AL2,AL3}`)
rather than single values — a shape Store's per-product fields never
needed. `computeDrift` supports comparing a flat policy target against
a per-tier effective value (a single number `20` against
`{AL0:20,AL1:20,AL2:20,AL3:50}` flags drift on AL3 alone) as well as
flat-vs-flat and tier-vs-tier comparisons.

## DECISION 2 — 25 business-facing rows, not ~370 raw config keys

Part 11's own instruction: don't create one row per raw config line.
`PROGRESSION_SEED_ENTRIES` groups the real, hash-verified GameServer
config into 25 rows across four domains (EXPERIENCE: 8, DROP: 4, RESET:
7, MASTER_RESET: 6) — VIP_PROGRESSION was considered as a fifth domain
but **deliberately not built as a separate set of rows**: every real
AL0-3 differentiation already lives inside each EXPERIENCE/DROP/RESET
row's own per-tier `effectiveValue` (e.g. `xp.rate` = `{AL0:50,AL1:60,
AL2:60,AL3:60}` already IS the VIP-progression picture for that
setting) — a separate `VIP_PROGRESSION` domain would have duplicated
the same facts under a second name rather than adding new information.
`docs/vip/vip-benefit-matrix.md` (Phase 14) remains the canonical VIP
benefit reference; this control plane reuses its numbers rather than
re-deriving or duplicating them into a competing table.

## DECISION 3 — Unit safety is structural, not a UI convention

Part 13 is mandatory, not a style preference: `unit` is a free-text
column, and every XP-rate row's `unit` is the literal string
`"unidade/formula nao confirmada"` rather than `"x"` or `"%"` — because
`docs/progression/xp-stacking-investigation.md` genuinely could not
confirm which one is true. This is enforced at the seed-data level (the
value physically stored), not left to the frontend to remember —
proven by a real test (`XP_50_NOT_LABELED_50X_WITHOUT_PROOF`).

## DECISION 4 — Reset cap: a real, present, non-hypothetical policy target

Bryan's Part 17 instruction ("persist/re-confirm TARGET RESET CAP = 20")
is implemented as a real `desiredValue: 20` on the `reset.cap` row,
seeded with a dated reason. This is not the illustrative example the
phase instructions used ("desired 20 vs effective 50 → DRIFT") — it is
the **actual current state**: `CommandResetLimit_AL3 = 50` really is
2.5x both the other three tiers and the policy target, confirmed via a
hash-verified, unchanged-since-Phase-11 read of `Command.dat`. No sync
was performed — the Gold tier's real cap remains 50 on the GameServer;
the Portal now just makes that fact visible instead of silent.

## DECISION 5 — The "~2-3 resets/week" balance target is deliberately NOT a config-item row

Part 18 is explicit: this is a balance target, not a direct config
value, and must never be auto-converted into an XP number. Every row in
`ProgressionConfigItem` traces to one real GameServer config key by
construction (`technicalSource` requires it) — fabricating a row for a
target that has no config-key source would violate that invariant.
This target is instead recorded here, as a dated product decision:
**normal player target ≈ 2-3 resets/week, reset cap = 20** (Bryan,
Phase U, 2026-09-03) — available for a future progression simulator
(Part 19) to validate against once one exists, never silently promoted
into a config row of its own.

## DECISION 6 — Changeset/preview/config-history: designed, not built

Parts 26-28 ask for a multi-setting changeset workflow (draft → review
→ approval → apply → rollback) with a preview and named historical
snapshots ("Open Beta week 1"). This phase deliberately does **not**
build that system — Part 26 itself says "do not implement runtime apply
yet," and a full changeset CRUD/review UI is a materially larger scope
than this foundation phase's real deliverable (config discovery +
single-setting desired/effective/drift/audit). What exists instead:
single-row history via the same `AuditEvent`-backed `history()` pattern
Phase T already proved (every past desired-value edit is visible,
individually, forever) — a genuine but smaller-scoped answer to "know
what was intended," not the named-snapshot system Part 28 describes.
The changeset **design** (states: draft/review/approved/applied/
rolled-back; a changeset groups N `ProgressionConfigItem` desired-value
proposals under one review) is documented here as the shape a future
phase should build, not implemented.

## DECISION 7 — Effective state via committed snapshot, same boundary as ADR-0023/0024

`progression-effective-state-snapshot.json` is generated the identical
way the legacy-catalog snapshot was: an operator re-runs the same
read-only RemoteOps download/hash technique, commits the result.
`apps/api` never holds a live GameServer credential. This phase's own
snapshot generation caught a real, useful fact as a side effect: a
fresh hash check found `Common.dat` had drifted from the last local
copy (2026-08-17 → 2026-09-03) on 12 non-progression fields (CashShop
switch, PK-drop mechanics, durability rates, etc.) while every
progression field (`AddExperienceRate_AL*`, `ItemDropRate_AL*`,
`CommandReset*`, `CommandMasterReset*`) stayed byte-identical — real,
useful confirmation that this phase's own numbers are current, obtained
as a natural consequence of the hash-first discipline, not a special
extra step.

## ALTERNATIVES CONSIDERED

- **A single flat `value` scalar column instead of `Json`**: rejected —
  would have forced every per-tier setting (the majority of this
  domain) into four separate rows, defeating Decision 2's own
  business-facing grouping goal.
- **Building `XSHOP_PORTAL_MANAGEMENT_ENABLED`-style access flags for
  progression too**: rejected per Decision 0 — this is exactly the
  pattern Bryan closed OQ-032 to prevent from repeating.
- **Guessing the XP stacking formula from the vendor's two isolated
  example numbers** (`ExperienceMultiplierConstA/B`'s "for max level
  1000 → 1/6" text): rejected — those examples use a max-level value
  (1000) that doesn't match this server's own `MaxLevel=400`, so
  reverse-engineering a formula from them would be exactly the
  unproven inference this phase was written to prevent.

## CONSEQUENCES

- Bryan (and any future admin) can now see, for the first time in this
  Portal, that Gold-tier accounts have a materially different reset cap
  than policy target — a real, previously-invisible fact.
- The XP stacking ambiguity is now a documented, first-class open
  question (`xp-stacking-investigation.md`) rather than an implicit
  assumption buried in a config file — any future "make Blood Moon
  Nx" marketing claim now has a concrete, honest blocker to check
  against first.
- The RBAC/kill-switch pattern this ADR formalizes (Decision 0) is
  reusable verbatim for the next control-plane domain, without
  redesign.
- Real production drift-detection discipline (Decision 7) now applies
  to a second, independent config file family (`Common.dat`/
  `Command.dat`), not just the shop files — increasing confidence this
  pattern generalizes rather than being a one-off fit for X-Shop/CashShop.

## RELATED SYSTEMS

`apps/api/src/modules/progression/` (`progression-config.service.ts`,
`progression-config-seed-data.ts`, `progression.controller.ts`,
`progression.module.ts`), `apps/api/prisma/schema.prisma`
(`ProgressionConfigItem`), `apps/api/prisma/migrations/
20260903120000_phase_u_progression_config_item/`,
`docs/progression/progression-config-field-matrix.md`,
`docs/progression/xp-stacking-investigation.md`,
`docs/progression/progression-effective-state-snapshot.json`,
`apps/api/test/progression-config.e2e-spec.ts`,
`apps/web/pages/painel/admin/progressao.vue`,
`docs/decisions/0024-legacy-shop-control-plane.md`,
`docs/vip/vip-benefit-matrix.md`.
