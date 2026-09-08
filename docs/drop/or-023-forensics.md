---
status: ACTIVE — real, hash-verified, multi-checkpoint forensic timeline
category: drop
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED for all diffs (real file comparisons); explicit UNKNOWN where engine behavior cannot be proven from config alone
---

# OR-023 forensics — Phase W Parts 1-9

Phase V found real, current production drift (map-wide item-drop rate
zeroed, 10 boss monsters' drop rate reduced) by comparing exactly two
points in time (2026-08-17 vs 2026-09-03/current). This document adds
**four more real historical checkpoints** (a vendor factory baseline
and three independent Blood Moon production snapshots spanning
2026-05 through 2026-09), narrowing OR-023 to its exact window and
adding a much richer, previously-undiscovered finding: **the "10 boss
reduction" is the second half of a two-part story** — a much larger
mass change happened *before* Phase V's own comparison window even
started.

**Current state re-verified this phase**: live production hashes for
`MapManager.txt`/`Monster.txt`/`MonsterSetBase.txt` are byte-identical
to Phase V's 2026-09-03 download — OR-023 is still the exact, current
production state as of this phase. Nothing changed between Phase V and
Phase W.

## Part 5 — Full checkpoint timeline (real files, real hashes)

| Checkpoint | Date | Provenance | MapManager.txt hash | Monster.txt hash | MonsterSetBase.txt hash |
|---|---|---|---|---|---|
| **FACTORY** | 2026-05 (internal file dates: Monster.txt=05-07, MonsterSetBase.txt=05-01) | Vendor factory-default baseline bundled inside the server distribution itself (`MuServer-stage/Backup/`) — **not** a dated Blood Moon admin backup, see Part 7 | not present in this folder | `F7B6F97F...` | `085B6B1F...` |
| **JULY** | ≤2026-07-02 (internal `Common.dat` mtime), confirmed present unchanged 2026-07-16 and 2026-07-30 | Two independent real VPS backups (a `pre-web-migration` zip captured 2026-07-16, and a predeploy snapshot captured 2026-07-30) — byte-identical to each other for every file checked | `700ADD3F...` | `01C33E72...` | `B737A312...` |
| **AUG17** | 2026-08-17 | Real RemoteOps read-only download, logged (`RemoteOpsLogs/2026-08-17.jsonl`) | `BAAF72AA...` | `D4FE375F...` | `F80173CE...` |
| **SEPT3/current** | 2026-09-03, re-verified unchanged 2026-09-04 | Real RemoteOps read-only download, logged (`RemoteOpsLogs/2026-09-03.jsonl`); live hash re-checked this phase | `7DEE7CB2...` | `61D8890C...` | `852893D0...` |

## Part 1/2 — MapManager.txt exact diff, all 67/68 maps

**FACTORY → JULY**: not comparable (factory baseline has no `MapManager.txt` at all — only `Monster.txt`/`MonsterSetBase.txt` ship in the factory folder).

**JULY → AUG17**: 68 maps → 67 maps. Map index `95` ("NEW" — a
placeholder/test map name) was **removed**. Exactly 4 real maps
changed, and **none of the changes touched `ItemDropRate`/
`ExcItemDropRate`/`SetItemDropRate`**:

| Map | Field | Old | New |
|---|---|---|---|
| 1 (Dungeon), 56 (Swamp of Calmness), 80 (Karutan 1), +1 more | `GuildWarEnable`/`TradeEnable`/`PShopEnable`/`DuelEnable`/`CustomAttackEnable`/`HelperEnable` | 1 (on) | 0 (off) |

**AUG17 → SEPT3 (the real OR-023 window)**: all 67 maps changed
identically:

```
ItemDropRate:    100 -> 0     (every map, no exceptions)
ExcItemDropRate: 1000 -> 100  (every map, no exceptions)
SetItemDropRate: unchanged (0, every map)
```

Plus 4 maps (Dungeon and 3 others) with unrelated `NonPK`/`PkLevelMin`
changes.

```
AFFECTED_MAPS = 67 of 67 (100%)
MAPS_ZEROED (ItemDropRate) = 67 of 67
MAPS_UNCHANGED (ItemDropRate) = 0
NO_OLD_EVIDENCE = 0 (all 67 maps present and comparable in every checkpoint)
```

**Conclusion: this is the smallest provable window for the map-side
change — it happened strictly between 2026-08-17 and 2026-09-03, a
~2.5 week window, and touches literally every map uniformly, not a
subset.**

## Part 3 — Monster/boss exact diff (the real, two-part story)

**JULY → AUG17 — the change Phase V never compared against, because it
predates Phase V's own two-point comparison**:

```
Monsters whose ItemRate became the 999999999 "always drop" sentinel: 224
Monsters whose ItemRate changed to a different real value (mostly 100): 28
Monsters whose ItemRate was unchanged: 293
Total monsters: 545 (no monsters added or removed in this window)
```

The 28 "changed to 100" group includes both notable named monsters
(Dark Knight, Ghost, Larva, Hell Spider, Skeleton Archer, Chief
Skeleton Warrior, Cyclops, Gorgon) and a cluster of Kanturu-zone
monsters (Sapi-Unus/Duo/Tres, Shadow Pawn/Knight/Look, Thunder/Ghost/
Blaze Napin, Ice Napin, Shadow Master, Sapi Queen) — all real, all
starting from real per-monster values in the 100-200 range in July.

**In the same JULY → AUG17 window**, the account-tier
`ItemDropRate_AL0-3` (`Common.dat`) went from `0/0/0/0` (confirmed
identical in both the July 16 and July 30 backups) to `100/120/120/120`
— already documented in `docs/production-vs-backup-diff.md`, correlated
there with a `GameServer.exe` process restart around 2026-08-15.

**AUG17 → SEPT3 (Phase V's own window) — the precise, targeted
correction**:

```
Monsters reverted FROM 999999999 back to a normal ItemRate: exactly 10
Monsters that changed ItemRate any other way: 0
Monsters still at the 999999999 sentinel today: 214 of 549
```

| ID | Name | Old ItemRate | New ItemRate | Level | Old MaxLife | New MaxLife | Other change |
|---|---|---|---|---|---|---|---|
| 49 | Hydra | 999999999 | 100 | 128 | 10,000 | 2,100,000 | Level 60→128, full stat overhaul |
| 275 | Kundun | 999999999 | 100 | 147 | 3,000,000 | 3,000,000 | Damage/Defense/AttackRate/RegenTime changed |
| 295 | Erohim | 999999999 | 100 | 140 | 5,000,000 | 4,000,000 | Level 128→140, Defense/AttackRate up |
| 361 | Nightmare | 999999999 | 100 | 135 | 2,500,000 | 3,500,000 | Defense/DefenseRate up |
| 362 | Maya Hand | 999999999 | 100 | 135 | 400,000 | 400,000 | ItemRate only |
| 363 | Maya Hand | 999999999 | 100 | 135 | 350,000 | 350,000 | ItemRate only |
| 459 | Selupan | 999999999 | 100 | 145 | 4,800,000 | 4,800,000 | Defense/AttackRate/DefenseRate up |
| 561 | Medusa | 999999999 | 100 | 175 | 7,800,000 | 6,000,000 | Defense/DefenseRate up |
| 801 | Farao | 999999999 | 100 | 128 | 3,000,000 | 2,150,000 | MaxLife down (see below — not a new monster) |
| 802 | BloodMoon | 999999999 | 100 | 180 | 8,000,000 | 8,000,000 | ItemRate only (custom server-branded boss) |

```
BOSSES_CHANGED = [Hydra(49), Kundun(275), Erohim(295), Nightmare(361),
  Maya Hand(362), Maya Hand(363), Selupan(459), Medusa(561),
  Farao(801), BloodMoon(802)]
```

**Classification caveat, per this phase's own instruction not to call
every changed monster a "boss" without support**: all 10 are real,
named, high-level (128-180), high-MaxLife (350,000-8,000,000)
monsters — every one of them is either a well-known MU "boss" fight
(Hydra, Kundun, Selupan, Medusa) or a custom/late-game unique
(Nightmare, Maya Hand ×2, Farao, BloodMoon, Erohim). None of the 224
still-sentinel monsters share this profile in the sampled data — the
classification "boss/unique tier" is supported by real level/MaxLife
evidence, not asserted from the name alone.

## Part 4 — The 4 new monsters (genuinely new, confirmed by spawn presence)

Confirmed added between AUG17 and SEPT3 (zero spawn rows and zero
`Monster.txt` entry in July or August; exactly one real
`scriptType=2` "Normal Monster" spawn row each as of September):

| ID | Name | Level | MaxLife | ItemRate | MoneyRate | Spawn map | First observed |
|---|---|---|---|---|---|---|---|
| 803 | Rei Orc | 128 | 2,500,000 | 10,000 | 100 | Map 37 (Kanturu 1) | Sept 3 snapshot |
| 804 | Kronus | 128 | 2,200,000 | 10,000 | 100 | Map 4 (Lost Tower) | Sept 3 snapshot |
| 805 | Lycan | 128 | 2,300,000 | 10,000 | 100 | Map 2 (Devias) | Sept 3 snapshot |
| 806 | Coelho | 128 | 2,000,000 | 10,000 | 100 | Map 51 (Elbeland) | Sept 3 snapshot |

All four share `Level=128` and a near-identical damage/defense
profile (Damage ~1000-1050/1200-1250, Defense ~1700-2300) — a
deliberately designed, themed set of high-tier monsters, not
independent additions. `ItemRate=10,000` is real but far below the
`999999999` sentinel — these are new, not swept into the July→Aug17
mass sentinel change (they didn't exist yet in that window).

(Exact stat columns available in `docs/progression/progression-route-dataset.json`
for the three of these that fall within the route dataset's own
scriptType=2 map coverage — `docs/progression/level-curve-monster-map-dataset.md`.)

**Likely purpose — stated as evidenced, not invented**: the names are
Portuguese ("Rei Orc" = King Orc, "Coelho" = Rabbit), each has exactly
one real spawn point on an already-established open-world map (not an
event-only map), and each is tagged `scriptType=2` (Normal Monster, the
same category as the server's other regular open-world encounters) —
consistent with new regular-content additions or a themed
event/seasonal addition (a "Rabbit" monster is a common
seasonal/Easter-style addition pattern). **No stronger claim than this
is supported by the evidence** — no comment, log, or doc anywhere
names an explicit purpose for these four.

```
NEW_MONSTERS = [803:Rei Orc, 804:Kronus, 805:Lycan, 806:Coelho]
```

## Part 6 — Project change attribution

```
PROJECT_CHANGE_ATTRIBUTION = PROJECT_CHANGE_NOT_FOUND (Aug17-Sept3
  window, high confidence); UNKNOWN (July-Aug17 window, no log
  coverage available)
```

Evidence:
- This git repository (`mu-bloodmoon-v1-openbeta`) has **zero**
  commits touching any path named `MapManager.txt`/`Monster.txt`/
  `MonsterSetBase.txt`, and **zero** source files (`.ts`/`.cjs`/`.ps1`)
  anywhere in the tracked codebase reference `ItemDropRate` or these
  filenames — confirmed by a full-history `git grep`/`git log` search.
  This matches the established architecture boundary
  (`docs/security/game-write-boundary.md`): `apps/api` has never held
  a live GameServer write credential.
- `D:\MU\RemoteOpsLogs\*.jsonl` (real, append-only audit logs, daily
  files from 2026-08-16 onward — covering the entire AUG17→SEPT3
  window) record **every single operation** against these two files as
  `"operation":"download"` — never `"upload"` or any write action.
  Every logged operation, across the whole log history, originates
  from the same local operator machine (`DESKTOP-9368KF9\Mini
  DELL3080`) and is a plain read. `bm-set-drop-rate.ps1` (the one
  pre-built tool in this project's toolkit that CAN write to
  `Common.dat`'s drop-rate fields) has its own distinct, loggable
  `Copy-ToBloodMoonServer` upload step — never invoked, in this log
  history, against any file.
- No session/handoff/decision doc anywhere in this repository claims
  or references making this change (a full-text search for the
  relevant field names across `docs/` returns only this phase's own
  new documentation).
- The RemoteOps log history does not extend before 2026-08-16, so the
  JULY→AUG17 window (which includes the much larger 224-monster
  sentinel change and the account-tier drop reactivation) cannot be
  ruled in or out by this log — genuinely `UNKNOWN`, not assumed
  either way.

**Conclusion, stated as evidence supports it and no further**: the
AUG17→SEPT3 change (OR-023 itself) was **not** made through any
Blood Moon Portal-project tool, script, or agent action.
`EXTERNAL_OR_MANUAL_CHANGE_LIKELY` — someone with direct access to the
GameServer (RDP, local console, or a tool outside this project's own
RemoteOps toolkit) made this change. No specific person or process is
named — the evidence supports ruling out this project's own tooling,
not identifying who did act.

## Part 7 — Vendor default comparison

The FACTORY checkpoint (`MuServer-stage/Backup/`) is confirmed (per
`docs/configuration-history.md`, re-verified this phase) to be the
**vendor's own bundled factory-restore reference**, not a dated Blood
Moon backup — its internal file dates (May 2026) reflect whenever the
distributor last touched their own template, unrelated to Blood Moon's
own timeline.

| Field | Factory (vendor default) | July (Blood Moon, stable) | Reading |
|---|---|---|---|
| Monster stats (Level/MaxLife/Damage/Defense/AttackRate, sampled across 217 monsters) | vendor's own baseline values | substantially higher across the board | **Real Blood Moon customization**, done and stable by July — this is not "drift," it's deliberate, already-established game balance from before this project's own session history began |
| `ItemRate` (per-monster) | real per-monster values (e.g. 190/200/160 for Hell Hound/Dark Knight/Balrog) | **identical to factory** for the same sample | `ItemRate` was untouched from factory through July — confirms the July→Aug17 mass sentinel-setting was the *first* time this specific field was ever touched, not a continuation of earlier tuning |
| `MoneyRate` (per-monster) | varied per-monster (20-100 range) | uniformly `300` (or `0` for a subset) | Actively, deliberately reconfigured before July — a separate, earlier, already-stable customization |

**Current state (Sept3) relative to this baseline**: the 214 monsters
still at the `999999999` `ItemRate` sentinel are far outside both the
factory default AND the stable July value — this is not a reversion to
any known default, it's a genuinely new state introduced in the
July→Aug17 window and never fully reverted.

## Part 8 — Drop mechanism interaction: does map `ItemDropRate=0` mean zero drops?

```
MAP_ITEMDROP_ZERO_RUNTIME_EFFECT = UNKNOWN_RUNTIME_EFFECT
```

The confirmed pipeline (`docs/progression/level-curve-monster-map-dataset.md`,
`drop-rate-forensics.md`) is: Account tier rate × Map rate × Monster
rate × item selection, each layer a real, independently-configured
percentage/multiplier. Under a straightforward multiplicative reading,
Map `ItemDropRate=0` would zero the combined result **regardless of how
high the monster's own `ItemRate` is** — meaning the 214 monsters still
at the `999999999` sentinel would currently generate **zero** normal
item drops, not "always drop," because the map layer they're
standing on now multiplies by zero.

**This cannot be confirmed as engine truth from config alone.** Two
real, unprovable-without-source alternatives exist: (a) the engine
applies the layers exactly as the vendor's percentage-of-baseline
convention implies (multiplicative, map=0 zeroes everything), or (b) a
sufficiently extreme per-monster `ItemRate` (like `999999999`) is
engine-special-cased as an override/bypass for boss-tier kills
specifically (a real pattern in some MU engine forks, where rare/boss
kills are guaranteed a drop independent of global economy switches) —
in which case the 214 sentinel monsters could still be generating
drops today despite the map-level zero. **No text file, vendor
tutorial, or accessible source resolves which of these is true.**
Marked `UNKNOWN_RUNTIME_EFFECT` rather than guessed, per this phase's
own explicit instruction.

## Part 9 — OR-023 impact classification

```
CONFIG_CHANGE_MAGNITUDE = HIGH
  (100% of maps affected on two real fields; 224 of 545 monsters
  pushed to an extreme sentinel value in the prior window, 10 of those
  precisely corrected in this window — large, precise, non-random
  changes by any measure)

PROVEN_PLAYER_IMPACT = UNKNOWN
  (no telemetry, log, or empirical gameplay evidence exists anywhere
  in this project to confirm real players actually experienced reduced
  item drops — this document reports what the CONFIG says, not what
  players observed. Per Part 9's own instruction, this is not
  pretended to be observed impact.)

OR023_INTENT = DELIBERATE
  (the precision argues against accidental drift: the AUG17->SEPT3
  change touched exactly 67/67 maps on exactly 2 fields uniformly, and
  exactly 10/224 sentinel monsters were reverted with no other
  incidental changes — a corruption, sync bug, or random drift would
  not produce this level of precision. This is a judgment about the
  PATTERN of the change, not an accusation about WHO made it or WHY.)

OR023_IMPACT = MEDIUM
  (real, current, server-wide config state with plausible economy
  consequences per the confirmed base-100 multiplier convention — but
  downgraded from HIGH/CRITICAL because Part 8's own
  UNKNOWN_RUNTIME_EFFECT finding means it is not proven that item
  drops are actually zero in the live game; and downgraded further by
  the complete absence of any proven player impact. Real and worth
  Bryan's attention, not proven catastrophic.)
```

## Part 10 — No automatic restoration (compliance statement)

No file was restored, no production write was made, no GameServer
config was altered, and no remediation was applied automatically this
phase, regardless of how the older (July) values might look more
"reasonable" by comparison. See `remediation-proposal.md` reference in
`docs/decisions/0027-or-023-forensics-and-balance-inputs.md` for the
proposal-only remediation Bryan would need to explicitly approve
before any restore.

## Part 11 — Drop policy status

Every currently-effective drop value discussed in this document is
represented in the Progression control plane as `EFFECTIVE_BUT_
UNAPPROVED` (or, for the specific rows this drift directly touches,
would be `POLICY_DRIFT` once a real target is set) — never silently
promoted to `APPROVED` product policy. See
`docs/progression/vip-progression-policy-drift-matrix.md` (Phase V) for
the account-tier drop rows already modeled this way; the map/monster
layers this document covers are not yet individual
`ProgressionConfigItem` rows (Phase U/V deliberately deferred per-map/
per-monster granularity — `docs/progression/level-curve-monster-map-dataset.md`).

## Related systems

`docs/open-risks.md` (OR-023), `docs/progression/level-curve-monster-map-dataset.md`,
`docs/decisions/0026-progression-evidence-and-balance-readiness.md`,
`docs/decisions/0027-or-023-forensics-and-balance-inputs.md`,
`docs/configuration-history.md`, `docs/production-vs-backup-diff.md`,
`docs/drop-rate-forensics.md` (operator references),
`D:\MU\RemoteOpsLogs\*.jsonl` (operator audit logs).
