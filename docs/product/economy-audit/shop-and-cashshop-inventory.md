# Shop / CashShop / X-Shop / Daily Reward / Battle Pass / Coins-Online — Real Config Inventory

**Phase**: 11 (Economy & Monetization Foundation)
**Evidence source**: Live remote server config downloaded via `bm-remote.cmd` on 2026-08-29.
**Discipline**: every item/price below is quoted from a real downloaded file. Item names come from the file's own `//comment` field where present; item codes are given otherwise. Currency field names are quoted exactly as they appear in config (`WCoinC`, `WCoinP`, `GoblinPoint`, `Cash`, `Gold`, `Zen`) — their real-world meaning (e.g. "paid" vs "earned" currency) is only asserted where the config text itself says so (see Section 7).

---

## 1. `C:\MuServer\Data\Shop` — full directory inventory

47 numbered NPC shop files (`000 - Hanzo Ferreiro Armadura.txt` through `046 - Gislaine BloodMoon SHOP.txt`) plus `ShopManager.txt`. **No file matching "070 - Lucky Coin" or any "Lucky Coin"-named file exists anywhere in this directory** — the full listing was captured and the highest index present is `046`. (This contradicts the task brief's claim of a prior partial-inventory finding of such files; see Section 6 for the correction.)

`ShopManager.txt` (3289 bytes, read in full) is the **NPC registry**, not a price list: `Index, MonsterClass, Map, X, Y, GML, Pk, Message, AccountLevel, Comment`. It maps each numbered shop file to an in-world NPC. Confirmed entry for the BloodMoon-branded NPC:
```
46   702   0   148   109   *   0   0   0   //BloodMoon Shop
```
(MonsterClass 702, Map 0/Lorencia, position 148,109.)

`046 - Gislaine BloodMoon SHOP.txt` (5349 bytes, read in full) is the item-availability list for that NPC. **Active (non-commented) items sold**: Old Farming (14/144), Steel Farming (14/143), Elegant Farming (14/142), Shining Farming (14/141), Jewel Of Level (14/245), Jewel Of Adicional (14/248), Jewel Of Luck (14/247), Jewel Of Skill (14/246), Scroll of Archangel +1 through +8 (13/16), Blood Bone +1 through +8 (13/17), Devil's Eye +1 through +7 (14/17), Devil's Key +1 through +7 (14/18). A large number of other items (Jewel Of Socket, Box of Kundun +1–+5, Talisman of Chaos Assembly, Talisman of Luck, Armor of Guardsman, Lost Map +1–+7, Imp, Guardian Angel, Horn of Uniria, Darkhorse Soul, DarkhSpirit Soul) are present in the file but **commented out** — i.e. defined but not currently sold. This file does not itself carry a Zen/coin price column (pricing for NPC-sold jewels/scrolls is presumably in `Item.txt`/`ItemValue.txt`, which were not parsed line-by-line this pass — out of explicit scope).

## 2. CashShop — `C:\MuServer\Data\CashShop`

Both files read in full.

**`CashShopPackage.txt`** (6516 bytes) — bundle/package definitions, `CoinIndex 508`, priced in `CoinValue`:

| Item | CoinValue | Comment field |
|---|---|---|
| Blood Castle Ticket | 5 | //Blood Castle Ticket |
| Devil Square Ticket | 5 | //Devil Square Ticket |
| Kalima Ticket | 5 | //Kalima Ticket |
| Guardian Angel (wing) | 3 | //Guardian Angel |
| Imp (wing) | 3 | //Imp |
| Horn of Dinorant | 3 | //Horn of Dinorant |
| Demon (wing) | 6 | //Demon |
| Spirit of Guardian | 5 | //Spirit of Guardian |
| Pet Rudolf | 4 | //Pet Rudolf |
| Pet Panda | 10 | //Pet Panda |
| Pet Unicorn | 4 | //Pet Unicorn |
| Pet Skeleton | 10 | //Pet Skeleton |

**`CashShopProduct.txt`** (4244 bytes) — the underlying per-item product entries referenced by the packages above, including duration:

| Item | CoinValue | Quantity | ItemDuration (sec) | Notes |
|---|---|---|---|---|
| Blood Castle Ticket | 5 | 10 | 0 (permanent) | stackable ticket |
| Devil Square Ticket | 5 | 10 | 0 | stackable ticket |
| Kalima Ticket | 5 | 10 | 0 | stackable ticket |
| Guardian Angel | 3 | 0 | 604800 (7 days) | rental wing |
| Imp | 3 | 0 | 604800 (7 days) | rental wing |
| Horn of Dinorant | 3 | 0 | 604800 (7 days) | rental |
| Demon | 6 | 0 | 604800 (7 days) | rental wing |
| Spirit of Guardian | 5 | 0 | 604800 (7 days) | rental |
| Pet Rudolf | 4 | 0 | 604800 (7 days) | rental pet |
| Pet Panda | 10 | 0 | 604800 (7 days) | rental pet |
| Pet Unicorn | 4 | 0 | 604800 (7 days) | rental pet |
| Pet Skeleton | 10 | 0 | 604800 (7 days) | rental pet |

All 12 rows in both files are **active (not commented)** — this is a fully live, enabled CashShop catalog. `CashShopSwitch = 1` is also confirmed in `GameServerInfo - Common.dat`.

## 3. X-Shop — `C:\MuServer\Data\Custom\CustomXShop.txt` (18968 bytes, read in full)

Fully active, 13 item categories, each item priced across **three parallel coin columns** (`Coin0`, `Coin1`, `Coin2` — column meaning not labeled beyond position; see Section 7 caveat), all items `ItemLevel 13` (i.e., +13 base), Excellent option flags set (`ItemOption1/2/3 = 1/1/7`, `ItemNewOption=63` on most rows):

| Category | Item count | Coin0 range | Coin1 | Coin2 | Duration |
|---|---|---|---|---|---|
| Swords (0) | 12 | 10000–30000 | 0 | 0 | 60s (all but idx3, which costs 500/200/60) |
| Axes (1) | 12 | 10000–30000 | 50 (flat) | 0 | 0 (permanent) |
| Scepters (2) | 12 | 10000–30000 | 30 (flat) | 10 (flat) | 0 |
| Spears (3) | 12 | 0 | 100 (flat) | 0 | 0 |
| Bows/CrossBows (4) | 12 | 0 | 0 | 200 (flat) | 0 |
| Staffs (5) | 12 | 10000–30000 | 0 | 0 | 0 |
| Shields (6) | 12 | 10000–30000 | 0 | 0 | 0 |
| Helms (7) | 12 | 10000–30000 | 0 | 0 | 0 |
| Armors (8) | 12 | 10000–30000 | 0 | 0 | 0 |
| Pants (9) | 12 | 10000–30000 | 0 | 0 | 0 |
| Gloves (10) | 12 | 10000–30000 | 0 | 0 | 0 |
| Boots (11) | 12 | 10000–30000 | 0 | 0 | 0 |
| Wings (12) | 12 | 10000–30000 | 0 | 0 | 0 |
| Pets/Rings/Pendants (13) | 12 | 10000–30000 | 0 | 0 | 0 |

(Full per-item breakdown is in the raw file at `D:\MU\RemoteData\Phase11\CustomXShop.readable.txt` — 182 individual item rows total across the 13 categories; the table above summarizes the pattern rather than repeating all 182 rows.)

## 4. `CustomShopBuyKits.txt` (8041 bytes, read in full) — "Kit" bundles

Two sections:
- **Buy Item** (section `0`): individual gear pieces tagged with a `KitId` (1–10), each priced flat at `WCoinC=10, WCoinP=20, GoblinPoint=30` regardless of the specific item.
- **Preview Kits** (section `1`): named kit bundles — `"Kit Venom Mist"` (KitId 1, 6), `"Kit Dragon Knight"` (2), `"Kit Sylphid Ray"` (3, 8), `"Kit Volcano"` (4, 9), `"Kit Sunlight Mask"` (5, 10), `"Kit Green 3.0 RLK"` (7) — each a 9-slot full gear set. All 10 kits are active (a few individual slot-lines are commented out within Kit Volcano and Kit Sunlight Mask, e.g. slot 1 of Kit Volcano).

## 5. Daily Reward — `C:\MuServer\Data\Custom\CustomDailyReward.txt` (5098 bytes, read in full)

Fully active, 31 consecutive days configured (Day 1–31), each row grants a real item + `Cash` + `Zen`, with `Cost = 0` on every row (i.e., **claiming is free**, no purchase cost). Cash and Zen scale linearly with day number:

| Day | Cash | Zen |
|---|---|---|
| 1 | 5000 | 10,000,000 |
| 2 | 6000 | 20,000,000 |
| ... | +1000/day | +10,000,000/day |
| 31 | 35000 | 310,000,000 |

Item rewards vary by day (e.g. day 4 grants item 0/22 with socket options 109/128; day 26 grants item 13/30 — likely a special/box item). Full row-by-row detail in `D:\MU\RemoteData\Phase11\CustomDailyReward.readable.txt`.

## 6. Battle Pass — `C:\MuServer\Data\Custom\CustomBattlePass.txt` (7839 bytes, read in full)

- **Season config** (section `0`): `Enable=1, SeasonId=1, ExpPerLevel=100, ProgressSource=1 (character level), ProgressMultiplier=10`. Comment block in the file documents `ProgressSource`: `0=Manual, 1=Level do personagem, 2=Reset, 3=Master Reset` — this server is currently configured to progress the pass via **character level**, not Reset/Master Reset.
- **Premium-ticket activation requirement** (section `1`): `Level=1, Reset=0, MasterReset=0, WCoinC=0, WCoinP=0, GoblinPoint=0` — i.e., **no currency cost and no level/reset gate is configured** to unlock premium track via this requirement row (all zero = "use 0 to ignore the requirement" per the file's own comment).
- **Premium ticket item** (section `2`): `ItemType=14, ItemIndex=13, ItemLevel=-1 (any), Count=1` — meaning premium track is unlocked by *possessing* a specific consumable ticket item (type 14/index 13), not by paying WCoin directly through this file.
- **Rewards** (section `3`): 31 tiers × Free and Premium tracks, each granting a real item (with socket/option data) and a `Quantity`. **No WCoinC/WCoinP/GoblinPoint/Zen values are populated on any reward row** (all read `0`) — rewards are 100% item-based on this server, not currency-based.

## 7. Coins-Online — `C:\MuServer\Data\Custom\CustomCoinsOnline.txt` (161 bytes, read in full)

Fully active, all 3 rows uncommented:
```
//Index   AccountLevel   Map   AllowPK   Delay   CoinType   CoinValue
0         *              *     1         1       0          10
1         *              *     1         1       1          10
2         *              *     1         1       2          10
```
Three parallel `CoinType` (0/1/2) grants of `CoinValue=10` each, `Delay=1` (unit not specified in-file — likely minutes based on typical engine convention, but this is **not stated in the file**, so marked `UNKNOWN`), available on any map/account-level, with PK players allowed to still earn. **`CoinType 0/1/2` are not explicitly labeled in this file** — whether they correspond 1:1 to `WCoinC`/`WCoinP`/`GoblinPoint` (the three named currencies seen elsewhere in Custom.dat, e.g. `CustomStoreText7 = "...vendidos por WCoinC"`, `CustomStoreText8 = "...vendidos por WCoinP"`, `CustomOnlineLotteryText5 = "...%d WCoinC, %d WCoinP, %d GoblinPoint..."`) is **UNKNOWN** — no field in `CustomCoinsOnline.txt` or `GameServerInfo - Custom.dat` explicitly maps `CoinType` index to a named currency.

## 8. VIP purchase config — `C:\MuServer\Data\Custom\CustomBuyVipAndCoin.txt` (463 bytes, read in full)

**Every data row in both sections is commented out.** Section `0` (item-purchase) example (all `//`):
```
//14   123   0   1   0   0   0   1   100   200   300   //Golden Box
//14   124   0   0   1   1   7   0   0     0     0     //Silver Box
```
Section `1` (class-based) is similarly fully commented (`//1  12  16  0  1  //Orb of Fire Slash`).

**Conclusion**: On this server, right now, `CustomBuyVipAndCoin.txt` defines **zero active purchasable VIP/coin offers**. If VIP is sold through a different mechanism (e.g. `CashShopPackage.txt`/`CashShopProduct.txt`, Section 2 above, which lists cosmetic/pet items but no explicit "VIP" line item), that is the only currently-active purchase path found. No item in the CashShop or X-Shop catalog is explicitly labeled "VIP" in its comment field.

---

## Enabled-state summary

| System | Config file | State |
|---|---|---|
| CashShop | CashShopPackage.txt / CashShopProduct.txt | **Active** — 12/12 rows enabled, `CashShopSwitch=1` |
| X-Shop | CustomXShop.txt | **Active** — all categories populated |
| Shop Kits | CustomShopBuyKits.txt | **Active** — 10 kits, minor per-slot exceptions commented |
| Daily Reward | CustomDailyReward.txt | **Active** — all 31 days populated, free to claim |
| Battle Pass | CustomBattlePass.txt | **Active** — Enable=1, all 31×2 reward tiers populated (item-only, no currency reward) |
| Coins Online | CustomCoinsOnline.txt | **Active** — 3/3 rows enabled |
| VIP/Coin purchase | CustomBuyVipAndCoin.txt | **Disabled** — 0 active rows, fully commented |
| NPC Shop (Gislaine BloodMoon) | `046 - Gislaine BloodMoon SHOP.txt` | **Partially active** — ~20 items live, ~15 commented out |

---

## Evidence quality

All 10 files in this report were downloaded fresh from the live server and read **in full** (byte length of each local file matches the remote inventory listing exactly — verified for all files). No content was truncated or sampled except CustomXShop.txt's per-row detail, which is summarized by category above (all 182 rows were read; the full row-by-row values are preserved in the raw converted file at `D:\MU\RemoteData\Phase11\CustomXShop.readable.txt` for reference).

## Correction to task brief

The task brief stated a prior pass found "many numbered item files like `070 - Lucky Coin 1.txt`" in the Shop directory. **The current full directory listing of `C:\MuServer\Data\Shop` (captured this pass, 48 entries total) does not contain any such file** — the numbering only goes from `000` to `046`, all named after NPC vendors, plus `ShopManager.txt`. This should be treated as `NOT_FOUND_IN_CONFIG` rather than assumed to still exist; see also `lucky-sets-inventory.md` for the related Lucky-item findings.
