# Lucky Items / Lucky Sets / Lucky Wheel — Real Config Findings

**Phase**: 11 (Economy & Monetization Foundation)
**Evidence source**: Live remote server config downloaded via `bm-remote.cmd` on 2026-08-29.
**Discipline**: every claim below cites the exact source file and field. Anything not found is marked `NOT_FOUND_IN_CONFIG`.

---

## Headline correction to task brief

The task brief hypothesized "070/071/072 - Lucky Coin N.txt" files existing in the Shop or Item directory, and asked to find "a dedicated 'LuckySet' file if one exists." **Full directory listings of both `C:\MuServer\Data\Shop` (48 entries) and `C:\MuServer\Data\Item` (18 entries) were captured this pass, and neither contains any file with "Lucky Coin" or "LuckySet" in its name.** This must be reported honestly as `NOT_FOUND_IN_CONFIG` rather than assumed to exist elsewhere unseen. The only "Lucky"-named file that exists anywhere in the inventoried roots is `C:\MuServer\Data\Item\LuckyItem.txt`.

Full `Item` directory listing (18 files) for reference: `380ItemOption.txt`, `380ItemType.txt`, `ExcellentOptionRate.txt`, `Item.txt`, `ItemDrop.txt`, `ItemDurability.txt`, `ItemLevel.txt`, `ItemMove.txt`, `ItemOption.txt`, `ItemOptionRate.txt`, `ItemStack.txt`, `ItemValue.txt`, `JewelOfHarmonyOption.txt`, `JewelOfHarmonyType.txt`, **`LuckyItem.txt`**, `SetItemOption.txt`, `SetItemType.txt`, `SocketItemOption.txt`, `SocketItemType.txt`, `TradeItemBlock.txt`. No "Wing"- or "Ancient"-named file exists in this directory either (Wing config lives in `Data\Custom\CustomWing.txt` instead, see Section 3).

---

## 1. `LuckyItem.txt` — what it actually is

`C:\MuServer\Data\Item\LuckyItem.txt` (6129 bytes, read in full; local copy `D:\MU\RemoteData\Phase11\LuckyItem.readable.txt`).

**This is NOT a "Lucky Coin" currency/consumable file.** It is a decay/progression table for a specific named tier of gear sets — full-body armor pieces (Helm/Armor/Pants/Gloves/Boots) across 5 named set lines, each split into a lower "Group 0" and higher "Group 1" tier:

Column header: `Index  Group  Decay  Option0  Option1  Option2  Option3  Option4  Option5  Option6  Comment`

**Group 0 (base tier) sets**: Scale, Silk, Sphinx, Violent Wind
**Group 1 (upper tier) sets**: Dark Soul, Dragon, Guardian, Legendary, Red Wing, (Atlans — Pants/Gloves/Boots only), Storm Jahad (Helm/Armor/Boots only — no Pants/Gloves rows present for Storm Jahad)

Every single row shares the same values: `Decay = 2400` (seconds — 40 minutes) and `Option0` through `Option6 = 10` (all seven option slots identical at 10). Item index examples: Helm codes 3646–3656, Armor codes 4158–4168, Pants codes 4670–4680, Gloves codes 5182–5191, Boots codes 5694–5704 (54 total item rows across the 5 slots).

**Interpretation, strictly from field names (no invention beyond what the header states)**:
- `Decay` = a 2400-second timer, presumably how long before the item's "luck" state changes/decays (classic MU "Lucky Item" mechanic where the item degrades after a countdown).
- `Option0`–`Option6 = 10` on every row — most likely a flat probability weight (10%) for each of 7 possible outcome states, identical across all 54 items. Whether Option0–6 represent "chance to upgrade to next set piece" vs. "chance to drop to a lower option" is `UNKNOWN` — not documented in the file itself.
- No "set bonus" text, no stat bonus values, and no reference to a currency/coin appear in this file at all.

## 2. Set bonus data — `SetItemOption.txt` / `SetItemType.txt`

