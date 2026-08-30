# Reset / Master Reset — Real Config Findings

**Phase**: 11 (Economy & Monetization Foundation)
**Evidence source**: Live remote server config downloaded via `bm-remote.cmd` on 2026-08-29.
**Discipline**: every claim below cites the exact source file and field. Anything not found is marked `NOT_FOUND_IN_CONFIG`.

---

## Headline finding: the core Reset requirement/cost/reward is NOT exposed in any inventoried config file

The task hypothesis was that `GameServerInfo - Character.dat` "likely holds Reset-related fields." **This is refuted by direct evidence**: Character.dat was downloaded and read in full (13538 bytes, 445 lines) and contains **zero** fields with "Reset" in the name. Its entire content is combat/damage tuning: `DuelDamageRate`, per-class `xxDamageRatePvP/PvM`, class-vs-class damage matrices, `xxAttackSuccessRateConst*`, `xxDefenseSuccessRateConst*`, HP/MP/BP/SD recovery rates, skill damage constants (Combo, Earthquake, Electric Spark, Nova, Plasma Storm), etc. No level requirement, no Zen cost, no stat-point reward, nothing reset-related. (Local copy: `D:\MU\RemoteData\Phase11\GameServerInfo - Character.dat`.)

A broader search was then run across every other downloaded/relevant file. Result: **the actual Reset/Master Reset level requirement, currency cost, and stat/point reward are not present in any of the config files reachable under the allowed remote roots.** What follows is everything that IS confirmed, and an explicit list of what remains unknown.

---

## 1. Confirmed: Reset reward *feature switches* are OFF

`GameServerInfo - Custom.dat` (`C:\MuServer\GameServer\DATA\GameServerInfo - Custom.dat`, 29822 bytes, downloaded and converted in full; local copy `D:\MU\RemoteData\Phase11\GameServerInfo - Custom.dat`):

```
CustomItemRewardResetSwitch = 0
CustomBuffRewardResetSwitch = 0
CustomCoinRewardResetSwitch = 0

CustomItemRewardMasterResetSwitch = 0
CustomBuffRewardMasterResetSwitch = 0
CustomCoinRewardMasterResetSwitch = 0
```

All six reward switches (item/buff/coin, for both Reset and Master Reset) are set to **0 (disabled)**. This is corroborated by the reward tables themselves (section 2 below), whose actual reward rows are all commented out.

Other Reset-adjacent fields found in the same file (not reward-related, gating other systems by reset count — quoted verbatim):
```
CustomAttackRequireReset_AL0 = 0   CustomAttackRequireReset_AL1 = 0   CustomAttackRequireReset_AL2 = 0   CustomAttackRequireReset_AL3 = 0
CustomAttackOfflineRequireReset_AL0 = 3   CustomAttackOfflineRequireReset_AL1 = 3   CustomAttackOfflineRequireReset_AL2 = 0   CustomAttackOfflineRequireReset_AL3 = 0
CustomStoreRequireReset_AL0 = 0   CustomStoreRequireReset_AL1 = 0   CustomStoreRequireReset_AL2 = 0   CustomStoreRequireReset_AL3 = 0
CustomStoreOfflineRequireReset_AL0 = 0  (AL1/AL2/AL3 also 0)
CustomNpcCollectorReset_AL0-3 = 0        CustomNpcCollectorMasterReset_AL0-3 = 0
CustomOnlineHoursSystemReset_AL0-3 = 0   CustomOnlineHoursSystemMasterReset_AL0-3 = 0
CustomStoreCharacterSellReset_AL0-3 = 0  CustomStoreCharacterSellMasterReset_AL0-3 = 0
CustomExchangeItemRandomReset_AL0-3 = 0  CustomExchangeItemRandomMasterReset_AL0-3 = 0
```
These are minimum-Reset-count gates for *other* features (offline attack, /store, NPC collector, online-hours system, character-sell store, item exchange) — all currently set to `0`, i.e., no reset requirement is being enforced for those adjacent features either. They do not define the cost/reward of performing Reset itself.

## 2. Confirmed: Reset/Master Reset item/buff/coin reward tables are fully commented out (no active rows)

