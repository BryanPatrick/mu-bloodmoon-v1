---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — views, triggers, functions

Real inventory (CONFIRMED, `database-overview.md`): 2 views, 1 trigger,
0 user-defined functions found in the real restored copy.

## Views

### `Gens_Duprian` (STRONG_EVIDENCE)

Name pattern matches the `Gens_*` faction-system table family
(`Gens_Rank`, `Gens_Reward` — see `logical-relationships.md`). "Duprian"
and "Varnert" are the two opposing factions in MU Online's Gens
(faction/guild-alliance) system. **STRONG_EVIDENCE** this view surfaces
one faction's ranking/roster; definition not read this round.

### `Gens_Varnert` (STRONG_EVIDENCE)

The counterpart view for the other faction. Same confidence basis as
`Gens_Duprian` above.

## Triggers

### `DmN_Update_Killer_Ranking` (CONFIRMED, full definition read — Phase K)

Full real trigger body (via `sys.sql_modules`):

```sql
CREATE TRIGGER [dbo].[DmN_Update_Killer_Ranking] ON [dbo].[Character]
AFTER UPDATE
AS
BEGIN
  DECLARE @last_pk_count int, @Name varchar(50), @PKCount int, @new_pk int
  SET NOCOUNT ON;
  IF (UPDATE(PKCount))
  BEGIN
    SELECT @Name = Name, @PKCount = PKCount FROM inserted
    SELECT @last_pk_count = dmn_last_server_pk_count FROM Character WHERE Name = @Name
    IF (@last_pk_count < @PKCount)
    BEGIN
      SET @new_pk = @PKCount - @last_pk_count
      UPDATE Character SET dmn_last_server_pk_count = @PKCount, dmn_pk_count = dmn_pk_count + @new_pk
      WHERE Name = @Name
    END
  END
END
```

**Exact trigger event**: `AFTER UPDATE` on `Character`, gated by
`UPDATE(PKCount)` — it only runs its body when the native `PKCount`
column was part of the UPDATE's column list (SQL Server's `UPDATE()`
function, not a value comparison).

**Conditions**: only acts when the new `PKCount` is strictly greater
than the character's stored `dmn_last_server_pk_count` — a monotonic
guard against double-counting or against a PK-count reset being
misread as a PK increase.

**Tables/columns affected**: `Character.dmn_last_server_pk_count` and
`Character.dmn_pk_count` — **two real columns this audit had not
previously catalogued**, now added to `data-dictionary.md`. Both are
`DmN_`-prefixed despite living directly on the live, active `Character`
table (not in the separate DmN schema family) — a real, concrete example
of the legacy CMS's naming convention having been merged directly into
the native engine schema at some point in this server's history.

**Effect**: maintains a running, delta-accumulated player-kill counter
(`dmn_pk_count`) separate from the native `PKCount` column itself —
plausibly because `PKCount` can be reset (by an admin action or a
PK-penalty-decay mechanic) while `dmn_pk_count` is designed to only ever
increase, functioning as a lifetime/cumulative kill counter for a
"killer ranking" display. This is now **CONFIRMED** logic, not inferred
from the name alone.

**Whether it is still required / GameServer dependency**: `dmn_pk_count`
is not read by any of the 86 cataloged native procedures
(`stored-procedures.md` — table-level dependency check found no
procedure referencing `Character` for a ranking-read purpose that would
plausibly consume this specific column) nor by any Blood Moon code
(`apps/api`, GameBridge Agent — grep-confirmed). The most likely
consumer is the compiled GameServer/ConnectServer client-facing code
itself (an in-game "top killers" display), which is not available
locally to confirm. **STRONG_EVIDENCE it is still meaningful to the live
game, UNKNOWN whether anything currently reads it.**

**Risk if removed**: LOW on data integrity (removing the trigger would
simply stop `dmn_pk_count` from advancing; `PKCount` itself, the
native column, would be entirely unaffected) but **potentially
player-visible** if an in-game UI reads `dmn_pk_count` — removing it
without confirming that dependency first could silently freeze a
killer-ranking display. **Recommendation: do NOT remove** without first
confirming (via GameServer client-side source, not available this
round) whether anything reads `dmn_pk_count`.

**Security implications**: none identified — the trigger only reads/
writes columns on the same row being updated, no cross-account access,
no dynamic SQL, no privilege escalation surface.

**This trigger was NOT modified, disabled, or removed this round** — read-only
inspection via `sys.sql_modules`, matching the standing "do NOT activate
or modify production" rule (and this was read against the local lab
copy, not production, regardless).

## User-defined functions

**None found.** 0 scalar or table-valued functions exist in the real
restored copy (CONFIRMED via `sys.objects` inventory during discovery).

## Why this matters for GameBridge

None of the four `bm_*` GameBridge procedures touch any view, and none of
their target tables (`Character`, `MEMB_INFO`, `CustomMarketShop`,
`T_Friend*`, `warehouse`, `CashShopData`, `Guild`/`GuildMember`) carry a
trigger of their own in the real inventory — the single confirmed trigger
is scoped to `Character`, but only fires on `UPDATE` and the GameBridge
procedures' `Character` writes (rename-to-tombstone in
`bm_AnonymizeGameAccount`, delete in `bm_PurgeGameAccount`) were both
exercised against the real lab data in `lab-gamebridge-test.sql` without
any unexpected side effect — meaning if `DmN_Update_Killer_Ranking` did
fire, it did not break or block either procedure. Its output was not
independently inspected, so this is a "did not observe a problem," not a
"confirmed no interaction" — noted as **REVIEW_REQUIRED** for full
confidence.
