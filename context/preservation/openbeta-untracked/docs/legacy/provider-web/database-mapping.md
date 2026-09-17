---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read)
---

# Legacy provider-web — database mapping

Resolves the 8 previously-unknown GameServer table writers/readers this
investigation specifically targeted, using the real `application/` PHP
source. See [`overview.md`](overview.md) for why this panel's `DmN_*`
tables are the same physical tables as the GameServer's own schema.

## The 8 targeted tables

| Table | Result | Real source |
|---|---|---|
| `PixPayments` | **No reference found anywhere** in `application/` (PHP, JSON, or `.sql` schema files) — confirmed clean miss, both exact-case and loose search. Writer remains genuinely unknown; not this panel. Stays classified `DORMANT_LEGACY_UNKNOWN_WRITER` per `docs/payments/payment-surfaces-comparison.md`. | — |
| `DmN_Admin_Logins` | **Writer found.** `admin_login_attemt($user)` inserts `(memb___id, time, ip)` on every admin-panel login attempt. | `models/model.admin.php:171` (insert), `:109` (read, dashboard widget) |
| `DmN_IP_Log` | **Writer found, but the writer is DEAD CODE in this snapshot** — see below. Read by three functions: `get_ip_logs()` (admin account detail), `get_account_by_ip()` (admin "accounts by IP" lookup), `check_referral_ips()` (anti-multi-accounting for referrals). | `models/model.account.php:536` (writer, dead — see [`dead-and-dormant-components.md`](dead-and-dormant-components.md)), `:2466`/`:2521`/`:1450` (readers) |
| `DmN_OnlineCheck` | **Reader only in this codebase, no writer here.** Read for online-hour-to-credit exchange (`load_online_hours`/`exchange_online_hours`), rankings (online-time leaderboard), and achievement/battle-pass online-time progress. The real writer is elsewhere (presumably the native GameServer/login-server side, not this web panel) — genuinely unresolved by this pass. | `models/model.account.php`, `models/model.rankings.php`, `plugins/achievements/*`, `plugins/battle_pass/*` |
| `DmN_Shop_Harmony` | **Admin-CRUD only, no gameplay-event writer found.** `load_harmony_values`/`check_harmony`/`get_harmony_price` (read), `load_harmony_list`/`edit_harmony`/`change_harmony_status` (admin edit). An admin-curated item-harmony shop price list, not populated from gameplay. | `models/model.shop.php`, `models/model.admin.php` |
| `DmN_Shop_Sockets` | Same pattern as Harmony — admin-curated socket price/definition list. | `models/model.shop.php`, `models/model.admin.php`, `plugins/workshop/models/model.workshop.php` |
| `DmN_Account_Invt` | **Writer found — but this is NOT an invite/referral table**, despite the name. It is the **lost-password reset-token table**: `create_reminder_entry_for_name()` inserts `(invt_code, assignto, used)` where `invt_code` is a 40-char reset code, `assignto` the account, `used` a timestamp for a 10-minute reuse cooldown. Confirmed by callers (`load_reminder_by_name`/`load_reminder_by_code`/`delete_reminder_entries_for_name`), all invoked from the lost-password flow. **Worth correcting in project docs if `DmN_Account_Invt` was previously assumed to be a referral/invite table.** | `models/model.account.php:408-417` (writer), `controllers/controller.lost_password.php` (callers) |
| `DmN_Mmotop_Stats` | **Writer found.** `insert_mmotop_stats()`, called from `tasks/ParseMMOTOPVotes.php`, inserts `(unid, character, vote_type, server)` for each new vote-tracking record pulled from the external `mmotop.ru` stats URL. Read/updated by `check_mmotop_voters()` (rewards) and `log_rewarded_mmotop_vote()` (marks `status = 1`). | `models/model.account.php:1110-1123` |

**Net**: 6 of 8 tables have a confirmed writer or reader in this panel (4
with a real write path: `DmN_Admin_Logins`, `DmN_IP_Log` [dead],
`DmN_Account_Invt`, `DmN_Mmotop_Stats`; 2 admin-CRUD-only:
`DmN_Shop_Harmony`, `DmN_Shop_Sockets`). `DmN_OnlineCheck` is consumed but
never written here — its real writer is still unresolved. `PixPayments`
remains completely unreferenced anywhere in this codebase.

## Real security-relevant PHP bug found while resolving `DmN_IP_Log`

`login_user()`'s actual call to `insert_ip_log()` is **commented out**
(`models/model.account.php`, around lines 523-524) in this snapshot,
despite a dedup guard (`ip_log_exists()`) still being wired up around it.
This means `DmN_IP_Log` was likely **not actually being populated by this
panel on ordinary user logins** in this configuration — which would have
silently degraded both the admin "accounts by IP" tool and the referral
self-referral check (`check_referral_ips()`), neither of which would ever
have found real rows to compare against. Not fixed (this is dead-backup
analysis, not live code); documented as a real bug found in the
as-captured source.

## Other database findings (native, HISTORICAL_REFERENCE — see that doc for full detail)

- `T_InGameShop_Log` (native, `game` db) — real in-game cash-shop purchase
  log, read-only display in the account panel
  (`plugins/cashshop_log/models/model.cashshop_log.php`).
- `Warehouse`/`DmN_Warehouse_Delete_Log` — direct native warehouse
  read/write for the account-panel warehouse viewer, plus a web-side
  deletion-audit table for admin-triggered item removals.
- `CashShopData.WCoinC`/`GoblinPoint` (native) — this panel's
  `add_wcoins`/`remove_wcoins`/`get_wcoins` perform direct
  `UPDATE CashShopData SET WCoinC = WCoinC ± :amount` — no `WCoinP`/
  `CoinIndex` reference anywhere (clean miss).
- No `XShop`, `CustomMarketShop`, `CoinIndex`, or `ExtWarehouse` reference
  found anywhere in `application/` — clean misses, exhaustively searched.
- No reference to the native `Add_Credits` stored procedure anywhere —
  this panel does its own currency math directly against tables rather
  than delegating to it.

## Full `tasks/*.php` cron inventory

See [`cron-and-background-jobs.md`](cron-and-background-jobs.md) for
every file and its real, confirmed behavior.
