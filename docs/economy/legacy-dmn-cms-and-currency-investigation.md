---
status: FINDING_FOR_BRYAN_REVIEW
category: economy/infrastructure
audience: internal (product + engineering) — read this before further WCoin/CashShop work
lastVerified: 2026-08-30
---

# Legacy DMN CMS + Real Currency Storage — Investigation

Directly answers two of Bryan's 2026-08-30 questions (CoinIndex 508 trace; WCoinC/WCoinP vs. Portal WCOIN) — and surfaces a real, previously-undocumented finding neither question anticipated. Read-only throughout, via `bm-sql.cmd`.

## The headline finding: a complete, separate legacy web panel already lives in the production database

Searching `INFORMATION_SCHEMA.TABLES` for `DmN%` (the prefix that led to the `CoinIndex` trace) surfaced **74 tables**, not one. This is a full, previously undocumented, vendor-style MU Online web-panel/CMS ("DMN") schema, entirely separate from `mu-bloodmoon-v1-openbeta` (this Node/Nuxt portal), covering: multiple real payment-gateway integrations (`2CheckOut`, `PagSeguro`, `Interkassa`, `PayCall`, `CuentaDigital`, `Fortumo`, `SuperRewards`), a donation/shop system (`DmN_Shop_*`, `DmN_Donate*`), **its own VIP package and VIP user system** (`DmN_Vip_Packages`, `DmN_Vip_Users`, `DmN_VipSystem`), a marketplace (`DmN_Market*`), a referral system, a multi-site vote-reward system (Mmotop/Gtop/Top100arena/Topg/Xtremetop), a support-ticket system, ban list, GM tools, and account/character logs.

**This was not documented in any prior phase.** It was found only because the `CoinIndex`/`WCoinC`/`WCoinP` trace this round happened to search by column name rather than by table prefix.

## Is it live? — Evidence says no, but it is not empty either

| Signal | Finding |
|---|---|
| `DmN_Vip_Packages` (VIP product definitions) | **0 rows** — no VIP package was ever configured |
| `DmN_Vip_Users` (VIP grants) | **0 rows** — no VIP was ever granted through this system |
| `DmN_Donate`, `DmN_Donate_Transactions`, `DmN_Donate_Orders` | **0 rows** |
| `DmN_2CheckOut_Transactions`, `DmN_PagSeguro_Transactions` | **0 rows** — both real payment gateways integrated at the schema level, **zero real transactions ever processed** |
| `CashShopData` (the real WCoinC/WCoinP/GoblinPoint balance table — see below) | **4 rows, nonzero balances** |

Read together: this looks like a **fully provisioned but never commercially used** legacy panel — either the originally-planned web panel before the current custom portal was built, or a vendor product installed/evaluated and then not adopted. No real money, no real VIP grant, no real donation has ever gone through it. The 4 nonzero `CashShopData` rows are exactly the same 4 accounts (`teste`, `teste1`, `teste2`, `teste3`) already reviewed in [`pre-beta-account-review.md`](../accounts/pre-beta-account-review.md) — consistent with manual test-currency grants during development, not real player activity.

**This is reported as a finding requiring your decision, not something this phase acted on.** Options for a future phase: leave dormant and undocumented-elsewhere-no-longer (now documented here), formally decommission/drop the schema, or audit it further before deciding. Not resolved this phase — no schema in this legacy system was touched.

## CoinIndex 508 — resolved

`CoinIndex=508` in `CashShopPackage.txt` **is not a foreign key into any known table** — no table has a row with `id=508` that plausibly matches (`DmN_Vip_Packages.id`, etc. are all currently empty; no dedicated "currency definition" table exists anywhere in the schema). It is most likely a GameServer/client-protocol-internal numeric identifier for "the CashShop's coin," not a database-resolvable reference. **Reported as resolved-as-unresolvable** — this is the honest answer, not a guess dressed up as a finding.

## WCoinC / WCoinP / GoblinPoint — real storage found, confirmed separate from Portal WCOIN

`CashShopData(AccountID, WCoinC, WCoinP, GoblinPoint)` is the **real, live balance table** these three currencies read/write against on the GameServer side — found via `INFORMATION_SCHEMA.COLUMNS` search for `%Coin%` across every table, not assumed from naming alone. This directly confirms and closes the "unconfirmed positional guess" caveat carried since Phase 12: `CustomXShop.txt`'s `Coin0`/`Coin1`/`Coin2` and `CashShopPackage.txt`'s `CoinValue` almost certainly read/write against exactly these three `CashShopData` columns (still not proven with 100% certainty without GameServer source, but now backed by a real, matching three-column table rather than positional analogy alone).

**This is a separate three-currency system from the Portal's unified `WCOIN` `CurrencyCode`.** Per your explicit instruction, **no equivalence is assumed and no integration was built** — `AccountCurrency`/`WalletLedgerService` (the Portal's real economy, Phases 13-15) never reads or writes `CashShopData` in any way. If X-Shop/CashShop are ever wired into the Portal, this is the exact table a future integration would need to reconcile against, and the reconciliation question ("is 1 WCoinC = 1 Portal WCOIN, or a separate ledger entirely") remains **open, not decided here**.

## `appl_days` gap — investigated further, remains unresolved

Checked `DmN_Account_Logs` (a real, generically-named account activity log table in the legacy system) as a possible alternate source for the 8 accounts' missing GameServer-side creation timestamps — **0 rows, no help**. The gap noted in `pre-beta-account-review.md` (8 of 9 `MEMB_INFO` rows have a blank `appl_days`) remains a genuine `UNKNOWN`, not resolved by this pass. Recommend either GameServer source access or accepting it as a permanent data gap for pre-existing test accounts before Open Beta.
