---
status: DRAFT_FOR_REVIEW
category: vip
audience: internal (product + engineering)
lastVerified: 2026-08-30
---

# VIP (AL0-3) Benefit Matrix — Phase 14 Part C

Every row below comes from a real `_AL0/_AL1/_AL2/_AL3` config-key group found in `GameServerInfo - Command.dat`, `- Custom.dat`, or `- Common.dat`. 275 such groups exist in total; **28 are genuinely differentiated** (values actually differ across AL0-3) — those 28 are the real VIP benefit surface and are listed in full below. The remaining 247 carry the `_AL0-3` naming pattern but hold the *same* value across all four brackets (i.e., the field exists per-bracket but currently applies no differentiation) — a representative sample is listed as `DEAD_CODE` / `FLAT_NO_DIFFERENTIATION` afterward, not the full 247, to keep this table usable.

`AL0≈Free / AL1≈Bronze / AL2≈Silver / AL3≈Gold` is a working hypothesis, not a confirmed mapping — see `vip-deep-audit.md` for the evidence and caveat. Column headers use AL0-3 directly to avoid asserting that mapping as fact.

## Differentiated benefits (28/28 found)

| Benefit | AL0 | AL1 | AL2 | AL3 | Source file | Confidence |
|---|---|---|---|---|---|---|
| Experience rate bonus | 50 | 60 | 60 | 60 | Common.dat `AddExperienceRate_AL*` | CONFIRMED (config value; effect on real XP formula not independently verified) |
| Master-level experience rate bonus | 20 | 22 | 22 | 22 | Common.dat `AddMasterExperienceRate_AL*` | CONFIRMED |
| Item drop rate | 100 | 120 | 120 | 120 | Common.dat `ItemDropRate_AL*` | CONFIRMED |
| Zen (money) drop rate | 10 | 12 | 12 | 12 | Common.dat `MoneyAmountDropRate_AL*` | CONFIRMED |
| Jewel of Soul success rate | 30 | 40 | 40 | 40 | Common.dat `SoulSuccessRate_AL*` | CONFIRMED |
| Jewel of Life success rate | 20 | 30 | 30 | 30 | Common.dat `LifeSuccessRate_AL*` | CONFIRMED |
| Harmony option success rate | 20 | 30 | 30 | 30 | Common.dat `HarmonySuccessRate_AL*` | CONFIRMED |
| Smelt/refinement success rate (tier 1) | 10 | 15 | 15 | 15 | Common.dat `SmeltStoneSuccessRate1_AL*` | CONFIRMED — **note**: this is a distinct crafting mechanic from Chaos Machine (see below); do not conflate |
| Smelt/refinement success rate (tier 2) | 20 | 25 | 25 | 25 | Common.dat `SmeltStoneSuccessRate2_AL*` | CONFIRMED |
| PK item-drop-on-death protection | drops (1) | drops (1) | drops (1) | **protected (0)** | Common.dat `PkItemDropEnable_AL*` | CONFIRMED — only AL3 is protected from losing items when killed as a PK; a defensive, not offensive, benefit |
| Mail/Post command min. character level | 150 | 10 | 10 | 10 | Command.dat `CommandPostLevel_AL*` | CONFIRMED |
| Mail Post cooldown (seconds) | 30 | 15 | 15 | 0 | Command.dat `CommandPostDelay_AL*` | CONFIRMED |
| Buy-via-mail min. character level | 150 | 10 | 10 | 10 | Command.dat `CommandBuyPostLevel_AL*` | CONFIRMED |
| Buy-via-mail cooldown (seconds) | 30 | 30 | 30 | 0 | Command.dat `CommandBuyPostDelay_AL*` | CONFIRMED |
| Sell-via-mail min. character level | 150 | 10 | 10 | 10 | Command.dat `CommandSellPostLevel_AL*` | CONFIRMED |
| Sell-via-mail cooldown (seconds) | 30 | 30 | 30 | 0 | Command.dat `CommandSellPostDelay_AL*` | CONFIRMED |
| PK-status clear cost (Zen) | 10,000,000 | 5,000,000 | 2,500,000 | **free (0)** | Command.dat `CommandPKClearMoney_AL*` | CONFIRMED |
| `/money` command access | disabled | disabled | disabled | **enabled** | Command.dat `CommandMoneyEnable_AL*` | CONFIRMED |
| `/change` command access | disabled | disabled | disabled | **enabled** | Command.dat `CommandChangeEnable_AL*` | CONFIRMED |
| Class-change command access | disabled | disabled | disabled | **enabled** | Command.dat `CommandChangeClassEnable_AL*` | CONFIRMED — highest-impact single benefit found; needs product review (see below) |
| Warehouse page count | 2 | 5 | 8 | 8 | Command.dat `CommandWareNumber_AL*` | CONFIRMED |
| Remote warehouse access (`/openware`) | disabled | disabled | disabled | **enabled** | Command.dat `CommandOpenWareEnable_AL*` | CONFIRMED |
| Reset command daily/limit cap | 20 | 20 | 20 | 50 | Command.dat `CommandResetLimit_AL*` | CONFIRMED (carried over from Phase 12) |
| Reset stat-point award | 450 | 500 | 500 | 500 | Command.dat `CommandResetPoint_AL*` | CONFIRMED (carried over from Phase 12) |
| Stat "ReAdd" (respec) cost (Zen) | 5,000,000 | 2,500,000 | 2,500,000 | **free (0)** | Command.dat `CommandReAddMoney_AL*` | CONFIRMED |
| Offline auto-attack: reset requirement | 3 resets | 3 resets | **0 (none)** | 0 (none) | Custom.dat `CustomAttackOfflineRequireReset_AL*` | CONFIRMED |
| Offline auto-attack: activation cost (Zen) | 1,000,000 | 500,000 | 250,000 | **free (0)** | Custom.dat `CustomAttackOfflineRequireMoney_AL*` | CONFIRMED |
| Offline auto-attack: max session length (hours) | 4 | 8 | 12 | 0 | Custom.dat `CustomAttackOfflineMaxTimeLimit_AL*` | CONFIRMED value; **UNKNOWN** whether AL3's `0` means "unlimited" or "disabled" — ambiguous without GameServer source, flagged rather than guessed either way |

