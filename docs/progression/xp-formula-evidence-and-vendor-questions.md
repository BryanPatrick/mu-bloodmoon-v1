---
status: INVESTIGATION_DEEPENED — formula remains UNKNOWN, reload semantics substantially resolved
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: MIXED — see per-item CONFIDENCE; nothing here asserts the XP formula without proof
---

# XP formula evidence table + vendor question package — Phase V Parts 3/4/5

## Part 3/4 — Formula evidence table

Every component below traces to a real key in this server's own files,
re-confirmed this phase (`Common.dat` hash-checked live; `Command.dat`/
`Custom.dat` confirmed unchanged since Phase 11/U). New this phase: a
pre-existing, exhaustive vendor-tutorial extraction
(`D:\MU\docs\vendor-tutorials-knowledge-extraction.md`, operator
reference, sourced from 49 hash-verified vendor `.htm`/`.rtf` tutorials
copied read-only from `C:\MuServer\Tutoriais\`) supplies real vendor
text this investigation had not yet used.

| COMPONENT | RAW VALUE | SOURCE | VENDOR DESCRIPTION | OBSERVED BEHAVIOR | FORMULA RELATIONSHIP | CONFIDENCE |
|---|---|---|---|---|---|---|
| `AddExperienceRate_AL0-3` | 50/60/60/60 | `Common.dat` | "Valor no qual a experiência do servidor será multiplicada" (per tier) | Not empirically observed (no test performed) | Feeds into final XP somehow; whether as a raw multiplier, a %-bonus, or an additive term to the ConstA/B formula is not stated | CONFIRMED (value + vendor text) / UNKNOWN (exact relationship) |
| `ExperienceMultiplierConstA` | 10 | `Common.dat` | "Padrão 10 (para nível máximo 1000 = 1)" | Not empirically observed | A real formula input; the vendor's own worked example uses `MaxLevel=1000`, which does NOT match this server's real `MaxLevel=400` — the example cannot be applied to this server without re-deriving it | CONFIRMED (exists, is used) / UNKNOWN (formula) |
| `ExperienceMultiplierConstB` | 1000 | `Common.dat` | "Padrão 1000 (para nível máximo 1000 = 6)" | Not empirically observed | Same caveat as ConstA | CONFIRMED (exists, is used) / UNKNOWN (formula) |
| `ExperienceTable.txt` (bracket-based rate override by level/master-level/reset/master-reset range) | **file exists, zero data rows** (`//header` + `end` only) | `Data/Util/ExperienceTable.txt` | "ExperienceRate: 100=sem mudança, 200=dobra, 300=triplica, 50=metade" (`ExperienceTable.htm`) | Confirmed empty — this mechanism is real but completely unconfigured on Blood Moon | Would apply on top of `AddExperienceRate` if ever configured; currently a no-op | CONFIRMED (real mechanism, real scale, real emptiness) |
| `MapManager.txt` → `ExperienceRate` (per-map) | 100 for every one of 67 maps (re-confirmed this phase, live download) | `Data/Maps/MapManager.txt` | Same 100/200/300/50 convention (`MapManager.htm`, cross-referenced) | Confirmed flat — no map currently has a non-baseline XP multiplier | A real, separate, currently-inert multiplier layer on top of the account-tier rate | CONFIRMED (value, scale, and current flatness) |
| `PartyGeneralExperience1-7` / `PartySpecialExperience1-7` | 100/75/80/80/80/80/80 (both families) | `Common.dat` | Direct percentage of XP per party size, same-class vs mixed-class | Confirmed values, not empirically tested in-game | Applies to party kills; relationship to the tier/map layers above not stated | CONFIRMED (values) / UNKNOWN (combination with other layers) |
| `AddEventExperienceRate_AL0-3` / `AddQuestExperienceRate_AL0-3` | 300 flat / 100 flat | `Common.dat` | Same "multiplied" language, scoped to event/quest XP specifically | Not observed | Whether these REPLACE or STACK with `AddExperienceRate` for a kill that is simultaneously an event/quest kill is not stated anywhere | CONFIRMED (values) / UNKNOWN (stacking relationship) |
| Monster base XP | **no column found** | `Data/Monster/Monster.txt` (re-confirmed this phase, live download, 549 real monster rows) | N/A — no vendor tutorial documents a per-monster XP field | Confirmed absent from the real, current column set (`Index,Rate,Name,Level,MaxLife,MaxMana,DamageMin,DamageMax,Defense,MagicDefense,AttackRate,DefenseRate,MoveRange,AttackType,AttackRange,ViewRange,MoveSpeed,AttackSpeed,RegenTime,Attribute,ItemRate,MoneyRate,MaxItemLevel,MonsterSkill,Resistance1-4`) | Base XP must derive from `Level` (the one column that plausibly feeds a formula) — this is the strongest indirect evidence for *why* `ExperienceMultiplierConstA/B` exist at all | CONFIRMED (column absent) |
| `ExperienceRandomAditional` | 0 | `Common.dat` | Not fully explained in the vendor doc extraction available | Confirmed inert at 0 | Unknown whether/how it participates when non-zero | CONFIRMED (value) / UNKNOWN (mechanism) |

## Reload/restart semantics — substantially resolved this phase (real upgrade from Phase U's complete UNKNOWN)

New evidence this phase: `Recarregando arquivos e configurações.htm`
(a real vendor tutorial, `CONFIRMED_VENDOR_DOC`) documents an
in-game/console **Reload menu** on `GameServer.exe` itself, with a
companion `Lista de Comandos Reload.txt` naming 18 categories:
`cashshop, chaosmix, character, command, common, custom, event,
eventitembag, hack, item, monster, move, quest, shop, skill, util,
bots, all`.

```
COMMON_DAT_RELOAD = "Reload Common" -> rereads GameServerInfo -
  Common.dat + Effect.txt, ExperienceTable.txt, Filter.txt,
  GameMaster.txt, Gate.txt, MapManager.txt, MapServerInfo.dat,
  Message.txt, Move.txt, MoveSummon.txt, Message.wtf, Notice.txt,
  ResetTable.txt
COMMAND_DAT_RELOAD = "Reload Command" -> rereads the entire
  GameServerInfo - Command.dat
RESTART_REQUIRED (Common.dat fields) = NO, per vendor doc: "não
  necessário para valores cobertos por Reload Common"
RESTART_REQUIRED (Command.dat fields) = NO, per vendor doc: "não
  necessário para campos cobertos por Reload Command"
RELOAD_TRIGGER_MECHANISM = clicking "Reload" in the GameServer.exe
  interactive console window, selecting a category. A `/reload
  <categoria>` chat-command form is referenced as "implicit" by the
  category list but its EXACT chat syntax is not shown in any of the
  49 tutorials read.
REMOTELY_SCRIPTABLE_VIA_SSH = UNKNOWN -- the vendor doc explicitly
  requires "GameServer.exe rodando com janela acessível (console
  interativo)" -- this is a GUI action inside an interactive console
  window, not confirmed reachable via RemoteOps/SSH (which has no
  interactive GUI access to that console).
```

**This is a real, substantial upgrade from Phase T/U's "RUNTIME_MUTABLE/
RELOAD_REQUIRED/RESTART_REQUIRED = UNKNOWN for every field."** For the
`EXPERIENCE`, `DROP`, `RESET`, and `MASTER_RESET` `ProgressionConfigItem`
domains specifically, `RESTART_REQUIRED` can now be confidently marked
`NO` (`CONFIRMED_VENDOR_DOC`) instead of `UNKNOWN`. **`RELOAD_REQUIRED`
remains `YES`** (files are not picked up automatically on save — some
reload trigger is needed), and **whether that trigger can be invoked
remotely/programmatically (vs. requiring physical/RDP console access)
remains `UNKNOWN`** — this is now the one real, narrowed gap standing
between "we know how to make this change take effect" and "we could
build a real sync command for it." Per Bryan's Decision 2 this phase,
this gap is `BLOCKED_BY_RUNTIME_EVIDENCE` and stays that way — reading
this vendor documentation is real evidence-gathering, not runtime
testing, and no reload/restart was performed or requested against
production this phase.

## KNOWN_COMPONENTS / UNKNOWN_COMPONENTS (Phase U's structure, reconfirmed)

Unchanged from `xp-stacking-investigation.md` (Phase U) — every
component identified there remains identified, and no new formula-math
evidence was found. The one genuinely new fact this phase: the
`ExperienceTable.txt` bracket-override mechanism is now confirmed to
exist AND confirmed to be completely unconfigured (empty), which
*removes* one possible confound (there is no hidden level/reset-bracket
XP override currently active) without resolving the core formula.

```
XP_STACKING = UNKNOWN (unchanged)
XP_EFFECTIVE_FORMULA = UNKNOWN (unchanged)
ADD_EXPERIENCE_RATE_AL0_MEANING = "value by which server XP will be
  multiplied" (vendor's own words, re-confirmed) -- still not proof of
  a literal Nx multiplier
CAN_CALL_SERVER_50X = NO (unchanged)
```

## Part 5 — Vendor contact question package (not sent, prepared only)

Bryan's instruction: resolving the formula is worth pursuing because it
blocks honest rate communication, simulation, 2-3-resets/week
balancing, VIP XP balancing, and map/monster planning. Below is a
precise, technically-scoped question set a real server/vendor developer
could answer quickly — deliberately NOT "how does XP work?"

1. **`AddExperienceRate_AL0-3` semantics**: Is this field a literal
   multiplier applied to base monster XP (`final = base × rate`), a
   percentage bonus over a baseline of 100 (`final = base × (rate/100)`
   or `final = base × (1 + (rate-100)/100)`), or an additive input to
   the `ExperienceMultiplierConstA/B` formula below? Please give the
   exact arithmetic expression, not a description.

2. **`ExperienceMultiplierConstA`/`ExperienceMultiplierConstB` formula**:
   What is the complete formula that converts a monster's `Level`
   (from `Monster.txt`) into base XP, using these two constants? The
   vendor documentation we have gives two isolated example *outputs*
   ("for `MaxLevel=1000` → 1" and "→ 6") without the formula that
   produces them, and our server's real `MaxLevel` is 400, not 1000 —
   please give the formula itself, not another single-point example.

3. **Order of operations**: Given a normal (non-event, non-quest,
   solo, no party) monster kill, in what order are the following
   applied: base XP (from Level via ConstA/B) → `AddExperienceRate_AL*`
   → `MapManager.txt`'s per-map `ExperienceRate` →
   `ExperienceRandomAditional`? Please give the exact sequence.

4. **Event/quest stacking**: For a kill that occurs during an active
   event AND grants quest XP simultaneously (if that state is even
   reachable), do `AddEventExperienceRate_AL*` and
   `AddQuestExperienceRate_AL*` both apply (multiplicatively or
   additively — which?), does one override the other, or is this not a
   real reachable game state?

5. **Party stacking**: Does `PartyGeneralExperience<N>`/
   `PartySpecialExperience<N>` (percentage by party size) apply to the
   *base* XP (before `AddExperienceRate_AL*`) or to the
   *already-tier-multiplied* XP? Please give the exact formula position.

6. **AccountLevel (VIP tier) stacking with Master XP**: Does
   `AddMasterExperienceRate_AL0-3` use the identical
   `ExperienceMultiplierConstA/B`-based formula as normal XP (just a
   different rate input), or is Master XP computed via a structurally
   different formula? If different, please provide it.

7. **`ExperienceRandomAditional`**: When this value is non-zero, what
   is the exact random-variance mechanism (uniform range? percentage
   jitter? applied before or after the tier multiplier)? Confirmed
   currently `0` on our server, but we'd like to understand the
   mechanism before ever changing it.

8. **`ExperienceTable.txt` interaction**: If we were to add a real
   bracket row to this currently-empty file (e.g. a temporary event
   XP boost for characters with reset count in [10,20]), does its
   `ExperienceRate` value replace `AddExperienceRate_AL*` for
   matching characters, or stack with it? Same
   multiplicative-vs-additive question as #1, scoped to this
   mechanism specifically.

```
VENDOR_XP_QUESTION_PACKAGE = READY (8 precise questions, none sent)
```

## Related systems

`docs/progression/xp-stacking-investigation.md` (Phase U original),
`docs/progression/progression-config-field-matrix.md`,
`docs/decisions/0026-progression-evidence-and-balance-readiness.md`,
`D:\MU\docs\vendor-tutorials-knowledge-extraction.md` (operator
reference, source of the reload-mechanism finding),
`D:\MU\docs\common-dat-semantic-map.md`.
