---
status: ACTIVE — real production data, mathematical stack formula still UNKNOWN
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED for raw config values and stacking eligibility (Group mechanism); UNKNOWN for exact XP math
---

# XP stack modifier inventory — Phase X Parts 1-12

Companion dataset: [`xp-modifier-dataset.json`](xp-modifier-dataset.json)
(machine-readable, same data as this document). Every value below is a
real, current production read (`Effect.txt`, `BonusManager.dat`,
`CustomPet.txt`, `CustomMonster.txt`, `Common.dat`, `MapManager.txt` —
downloaded read-only this phase, or re-confirmed hash-unchanged from
prior phases). No formula is invented — every UNKNOWN stays UNKNOWN.

## Part 4/5 — Base server rate representation (Bryan's Decision 1, closed)

```
BASE_SERVER_RATE = 50x   (Bryan's final product terminology, 2026-09-04)
CAN_CALL_BASE_SERVER_50X = YES
CAN_CLAIM_EFFECTIVE_XP_WITH_ALL_BONUSES = NO, until the stack formula is known
```

**Correction to prior phases** (never silently overwritten — struck
through, corrected here): `xp-stacking-investigation.md` (Phase U) and
`docs/open-risks.md`'s OR-021 both stated ~~`CAN_CALL_SERVER_50X = NO`~~
as a single, undifferentiated claim. Bryan's Phase X instruction draws
a distinction that resolves this without contradicting the underlying
technical finding: **the technical finding was never wrong** — the
real formula relating `AddExperienceRate_AL0-3`,
`ExperienceMultiplierConstA/B`, and monster level to final XP is still
genuinely `UNKNOWN`, and no config value alone proves a literal 50x
multiplier. What changes is that "50x" is now **Bryan's own product
policy decision for the BASE SERVER RATE label**, not a technical claim
derived from `AddExperienceRate_AL0=50`. The two open-risk/doc updates
for this correction are in Part 32 below.

```
ACCOUNT_LEVEL_VIP_CONFIG_VALUE = 50/60/60/60 (AddExperienceRate_AL0-3, Common.dat)
RELATIONSHIP_TO_BASE_50X = UNKNOWN (do not assume 50=1x/60=1.2x or any
  other reading unless the engine formula proves it)
```

Per Part 5's explicit instruction, these two facts are kept as
**separate, independently labeled rows** in the calculator model
(`BASE_SERVER_RATE` and `ACCOUNT_LEVEL_VIP` are distinct modifier
groups, never merged into one number) — see
[`progression-calculator.ts`](../../apps/api/src/modules/progression/progression-calculator.ts).

## Part 1 — XP item inventory (real, current production data)

Source: `Effect.txt` (22,052 bytes, 172 real rows, downloaded read-only
this phase from `C:\MuServer\Data\Effect.txt`). Columns confirmed by a
real vendor tutorial (`Effect.htm`, `CONFIRMED_VENDOR_DOC`): `Index,
Group, ItemIndex, Name, Save, Type, Flag, Count, Value1-4`.

| Item ID | Name | Source | XP bonus (raw) | Duration | Stack group | Confidence |
|---|---|---|---|---|---|---|
| 6699 | Seal of Ascension | Effect.txt (2 entries: idx29, idx40 — identical) | Value1=50 | 1800s (30 min) | `EFFECT_GROUP_60` | CONFIRMED value/UNKNOWN unit |
| 6836 | Seal of Ascension (stronger variant) | Effect.txt (idx193) | Value1=100 | 1800s | `EFFECT_GROUP_60` | CONFIRMED value/UNKNOWN unit |
| 6749 | Master Seal of Ascension | Effect.txt (idx101) | Value1=50 | 1800s | `EFFECT_GROUP_60` | CONFIRMED value/UNKNOWN unit |
| 6837 | Master Seal of Ascension (stronger variant) | Effect.txt (idx194) | Value1=100 | 1800s | `EFFECT_GROUP_60` | CONFIRMED value/UNKNOWN unit |
| 6759 | Party Experience Bonus | Effect.txt (idx112) | Value1=90, Value2=10 | 1800s | `EFFECT_GROUP_24` (alone) | CONFIRMED value/UNKNOWN unit |
| 6833 | Talisman of Ascension 1 | Effect.txt (idx190) | Value1=50 | 1800s | `EFFECT_GROUP_115` | CONFIRMED value/UNKNOWN unit |
| 6834 | Talisman of Ascension 2 | Effect.txt (idx191) | Value1=100 | 1800s | `EFFECT_GROUP_115` | CONFIRMED value/UNKNOWN unit |
| 6835 | Talisman of Ascension 3 | Effect.txt (idx192) | Value1=200 | 1800s | `EFFECT_GROUP_115` | CONFIRMED value/UNKNOWN unit |
| — | Pets (`CustomPet.txt`: `IncExperience`/`IncMasterExperience` columns) | `CustomPet.txt` (real vendor-named columns confirmed) | mechanism exists | — | — | CONFIRMED mechanism / **file is currently EMPTY — zero pets configured** |

