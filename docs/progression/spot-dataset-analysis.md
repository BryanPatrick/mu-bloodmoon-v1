---
status: ACTIVE — real production spawn data, respawn semantics UNKNOWN
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED for spawn counts/positions; UNKNOWN for respawn timing and kills/hour
---

# Spot dataset analysis — Phase X Parts 13-18

Companion dataset: [`spot-dataset.json`](spot-dataset.json) (machine-
readable, 58 real spots). Source: `MonsterSetBase.txt`, `Monster.txt`,
`MapManager.txt` — the same Sept3/current snapshot used throughout
Phases V-W, re-verified unchanged this phase.

## Part 13/14 — Spot identification and grouping rule

```
GROUPING_RULE = (MapNumber, MonsterID) -- every scriptType=2
  ("Normal Monster") spawn row sharing the same map and monster ID is
  one spot. This is the natural grouping unit already present in the
  source data, not an invented spatial radius. No distance-based
  clustering was applied -- MonsterSetBase.txt's own scriptType=2
  blocks have no sub-grouping markers (no comments separating spawn
  clusters within a block), so any finer split would require choosing
  an arbitrary coordinate radius, which Part 14 explicitly forbids
  doing silently. Individual spawn points are preserved via each
  spot's boundingBox (min/max X/Y across its spawn points), not
  collapsed to a single point.
SPOT_ID_FORMAT = "map{N}-mon{ID}" (technical, deterministic, generated
  -- no semantic spot names exist in the source data to reuse)
```

## Part 13/15 — Real spot inventory

```
TOTAL_SPOTS = 58
MAPS_WITH_SPOT_DATA = 15 of 67
TOTAL_MONSTERS_IN_SPOTS = 407
```

| Map | Spots | Monsters |
|---|---|---|
| 2 Devias | 1 | 1 (boss: Lycan) |
| 4 Lost Tower | 1 | 1 (boss: Kronus) |
| 7 Atlans | 1 | 1 (boss: Hydra) |
| 8 Tarkan | 1 | 1 (boss: Farao) |
| 24 Kalima 1 | 8 | 61 |
| 25 Kalima 2 | 8 | 61 |
| 26 Kalima 3 | 8 | 61 |
| 27 Kalima 4 | 8 | 61 |
| 28 Kalima 5 | 8 | 61 |
| 29 Kalima 6 | 8 | 67 |
| 33 Aida | 1 | 1 (boss: BloodMoon) |
| 36 Kalima 7 | 1 | 1 (boss: Kundun) |
| 37 Kanturu 1 | 1 | 1 (boss: Rei Orc) |
| 38 Kanturu 2 | 2 | 27 |
| 51 Elbeland | 1 | 1 (boss: Coelho) |

**Important, honest caveat — do not over-read the 52 "missing" maps**:
`MonsterSetBase.txt`'s `scriptType=2` blocks appear to be a **custom/
additional** spawn layer, not a complete server-wide spawn table.
Well-known standard leveling maps (Lorencia, Noria, regular Devias/
Lost Tower/Elbeland mobs, Dungeon, Icarus, etc.) have **zero** rows in
this file, which almost certainly does not mean these maps have no
monsters in-game — it means their spawn definitions live somewhere
this investigation could not access (most plausibly compiled into the
GameServer binary itself, a common pattern for "vanilla" MU maps that
don't need a custom override). **This document reports what
`MonsterSetBase.txt` contains, not a claim about total server-wide
spawn coverage.** The 15 maps above are real, confirmed, current
production custom spawn data — mostly the Kalima 1-6 dungeon chain
(a real, substantial farming dataset: 8 spots/61-67 monsters per map)
plus Kanturu 2 and the 7 single-boss maps already known from OR-023
forensics.

`scriptType=4` ("Blood Castle Monsters / Gate / Others") has 2,110
rows in the same file — real, but event-specific, not open-world
leveling data, and out of scope for this farming-spot analysis per
Bryan's own framing ("leveling/farming spot"). `scriptType=0`
("Guards / NPC / Traps") has 373 rows, also out of scope (not
monsters players farm for XP).

## Part 16 — Respawn timing

```
RESPAWN_DATA = UNKNOWN
```

`Monster.txt` has a `RegenTime` column (real, confirmed to exist,
captured per-monster in `spot-dataset.json`). Real values found among
the 15 maps' monsters: 3, 10, 10,800 (3h), 21,600 (6h), 28,800 (8h),
43,200 (12h) seconds. **This document does not assume `RegenTime`
means "seconds until a killed monster respawns."** No vendor tutorial
in the 49-file extraction documents `Monster.txt`'s own `RegenTime`
field specifically (a different, unrelated `RegenTime` field exists in
`InvasionManager.dat`'s own Section 3, for invasion-event monsters —
confirmed vendor-documented there, but that is a different file and a
different mechanism). The wide range of values here — including
implausibly short ones (3s, 10s) for a literal respawn interval next
to plausible ones (3h-12h) — is exactly the kind of ambiguity Part 16
warns against resolving by assumption. An equally plausible reading is
that `RegenTime` governs a monster's own HP/MP self-regeneration tick,
unrelated to spawn cadence. **Marked `UNKNOWN`, not guessed, per Part
16's explicit instruction not to use generic MU timing.**

## Part 17 — Theoretical kills/hour ceiling (spawn capacity)

```
SPAWN_CAPACITY_CALCULATION = NOT_AVAILABLE
BLOCKED_BY: RESPAWN_DATA = UNKNOWN
```

The formula itself is real and ready to use the moment respawn timing
is confirmed:

```
SPAWN_CAPACITY_PER_HOUR = spotMonsterCount × (3600 / confirmedRespawnSeconds)
```

`progression-calculator.ts`'s `spawnCapacityPerHour()` implements
exactly this — and throws a named error
(`RespawnTimeUnknownError`) rather than silently using the unproven
`RegenTime` column as if it were respawn interval. This is
**distinct from `PLAYER_KILLS_PER_HOUR`** (Part 18) — a spawn ceiling
describes the map's own maximum monster throughput, never how fast a
player can actually kill.

## Part 18 — Player kill speed

```
PLAYER_KILLS_PER_HOUR = REQUIRES_USER_INPUT (no combat telemetry exists)
```

Matches Phase V's own conclusion (`reset-audit-and-time-to-reset-model.md`)
— no kills/hour empirical data source exists anywhere in this project.
The calculator accepts this as a real, admin/player-supplied input
(seconds-per-kill or kills-per-minute — `progression-calculator.ts`'s
`estimateXpPerHour()`), never as a value the calculator invents or
defaults silently.

## Related systems

`spot-dataset.json`, `docs/drop/or-023-forensics.md` (the same
`MonsterSetBase.txt` snapshot, boss spawn cross-reference),
`docs/progression/xp-stack-inventory.md`,
`apps/api/src/modules/progression/progression-calculator.ts`.
