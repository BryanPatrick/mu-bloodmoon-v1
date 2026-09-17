---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — economy data map

Covers the currency/item/marketplace tables actually confirmed this
round. This is narrower than the full in-game economy (drop tables,
crafting, jewel systems are out of scope for GameBridge and not mapped
here) — see `docs/README.md`'s roadmap for what's still `MISSING`.

## `warehouse` (CONFIRMED)

Per-account item storage (the "personal warehouse" / stash). Keyed by
`AccountID` (`logical-relationships.md`). Touched by `bm_PurgeGameAccount`
(hard delete on purge, `account-data-map.md`) — real proof: `labacct04`'s
warehouse rows confirmed absent post-purge. Not touched by
`bm_AnonymizeGameAccount` — items are left in place on anonymize, only
identity fields are pseudonymized/tombstoned elsewhere; this is a real
design choice worth flagging: an anonymized account keeps its warehouse
contents (STRONG_EVIDENCE this is intentional — anonymize is meant to
preserve game-state/economy integrity while removing identity, whereas
purge is meant to remove everything).

## `CashShopData` (CONFIRMED)

Per-account CashShop-purchased item/currency state. Keyed by `AccountID`.
Touched by `bm_PurgeGameAccount` (hard delete, real proof against
`labacct04`); not touched by `bm_AnonymizeGameAccount`, same reasoning as
`warehouse` above.

## `CustomMarketShop` (CONFIRMED — real 8-column shape)

`ItemGUID`(PK)/`AuthCode`/`SellerAccount`/`SellerName`/`Price`/
`PriceType`/`Item`(varbinary(16), the serialized item blob)/`Tax`. No
status/active/sold/cancelled column — a listing's mere existence in this
table is the only "active" signal (CONFIRMED via real production
read-only check this session, replacing an earlier VERIFY_BEFORE_USE
assumption — see `stored-procedures.md`/`account-data-map.md`). This is
why both `bm_AnonymizeGameAccount` and `bm_PurgeGameAccount` **block** on
any existing row for the seller rather than attempting to cancel/clear
listings themselves — the procedures have no logic to unwind a listing
(refund the buyer's escrow, return the item), so a seller with active
listings must resolve them through normal gameplay first.

## `MEMB_INFO.AccountLevel` as a VIP/economy signal (CONFIRMED)

Not itself a currency, but the integer column that gates VIP-tier
benefits — the entire reason GRANT_VIP/SYNC_VIP_TIER exist. See
`account-data-map.md` for full behavior.

## `Add_Credits` procedure (STRONG_EVIDENCE, not traced)

A currency/credit-grant utility procedure outside the `WZ_*`/`DmN_*`
families (`stored-procedures.md`). Plausibly the original CashShop or
donation top-up path. Not called by GameBridge, not traced through code
this round.

## Legacy `DmN_*` marketplace/payment tables (CONFIRMED dormant)

`DmN_Market*`, `DmN_2CheckOut_Transactions`, `DmN_Donate_Transactions`,
`DmN_PagSeguro_Transactions`, `DmN_Vip_*` — all real tables, all
confirmed **zero real transactions** in the restored snapshot examined.
See `legacy-unknown-structures.md` for the full inventory and dormancy
evidence.

## Phase K — X-Shop/CashShop deep dive (2026-08-30)

### `PixPayments` — a real, previously-undocumented payment table (CONFIRMED to exist)

`PixPayments(Id, TxId, Account, Valor, PixPgmtAprovado, PixResgatado,
DataCriacao, DataPagamento)` — a real table living directly in the
GameServer schema (not the DmN CMS, not the Portal). Name and column
shape (`TxId`/`Valor`/`PixPgmtAprovado`="PIX payment approved"/
`PixResgatado`="PIX redeemed") are unambiguous: this is a **Brazilian
PIX instant-payment integration**, built directly against the game
database, independent of both the legacy DmN payment-gateway family
(`legacy-unknown-structures.md`) and the Blood Moon Portal's own payment
system. **0 real rows** in this snapshot — never used, or used and since
cleared. No stored procedure references it (checked against all 90
cataloged procedures). **UNKNOWN** what wrote/reads it — most likely a
GameServer-adjacent tool or a since-removed integration; not traceable
further without the writer's source, which is not available locally.
**This is a genuinely new discovery this round** — flagged for product
awareness even though currently dormant, since it represents a real,
undocumented payment surface directly against game data.

### `CashShopInventory` / `CashShopPeriodicItem` (CONFIRMED shape, 0 real rows)

`CashShopInventory(BaseItemCode, MainItemCode, AccountID, InventoryType,
PackageMainIndex, ProductBaseIndex, ProductMainIndex, CoinValue,
ProductType, GiftName, GiftText)` — a real, per-account pending-purchase/
gift-delivery table (`GiftName`/`GiftText` strongly imply this is where
a CashShop purchase or gifted item waits before being delivered
in-client). `CashShopPeriodicItem(ItemSerial, Time)` — a real table for
time-limited/rental items, but has **no `AccountID` or any other
confirmed join key** — its relation to `CashShopInventory`/an account is
plausible (`ItemSerial` likely correlates to an item minted via
`CashShopInventory`) but not proven this round. **UNKNOWN relation** —
flagged rather than guessed; this is why neither `bm_AnonymizeGameAccount`
nor `bm_PurgeGameAccount` touch `CashShopPeriodicItem`.

### `LuckyCoin` / `LuckyItem` (CONFIRMED shape)

`LuckyCoin(AccountID, LuckyCoin)` — a real, simple per-account currency
balance, 0 rows in this snapshot. `LuckyItem` — a **real, populated
catalog table (15 rows)**, distinct from `LuckyCoin` — column shape not
individually captured this round beyond confirming its existence and row
count; STRONG_EVIDENCE it is the drop/reward table `LuckyCoin` balances
are spent against, not confirmed via a proven join.

### `DmN_Shop_Harmony` / `DmN_Shop_Sockets` — a real, populated legacy catalog with zero real purchases

Both are real, substantially populated tables (267 and 136 rows
respectively — item-harmony options and socket definitions, each with a
real `price` column) living in the DmN CMS namespace
(`legacy-unknown-structures.md`). **This refines the "fully dormant"
conclusion from the prior round**: the catalog itself was built out with
real, priced content, but the actual purchase/transaction tables
(`DmN_Shop_Logs`, `DmN_Shop_Card`, `DmN_Shop_Credits`) are all 0 rows —
meaning this specific legacy shop was stocked but never sold through, as
far as this database shows.

### `Add_Credits` procedure — now CONFIRMED, not just STRONG_EVIDENCE

Real dependency data (`stored-procedures.md`) confirms `Add_Credits`
writes to `DmN_Shop_Credits` — the legacy DmN CMS's own credit ledger,
DEAD per the payment-gateway zero-transaction evidence. **Not the live
CashShop currency** (`CashShopData.WCoinC`/`WCoinP`/`GoblinPoint`, which
`WZ_SetCoin` governs instead — also now CONFIRMED via the same
dependency data).

## What this document does NOT claim

Item drop tables, crafting/combination systems, jewel/chaos-machine
mechanics, and the in-game shop (NPC) price tables were not inventoried
this round — `MISSING` in `docs/README.md`'s roadmap, not silently
assumed complete here.
