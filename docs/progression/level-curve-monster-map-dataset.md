---
status: ACTIVE — real, hash-verified data; scope limits stated explicitly
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED for everything reported present; explicit UNKNOWN for the level curve
---

# Level curve, monster, and map dataset — Phase V Parts 6/7/8/9/10/18

## Part 6 — Level experience curve

```
LEVEL_CURVE = UNKNOWN
MASTER_LEVEL_CURVE = UNKNOWN
```

No text-configurable table of "XP required per level" exists anywhere
accessible to this investigation. Two real, adjacent mechanisms were
checked and ruled out as *not* being this table:

- `ExperienceTable.txt` (`Data/Util/ExperienceTable.txt`, 133 bytes,
  hash-verified unchanged since Phase 11) — a real file, but its
  columns are `MinLevel/MaxLevel/MinMasterLevel/MaxMasterLevel/
  MinReset/MaxReset/MinMasterReset/MaxMasterReset/ExperienceRate`: a
  **rate-override-by-bracket** table (e.g. "give 2x XP to characters
  with reset count 10-20"), not a required-XP-per-level table. Confirmed
  **empty** (header + `end` only) — this mechanism exists but is
  unconfigured.
- `ExperienceMultiplierConstA`/`ConstB` (`Common.dat`) — real formula
  inputs, but the formula itself is not given in any accessible text
  (see `xp-formula-evidence-and-vendor-questions.md`). If the level
  curve is computed at all (rather than looked up), it is most likely
  computed from these two constants plus `MaxLevel` — but this is
  exactly the unresolved formula question, not a separate curve.

No other `.txt`/`.dat` file with level-indexed cumulative or per-level
XP values was found. This is consistent with `gameplay-call-flow.md`'s
Phase-U-era conclusion that the actual level-XP relationship is a
`BINARY_ANALYSIS_CANDIDATE` — most likely computed in `GameServer.exe`
itself, not stored as server-editable text data. **Not substituted with
a generic MU-community level curve** — per this phase's own explicit
instruction, an unproven external curve would be worse than reporting
`UNKNOWN` honestly.

## Parts 7/8 — Monster and map datasets

Real, hash-verified, freshly re-downloaded this phase (RemoteOps
read-only):

```
MONSTER_DATASET = PASS (549 real monster rows, full column set)
MAP_DATASET = PASS (67 real maps, full column set)
```

Source files: `Data/Monster/Monster.txt` (204,882 bytes, live hash
`61D8890C...`), `Data/Maps/MapManager.txt` (15,816 bytes, live hash
`7DEE7CB2...`), both drifted since the last local snapshot (2026-08-17)
— fresh copies downloaded and diffed field-by-field against the old
snapshot (`D:\MU\.secrets\production-snapshots\`, operator reference)
rather than assumed stale-safe.

### Real, substantive changes found since 2026-08-17 (not this phase's doing — pre-existing production drift, discovered by re-reading)

**MapManager.txt — every one of 67 maps changed identically**:
`ItemDropRate: 100 → 0` and `ExcItemDropRate: 1000 → 100` on **all 67
maps, no exceptions**. Given the confirmed vendor convention
(`100=baseline, 200=double, 50=half` — a percentage-of-baseline
multiplier), a map-level `ItemDropRate` of `0` reads as "zero item
drops from this map's own multiplier," which would make the
*combined* effective item drop zero everywhere regardless of the
account-tier `ItemDropRate_AL0-3` value (100/120/120/120) — the two
layers combine multiplicatively per the drop pipeline
`drop-rate-forensics.md` already established. **This is `STRONG_EVIDENCE`,
not 100% `CONFIRMED`** — no vendor sentence explicitly states "0 means
disabled" for this specific field (some fields elsewhere use a `*`
wildcard for "ignore," not `0`) — but it is the natural, and only
documented, reading of a percentage-of-baseline field. **This is a
real, current, server-wide fact worth Bryan's direct attention** —
whether deliberate (a temporary economy freeze) or accidental, it is
not something this investigation can distinguish from the config alone.
4 maps (Dungeon and 3 others) also had minor `NonPK`/`PkLevelMin`
changes, unrelated to drop.

**Monster.txt — 10 boss-tier monsters had `ItemRate` reduced from
`999999999` (an effective "always drop" sentinel) to `100`**: Hydra,
Kundun, Erohim, Nightmare, Maya Hand (×2), Selupan, Medusa, plus two
more of the same class — alongside real stat rebalancing (HP,
Defense, DamageMin/Max, AttackRate increased for several). **4 new
monsters** were added since 2026-08-17: indices 803-806 (`Rei Orc`,
`Kronus`, `Lycan`, `Coelho`) — Portuguese names, consistent with
custom/event content, not vanilla MU monsters.

**Reading these two findings together**: this server's real drop
economy has been substantially tightened very recently — map-level
item drop zeroed everywhere, and the most valuable boss monsters' own
per-monster drop rate cut by ~7 orders of magnitude (from a sentinel
"always" value to a normal `100`). This is real, current, operationally
significant information for the DROP domain (Part 18) that Phase U's
account-tier-only view could not have shown, because Phase U
deliberately deferred the map/monster read this phase closes.

## Part 9 — Monster → map relationship (spawn-file-backed, not inferred)

`Data/Monster/MonsterSetBase.txt` (356,398 bytes, live hash
`852893D0...`, also drifted and freshly re-downloaded) defines real
spawn rows, each tagged with a "Script Type": `0`=Guards/NPC/Traps,
`1`=Spots, `2`=Normal Monster, `3`=Bone King/Golden Monsters,
`4`=Blood Castle/event monsters. Per this phase's explicit instruction
("do not infer spawn presence merely because a monster exists"), the
route dataset below uses **only** `scriptType=2` rows — a monster
existing in `Monster.txt` is never assumed to be reachable anywhere
without a real spawn row confirming it.

**Honest scope limit, stated explicitly rather than papered over**:
`scriptType=2` spawn rows exist for only **15 of the 67 maps**: Devias,
Lost Tower, Atlans, Tarkan, Kalima 1-7, Aida, Kanturu 1-2, Elbeland.
The classic early-game maps most players actually level on first
(Lorencia, Noria, Icarus, Dungeon) have **zero** `scriptType=2` rows —
their base monster population is not present in this text file at all
under this script type. The most likely honest explanation: this
server's baseline/vanilla monster placement for those maps is
engine-hardcoded (compiled into `GameServer.exe`/client, a common
pattern for base-game content in this MU distribution family), and
`MonsterSetBase.txt` only carries **custom overrides/additions**
(consistent with `monster-map-system.md`'s own prior observation that
"golden monsters" use a distinct script type, and with `Aida` here
containing exactly one custom-named monster, `BloodMoon` — level 180,
clearly a server-branded custom boss, not a vanilla creature). This is
reported as a real gap, not resolved by guessing that those maps have
no monsters — they obviously do, in actual gameplay.

## Part 10 — Progression route dataset (machine-readable)

`docs/progression/progression-route-dataset.json` (committed, real,
hash-fingerprinted against its three source files) — one entry per map
that has at least one confirmed `scriptType=2` spawn, sorted by
monster level range, each carrying: map name, the map's own
`itemDropRate`/`excItemDropRate`/`setItemDropRate`/`experienceRate`,
and its full monster roster (name, level, HP, `itemRate`, `moneyRate`),
sorted low-to-high level. A separate `goldenBossesByMap` section lists
`scriptType=3` (Bone King/Golden) spawns per map, for completeness.

**Per Part 10's own explicit instruction, this dataset does NOT label
any route "best leveling route"** — it is raw, joined, real data only.
Whether Kalima 1 (levels 17-52, 8 monsters, confirmed real spawns) is
actually a good leveling choice depends on kill speed, gear, and the
still-unresolved XP formula — none of which this dataset asserts.

```
MONSTER_MAP_RELATIONSHIP = PARTIAL — real, spawn-file-backed data for
  15 of 67 maps; the other 52 maps' monster population (including the
  classic early-game maps) is not covered by this file and remains
  UNKNOWN by this method
```

## Part 18 — Drop system completion (closes Phase U's deferred gap)

Every drop layer is now real data, not a placeholder, with units kept
explicitly distinct per Part 18's own instruction — **no layer is
normalized into a shared fake percentage**:

| Layer | Unit | Current real state |
|---|---|---|
| Account drop (`ItemDropRate_AL0-3`, `Common.dat`) | direct percentage, 0-100 | 100/120/120/120 (unchanged since Phase U) |
| Map item drop (`ItemDropRate`, `MapManager.txt`) | base-100 multiplier (100=baseline) | **0 on all 67 maps** (changed since 2026-08-17, see above) |
| Map excellent drop (`ExcItemDropRate`, `MapManager.txt`) | fraction of 1,000,000 | **100 on all 67 maps** (down from 1000, see above) |
| Map ancient/set drop (`SetItemDropRate`, `MapManager.txt`) | fraction of 1,000,000 | 0 on all sampled maps (unchanged) |
| Monster item rate (`ItemRate`, `Monster.txt`) | per-monster relative weight, engine-internal scale (not vendor-documented as a percentage) | Mostly unchanged; 10 bosses reduced from `999999999` sentinel to `100`, see above |

```
DROP_LAYER_MATRIX = PASS
NO_UNIT_NORMALIZATION_ACROSS_DROP_LAYERS = CONFIRMED (five real,
  distinct units preserved above, never collapsed into one number)
```

## Related systems

`docs/progression/progression-route-dataset.json`,
`docs/progression/progression-config-field-matrix.md` (Phase U),
`docs/decisions/0026-progression-evidence-and-balance-readiness.md`,
`docs/economy/*` (item-side drop context from earlier phases),
`D:\MU\docs\monster-map-system.md`, `D:\MU\docs\drop-rate-forensics.md`
(operator references).
