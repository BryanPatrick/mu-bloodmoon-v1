# Game data schema catalog

Versioned, append-only record of what is actually known about the MU game
server's SQL Server schema — and, just as important, what is *not* known.
Never contains real personal data or credentials.

## Classification

Every field is tagged with exactly one of:

- **CONFIRMED** — verified by a real, read-only schema introspection pass
  against the live database (table/column/type/nullable directly observed).
  Nothing is CONFIRMED yet — no live SQL Server access exists in this
  environment. This category exists for the discovery pass that happens
  once real access is available.
- **OBSERVED** — inferred from the legacy AdminCP's behavior (it reads/writes
  these values, so the table.column must exist), but not from a direct
  schema dump. This is the strongest category currently populated. Source:
  `docs/game-vps-sqlserver-transition.md`.
- **INFERRED** — a plausible guess based on typical MU Online schema
  conventions (e.g. "Character.Name is usually the display name column").
  **INFERRED never becomes production SQL automatically.** It exists only
  to give a real discovery pass somewhere to start looking.
- **UNKNOWN** — no evidence and no informed guess. Explicitly named so it is
  never silently assumed.
- **ABSENT_IN_CURRENT_SCHEMA** — actively checked via `REAL_SQL_METADATA`
  and confirmed **not to exist** on the live database. This is a resolved,
  negative finding — different from UNKNOWN, which means nobody checked.
  `C_PlayerKiller_Info`, `T_InGameShop_Point`, `T_MasterLevelSystem` hold
  this status as of 2026-08-20 (previously listed only as candidate/
  unconfirmed alternate-engine tables — that expectation is preserved
  below, not deleted, since the check itself is what has value).

A related but distinct tier, used in `docs/game-data/legacy-web-intelligence/`:
**LEGACY_CODE_OBSERVED** / **LEGACY_CODE_CONFIRMED** — real, executing code
in the vendor's legacy web/AdminCP application builds and runs a query
against a named table/column. This is stronger evidence than OBSERVED
(behavior-inferred from a live UI) but is **never** the same as this file's
CONFIRMED — the legacy code was a snapshot in time, and only live
introspection against the *current* SQL Server promotes something to
CONFIRMED here.

## Evidence source

Every classified field also has an `EVIDENCE_SOURCE`, one of:
`REAL_SQL_METADATA` (live introspection — outranks everything else; if it
ever contradicts a lower-ranked source, the contradiction is recorded, the
lower-ranked source is never silently deleted), `LEGACY_WEB_CODE` (this
directory's `legacy-web-intelligence/` sweep), `ADMINCP_OBSERVATION`
(Phase 1's original AdminCP-behavior evidence), or `GENERIC_MU_KNOWLEDGE`
(a named-but-unverified hypothesis — never used to write a real query, only
to point a discovery script at a candidate). No field in this catalog has
`REAL_SQL_METADATA` yet — `REAL_MU_SQL_CONNECTION` remains `NOT_TESTED`.

## Files

- `v1-character-reset-master-level.md` — the reset/master-level fields.
- `v1-rankings.md` — the four ranking leaderboards.
- `join-keys-unknown.md` — the identity/join columns every real query needs
  and none of the above evidence confirms.
- `discovery/` — Phase 2A's read-only discovery script and handoff
  instructions. No real SQL Server access exists in the environment that
  writes this repo, so discovery is a manual handoff: run
  `discovery/mu-schema-discovery.sql` against the real database yourself
  and share the (metadata-only, never player-data) results back.

## What changes this catalog

Only a real, read-only schema discovery pass against the live SQL Server
(tables, columns, types, keys, relationships) may move a field from
INFERRED/UNKNOWN to CONFIRMED, or add a new OBSERVED entry from a newly
audited AdminCP behavior. That pass is future work, explicitly out of scope
for Phase 1 (see `docs/game-data/architecture.md`) — `SqlServerGameDatabaseReader`
in `apps/game-bridge-agent` stays `BLOCKED_BY_SCHEMA_DISCOVERY` until it
happens.

## Update — real SQL discovery has now happened (2026-08-20)

The paragraphs above described the situation before this date — kept
verbatim, not edited, per the never-silently-overwrite rule. As of
2026-08-20: `REAL_MU_SQL_CONNECTION = PASS` (via the pre-existing `bm-sql`
RemoteOps bridge, not a new connection improvised — see
`docs/game-data/schema/discovery/README.md`), 22 tables have real
`SCHEMA_CONFIRMED` column-level evidence (see
`v1-character-reset-master-level.md`, `v1-rankings.md`,
`v2-account-guild-currencies-warehouse.md`, `join-keys-unknown.md`), and
account identity was further validated in
`docs/game-data/account-identity.md`. `SqlServerGameDatabaseReader` in
`apps/game-bridge-agent` still has not been updated to use any of this —
that remains a separate, not-yet-done implementation task, deliberately
deferred. Raw evidence for everything above:
`references/game-data/sql-discovery/`.

## Update — Phase 2B real account read models (2026-08-20)

The paragraph above is kept unedited, per the never-silently-overwrite
rule, but is now out of date on one point: `SqlServerGameDatabaseReader`
**has** been updated — 10 new account-scoped methods are real,
parameterized implementations. See
`docs/game-data/read-models/account-snapshot.md` for the full contract
and `references/game-data/sql-discovery/phase-2b-readmodel-validation-20260820/`
for real-data validation of every one of those 10 methods' query text.
Phase 1's original bulk-poll methods remain `BLOCKED_BY_SCHEMA_DISCOVERY`,
unchanged. This update also corrects one prior `OBSERVED`-tier assumption:
`RankingCastleSiege` has real `KillScore`/`DeathScore`/`CrownTime` columns,
not a generic `Score` (see `v1-rankings.md`), and confirms `RuudMoney`
(named in the legacy web sweep) does not exist on the real `Character`
table — `ABSENT_IN_CURRENT_SCHEMA`, `EVIDENCE_SOURCE: REAL_SQL_METADATA`.
