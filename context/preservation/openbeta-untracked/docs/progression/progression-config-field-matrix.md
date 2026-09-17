---
status: DRAFT_FOR_REVIEW
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-03
confidence: MIXED — see per-field CONFIDENCE column; nothing here is generic MU knowledge, every row traces to this server's own real config, re-read/hash-verified this phase
---

# Progression configuration field matrix — Phase U (Parts 1/2/3/6/7/8/9)

Every row traces to a real key in this server's own config files, re-read
this phase via RemoteOps. **Provenance check performed before any new
claim was made**: `GameServerInfo - Command.dat`/`- Custom.dat` hashes
were re-verified live against production and found **byte-identical**
to the Phase 11 cached copies (`9D971E9F...`/`BA8A8C07...`) — safe to
reuse without re-download. `GameServerInfo - Common.dat` had **drifted**
since the last local snapshot (2026-08-17) — a fresh copy was downloaded
this phase (`A7030F2D...`, 15043 bytes) and diffed; see "Drift found
this phase" below for exactly what changed and why none of it touches
progression fields.

This document also draws on a pre-existing, exhaustive field-by-field
semantic map of `Common.dat` (369 key occurrences, 294 `CONFIRMED`
against the vendor's own tutorial text, produced 2026-08-17 via
RemoteOps forensic read — `D:\MU\docs\common-dat-semantic-map.md`,
operator-machine reference, not repo-tracked) and a drop-rate forensic
analysis (`D:\MU\docs\drop-rate-forensics.md`) and gameplay-flow
analysis (`D:\MU\docs\gameplay-call-flow.md`) from the same
investigation lineage. Per this project's own bootstrap discipline,
these are cited as sources, not re-derived from scratch — but every
number quoted from them was independently re-confirmed against this
phase's own fresh/hash-verified file reads before being used here.

## Drift found this phase (Common.dat, 2026-08-17 → 2026-09-03)

Real, operator-made changes to production since the last local
snapshot — **none touch a progression field this document tracks**:
`ServerGameMasterAccountLevelSwitch` (1→0), `WritePcPointLog` (0→1),
`MaxItemOption` (7→2), `ElfBufferMaxReset_AL0-3` (10000→3 — an Elf
Buffer re-buff cooldown counter, NOT `Character.ResetCount`, see the
false-positive note below), `*DurabilityRate` fields (100→1000, all
equipment types), `PlusStatPoint` (1→2), `HelperActiveMoney2-5`
(50/80/100/120 → 500/8000/100000/120000), `CashShopSwitch` (0→1,
already independently confirmed live as of Phase R), `PkItemDropSwitch`
/`PkItemDropRate`/`PkItemDropMaxLevel`/`PkItemDropPet`/`PkItemDropKit`
(PK-death item-drop mechanics, real changes). `AddExperienceRate_AL*`,
`AddMasterExperienceRate_AL*`, `ItemDropRate_AL*`,
`MoneyAmountDropRate_AL*`, and every `CommandReset*`/
`CommandMasterReset*` key are confirmed unchanged. This confirms the
file is actively hand-edited in production between phases — exactly the
operational reality this Control Plane direction exists to eventually
replace for the settings that matter most.

**False-positive warning, worth stating explicitly**: `ElfBufferMaxReset_AL0-3`
and `GuildCreateMinReset_AL0-3` both match a naive `Reset` text search but
are **not** the character reset system — the first gates how many resets
a character may have before the Elf Buffer NPC stops re-applying its
buff, the second gates guild creation. Neither is included in the RESET
domain below. This distinction matters because Part 1 explicitly warns
against generic-knowledge inference — the fix here is the opposite
discipline: don't let a shared word ("Reset") merge two unrelated
systems either.

## EXPERIENCE