`C:\MuServer\Data\Custom\CustomItemRewardReset.txt` (1054 bytes) and `C:\MuServer\Data\Custom\CustomItemRewardMasterReset.txt` (1087 bytes) — both read in full. Every data row in both files is commented (`//`), including the item-reward section, the buff-effect section, and the coin-reward section. Example from `CustomItemRewardReset.txt`:
```
//Reward Coin
2
//Class   Cash_AL0  Cash_AL1  Cash_AL2  Cash_AL3  Gold_AL0  Gold_AL1  Gold_AL2  Gold_AL3  PcPoint_AL0  PcPoint_AL1  PcPoint_AL2  PcPoint_AL3  MinMasterReset  MaxMasterReset
//*        1         2         3         4         1         2         3         4         1            2            3            4            1               *
end
```
The single non-commented line in each `2` (coin) section is just `end` — no active reward row exists. Same structure/result for `CustomItemRewardMasterReset.txt`.

**Conclusion**: On this server, right now, resetting or master-resetting grants **no configured item, buff, or coin reward** through this mechanism (consistent with switches being 0 in section 1).

## 3. Confirmed: `CustomResetAndMasterResetMove.txt` defines teleport destinations, not requirements

`C:\MuServer\Data\Custom\CustomResetAndMasterResetMove.txt` (9064 bytes, read in full; local copy `D:\MU\RemoteData\Phase11\CustomResetAndMasterResetMove.txt`). This file has three sections:

- Section `0` (Reset move gates): per-map, per-class **teleport gate/position IDs** a character is sent to after Reset (e.g., map 0: `ResetMoveGateDW=500, ResetMoveGateDK=500, ResetMoveGateFE=27, ResetMoveGateMG=500, ResetMoveGateDL=500, ResetMoveGateSU=267, ResetMoveGateRF=500` — identical values repeated across nearly every listed map ID).
- Section `1` (Master Reset move gates): same structure, different (lower) gate IDs, e.g. map 0: `MasterResetMoveGateDW=17, ...FE=27, ...SU=267, ...RF=17`.
- Section `2`: a **fully commented-out** template for an item-based reset requirement (`CheckItemReset`, `ResetCount`, `CheckItemMasterReset`, `MasterResetCount` columns) — no active rows.

This file governs *where the player is teleported* on reset, not the level requirement or cost to reset.

## 4. Confirmed: `CustomResetQuestRequirement.txt` — commented-out template, no active requirement

`C:\MuServer\Data\Custom\CustomResetQuestRequirement.txt` (204 bytes, read in full; local copy `D:\MU\RemoteData\Phase11\CustomResetQuestRequirement.txt`):
```
//Quest Reset Requeriment
0
//Index   MinReset   MaxReset   QuestCount
//0       1          *          0
end

//Quest MasterReset Requeriment
1
//Index   MinMasterReset   MaxMasterReset   QuestCount
//0       1                *                0
end
```
Both sections are fully commented — no quest-based reset requirement is active.

## 5. Confirmed: `C:\MuServer\Data\Util\ResetTable.txt` is an empty schema-only file

Full content (170 bytes, 2 lines):
```
//MinReset   MaxReset   Level_AL0   Level_AL1   Level_AL2   Level_AL3   Money_AL0   Money_AL1   Money_AL2   Money_AL3   Point_AL0   Point_AL1   Point_AL2   Point_AL3
end
```
This is the column schema for exactly what the task was looking for (per-reset-bracket level requirement, money/Zen cost, and point reward, broken out by AL tier) — but it has **zero data rows**. It is inactive, matching the pattern of every other reset-related file inspected this pass.

## 6. `GameServerInfo - Common.dat` and `GameServerInfo - ChaosMix.dat` — no Reset requirement/cost fields

Grepped in full for "Reset": Common.dat only contains `GuildCreateMinReset_AL0-3` (=10) and `GuildCreateMinMasterReset_AL0-3` (=0) (guild-creation gating, not the reset action itself) and `ElfBufferMaxReset_AL0-3` (=3, Elf Buffer feature gating). ChaosMix.dat has **no** "Reset" field at all. Neither file defines the Reset command's own level requirement or cost.

---

