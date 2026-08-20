# SQL discovery — live, 2026-08-20

`sourceType: REAL_LIVE_SQL_SERVER` (see `metadata.json`). Read-only,
metadata-only capture against the real production MU game database
(`MuOnline`, SQL Server 2014), via the pre-existing `bm-sql` RemoteOps
bridge — not a new connection improvised this session, and not a database
backup/copy. `GAME_WRITES_PERFORMED = 0`, confirmed by the bridge's own
`self-test` (`CanInsert/CanUpdate/CanDelete/CanExecute/CanAlter` all `0`).

## Chain

- **raw/** — 9 files, exact tool output (health check, self-test, column
  lists, PK/unique keys, the full foreign-key inventory, collations, live
  row counts, stored-procedure existence check). Zero player/account data
  rows anywhere — every query is against `sys.*` catalog views or a
  `GROUP BY` count.
- **normalized/real-schema.json** — the raw output consolidated into one
  structured per-table schema (columns, types, primary keys, notable
  notes).
- **derived/legacy-vs-real-comparison.md** — narrative comparison against
  `docs/game-data/legacy-web-intelligence/`'s findings: what was confirmed
  exactly, what was refined/corrected, and what turned out not to exist.

## Headline finding

The account↔character link (`Character.AccountID = MEMB_INFO.memb___id`)
is real and confirmed — but it is a **logical, application-level join**,
not a physical foreign key. The entire database has exactly one FK
(`CustomQuest.Name → Character.Name`). See `derived/legacy-vs-real-comparison.md`.

This is the evidence backing the promotions to `SCHEMA_CONFIRMED` /
`EVIDENCE_SOURCE: REAL_SQL_METADATA` in `docs/game-data/schema/`.
