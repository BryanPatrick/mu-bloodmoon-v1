---
status: LIVING_DOCUMENT
category: payments
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# Payment surfaces — full comparison and PixPayments deep audit (Phase L, Parts 3-4)

Three independent payment-adjacent surfaces exist across this project.
This document maps all three so a future payment-integration phase does
not accidentally build a fourth, or wire into the wrong one.

## Part 3 — `PixPayments` deep audit

Real schema (confirmed via `sys.columns`/`sys.indexes`, `bloodmoon_gameserver_lab`):

| Column | Type | Nullable | Default | Note |
|---|---|---|---|---|
| `Id` | `INT IDENTITY` | NOT NULL | auto-increment | PK (`PK__PixPayme...`) |
| `TxId` | `BIGINT` | NOT NULL | none | The PIX transaction ID — no unique index, duplicates are not prevented at the DB level |
| `Account` | `VARCHAR(20)` | NOT NULL | none | Wider than the usual login field (`VARCHAR(10)`) — unexplained, possibly over-provisioned rather than meaningful |
| `Valor` | `DECIMAL(10,2)` | NOT NULL | none | The payment amount |
| `PixPgmtAprovado` | `BIT` | NOT NULL | `0` | "PIX payment approved" flag |
| `PixResgatado` | `BIT` | NOT NULL | `0` | "PIX redeemed" flag — distinct from approved, suggesting a two-step approve-then-redeem/deliver flow |
| `DataCriacao` | `DATETIME` | NOT NULL | `GETDATE()` | Row creation time |
| `DataPagamento` | `DATETIME` | NULL | none | Populated only once paid |

**No foreign keys, no unique index beyond the PK, no index on `Account`**
(a lookup by account would be a full table scan — moot at 0 rows, a real
gap if this table is ever revived). **0 real rows** in the restored
snapshot. **Zero stored procedures reference it** (confirmed across all
90 real procedures via `sys.sql_modules` full-text search).

### Writer/reader — resolved this round (Phase L)