**Not included, confirmed out of scope by direct inspection** (not
assumed): `CustomJewel.txt`/`CustomWing.txt` grant equipment stat
bonuses, no XP field found in their real, vendor-documented columns.
`CustomRingInvoker.txt` is a monster-summoning mechanism (real, but
zero active rows besides one commented-out example) — not an XP item.

**Item name / catalog note**: two pairs above ("Seal of Ascension" ×2,
"Master Seal of Ascension" ×2) share a display name but have different
real `ItemIndex` values and different `Value1` — these are genuinely
distinct catalog items, not duplicate rows. Treated as separate entries
throughout this document and the dataset.

## Part 2 — Buff / seal stacking (compatibility matrix)

**Real mechanism, `CONFIRMED_VENDOR_DOC` (`Effect.htm`)**: *"Group: só
um efeito ativo por grupo"* — only one active effect per `Group` value.
This is the authoritative stacking rule — not inferred, not guessed.

```
STACK_RULE = ONE_ACTIVE_EFFECT_PER_GROUP (Effect.txt's own Group column)
```

**Real finding — Seal and Master Seal of Ascension are mutually
exclusive with each other**, not previously documented: all four
Ascension-family seals (`Seal of Ascension` ×2, `Master Seal of
Ascension` ×2) share `Group 60`. A player cannot have a normal XP seal
and a Master XP seal active at the same time — activating one clears
any other Group-60 effect.

| Modifier A | Modifier B | Can coexist | Stack behavior | Confidence |
|---|---|---|---|---|
| Seal of Ascension (any variant) | Master Seal of Ascension (any variant) | **NO** | `MUTUALLY_EXCLUSIVE` (same Group 60) | CONFIRMED |
| Seal of Ascension | Seal of Ascension (the other ItemIndex variant) | **NO** | `MUTUALLY_EXCLUSIVE` (same Group 60) | CONFIRMED |
| Seal of Ascension | Talisman of Ascension (any tier) | **YES** | `DIFFERENT_GROUPS` (60 vs 115) | CONFIRMED coexist / UNKNOWN numeric combination |
| Talisman of Ascension 1/2/3 (with each other) | — | **NO** | `MUTUALLY_EXCLUSIVE` (same Group 115) | CONFIRMED |
| Seal/Master Seal/Talisman of Ascension | Party Experience Bonus (item 6759) | **YES** | `DIFFERENT_GROUPS` (24 vs 60/115) | CONFIRMED coexist / UNKNOWN numeric combination |
| Any Effect.txt XP item above | `VIP` (`AddExperienceRate_AL0-3`) | **YES** | different mechanism entirely (config field vs. timed item effect) — no evidence of mutual exclusion | CONFIRMED coexist (different systems) / UNKNOWN numeric combination |
| Any Effect.txt XP item above | `Event` (`AddEventExperienceRate`) / `Party` config rate | **YES** | different mechanism — no evidence of exclusion | CONFIRMED coexist / UNKNOWN numeric combination |

Full pairwise matrix (36 real entries, every Group-60/115/24 pair plus
every cross-group XP-item pair): `xp-modifier-dataset.json`'s
`compatibilityMatrix` array.

**What remains genuinely unknown**: whether two coexisting modifiers
combine additively or multiplicatively. The Group mechanism proves
*eligibility to be simultaneously active* — it says nothing about the
arithmetic once they are. This is why the calculator (Part 19) has a
`KNOWN_COMPONENTS` vs `UNKNOWN_COMBINATION` split, never a computed
"effective %" from multiple active modifiers.

## Part 3 — XP modifier groups (normalized, evidence-backed only)