| SETTING | SOURCE FILE/TABLE | SECTION | RAW VALUE | TYPE | MEANING | CONFIDENCE | READABLE | WRITABLE_IN_SOURCE | RUNTIME_MUTABLE | RELOAD_REQUIRED | RESTART_REQUIRED | PORTAL_CONTROL_SUITABILITY | NOTES |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `AddExperienceRate_AL0-3` | Common.dat | Experience Settings | 50/60/60/60 | int per-tier | "Valor no qual a experiência do servidor será multiplicada" — vendor's own text, literally "value by which server XP will be multiplied" | CONFIRMED (vendor doc, value) — **unit/scale still ambiguous, see XP stacking doc** | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES, top candidate | The word "multiplicada" is the vendor's own; does not by itself prove 50=50x vs 50=+50% — see `xp-stacking-investigation.md` |
| `AddMasterExperienceRate_AL0-3` | Common.dat | Experience Settings | 20/22/22/22 | int per-tier | Same "multiplied" language, for Master XP specifically | CONFIRMED (vendor doc, value) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES | Same scale ambiguity as above |
| `MinMasterExperienceMonsterLevel_AL0-3` | Common.dat | Experience Settings | 136/136/136/136 | int per-tier | Minimum monster level required for a kill to award Master XP at all | CONFIRMED (vendor doc) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES (flat today — no real per-tier differentiation to manage yet) | Flat across all 4 tiers |
| `AddEventExperienceRate_AL0-3` | Common.dat | Experience Settings | 300/300/300/300 | int, flat | XP multiplier applied specifically during events | CONFIRMED (vendor doc) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES (flat) | No VIP differentiation currently configured |
| `AddQuestExperienceRate_AL0-3` | Common.dat | Experience Settings | 100/100/100/100 | int, flat | XP multiplier applied to quest-granted XP | CONFIRMED (vendor doc) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES (flat) | Fell from 200→100 sometime before Aug 17 (see `configuration-history.md` lineage) — a real historical change, not this phase's finding |
| `ExperienceRandomAditional` | Common.dat | Experience Settings | 0 | int | Extra random variance applied to XP calculation | PROBABLE (vendor doc doesn't fully spell out the mechanism) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (unclear semantics, currently inert at 0) | — |
| `ExperienceMultiplierConstA` | Common.dat | Experience Settings | 10 | int, formula constant | Vendor doc: "Padrão 10 (para nível máximo 1000 = 1)" — a scaling constant tied to the server's configured max level | CONFIRMED to exist and be a real formula input; **exact formula UNKNOWN** | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO — do not expose as an editable number until the formula it feeds is known | See `xp-stacking-investigation.md` — this is the single most important unresolved fact in this whole matrix |
| `ExperienceMultiplierConstB` | Common.dat | Experience Settings | 1000 | int, formula constant | Vendor doc: "Padrão 1000 (para nível máximo 1000 = 6)" | CONFIRMED to exist; **exact formula UNKNOWN** | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO | Same caveat |
| `PetExperienceMultiplierConstA` / `PetExperienceRateDivisor` | Common.dat | Experience Settings | 100 / 10 | int, formula constants | Pet XP formula inputs (vendor-documented to exist, formula itself not given) | CONFIRMED to exist; formula UNKNOWN | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO | Out of this phase's core scope (pets are a secondary progression surface) |
| `MaxLevelUp` / `MaxLevelUpEvent` / `MaxLevelUpQuest` | Common.dat | Level Up Settings | 1/1/1 | int | Max number of character levels gainable from a single XP grant (normal/event/quest) | CONFIRMED (vendor doc) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES (flat, low-risk) | A real, if unusual, level-up throttle — worth surfacing even though not asked for by name |
| `PartyGeneralExperience1-7` / `PartySpecialExperience1-7` | Common.dat | Party Settings | 100/75/80/80/80/80/80 (both families, identical values) | int, percentage per party size | XP percentage per member as party size grows, split into same-class ("General") vs mixed-class ("Special") — both families currently hold identical values, i.e. no reward for mixed-class parties over same-class ones today | CONFIRMED (vendor doc, all 14 fields) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES (medium complexity — 14 related fields) | Real, complete, vendor-confirmed party-XP curve |

## MASTER XP (see EXPERIENCE above for the rate fields)

Master XP shares its rate fields (`AddMasterExperienceRate_AL0-3`,
`MinMasterExperienceMonsterLevel_AL0-3`) with the EXPERIENCE section
above — Master XP is not a separate config file, only a separate
rate/gate pair layered on the same base kill-XP pipeline once a
character reaches Master Level (a separate progression track entered
via Master Reset, see MASTER_RESET below — `MasterSkillTree.MasterLevel`,
`docs/game-data/schema/v1-character-reset-master-level.md`).

## DROP

Real, confirmed **4-layer** pipeline (account tier → map → monster →
item), each layer with its **own, non-uniform scale** — a single "Drop
Rate" slider would misrepresent this system:

| SETTING | SOURCE FILE/TABLE | SECTION | RAW VALUE | TYPE | MEANING | CONFIDENCE | READABLE | WRITABLE_IN_SOURCE | RUNTIME_MUTABLE | RELOAD_REQUIRED | RESTART_REQUIRED | PORTAL_CONTROL_SUITABILITY | NOTES |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ItemDropRate_AL0-3` | Common.dat | Item Drop Settings | 100/120/120/120 | int, **direct percentage 0-100** | "Porcentagem de chance de dropar items dos monstros" per account tier | CONFIRMED (vendor doc, dual-sourced against public S4-S15 documentation for the same field, same convention) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES, top candidate | Real drop-rate change already confirmed this phase (was 0 in June, reactivated to 100/120 before Aug 17) |
| `ItemDropTime` | Common.dat | Item Drop Settings | 20 | int, seconds | How long a dropped item stays visible on the ground | CONFIRMED (vendor doc) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES (low risk, UX-only) | Changed 10→20 before Aug 17 |
| `MoneyAmountDropRate_AL0-3` | Common.dat | Money Drop Settings | 10/12/12/12 | int, **direct percentage** | Zen (money) drop chance per account tier | CONFIRMED (vendor doc) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES | GameServer vs GameServerCS differ by 1pp on AL1-3 (12 vs 11) — a real, pre-existing, small cross-room inconsistency, not this phase's finding |
| `MoneyDropTime` | Common.dat | Money Drop Settings | 10 | int, seconds | How long dropped Zen stays visible | CONFIRMED (vendor doc) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | YES (low risk) | — |
| `ItemDropRate` (per map) | `Data/Maps/MapManager.txt` | — | not re-read this phase (see below) | int, **base-100 multiplier** (100=baseline, 200=double, 50=half) | Per-map item drop multiplier, vendor-documented with an explicit "100=baseline" convention distinct from the account-tier field's direct-percentage convention | CONFIRMED convention (vendor doc); **values NOT re-read this phase** | YES (not re-read) | YES | UNKNOWN | UNKNOWN | UNKNOWN | DEFERRED — needs its own per-map inventory pass before any Portal control is designed | Real file, real column, genuinely different scale from `ItemDropRate_AL0-3` above — do not conflate |
| `ExcItemDropRate` / `SetItemDropRate` (per map) | `Data/Maps/MapManager.txt` | — | not re-read this phase | int, **fraction of 1,000,000** | Excellent-option / Ancient(set)-item drop chance per map | CONFIRMED convention (vendor doc); values NOT re-read this phase | YES (not re-read) | YES | UNKNOWN | UNKNOWN | UNKNOWN | DEFERRED | A third, still different scale — three genuinely incompatible units live in this one "drop" concept |
| Monster-level drop rate (`ItemRate` per monster) | `Data/Monster/Monster.txt` | — | not re-read this phase | int | Per-monster drop-chance modifier | CONFIRMED to exist (prior phase file read); values NOT re-read this phase | YES (not re-read) | YES | UNKNOWN | UNKNOWN | UNKNOWN | DEFERRED | Fourth layer — item eligibility/option-generation (excellent/ancient/socket roll) sits on top of all four and is **PROBABLE, not CONFIRMED** — the exact multi-table combination formula is not in any text file (`drop-rate-forensics.md`) |
| PK-death item drop (`PkItemDropSwitch`/`Rate`/`MaxLevel`/`Pet`/`Kit`) | Common.dat | PK-adjacent (not its own titled section) | Switch=1, Rate=5, MaxLevel=10, Pet=0, Kit=0 | mixed | Whether/how much of a PK's inventory drops on death | CONFIRMED (vendor doc); **changed this phase's own drift check** (was Switch=0 before) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO for this phase (PK-death penalty is a distinct risk system, not named in Phase U's scope, flagged for completeness only) | Real, recent, active change — worth Bryan's awareness even though out of Phase U's direct ask |

## RESET

Fully confirmed, complete config block (`Command.dat`, "Reset Command
Settings" section, hash-verified unchanged since Phase 11):

| SETTING | RAW VALUE (AL0/AL1/AL2/AL3) | MEANING | CONFIDENCE | PORTAL_CONTROL_SUITABILITY | NOTES |
|---|---|---|---|---|---|
| `CommandResetSwitch` | 1 (global, not per-tier) | Master on/off for the `/reset` command | CONFIRMED | N/A (structural, not a rate) | Reset is ACTIVE |
| `CommandResetEnable_AL0-3` | 1/1/1/1 | Per-tier enable (redundant with the global switch while all are 1) | CONFIRMED | LOW priority | — |
| `CommandResetLevel_AL0-3` | 400/400/400/400 | Character level required to reset | CONFIRMED | YES | Matches `MaxLevel` — reset is a "you've capped out" mechanic, not available mid-leveling |
| `CommandResetMoney_AL0-3` | 0/0/0/0 | Zen cost per reset | CONFIRMED | YES | **Currently FREE for everyone** |
| `CommandResetCheckItem_AL0-3` / `CommandResetQuest_AL0-3` / `CommandResetSkill_AL0-3` | 0/0/0/0 (all three) | Item/quest/skill gates on reset | CONFIRMED | LOW (all inactive) | No item or quest requirement exists today |
| `CommandResetCount_AL0-3` | 1/1/1/1 | Resets granted per command use | CONFIRMED | LOW | — |
| **`CommandResetLimit_AL0-3`** | **20/20/20/50** | **Total reset cap, per account tier** | **CONFIRMED** | **YES — highest priority in this entire matrix** | **This is the field Bryan's Part 17 policy target (=20) is about. Gold tier (AL3) is currently configured 2.5x higher than the other three tiers and 2.5x higher than the target — a real, present DRIFT, not a hypothetical example.** |
| `CommandResetLimitDay/Wek/Mon_AL0-3` | 10000 (all, all tiers) | Daily/weekly/monthly reset throttle | CONFIRMED | LOW (effectively unlimited, no real throttle exists) | — |
| `CommandResetStartLevel_AL0-3` | 1/1/1/1 | Character level after a reset completes | CONFIRMED | LOW (structural) | — |
| **`CommandResetPoint_AL0-3`** | **450/500/500/500** | **Stat points awarded per reset** | **CONFIRMED** | **YES** | Free tier gets 50 fewer points per reset than VIP — a real, current progression differentiator |
| `CommandResetPointRateDW/DK/FE/MG/DL/SU/RF` | 100 (all 7 classes) | Per-class stat-point-rate multiplier | CONFIRMED | LOW (flat, no differentiation) | — |
| `CommandResetKeepDLCommandPoint_AL0-3` | 1/1/1/1 | Whether Dark Lord's command-stat points survive a reset | CONFIRMED | LOW | — |
| `CommandResetClosePartyEnable_AL0-3` | 0/0/0/0 | Whether resetting force-removes the character from its party | CONFIRMED | LOW | — |
| `CommandResetEffectSwitch` / `CommandResetType` / `CommandResetMoveType_AL0-3` / `CommandResetAutoEnable_AL0-3` | 0 / 1 / 1,1,1,1 / 0,0,0,0 | Visual effect toggle / a reset "type" mode / post-reset teleport behavior / an "auto-reset" feature (currently off) | CONFIRMED (values); PROBABLE (exact semantics of `Type`/`MoveType`'s numeric meaning) | LOW/structural | Not needed for a first control-plane pass |

## MASTER RESET

Fully confirmed, complete config block (`Command.dat`, "Master Reset
Command Settings" section, hash-verified unchanged since Phase 11).
**Distinct system from RESET** — different requirements, different
rewards, currently disabled:

| SETTING | RAW VALUE (AL0/AL1/AL2/AL3) | MEANING | CONFIDENCE | PORTAL_CONTROL_SUITABILITY | NOTES |
|---|---|---|---|---|---|
| **`CommandMasterResetSwitch`** | **0** (global) | Master on/off for `/masterreset` | **CONFIRMED** | N/A | **INACTIVE** — the command cannot be used regardless of any per-tier value below |
| `CommandMasterResetEnable_AL0-3` | 1/1/1/1 | Per-tier enable — irrelevant while the global switch is 0 | CONFIRMED | LOW | Per `progression-entries.json` PROG-004: these values look deliberately staged, not abandoned — the per-tier gates were configured before the feature was disabled, suggesting Master Reset was prepared for a future launch |
| `CommandMasterResetLevel_AL0-3` | 400/400/400/400 | Character level required | CONFIRMED | YES (once activated) | Same as Reset's level gate |
| **`CommandMasterResetReset_AL0-3`** | **1000/1000/1000/1000** | **Reset count required before Master Reset is available** | **CONFIRMED** | **YES (once activated)** | A deliberately customized value (not a template default) — real evidence of intent |
| `CommandMasterResetMoney_AL0-3` | 0/0/0/0 | Zen cost | CONFIRMED | YES (once activated) | Free, same as Reset |
| `CommandMasterResetCount_AL0-3` | 1/1/1/1 | Master resets granted per use | CONFIRMED | LOW | — |
| `CommandMasterResetLimit_AL0-3` / `LimitDay/Wek/Mon` | 10000 (all) | Total/throttle caps | CONFIRMED | LOW (effectively unlimited if ever activated) | Unlike Reset, there is no configured tier-differentiated cap here at all |
| `CommandMasterResetStartLevel_AL0-3` | 400/400/400/400 | Character level after a master reset | CONFIRMED | YES (once activated) | **Different from Reset's `StartLevel=1`** — a master reset returns the character to 400, not 1 |
| `CommandMasterResetStartReset_AL0-3` | 0/0/0/0 | Reset counter after a master reset | CONFIRMED | YES (once activated) | Reset count is zeroed — the "cycle restarts" design |
| **`CommandMasterResetPoint_AL0-3`** | **0/0/0/0** | **Stat points awarded per master reset** | **CONFIRMED** | **YES (once activated)** | **Zero, unlike Reset's 450-500.** Master Reset today would grant no direct stat benefit — its value (if activated) would come from unlocking Master Level progression, not from the reset action's own reward |
| `CommandMasterResetCheckStatusEnable_AL0-3` + `CommandMasterResetStatusStrength/Dexterity/Vitality/Energy/Leadership` | 0 (all 9 fields) | An optional minimum-stat gate for master reset, currently fully inactive | CONFIRMED (values); PROBABLE (exact enforcement semantics) | LOW (inactive) | A real, unused gate mechanism — worth knowing exists even though currently moot |
| `CommandMasterResetPointRateDW/DK/FE/MG/DL/SU/RF` | 100 (all 7) | Per-class point-rate multiplier | CONFIRMED | LOW (flat) | — |
| Every other `CommandMasterReset*_AL0-3` sub-field (CheckItem/MoveType/Quest/Skill/ClosePartyEnable) | 0 (all) | Same category of gates as Reset, all inactive | CONFIRMED | LOW | Confirms `vip-benefit-matrix.md`'s own finding: Master Reset has **zero** VIP tier differentiation across every single sub-field |

**Related, separately-tracked fields** (not part of the Command.dat
block above, but load-bearing for the same feature): `Character.ResetCount`
/`Character.MasterResetCount` (also `Character.resets`/`Character.grand_resets`,
a second, unused pair of columns — `docs/game-data/schema/v1-character-reset-master-level.md`),
`MasterSkillTree.MasterLevel` (a separate table, joined on `Character.Name`).

## VIP_PROGRESSION (AL0-3 differentiation summary)

Already comprehensively audited in `docs/vip/vip-benefit-matrix.md`
(Phase 14) — reused, not rebuilt, per this project's own
never-redo-real-work discipline. Re-confirmed unchanged this phase for
every progression-relevant row (Command.dat/Custom.dat hash-identical).
The progression-specific subset of that matrix:

| Benefit | AL0 (Free) | AL1 | AL2 | AL3 (Gold) | Monotonic? |
|---|---|---|---|---|---|
| XP rate bonus | 50 | 60 | 60 | 60 | Yes |
| Master XP rate bonus | 20 | 22 | 22 | 22 | Yes |
| Item drop rate | 100 | 120 | 120 | 120 | Yes |
| Zen drop rate | 10 | 12 | 12 | 12 | Yes |
| Reset cap | 20 | 20 | 20 | 50 | Yes (but a step function, not smooth — see RESET above) |
| Reset stat points | 450 | 500 | 500 | 500 | Yes |
| Master Reset (all fields) | flat | flat | flat | flat | N/A — zero differentiation |

`AL0≈Free/AL1≈Bronze/AL2≈Silver/AL3≈Gold` remains a **working
hypothesis**, not confirmed product mapping (per `vip-deep-audit.md`) —
this document does not treat it as more certain than that.

## SOURCE_OF_TRUTH (Part 9)

Every progression field in this matrix has exactly one real,
confirmed source today: `GAMESERVER_CONFIG` (`Common.dat`/`Command.dat`).

**One real, documented `SOURCE_OF_TRUTH_CONFLICT` risk, currently
dormant**: the legacy web AdminCP (PG MuCMS/DmN MuCMS, `NOT_DEPLOYED` —
see `docs/store/store-channel-boundaries.md` and `docs/legacy/provider-web/`)
has its own "Reset Settings"/"Grand Reset Settings" admin pages
(`current-admincp-catalog.md`). A dedicated prior code-level trace of
that legacy panel's own PHP source
(`D:\MU\docs\admin-to-game-config-map.md`, operator reference) confirms
those pages write only to `application/config/*.json` + the legacy
panel's own database — **there is no code path connecting them to
`Command.dat` at all**. If that panel were ever deployed, it would let
an operator configure "sold" reset rules on the website with zero
actual effect on the GameServer's real reset behavior — a real,
confirmed `SOURCE_OF_TRUTH_CONFLICT` pattern, currently inert only
because the panel itself is not deployed. Flagged here rather than
resolved, per this project's own "never silently pick a side" rule —
no code change follows from this row; it is a documented risk for the
day someone considers reviving that legacy panel.

No `PORTAL`/`LEGACY_CMS` value competes with `GAMESERVER_CONFIG` for
any field in this matrix today — the Portal has never displayed or
stored any of these values before this phase.

## Related systems

`docs/decisions/0025-progression-control-plane.md`,
`docs/progression/xp-stacking-investigation.md`,
`docs/progression/progression-effective-state-snapshot.json`,
`docs/vip/vip-benefit-matrix.md`, `docs/vip/vip-deep-audit.md`,
`docs/game-data/schema/v1-character-reset-master-level.md`,
`docs/store/store-channel-boundaries.md` (legacy AdminCP dormant-conflict
precedent), `apps/api/src/modules/progression/`.