A thorough local search (all of `D:\MU\`, every sibling project, the
newly-found legacy CMS source, application code by extension) found:

- **The real `PixPayments.sql` `CREATE TABLE` script** exists in two
  identical extracted GameServer DB snapshots outside this repository
  (`Deploy\Predeploy-Snapshots\...\MuServer-stage\DB\All SQL Scripts\PixPayments.sql`,
  `MU-Server\Lab\drop-validation\...\PixPayments.sql`) — confirms this
  is real, deliberate schema, not a lab artifact.
- **No application code anywhere references `PixPayments` by name**, or
  by its distinctive columns (`PixPgmtAprovado`/`PixResgatado`).
- **A real, separate PIX integration WAS found and ruled out**: the
  legacy `hostbr-web` CMS contains a genuine, functioning **Gerencianet
  PIX payment-gateway plugin** (`application/plugins/gerencianet/plugin.php`,
  `model.gerencianet.php` — real API calls: `createCharge`, a webhook
  `notify()`, QR-code generation). Its writes were traced and land in
  its **own** tables — `DmN_Donate_Gerencianet_Orders`/
  `_Transactions`/`_Packages` (part of the already-catalogued
  `DmN_Donate*` family, DEAD, 0 rows) — **not** `PixPayments`. This is a
  genuine, independent PIX code path that demonstrably writes elsewhere.

**Reconfirmed, 2026-08-31 (provider-web second pass)**: a much broader,
deeper re-read of the legacy `hostbr-web` `application/` tree — including
all `plugins/` (8 newer payment-gateway plugins beyond Gerencianet:
`mercadopago`, `xendit`, `coinbase`, `binance`, `stripe`, `paghiper`,
`nganluong`) and every built-in gateway in
`controllers/controller.payment.php` (PayPal, PayCall, PaymentWall,
2CheckOut, Interkassa, PagSeguro, Fortumo, CuentaDigital, Paygol) — still
found **zero** references to `PixPayments` anywhere, exact-case and
loose. Full gateway-by-gateway detail (including a real security
assessment of each callback's verification quality):
`docs/legacy/provider-web/payments-legacy.md`. No new writer candidate
found; the conclusion below is unchanged, now with a materially broader
search behind it.

**Classification: DORMANT.** Real, deliberately-designed table
(`Valor`/`PixPgmtAprovado`/`PixResgatado` are specific, purposeful names,
not generic placeholders), zero real usage evidence anywhere locally.
**PIXPAYMENTS_STATUS = DORMANT, writer/reader = UNKNOWN** (no local
evidence of either, and the Gerencianet plugin is confirmed NOT the
writer).

## Part 4 — payment architecture recommendation

**Question: should `PixPayments` be retired, become a compatibility
sink, be integrated, be migrated, or be removed only after proof of
inactivity?**

**Recommendation: none of the above yet — treat it as PRESERVE_UNTIL_DECIDED,
not decided by row count alone**, per Bryan's explicit instruction. Real
reasoning:

- Row count (0) alone would suggest "just drop it," but this table's
  column shape is specific and purposeful enough that it was plausibly
  built for a real, planned integration that never shipped (or shipped
  briefly, cleanly, with no residue — also possible, can't be ruled out).
- No writer/reader was found, but the search was necessarily bounded to
  local files — the production GameServer's compiled binary is packed
  and could not be searched for readable references (same limitation
  documented in `docs/vip/wz-setaccountlevel-coexistence.md`).
- If a future payment phase wants a PIX-based recharge/donation path, this
  table's shape (`TxId`/`Valor`/approved+redeemed two-step flag) is a
  reasonable starting point to EITHER adopt directly or deliberately
  supersede — but that decision belongs to the payment-phase design work
  itself, not to this audit.

**Do not build a new payment table without first checking this one** —
that's the one concrete, actionable recommendation this round makes.

## Comparison — all three payment surfaces, end to end

| | **Current Portal** | **Legacy DmN CMS** | **GameServer `PixPayments`** |
|---|---|---|---|
| Source of truth | `Order`/`RechargeIntent` + Mercado Pago webhook, reconciled into `AccountCurrency`/`WalletLedgerEntry` | `DmN_Donate*`/`DmN_2CheckOut*`/`DmN_PagSeguro*`/`DmN_Donate_Gerencianet_*` tables, driven by legacy PHP cron/webhook code | Unknown — no confirmed writer |
| Writer | `apps/api` (real, live, current production path) | Legacy PHP application code (confirmed present locally, deployment status on production unconfirmed) | UNKNOWN |
| Reader | `apps/api`/`apps/web` | Legacy PHP application code | UNKNOWN |
| Account link | Portal `Account.id` (real FK) | `memb___id`/`account` string columns, no FK (same no-hard-FK reality as the rest of the GameServer schema) | `Account VARCHAR(20)`, no FK |
| Payment ID | Mercado Pago's own reference, stored on `Order`/`RechargeIntent` | Provider-specific (`TxId`/`order_hash`/etc, varies per gateway sub-table) | `TxId BIGINT` |
| Amount | `WalletLedgerEntry.grossAmount`/`netAmount`/`taxAmount`, real decimal precision tracked | `credits`/`credits2`/`credits3` (legacy `DmN_Shop_Credits`) or gateway-specific amount columns | `Valor DECIMAL(10,2)` |
| Status | Real order/recharge state machine (`apps/api` Prisma models) | Per-gateway status/payment_type columns, mostly `UNKNOWN_UNOBSERVED_ENUM` (0 rows — see `privacy-data-map.md`) | `PixPgmtAprovado`/`PixResgatado` bit flags |
| Security | Real webhook signature verification (Mercado Pago), real Portal auth | Unknown/unverifiable — legacy vendor code, not audited for injection/auth weaknesses this round beyond the general finding in `legacy-unknown-structures.md` (no stored-procedure boundary, all raw app-layer SQL) | N/A (dormant) |
| Chargeback support | Real, part of the current financial-retention design (`docs/payments/financial-retention-policy.md`) | Unknown | N/A |
| Current usage | **ACTIVE — the only real, live payment path** | DEAD (0 real rows across every gateway table, confirmed both Phase K and this round) | DORMANT (0 rows, no confirmed writer) |
| Risk | Low — actively maintained, tested | Low in its current 0-row state; MEDIUM if the legacy panel is still deployed and reachable (unconfirmed) — see the security findings in `legacy-unknown-structures.md` | Low while dormant; genuinely unknown if reactivated |

**Goal achieved**: this table makes explicit that there is exactly ONE
real, live payment source of truth today (the Portal). The other two are
either confirmed dead (legacy CMS gateways) or dormant-with-unknown-history
(`PixPayments`) — a future payment phase should build on the Portal path
and treat both others as historical/reference material, not integration
targets, unless a specific decision says otherwise.