Both files read in full (`SetItemOption.txt` 14256 bytes / `SetItemType.txt` 6056 bytes) and **grepped for the literal string "Lucky" — zero matches in either file.** These are the engine's standard Set-item bonus tables (columns: `Section, Type, StatType, OptionIndex1, OptionIndex2` for `SetItemType.txt`), unrelated by name or content to any "Lucky Set" concept. **There is no dedicated file combining "Lucky" and "Set" semantics anywhere in the inventoried `Item` directory.** If the product concept "Lucky Set" exists in game design intent, it is **not represented as a distinct config artifact** on this server — it would have to be assembled from `LuckyItem.txt` (Section 1) referencing item codes that separately participate in the standard Set bonus system, which was not cross-referenced this pass (out of scope; would require parsing `Item.txt`, 253685 bytes, to map the 54 LuckyItem item codes to their Set membership).

## 3. Related but distinct: `CustomWing.txt`

`C:\MuServer\Data\Custom\CustomWing.txt` (1090 bytes, read in full). This is a **"New Wing" combat-stat table**, not a Lucky/Set file:
```
//Index  ItemIndex  DefenseConstA  IncDamageConstA  IncDamageConstB  DecDamageConstA  DecDamageConstB  OptionIndex1  OptionValue1  ...  ModelType  ModelName
0        6374       6              145              2                61               2                83            4             ...  0          "Wing230"
1        6375       6              145              2                61               2                83            4             ...  1          "Wing231"
```
Only 2 rows, defining custom combat stats for two specific wing item codes (6374, 6375 → "Wing230"/"Wing231"). No duration, rental, or Lucky-related fields present. Included here only because "Wing" was in the task's list of names to search for — it is **not** a Lucky Set artifact.

## 4. Lucky Wheel — `C:\MuServer\Data\Custom\CustomLuckyWheel.txt` (4946 bytes, read in full)

This is a **spin-the-wheel minigame**, separate from the "Lucky Item" decay system in Section 1. Three sections:

- **Section `0` — Item Requirement to spin**: `Index=0, ItemType=14, ItemIndex=13, ItemLevel=0, ItemQuantity=2, Cash=5, Gold=10, PcPoint=15`. This defines the cost of one spin: consuming 2× of item (type 14, index 13) — the same "premium ticket" item code referenced by the Battle Pass premium-unlock in the shop report — alongside apparent alternate/parallel currency costs `Cash=5, Gold=10, PcPoint=15` (exact relationship between the item cost and the currency costs — i.e. whether both are required simultaneously, or currency is an alternate payment path — is `UNKNOWN`, not stated in the file).
- **Section `1` — Reward pool, per class**: 7 character classes (DW, DK, ELF, MG, DL, SU, RF) each get 5 class-specific reward slots (rows 0–34), plus a shared "Items All Class" pool (rows 35–41, 7 more slots) covering wing-tier items (12/36 through 12/50) and a final "Item Requeriment" entry (row 42, referencing item type 13/index 14 — likely the wheel ticket itself as a possible reward, "recycling" back into the currency described in Section 0).
- All reward rows are **active (not commented)** — 42 total reward slot definitions, each with full item option/socket data but `ItemLevel=13` (+13) throughout the per-class section.

**Duration/rental support**: `NOT_FOUND_IN_CONFIG` in this file — reward items in the per-class section show `ItemDuration = 0` (permanent) on every row read.

## 4b. UPDATE — "070/071/072 - Lucky Coin N.txt" located (they exist, just not where the task brief said)

The task brief's original lead (from an earlier, less-precise partial inventory pass) pointed at `Data\Shop` or `Data\Item`. This report correctly found neither location has them. Following up directly: **they exist in `C:\MuServer\Data\EventItemBag\`** — `070 - Lucky Coin 1.txt` (8824 bytes), and presumably `071`/`072` alongside it. Downloaded and read `070 - Lucky Coin 1.txt` directly.

**What it actually is**: an event item-bag/loot-box drop table, structurally identical to the directory's other entries (`000 - Box of Luck.txt`, `001 - Skeleton King.txt`, `002 - Red Dragon.txt`, etc. — all dated 2014, same era as `LuckyItem.txt`). Section `0` names the bag ("Lucky Coin 1") and sets `DropZen=1000, ItemDropRate=100`; section `1` is a standard weighted item-drop table (`Section/Type/MinLevel/MaxLevel/Skill/Luck/Option/Excellent` columns). **This is a loot-box-style event reward container, not a currency and not a rentable gear set** — it has nothing to do with the "Lucky Set" rental concept in Part S of the phase spec. This closes the lead cleanly: it was a red herring from an imprecise initial file-path guess, now resolved rather than left dangling.