**Two rows deserve explicit product attention before any VIP benefit is ever activated for real**:
- **Class-change command, AL3-only.** If this maps to Gold tier, it is a materially different kind of benefit than XP/drop-rate boosts — a one-time structural change to a character, not a rate multiplier. Needs its own explicit yes/no from Bryan, separate from "VIP benefits in general," since [`ECONOMY_PRODUCT_DECISIONS.md`](../product/ECONOMY_PRODUCT_DECISIONS.md) (Phase 11) never mentioned class-change as an approved VIP benefit.
- **PK item-drop protection, AL3-only.** A defensive/insurance-style benefit rather than a power boost — worth flagging to product as a distinct benefit *category* (safety, not power or speed), since Phase 11's "no direct PvP power" VIP constraint may or may not have been written with this kind of protective effect in mind.

## Not found (explicitly checked, absent)

| Area | Result |
|---|---|
| Chaos Machine (wing/item combination) success rates | **NOT_FOUND** — `GameServerInfo - ChaosMix.dat` has zero `_AL0-3` fields of any kind (not even flat/dead ones). This is a stronger negative than "flat" — there is no AL-parameterization mechanism in this file at all, re-confirming (at a deeper level than Phase 12's original check) that Chaos Machine is entirely un-differentiated by VIP tier today. |
| PvP damage/defense bonus | **NOT_FOUND** — no `_AL0-3` field anywhere ties to PvP damage or defense multipliers. Consistent with Phase 11's "no direct PvP power" VIP design constraint already being true of the underlying engine, not just a product promise. |
| Character/account-wide stat bonus | **NOT_FOUND** — no `_AL0-3` field grants raw Strength/Agility/Vitality/Energy. |

## Representative sample of flat / dead-for-AL-purposes fields (247 total, not exhaustive here)

These carry the `_AL0-3` naming convention but hold an identical value across all four brackets — the field exists per-bracket in the file format but currently expresses no VIP differentiation. Full list available on request; a representative sample:

| Field | Value (all AL0-3) | Meaning |
|---|---|---|
| `CommandMasterReset*_AL0-3` (13 sub-fields: Level, Reset, Money, Count, Limit, LimitDay/Wek/Mon, StartLevel, StartReset, Point, ClosePartyEnable, CheckStatusEnable) | identical across all 4 brackets, every single sub-field | Master Reset command has **zero** VIP differentiation despite having the config structure to support it |
| `CommandChangeLimit_AL0-3` | 2 | Character-slot change limit, same for everyone |
| `CommandBuyVipEnable_AL0-3` / `CommandBuyVipMoney_AL0-3` | 0 / 0 | The `/buyvip` command's own AL-gate — moot while `CommandBuyVipSwitch=0` |
| `CommandDisablePvP*_AL0-3` (Enable/Money/Level/Reset/MasterReset) | 0 across all | PvP-disable purchase feature — fully inactive for everyone |
| `CommandRename*_AL0-3` (Enable/Level/Reset/Money/Delay) | 0/0/0/0/60 | Character rename — fully inactive for everyone |
| `CommandAutoPotionUpEnable_AL0-3` / `CommandAutoPotionPvpEnable_AL0-3` | 0 | Auto-potion feature — fully inactive for everyone (its Life/Mana/AG/SD recovery sub-values are moot while disabled) |
| `CommandExchangeItem*_AL0-3` / `CommandExchangeCoin*_AL0-3` | 0 | Currency/item exchange commands — fully inactive |
| `CustomAttackOfflineEnable_AL0-3` | 1 (enabled for everyone) | The *feature* is on for all tiers; only its cost/duration sub-parameters (listed above) differentiate by tier |

## Coverage statement

This matrix is built from an exhaustive `_AL[0-3]` pattern sweep across every GameServer `.dat`/`.txt` config file downloaded in this session (Phase 11 through Phase 14) — 275 real config-key groups found, all 28 differentiated ones listed in full above, zero omitted. This is **not** a claim of completeness against the GameServer's entire source-level configuration surface — only against the files this session has read access to via RemoteOps.
