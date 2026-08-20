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

## Files

- `v1-character-reset-master-level.md` — the reset/master-level fields.
- `v1-rankings.md` — the four ranking leaderboards.
- `join-keys-unknown.md` — the identity/join columns every real query needs
  and none of the above evidence confirms.

## What changes this catalog

Only a real, read-only schema discovery pass against the live SQL Server
(tables, columns, types, keys, relationships) may move a field from
INFERRED/UNKNOWN to CONFIRMED, or add a new OBSERVED entry from a newly
audited AdminCP behavior. That pass is future work, explicitly out of scope
for Phase 1 (see `docs/game-data/architecture.md`) — `SqlServerGameDatabaseReader`
in `apps/game-bridge-agent` stays `BLOCKED_BY_SCHEMA_DISCOVERY` until it
happens.
