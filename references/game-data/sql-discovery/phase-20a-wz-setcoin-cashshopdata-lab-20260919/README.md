# Phase 20A evidence — `WZ_SetCoin`, `CashShopData` and the other coin procedures (laboratory, read-only)

Chain: **SOURCE** (production backup, 2026-07-16) → **RAW** (catalog reads of the
restored copy, 2026-09-19) → **DERIVED** (`derived/findings.md`).

Nothing here was read from, executed on or written to a production system. No
vendor procedure was executed anywhere. No table row was selected.

## Source chain

| Step | Value |
|---|---|
| Original | Production `MuOnline` database, VPS `WIN-K82J9TU944D`, SQL Server 2014, `COPY_ONLY` backup finished 2026-07-16 09:57:58 |
| Local file | `D:\MU\MU-Server\Database\pre-web-migration-20260716-095739\MuOnline_COPY_ONLY.bak` — 705,024 bytes, **sha256 `570d225ade6455755965c912039128864bdfd7167f6b0f5a52e12d90631db682`** (recomputed 2026-09-19; the backup's README records it matched the VPS original) |
| Restored copies (local SQL Server 2022 Developer, `DESKTOP-9368KF9`, Windows authentication) | `bloodmoon_gameserver_raw_analysis` (created 2026-08-30 21:52, the unsanitized read-only source copy — **used for every read here**) and `bloodmoon_gameserver_lab` (2026-08-30 23:31, sanitized working copy — used only to confirm the same procedure hashes). Chain documented in `context/preservation/openbeta-untracked/docs/gameserver/database/lab-environment.md`. |
| Procedure creation date in the database | `WZ_SetCoin` created and last modified 2026-04-22 13:20:21 |

## Method and read-only guard

All reads went through `tools/RunLabQuery.ps1`, which **fails closed**:
allow-listed databases only (`bloodmoon_gameserver_raw_analysis`,
`bloodmoon_gameserver_lab`); refuses any query containing `INSERT/UPDATE/DELETE/
MERGE/DROP/ALTER/CREATE/TRUNCATE/GRANT/REVOKE/DENY/EXEC/EXECUTE/sp_/xp_/BACKUP/
RESTORE/…`; connects with `ApplicationIntent=ReadOnly`; verifies `@@SERVERNAME` is
the local lab machine before running. Queries (`queries/`) read only catalog views
(`sys.sql_modules`, `sys.columns`, `sys.indexes`, `sys.default_constraints`,
`sys.foreign_keys`, `sys.triggers`, `sys.sql_expression_dependencies`,
`sys.dm_db_partition_stats` for an approximate row count). The raw outputs keep
the helper's header line (`server=… database=… readonly=1`) as provenance.

## Files (sha256)

| File | sha256 | What |
|---|---|---|
| `raw/01-WZ_SetCoin.definition.sql` | `d0094f7b29022838863a9eb52bfdcbd09ab622a3bd484c6bf13afc5e95323c5c` | exact procedure text (trailing blank lines trimmed) |
| `raw/02-coin-object-inventory.txt` | `6a3a5875a33a21af0c6614b5ab16b146d43ada4e7d7db5e317a97d4847127c2d` | every object whose name contains "Coin" |
| `raw/03-CashShopData.columns.txt` | `cba9dd52c52114a0e7149910d6f371eafe54380324d00a261ff104118de89287` | columns, types, nullability, defaults |
| `raw/04-CashShopData.keys-indexes-constraints.txt` | `94b6f8ee7e56f024deb2527b4e309f4ebd2156ecaed3d1a0f4ede0e4da0a762e` | PK/indexes/checks/FKs/triggers/row count |
| `raw/05-modules-referencing-CashShopData.txt` | `9a8c359cb9e0281752762de9fcfe7cfb6584996adcc4f8f3ba500e25c5e95379` | the 11 modules that touch the table + other coin-column tables |
| `raw/06-related-vendor-procedures.definitions.txt` | `4905dbd98ded3bea83304331504258ed2a270ea9d0860679dad65d0417d5e0dd` | the other seven vendor procedures' text |
| `raw/10-ranking-reward-procedures.definitions.txt` | `fa99831136c993d654985446d87c47f7ef7a7dfe27462b185fe6dcbf04ed382a` | `WZ_SetRankingDay/Mon/Wek` text (read after the first pass; queries/q9) |
| `raw/07-CustomPlayToEarn.catalog.txt` | `67b48ca4faed805c9913f4dd2599a93505f65ef4307842e842a373ae239831ca` | second coin-bearing table (schema only) |
| `raw/08-definition-hashes.raw_analysis.txt`, `raw/09-definition-hashes.lab.txt` | `6091f9cf…b50a`, `72637df6…c655` | UTF-16 definition SHA-256 per procedure in each copy — **identical** |

The SQL-side hash of `WZ_SetCoin` is `FBE6AD49194B200BC4F495DDC29D73E32CAFADC7D79F4FA5AAE83CDB89B3F8C2`
(SHA-256 of the UTF-16 definition, as SQL Server stores it); the file hash above is
of the UTF-8 export, so the two differ by construction.

## Limits — what this evidence does not show

* It is the **2026-07-16** production state. `WZ_SetCoin` was not re-read on
  production (schema parity of other objects was verified on 2026-08-30, not this one).
* It shows **the database side only**. The closed-source GameServer's own SQL
  (how it *debits* a balance — no procedure exists for that) is not visible.
* Who *calls* each procedure, and whether the GameServer holds an in-memory copy of
  a balance, is not visible here.