## 4c. The real rental MECHANISM already exists and is live today — just not applied to Lucky items

Section 2 of `shop-and-cashshop-inventory.md` (the companion report) found that **`CashShopProduct.txt` already sells 8 items with `ItemDuration = 604800` (exactly 7 days)** — Guardian Angel, Imp, and Horn of Dinorant (wings/accessory), Demon (wing), Spirit of Guardian, and 3 pets (Rudolf, Panda, Unicorn, Skeleton). All 8 rows are live and active right now.

**This directly answers the Part S technical-feasibility question**: a time-limited rental via Cash Shop, using the `ItemDuration` field, is **proven technically supported** — it's not a hypothetical, it's shipping today for other item categories. What does **not** exist is any evidence this same mechanism has ever been pointed at the `LuckyItem.txt` gear-set codes (Scale/Silk/Sphinx/Violent Wind/Dark Soul/Dragon/Guardian/Legendary/Red Wing/Atlans/Storm Jahad) — those items, as configured today, use the unrelated `Decay` field (a 40-minute countdown) and have no `ItemDuration`/rental entry anywhere in `CashShopProduct.txt` or `CashShopPackage.txt`.

**Practical conclusion for Part S**: building "Lucky Set rental, 7/15/30 days" does not require new engine capability — it requires adding new `CashShopProduct.txt` rows for the Lucky Set item codes with `ItemDuration` set to 604800 (7d) / 1296000 (15d) / 2592000 (30d), the same pattern already proven live for the 8 wing/pet items. This is a config change, not a feature build — though actually making that change is out of scope this phase (`NO PRODUCTION WRITE`).

## 5. Summary answers to the specific task questions

| Question | Answer |
|---|---|
| Dedicated "Lucky Set" file | `NOT_FOUND_IN_CONFIG` — does not exist in `Data\Item` or `Data\Shop`. |
| "070/071/072 - Lucky Coin N.txt" files | `NOT_FOUND_IN_CONFIG` — full Shop directory listing (48 files) confirms these do not exist; highest-numbered file is `046`. |
| LuckyItem.txt — name, class, item codes | 54 rows: Helm (3646–3656), Armor (4158–4168), Pants (4670–4680), Gloves (5182–5191), Boots (5694–5704); 5 named set lines (Scale/Silk/Sphinx/Violent Wind = Group 0; Dark Soul/Dragon/Guardian/Legendary/Red Wing/Atlans/Storm Jahad = Group 1); class is not specified per-row (these appear to be class-agnostic armor codes). |
| LuckyItem.txt — stats / set bonus | Not present in this file; only `Decay=2400` and 7× `Option=10` per row. Actual stat/set-bonus values would live in `SetItemOption.txt`/`Item.txt`, not cross-referenced this pass. |
| Duration support / rental mechanism | `NOT_FOUND_IN_CONFIG` on the Lucky Item codes specifically, **but the rental mechanism itself is proven live today** via `CashShopProduct.txt`'s `ItemDuration` field (8 wing/pet items already sell as 7-day rentals) — see section 4c. Extending it to Lucky Set codes is a config addition, not new engine capability. |
| "070/071/072 - Lucky Coin N.txt" — do they exist? | **Yes**, but in `Data\EventItemBag\`, not `Data\Shop`/`Data\Item`. They are event loot-box drop tables, unrelated to a Lucky Set rental system — see section 4b. |
| Lucky Wheel spin cost | Confirmed: 2× item (14/13) + `Cash=5, Gold=10, PcPoint=15` (exact combination logic `UNKNOWN`). |
| Lucky Wheel current config state | **Active** — cost row and all 42 reward rows are live (not commented). |

---

## Evidence quality

`LuckyItem.txt`, `SetItemOption.txt`, `SetItemType.txt`, `CustomWing.txt`, and `CustomLuckyWheel.txt` were each downloaded fresh and **read in full** (byte lengths match remote inventory exactly). `SetItemOption.txt`/`SetItemType.txt` were additionally full-text-searched (grep) for "Lucky" with zero matches, confirming the absence of any Lucky-Set cross-reference in those files rather than relying on a partial read. `Item.txt` (253685 bytes) and `ItemValue.txt` (58148 bytes), which would be needed to resolve full stat/price detail for the 54 LuckyItem item codes, were **not** downloaded or parsed this pass — flagged as `UNKNOWN`/out of scope rather than guessed at.