```
BASE_SERVER_RATE       -- Bryan's product policy (50x)
ACCOUNT_LEVEL_VIP       -- AddExperienceRate_AL0-3 (Common.dat)
MAP                     -- MapManager.txt ExperienceRate (Part 9)
PARTY                   -- PartyGeneralExperience/PartySpecialExperience (Part 10)
EVENT                   -- AddEventExperienceRate_AL0-3 + BonusManager.dat scheduled bonus (Part 11)
QUEST                   -- AddQuestExperienceRate_AL0-3 (Part 12)
SEAL                    -- Effect.txt Group 60 (Seal/Master Seal of Ascension)
BUFF                    -- Effect.txt Group 115 (Talisman of Ascension), Group 24 (Party Experience Bonus item)
PET                     -- CustomPet.txt IncExperience/IncMasterExperience (mechanism only, not active)
RANDOM_BONUS            -- ExperienceRandomAditional (currently 0, inert)
```

No `ITEM` group beyond `SEAL`/`BUFF`/`PET` was created — no other
real, evidenced XP-affecting item category was found in CashShop/
X-Shop item catalogs during this phase's search (their existing
commercial review docs, `docs/economy/xshop-commercial-review.md`/
`cashshop-commercial-review.md`, do not list any item with a
documented XP effect — re-checked this phase, no new finding).

## Part 6 — Monster XP

```
MONSTER_XP_SOURCE = UNKNOWN (no explicit XP field found anywhere accessible)
```

