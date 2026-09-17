---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read)
---

# Legacy provider-web — useful historical reference

**Everything in this document is HISTORICAL_REFERENCE. None of it is
current Blood Moon policy, and none of it should be treated as a design
target.** Captured because old pricing/structure decisions are sometimes
useful context when a product conversation asks "what did the old system
do here" — nothing more.

## Currency engine

`helper.website.php::add_credits()`/`get_user_credits_balance()` is a
generic, config-driven multi-currency engine for currency "types" 1-3
(mapped per-server via `credits_config.json`). Type 4 is hardcoded
specially: `db='web'`, `table='DmN_Shop_Credits'`, `column='credits4'` —
labelled "WebZen" in the UI (`translate_credits()` case 4).

Native `WCoin`/`GoblinPoint` access (`CashShopData.WCoinC`/`GoblinPoint`,
`AccountID`-keyed) is direct `UPDATE ... SET WCoinC = WCoinC ± :amount`,
auto-inserting a row if missing. No `WCoinP`/`CoinIndex` reference
anywhere.

## Player market

`DmN_Market` (web db) stores `price`, `price_type` (which currency),
`price_jewel`+`jewel_type` (an optional barter-for-jewel alternative),
`sold`, `removed`, `active_till`. A `sell_tax` percentage
(`market|sell_tax` config) applies on top of the listed price at
settlement.

## VIP package structure

See [`vip-legacy.md`](vip-legacy.md)'s full field list — VIP tiers in
this legacy design bundled per-purchase discounts across nearly every
monetized feature (reset price/level/bonus discounts, shop discount,
name/class-change discount, online-hour-exchange bonus, bonus WCoins on
purchase, donation-bonus stacking), a much richer model than "tier +
expiry alone."

## Admin panel capability inventory

Based on `models/model.admin.php` (~3,500 lines, ~200 public methods) and
`controllers/controller.admincp.php` (~7,900 lines):

- **Accounts**: search/list/paginate all accounts, view full detail
  (characters, IP log, credits, purchase totals, referral share),
  activate unverified accounts, edit email/password/serial number,
  ban/unban account or character, delete an account (full cascade — see
  [`account-lifecycle-legacy.md`](account-lifecycle-legacy.md)).
- **Currency/VIP**: view/edit any account's donation logs across every
  gateway, manually adjust credit totals, create/edit/delete VIP
  packages, manually assign/change a player's VIP package.
- **Items/Shop/Warehouse**: full item-shop CRUD, harmony/socket price
  list management, search a character's inventory/warehouse by item
  serial, **generate a new item directly into a warehouse slot**, remove
  a specific inventory/vault item by serial, view warehouse-deletion
  logs.
- **GM system**: add/edit/remove GM authority entries (authority mask +
  expiry), set a character's `CtlCode`, list all GMs.
- **Bans**: ban/unban account or character, maintain the ban list.
- **Content**: news, guides, drop-rate entries, gallery uploads,
  downloads/patch management, announcements, language editor, vote-link
  manager (with XtremeTop100 auto-detection).
- **Support**: full ticket system (departments, priority, status, reply
  threads, SLA tracking).
- **Bulk email**: compose/queue mass emails to account segments.
- **Server/database administration**: add/remove/reorder configured game
  servers, plus a database-schema toolkit (check/add/drop columns,
  check/drop procedures, execute arbitrary SQL) — see
  [`security-findings.md`](security-findings.md) finding #8 for why this
  is a real risk surface, not just a convenience feature.
- **Plugin management**: install/uninstall/enable/disable any of the ~25
  plugins under `plugins/`.

This is a substantially broader admin surface than "grant VIP / add
currency / ban accounts" — live item generation into player warehouses,
raw SQL execution, and full account PII edit/delete are all in scope.
Useful negative reference for scoping Blood Moon's own Super Admin
manual: several of these capabilities (raw SQL execution in particular)
are exactly the kind of thing Blood Moon's own least-privilege GameBridge
design (EXECUTE-only on named procedures, never raw SQL — see
`docs/gamebridge/`) was deliberately built to avoid reproducing.
