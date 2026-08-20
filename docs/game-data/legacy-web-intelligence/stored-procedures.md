# Stored procedures — legacy evidence

Full-corpus scan (2,651 PHP files, both backup snapshots) for `EXEC`/`CALL`/
`sp_`/`usp_` call sites. None of the entries below are hypothetical — each
is a real call site in the legacy web app. **None were executed.**

| Procedure | Call site(s) | Inputs | Purpose (best understanding) | Read/Write |
|---|---|---|---|---|
| `DmN_Check_Acc_MD5` | `model.account.php` (registration, password reset), `model.admin.php::update_account_info()` | `:user, :pass` | Computes/validates the game's legacy MD5 password-hash format so PHP can write a compatible `MEMB_INFO.memb__pwd`. **This install's `constants.php` sets `MD5 = 0`**, so this call path is dead code in production at high confidence — the branch that would invoke it never executes. | READ-only / computational (returns a `result` column) |
| `WZ_GetItemSerial` | `model.shop.php::generate_serial()` | none | Fetches the next unique item serial when the web app fabricates a new item (webshop purchase, admin "Add Item to Warehouse") | Likely WRITE-adjacent (advances a server-side sequence); internal implementation UNKNOWN — never executed by this audit |
| `WZ_GetItemSerial2` | `model.shop.php::generate_serial2($count)` | `$count` | Batch variant of the above | Same as above |
| `WZ_PeriodItemInsert` | 7 plugin models (gift codes, VIP rewards, wheel of fortune, achievements, battle pass, level rewards, accumulated donation rewards), gated by `check_if_table_exists('T_PeriodItemInfo')` | `guid, name, index, effectType, effect1, effect2, time, expiryDatetimeString` | Registers a time-limited item/buff for a character, enforced server-side by the game engine | WRITE (registration/INSERT-style, confirmed by sibling direct-INSERT code paths in the same functions) |
| `IGC_PeriodItemInsertEx` | Same 7 plugin models, gated by `check_if_table_exists('IGC_PeriodItemInfo')` instead | `guid, name, itemType, index, effectType, effect1, effect2, serial, time*60, currTime, currTime+time*60` | Same purpose as above, for the "IGC" game-server codebase variant | WRITE |
| `WZ_CONNECT_MEMB` | Offered (installable/droppable) by an AdminCP setup routine; **no web-app call site executes it** | — | Almost certainly invoked by the game server/connect-server process (not the web app) to set `MEMB_STAT.ConnectStat = 1` on login | Inferred WRITE, not observed executing |
| `WZ_DISCONNECT_MEMB` | Same setup routine, same non-web-app-invoked pattern | — | Counterpart to the above, `ConnectStat = 0` on logout | Inferred WRITE, not observed executing |

## Related DDL-capable admin routines (not stored procedures, but same risk class)

- `model.admin.php::check_procedure()` — read-only (`SELECT * FROM sysobjects WHERE type='P' AND name='<proc>'`).
- `drop_procedure()` / `insert_sql_data()` — **DDL-executing** (`DROP PROCEDURE ...` / arbitrary SQL sourced from a bundled setup JSON file, `setup/data/procedures/required_stored_procedures[20.05.2015].json`). Install-time/administrative only — not part of normal request handling.
- `dropTriggerPKCount()` — drops a SQL Server **trigger**, `[dbo].[DmN_Update_Killer_Ranking]`.

None of the above were invoked, and none should ever be invoked by this
project's own GameBridge Agent, which is a pure `SELECT`-only reader with
no `Execute*NonQuery`-capable method on its interface at all (see
`docs/game-data/security-boundaries.md`).

## Confidence

Procedure names, parameters, and call sites: LEGACY_CODE_CONFIRMED (quoted
verbatim). Their internal T-SQL bodies were not present in this PHP
backup, so "purpose" and read/write classification beyond what's stated is
informed inference from naming and call context, not confirmed procedure
bodies.
