---
status: DRAFT_FOR_REVIEW
category: vip
audience: internal (product + engineering)
lastVerified: 2026-08-30
---

# VIP Deep Audit — Phase 14 Part C

Builds directly on Phase 12's `VIP_TECHNICAL_CAPABILITIES.md` (5 known grant paths, all disabled) and Phase 13's real `VipEntitlement`/`VipGrant`/`VipProductConfig`/`VipBenefitConfig` implementation. This phase re-audits with a much wider config search and reaches a materially stronger conclusion on the Bronze/Silver/Gold-to-AL mapping question Phase 12 left open.

## The AL0-3 level model — what it actually is

`AccountLevel` (`MEMB_INFO.AccountLevel`, real DB column, confirmed via `bm-sql`) is a 4-value integer field (0, 1, 2, 3 — no AL4+ exists anywhere in this GameServer's config; confirmed by an exhaustive `_AL4` pattern search returning zero matches across `Command.dat`, `Custom.dat`, `Common.dat`). Every one of this server's real 9 accounts currently has `AccountLevel = 0` (confirmed via `bm-sql`, `MIN=MAX=0`, `COUNT(DISTINCT)=1`) — consistent with every known grant path being disabled.

**Storage format**: a plain integer column on `MEMB_INFO`, not a separate table, not a JSON/bitmask blob. **Expiration**: not stored as a date/timestamp on `MEMB_INFO` itself — `AccountExpireDate` exists on that table but is a *different*, pre-existing field (account-level expiry, unrelated to VIP; likely for timed/trial account features, not audited further this phase as out of scope). The one file that documents a *duration* concept tied to AccountLevel — `CustomBuyVipAndCoin.txt` (100% commented out, template/example only, not live data) — carries `AccountLevelType` (which AL bracket to grant) and `AccountLevelDays` (how many days) as two separate purchase-item columns. This is the strongest evidence in this environment that **AccountLevel is designed to be a time-limited grant with a duration**, not a permanent account attribute — but because the only file describing the days-based mechanism is fully commented out, the *exact* runtime storage of "AL expires on date X" (a column this session didn't find, a scheduled job, or something else entirely) remains **UNKNOWN**, not fabricated.

**Timezone assumptions**: UNKNOWN — no config in this environment states a timezone for any AL-expiry mechanism, because no live AL-expiry mechanism was found to inspect. Flagged, not guessed.

**Runtime reload behavior**: UNKNOWN — whether `Command.dat`/`Custom.dat`/`Common.dat`'s `_AL0-3` values are read once at GameServer startup or hot-reloadable requires GameServer source or an operational test; not available this session.

## Exhaustive VIP/AL config search — method and completeness

Searched, case-insensitively, for `vip` and for the `_AL[0-3]` suffix pattern across every downloaded GameServer config file: `GameServerInfo - Command.dat`, `- Custom.dat`, `- Common.dat`, `- Character.dat`, `- ChaosMix.dat`, plus every `Custom*.txt` file already retrieved in Phase 11/12 (`CustomBuyVipAndCoin`, `CustomItemRewardMasterReset`, `CustomItemRewardReset`, `CustomLuckyWheel`, `CustomDailyReward`, `CustomBattlePass`, `CustomRanking`, `CustomRankingReward`, `CustomResetAndMasterResetMove`, `CustomResetQuestRequirement`, `CustomShopBuyKits`, `CustomWing`, `CustomXShop`, `CustomCoinsOnline`), `Item.txt`, `ItemValue.txt`, and `ShopManager.txt`.

Two literal `vip` matches in `Item.txt`/`ItemValue.txt` were confirmed false positives ("Arrow **Viper** Bow", "Grand **Viper** Staff" — not VIP). `ShopManager.txt` carries a real `AccountLevel` gating column for all 47 NPC merchants, but every single one is `AccountLevel=0` (ungated) — a dormant field, not a 6th active grant path.

### The 5 known grant paths — re-confirmed, still disabled, plus new detail

| # | Mechanism | File | Status | New detail this phase |
|---|---|---|---|---|
| 1 | `/buyvip` in-game command | `Command.dat` | `CommandBuyVipSwitch = 0` | Now confirmed structurally distinct from the AL system — see "Two parallel VIP-purchase concepts" below |
| 2 | NPC shop purchase | `CustomBuyVipAndCoin.txt` | 100% commented out | **New**: the file's real (commented) column header proves the *intended* item-grants-AL-for-N-days design — `AccountLevelType`/`AccountLevelDays` |
| 3 | Online lottery | `Common.dat`/`Custom.dat` | `CustomOnlineLotteryVipSwitch = 0` | Real Portuguese prize text re-confirmed: `"%s você ganhou %d dias de vip no sorteio!"` |
| 4 | New-character welcome reward | `Custom.dat` | `CustomVipRewardNewCharacterSwitch = 0` | No new detail |
| 5 | Referral/indication reward | `Command.dat` | `CommandIndicationRewardVipSwitch = 0`, `...VipType = 0`, `...VipDays = 0` | **New**: a `VipType` field alongside `VipDays` confirms referral rewards can target a *specific* VIP tier, not just "some VIP" |

**No 6th grant path was found.** The search above is exhaustive against every config file this session has read access to.

### Two parallel VIP-purchase concepts that do not obviously reconcile

This phase found clear evidence of **two structurally separate systems** sharing the word "Vip," which Phase 12 had not yet distinguished:

1. **`AccountLevel` (AL0-3)** — the field that actually gates real, differentiated gameplay benefits throughout `Command.dat`/`Custom.dat`/`Common.dat` (see the benefit matrix below). Its only documented grant-with-duration design (`CustomBuyVipAndCoin.txt`) uses `AccountLevelType` + `AccountLevelDays`.
2. **`Vip1`/`Vip2`/`Vip3`** — a separate three-tier price-slot structure inside the `/buyvip` command block (`CommandBuyVip1PriceValue1-3`, `CommandBuyVip2PriceValue1-3`, `CommandBuyVip3PriceValue1-3`), gated by a *different* set of fields (`CommandBuyVipEnable_AL0-3`, `CommandBuyVipMoney_AL0-3`) and constrained to `CommandBuyVipMinDays=15` / `CommandBuyVipMaxDays=30`.

The `CommandBuyVipEnable_AL0-3` naming implies the `/buyvip` command's own eligibility/pricing is gated by the caller's *current* AL bracket — i.e., `Vip1/2/3` reads more like a *product selector* inside a command that a player's *existing* AL tier can access at a tier-specific price, not a separate account attribute from AL. Read this way, `/buyvip`'s `Vip1/2/3` and `AccountLevel`'s AL0-3 could plausibly be the *same underlying status*, with `Vip1/2/3` just being that command's internal product-selection labels. This reading is **not proven** — no code path ties them together in any config file this session can read — but it is the best-supported synthesis available, offered as a hypothesis rather than a fact.

**One concrete, load-bearing tension**: `CommandBuyVipMinDays=15` means the *native in-game command path*, if ever re-enabled as-is, could not grant a 7-day Bronze purchase without either changing this GameServer-wide constant (affecting every VIP purchase, not just Bronze) or bypassing the command entirely. **This is now confirmed, concrete support for Phase 13's architectural decision to route VIP purchases through the portal-controlled `VipService` + `GameBridgeJob(GRANT_VIP)` path instead of the native `/buyvip` command** — the native command's own validation range doesn't fit the approved product (Bronze=7, Silver=15, Gold=30).

### Bronze/Silver/Gold → AL mapping: revised, better-evidenced hypothesis

Phase 12 called this "not yet exhaustively re-confirmed." This phase's benefit-matrix sweep (below) found **28 real, differentiated `_AL0-3` settings**, and in every single one, benefits increase monotonically AL0 ≤ AL1 ≤ AL2 ≤ AL3 (never non-monotonic, never AL2 worse than AL1). Combined with there being exactly 4 AL brackets (one free + three increasingly-better paid tiers) and the product's own exactly-3-tier Bronze/Silver/Gold structure, the leading hypothesis is now:

**`AL0 = no VIP (free)`, `AL1 ≈ Bronze`, `AL2 ≈ Silver`, `AL3 ≈ Gold`.**

This is **still not a confirmed 1:1 mapping** — no config file states it explicitly, and this session has no way to verify it in-game — but it is now supported by structural evidence (monotonic 4-bracket scaling matching a 4-tier product model exactly), not just plausibility. **Recommendation**: treat this as the working default for any future decision that needs an AL value per tier, but do not hard-code it as fact without a Bryan confirmation or an in-game test (e.g., manually set a test account's `AccountLevel=1` via a sanctioned path and confirm observed behavior matches "Bronze" expectations) — this SQL environment's read-only credential (`bloodmoon_observer`, `CanUpdate=0`) cannot perform that test itself, and no such test was attempted this phase.

## `vipDiscountPercent` — definitive determination

**DEAD_CODE, confirmed, not just previously-observed.** Re-confirmed via `apps/api` source: the field exists on `MarketplaceEconomyConfig`, is settable through the admin API (`marketplace-admin.service.ts`'s `updateEconomy()`), but is never read by any fee-calculation code path — `wallet-ledger.service.ts`'s `taxRatePercent()` reads only `wcoinTaxPercent`/`goblinPointTaxPercent`/`huntPointTaxPercent`, none of which reference `vipDiscountPercent`. Grepped the full `apps/api/src` tree for `vipDiscountPercent` outside the schema/DTO/admin-form-passthrough layer — zero read sites. **Recommendation**: leave as documented dead field (already the case since Phase 13); do not wire it up this phase (would be inventing a VIP pricing benefit Bryan hasn't approved) and do not remove it either (removing a schema field the admin API already exposes is a live-data-shape change outside this phase's scope) — noted for a future cleanup pass, not actioned now.

## See also

- [`vip-benefit-matrix.md`](vip-benefit-matrix.md) — the full CONFIRMED/NOT_FOUND/UNKNOWN/DEAD_CODE benefit table.
- [`vip-product-readiness.md`](vip-product-readiness.md) — what's technically ready to sell vs. still withheld pending Bryan's pricing/benefit decisions, plus the new GRANT_VIP delivery worker built this phase.
