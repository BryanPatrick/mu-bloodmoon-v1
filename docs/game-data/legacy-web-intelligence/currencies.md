# Currencies — legacy evidence

Two parallel currency subsystems exist. Do not conflate them.

## (a) The "credits" system (types 1–9) — webshop/market/AdminCP credits editor

Table/column/key are **configurable per credit type**, via
`credits_{server}|db_{type}`, `table_{type}`, `credits_column_{type}`,
`account_column_{type}` (`helper.website.php`). This install's
`application/config/xml/credits_DEFAULT_conf.xml` (the only mapping file
present — medium-high confidence it reflects the live site, since no
per-server override exists in the backup):

| Type | Table | Account key column | Currency column |
|---|---|---|---|
| 1 | `CashShopData` (account DB) | `AccountID` | `WCoinC` |
| 2 | `CashShopData` | `AccountID` | `WCoinP` |
| 3 | `CashShopData` | `AccountID` | `GoblinPoint` |
| 4 | `DmN_Shop_Credits` (**web DB**, hardcoded not configurable) | `memb___id` + `server` | `credits4` ("WebZen") |

Balance query shape: `SELECT <credits_column> AS credits FROM <table> WHERE <account_column> = :user [AND server = :server for type 4]`.
Mutation shape (increase): `UPDATE <table> SET <col> = <col> + :credits WHERE <identifier> = :user`.
Mutation shape (decrease, clamped at zero):
`UPDATE <table> SET <col> = CASE WHEN (<col> <= 0) THEN 0 WHEN (<col> - <credits> <= 0) THEN 0 ELSE (<col> - :credits) END WHERE <identifier> = :user`.
Type 4 auto-creates a zero row on first lookup: `INSERT INTO DmN_Shop_Credits (memb___id, server) VALUES (...)`.

**Open question, not resolved by static code alone**: whether
`CashShopData.AccountID` actually stores the account **username**
(`memb___id`'s value) rather than a numeric id — inferred from the
absence of `AccountID` in the code's special-case GUID-substitution list,
not from an observed row. Worth confirming directly once live discovery is
possible (Section 2 of the schema catalog already flags the general
identity-column risk).

## (b) A separate `table_config.json`-driven lookup

`helper.website::get_account_wcoins_balance()`/`get_account_goblinpoint_balance()`
→ `model.character.php::get_wcoins()`, resolved through the same
multi-preset `table_config.json`/`pre_defined_table_config.json` used for
resets/rankings. The DEFAULT preset points at `CashShopData.WCoinC` (same
as system (a)'s type 1), but IGCN-family presets instead point at
`T_InGameShop_Point.WCoinC`/`WCoin`. **Which preset is actually active for
this live site cannot be determined from static files alone** — the
selection is admin-configured at runtime in a way not visible in this
backup. Flagged as lower confidence; needs live confirmation.

## In-game carried Zen (distinct from both systems above)

`Character.Money`, keyed by `AccountId` + `Name`:
`UPDATE Character SET Money = Money ± :money WHERE AccountId = :account AND Name = :char`.
The vault's Zen is the separate `Warehouse.Money` column
(`inventory-warehouse.md`).

## AdminCP Credits Editor

`credits_editor()` resolves the account via `acc_exists()` (see
`account.md`), then calls system (a) above for a chosen credit type, and
writes an audit row (`add_account_log()`) into `DmN_Account_Logs`.

## Cross-reference against `docs/game-data/schema/`

| Field | Prior status | New status |
|---|---|---|
| `CashShopData.WCoinC` | OBSERVED | **ALREADY_KNOWN + NEW_LEGACY_EVIDENCE** (key column `AccountID` now known, with the open-question caveat above) |
| `CashShopData.GoblinPoint` | OBSERVED | **ALREADY_KNOWN + NEW_LEGACY_EVIDENCE** |
| `CashShopData.WCoinP` | not previously catalogued | **NEW_LEGACY_EVIDENCE** |
| `DmN_Shop_Credits`, `T_InGameShop_Point` (alternate preset, unconfirmed active) | not previously catalogued | **NEW_LEGACY_EVIDENCE** |
| `Character.Money`, `Warehouse.Money` | not previously catalogued | **NEW_LEGACY_EVIDENCE** |