`Monster.txt`'s real, confirmed column set (re-verified this phase,
549 rows) has no `Experience`/`XP` column — unchanged from Phase V's
finding. `CustomMonster.txt` (real, current, 12 rows — the 10 OR-023
boss reverts minus Maya Hand ×2, plus the 4 new monsters, plus Hydra)
DOES have an `ExperienceRate` override column, but **every one of its
12 real rows leaves `ExperienceRate` unset (`*`)** — the mechanism
exists and is populated for these bosses, but not used to modify their
XP specifically; the only fields these 12 rows actually set are
`InfoMessage` (32-43) and `AlertMessageAttackTime` (60). Base monster
XP is presumed to derive from `Level` via the still-unresolved
`ExperienceMultiplierConstA/B` formula — this is inference, not proof,
and is reported as such (unchanged from Phase V's own conclusion).

## Part 7/8 — Level XP curve

```
LEVEL_XP_CURVE = UNKNOWN
```

Searched this phase, none found: `Monster.txt`, `Common.dat`,
`Character`-adjacent SQL schema (`bloodmoon_gameserver_lab`, the real
local lab database — no table name contains `Level`/`Exp` per a direct
`INFORMATION_SCHEMA.TABLES` query), the full vendor tutorial extraction
(no dedicated `Monster.htm`/level-table tutorial exists among the 49
hash-verified files), and this project's own harvested external
reference library (`references/game-data/` — 330 canonical pages from
GuiaMu Argentina/Webzen/MuOnlineFanz/MegaMU, searched for
experience-table content, none found).

**Part 8's external-reference option, deliberately not exercised this
phase**: rather than assert a specific "well-known MU Season 6 formula"
from uncertain memory (a real risk of misremembering exact historical
constants and presenting them with false confidence — exactly what
Part 30's "no false precision" rule exists to prevent), the calculator
is built so a **future, explicitly-sourced** external reference table
can be loaded and clearly labeled `EXTERNAL_REFERENCE_ONLY` — see
`LevelCurveProvider` in `progression-calculator.ts`. This project
already has an established, real policy for exactly this situation
(`references/game-data/source-collection-policy.md`'s
`v6-prioridade`/`validar`/`high-version-futuro` classification, "nada
vindo dessas fontes deve ser publicado direto sem revisao") — reused
here rather than inventing a parallel one.

## Part 9 — Map XP

```
MAP_XP = CONFIRMED (unchanged from Phase V)
```

`MapManager.txt`'s `ExperienceRate` = 100 on all 67 maps, re-verified
this phase (Sept3/current snapshot, unchanged). Per the confirmed
vendor scale convention (100=no change, 200=double, 50=half —
`ExperienceTable.htm`, reused here since `MapManager.htm` cross-
references the identical convention), 100 means **neutral** — no map
currently applies its own XP multiplier. How this combines with the
account-tier rate (additive vs. multiplicative) is not proven by any
accessible source — same `UNKNOWN` as every other cross-layer
combination question in this document.

## Part 10 — Party XP

```
PARTY_XP = CONFIRMED (values) / UNKNOWN (special-party definition)
```

| Party size | General (%) | Special (%) |
|---|---|---|
| 1 | 100 | 100 |
| 2 | 75 | 80 |
| 3-7 | 80 (all) | 80 (all) |

(`PartyGeneralExperience1-7`/`PartySpecialExperience1-7`, `Common.dat`,
re-confirmed unchanged this phase.) **What "special" party means (a
class-composition rule — e.g. all-different-class vs. same-class) is
not documented anywhere accessible** — no vendor tutorial defines the
distinction, and no config file names the rule. Marked `UNKNOWN`, not
guessed. Real, separate item-based bonus found this phase: "Party
Experience Bonus" (`Effect.txt` item 6759, Value1=90/Value2=10) is a
**different mechanism** (a consumable/timed effect) from the party-size
percentage table — the two must not be conflated; both are represented
as distinct modifier-group members.

## Part 11 — Event XP

```
EVENT_XP = PARTIAL
```

Three distinct, real mechanisms found, kept separate per Part 11's own
instruction:

1. **Global event-kill rate**: `AddEventExperienceRate_AL0-3` = 300
   flat (all tiers), `Common.dat`, re-confirmed unchanged.
2. **Event on/off + tuning switches**: `GameServerInfo - Event.dat`
   (`CONFIRMED_VENDOR_DOC`, `Configurando eventos nativos.htm`) toggles
   Blood Castle/Chaos Castle/Devil Square/Illusion Temple/Crywolf/
   Castle Siege/Kanturu/etc. and a few difficulty constants
   (`ChaosCastleBlowUserRate`, `DoubleGoerEventDifficultRate`,
   `IllusionTempleEventRewardFenrirRate`) — **no explicit event-specific
   XP-reward field was found among its documented fields**. Whether
   completing/surviving these events grants XP via `AddEventExperienceRate`
   alone, a separate hidden reward, or not at all is `UNKNOWN`.
3. **Scheduled server-wide bonus event**: `BonusManager.dat` (real,
   current, downloaded this phase) has exactly one configured entry:
   `BonusIndex=0` (="EXP%" per vendor doc), `BonusValue_AL0-3=100/100/100/100`
   (uniform across tiers, unlike the account-tier XP rate), scoped to
   `MapNumber=33`, `MonsterLevelMin/Max=110/130`, with a schedule entry
   of `Month=5, Day=27, Hour=15, Minute=23` — a single date, not an
   obviously recurring rule. Whether `BonusValue=100` means "+100%"
   (doubling) or reuses the "100=neutral" convention from other fields
   is `UNKNOWN` — the vendor doc's own field name ("EXP%") suggests a
   percentage-add reading but does not state the baseline explicitly.

`Kill XP vs. completion reward XP` (Part 11's own required distinction):
not separable with current evidence — no completion-specific reward
field was found in `Event.dat`'s documented fields, so this document
does not claim event completions grant XP beyond the general
`AddEventExperienceRate` kill-time multiplier.

## Part 12 — Quest XP

```
QUEST_XP = PARTIAL
```

`AddQuestExperienceRate_AL0-3` = 100 flat (all tiers), `Common.dat`,
re-confirmed — applies to monster-kill XP earned while on a quest.
Separately, real, current production quest data was downloaded this
phase: `Quest.txt` (6,257 bytes, a state-machine definition — Index/
StartType/MonsterClass/CurrentState/RequireIndex/RequireState/
RequireMinLevel/RequireMaxLevel/class flags) and `QuestReward.txt`
(1,684 bytes — Type/Index/Quantity/Level/Option1-3/NewOption/
RequireIndex/RequireState/class flags). **No explicit lump-sum XP
reward field was found in either file's real column set** — reward
`Type` values (1, 2, 4, 8, 16 — bitflag-shaped) and `Index` (200-204,
likely referencing specific reward items) suggest quest completion
rewards are item-based, not a direct XP grant, but this is not proven
either way from the visible columns alone. `QuestWorld.txt` (a second,
much larger quest system, 139,912 bytes) exists but was not parsed this
phase — flagged for a future pass if quest-XP investigation continues.
Kill XP during a quest (via `AddQuestExperienceRate`) and any possible
lump-sum completion XP are kept explicitly separate per Part 12's
instruction — only the former is confirmed to exist.

## Related systems

`xp-modifier-dataset.json`, `docs/progression/xp-formula-evidence-and-vendor-questions.md`,
`docs/decisions/0028-xp-stack-and-progression-calculator.md`,
`docs/progression/spot-dataset-analysis.md`,
`apps/api/src/modules/progression/progression-calculator.ts`,
`references/game-data/source-collection-policy.md`.