## 7. Explicit answer to Part P (level requirement, Zen/currency cost, reward, Master Reset interaction, VIP hooks)

| Question | Answer |
|---|---|
| Reset level requirement | `CONFIRMED_BY_CONFIG` (see update below): `CommandResetLevel_AL0-3 = 400`, uniform across all AL tiers. Matches independent Phase 10 finding. |
| Zen/currency cost to Reset | `CONFIRMED_BY_CONFIG`: `CommandResetMoney_AL0-3 = 0` — no cost. |
| Reset reward (stat points / items / buffs / coins) | Item/buff/coin rewards are explicitly **disabled** (switches = 0, section 1) and their tables have **no active rows** (section 2). Stat-point-per-reset reward field: `NOT_FOUND_IN_CONFIG` in these files. |
| Master Reset interaction/requirement | Same pattern as Reset — teleport gates exist (section 3) and quest/item requirement templates exist but are fully commented out (sections 3–4). No active MinReset-to-unlock-MasterReset threshold was found. |
| VIP hooks on Reset | `NOT_FOUND_IN_CONFIG` — no AL-tier (VIP) differentiation appears in any Reset-specific field; the only AL-tiered Reset-adjacent fields found (`CustomAttackRequireReset_AL0-3`, etc.) are all uniformly `0` across tiers. |

**Bottom line**: Real config evidence shows the Reset/Master Reset **reward economy is fully disabled** on this server (all switches 0, all reward tables empty). The Reset **requirement mechanics** were not in any file this pass's file list covered.

**UPDATE (closed the gap, same day, following the lead this report itself raised)**: `GameServerInfo - Command.dat` (`C:\MuServer\GameServer\DATA\`, 24604 bytes) was downloaded and read directly after this report was written. It contains the `; Reset Command Settings` section with the real, active values:

```
CommandResetSwitch = 1
CommandResetLevel_AL0-3 = 400 (all four tiers identical)
CommandResetMoney_AL0-3 = 0 (no Zen cost, all tiers)
CommandResetCount_AL0-3 = 1
CommandResetLimit_AL0/AL1/AL2 = 20, CommandResetLimit_AL3 = 50
CommandResetLimitDay/Wek/Mon_AL0-3 = 10000 (effectively unlimited)
CommandResetPoint_AL0 = 450, CommandResetPoint_AL1/AL2/AL3 = 500
CommandResetPointRateDW/DK/FE/MG/DL/SU/RF = 100 (uniform across classes)
CommandMasterResetSwitch = 0 (confirmed still disabled)
```

This is **exactly consistent** with the independent Phase 10 finding from the same server (`reset-master-reset.md`, read via a different investigation path in an earlier phase) — level 400, no Zen cost, 450/500 points by AL tier, 20/20/20/50 reset cap by AL tier, Master Reset switched off. Two independent reads of the real server, in different phases, agree exactly — this is now `CONFIRMED_BY_CONFIG`, not `UNKNOWN`.

**Still genuinely unknown**: the Master Reset requirement (reset-count threshold, level requirement) was flagged in Phase 10 as `CommandMasterResetLevel = 400` / `1000 resets required` — not re-verified in this pass since `CommandMasterResetSwitch = 0` was the only field checked here; treat the exact Master Reset threshold values as needing a fresh read if they become load-bearing for a real decision, since this pass only confirmed the switch state, not the full Master Reset field block beyond it.

---

## Evidence quality

- `GameServerInfo - Character.dat`: read directly, full file (445 lines/13538 bytes verified).
- `GameServerInfo - Custom.dat`: read directly, full file (29822 bytes) — grepped for "Reset" across the whole file, all matches quoted above.
- `CustomItemRewardReset.txt`, `CustomItemRewardMasterReset.txt`, `CustomResetAndMasterResetMove.txt`, `CustomResetQuestRequirement.txt`, `ResetTable.txt`: read directly, full file, each.
- `GameServerInfo - Common.dat`, `GameServerInfo - ChaosMix.dat`: read directly, full file; grepped for "Reset".
- `GameServerInfo - Command.dat` / `CommandGM.dat`: **not downloaded this pass** — out of scope of the explicit file list, flagged above as an open lead.
