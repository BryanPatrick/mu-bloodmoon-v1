---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read, not inferred from file names)
---

# Legacy provider-web CMS ("DmN CMS") — overview

This is the second, deeper investigation of the legacy PHP control panel
found at:

```
D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\extracted\backup-7.16.2026_12-53-47_mubloodxz\homedir\public_html\
```

A first, shallower pass (Phase K) produced
[`docs/current-web-source-catalog.md`](../../current-web-source-catalog.md)
— a file-count inventory only. This tree is the follow-up: real files
read, real behavior confirmed, cross-referenced against the GameServer
database catalogue built in `docs/gameserver/database/`.

Production status of this panel is **NOT_DEPLOYED** — see
[`docs/vip/wz-setaccountlevel-coexistence.md`](../../vip/wz-setaccountlevel-coexistence.md)'s
"Phase L Decision Closure — Decision 1" section for the three independent
read-only checks (filesystem, cron, database activity timestamps) that
established this. This backup is historical reference and a source-code
answer key for otherwise-unexplained legacy database tables — never a
description of current Blood Moon behavior.

## Headline finding: this panel and the GameServer share one physical database

`constants.php` (webroot): `HOST = '151.243.219.30:1433'`, `USER = 'sa'`,
`WEB_DB = 'MuOnline'`. `application/data/serverlist.json`'s single
configured server has both `db` and `db_acc` set to `"MuOnline"`, at the
same host as the game server itself. `application/helpers/helper.website.php::db()`
connects the `'web'`, `'account'`, and `'game'` cases to the same
`[HOST, USER, PASS]` triple, differing only in database name — and for
this single-server deployment, that name is `MuOnline` in every case.

**Consequence**: every `DmN_*` table this panel reads or writes lives in
the exact same `MuOnline` database as `MEMB_INFO`, `Character`, and the
rest of the native GameServer schema catalogued in
`docs/gameserver/database/`. This backup is therefore the single most
complete available source for "what actually wrote this `DmN_*` table" —
more authoritative than guessing from naming conventions alone.

## A second, complementary investigation of the same source exists

[`docs/game-data/legacy-web-intelligence/`](../../game-data/legacy-web-intelligence/)
(9 files) investigates the **same** `hostbr-web-20260716` backup, from an
earlier phase, with a **different focus**: schema/query discovery
(account/character/currencies/guild/inventory-warehouse/online-status/
query-catalog/rankings/stored-procedures) to support live SQL Server
schema work, rather than this tree's module-inventory/security/payments/
VIP focus. They are complementary, not duplicates — read both for a
complete picture of this source. See
[`docs/knowledge/cleanup-recommendations.md`](../../knowledge/cleanup-recommendations.md)
for the explicit note on why these weren't merged.

## What's in this tree

- [`module-inventory.md`](module-inventory.md) — every meaningful
  code area, classified ACTIVE_CONFIRMED / ACTIVE_POSSIBLE /
  LEGACY_BUT_USEFUL_REFERENCE / DORMANT / DEAD / UNKNOWN.
- [`database-mapping.md`](database-mapping.md) — the writer/reader
  resolution for the 8 previously-unknown GameServer tables this
  investigation was specifically asked to hunt for, plus the full
  `tasks/*.php` cron inventory.
- [`vip-legacy.md`](vip-legacy.md) — how this panel modeled VIP,
  and why it's structurally incompatible with (and irrelevant to)
  Blood Moon's own VIP architecture.
- [`payments-legacy.md`](payments-legacy.md) — all payment gateways
  found, old and new generation, with a real security assessment of each
  callback's verification quality.
- [`account-lifecycle-legacy.md`](account-lifecycle-legacy.md) —
  registration, password reset, the real `appl_days` mystery resolution,
  and the account-deletion admin capability.
- [`security-findings.md`](security-findings.md) — concrete findings,
  file+line, no secret values ever printed per the explicit constraint
  this investigation was run under.
- [`cron-and-background-jobs.md`](cron-and-background-jobs.md) — the
  full `tasks/*.php` inventory cross-checked against what's actually
  scheduled.
- [`useful-historical-reference.md`](useful-historical-reference.md) —
  old pricing/currency/VIP-tier structures, explicitly marked
  HISTORICAL_REFERENCE, never current Blood Moon policy.
- [`dead-and-dormant-components.md`](dead-and-dormant-components.md) —
  confirmed-dead code, orphaned files, and features this panel itself
  had already disabled before the migration.

## Method

A background research agent re-read the `application/` tree end-to-end
(not just file listings) with a much larger set of search terms than the
first pass, informed by everything learned about the GameServer schema
since (138 tables, 90 procedures, the real VIP/currency/payment column
shapes). Read-only throughout; nothing in the backup was modified.
