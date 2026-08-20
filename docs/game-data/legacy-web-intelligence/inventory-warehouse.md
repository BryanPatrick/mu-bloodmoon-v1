# Inventory / Warehouse — legacy evidence

**`WRITE_PATH = YES` throughout this entire document.** Nothing here was
executed, and nothing here should ever be reused or activated — Phase 1's
`GAME_WRITES_PERFORMED = 0` rule stands. This is documentation of a write
capability the legacy app has, not a feature to bring forward.

## Storage format

Both the vault and per-character inventory are **one binary blob**, not one
row per item:

| Concept | Table | Key column | Blob column | Extra |
|---|---|---|---|---|
| Warehouse/vault | `Warehouse` | `AccountId` (also `AccountID` in the one `INSERT`) | `Items` (`IMAGE`/`VARBINARY`) | `Money` (integer, vault's Zen) |
| Character inventory | `Character` | `Name` (or the config-driven char-id column) | `Inventory` (`IMAGE`) | — |

The blob is `str_split()` into fixed-size chunks (`item_size`, a per-server
config value not found as a static literal in this backup — likely
DB-backed server config, not present in the files audited). An empty slot
is a chunk of all `F` hex nibbles. Slot↔grid mapping is positional: an
8-wide grid wrapping every 15 rows (8×15 = 120 slots by default), with
item width/height read from the item's own encoded bytes for multi-slot
occupancy checks (`check_space()`).

Item serial (the item's unique id) sits at a fixed byte offset within its
chunk (offset 6, 8 hex chars; offset 32 for a second serial on 64-byte item
formats) and is generated via stored procedures — see `stored-procedures.md`.

## Admin "Warehouse Editor" write path

`controller.admincp.php::warehouse_editor()` / `del_item()` / `add_wh_item()`:

- Looks the account up by **username** (`Madmin::acc_exists()`).
- Refuses to edit while the account is online (`check_status()` — see
  `online-status.md`).
- **Add**: builds the item bytes in PHP, finds a free slot
  (`Mshop::check_space()`), splices it into the blob
  (`generate_new_items()`), persists via `update_warehouse()` (an
  `UPDATE Warehouse SET Items = 0x<hex> WHERE AccountId = :user`-shaped
  query).
- **Delete by slot**: logs to `DmN_Warehouse_Delete_Log` (web DB —
  `account, server, item, date, deleted_by_admin`) before blanking the
  slot and persisting.
- **Find/remove by serial**: `SELECT Name FROM Character WHERE (charindex(0x<serial>, Inventory) % 16 = 4)` /
  `SELECT AccountId FROM Warehouse WHERE (charindex(0x<serial>, Items) % 16 = 4)`
  — locates the chunk by scanning the blob for the serial's byte offset.

## Player self-service (also game-DB writes)

- `del_item()` — same blank-and-persist pattern.
- `transfer_item('game'|'web')` — moves an item between the in-game
  `Warehouse` blob and a **web-side holding table `DmN_Web_Storage`**
  (`item, account, server, expires_on, is_removed`) so items can outlive
  the in-game vault (e.g. across a wipe).
- `sell_item()` — moves an item into the marketplace table `DmN_Market`.

## Marketplace (web DB, closely coupled to warehouse code)

`DmN_Market` columns: `cat, item, price_type, price, seller, add_date, active_till, serial, serial2, has_luck, has_skill, lvl, highlighted, char, server, has_ancient, has_exe_1..9, is_sm/is_bk/is_me/... (class flags), price_jewel, jewel_type, item_name, item_id, item_password`.

Note: this is the **legacy** web's own marketplace — unrelated to and not
to be confused with `apps/api`'s current `PlayerMarketListing`/`GameBridgeJob`
marketplace system, which is a from-scratch, escrow-based design already
built for this project.

## Confidence

Table/column names and query shapes: LEGACY_CODE_CONFIRMED (quoted
verbatim). The concrete `item_size`/`wh_size` byte values: LOWER
CONFIDENCE — they're per-server runtime config not present as static
literals in the files audited, only the mechanism (fixed-size chunking) is
confirmed.

## Cross-reference against `docs/game-data/schema/`

Entirely **NEW_LEGACY_EVIDENCE** — inventory/warehouse was previously
`PARTIAL` (legacy-AdminCP-menu-names-only) in the Global Portal Audit, with
zero real column/table evidence. It remains firmly out of scope for any
read pipeline given the write-heavy, blob-based storage model here.
