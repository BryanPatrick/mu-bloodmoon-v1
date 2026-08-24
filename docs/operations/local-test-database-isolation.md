# Local test database isolation (Phase 3D-B Part 0)

## The incident this responds to

On 2026-08-24, during the Launcher Foundation phase, a `prisma migrate
reset --force --skip-seed` was run against the shared local MySQL database
`bloodmoon_local`, following a convention from earlier single-session
phases (3A/3B) that treated it as always-safe disposable test/e2e fixture
data. At the time, a second, concurrent agent session ("Codex") was
actively developing production provisioning work (Phase 3C/3D-A) against
the same database. Whether the reset destroyed any real state Codex
depended on was never verified before the reset ran -- it was recognized
only afterward, and work stopped immediately pending review. See
`docs/accounts/unified-registration.md` and the project's own incident
record for the full factual account; this document only defines the fix.

## The fix: one MySQL database per session that resets destructively

Any session that runs destructive local-DB operations (`prisma migrate
reset`, manual `DELETE`/`DROP`, disposable-DB test fixtures) now targets
its **own** MySQL database, never the one another concurrent session might
depend on.

```
CLAUDE_LOCAL_DB   = bloodmoon_local_claude
CODEX_LOCAL_DB    = bloodmoon_local            (unchanged, Codex's own)
CODEX_LOCAL_DB_CONFLICT = REMOVED
```

`bloodmoon_local_claude` is created via
`references/ops/local-db-isolation-20260824/create-claude-local-db.sql` --
reuses the existing `bloodmoon` MySQL login (same DPAPI-stored credential
already on this machine), granting it rights on a **second**, new
database only. It does not touch `bloodmoon_local`, its data, or its
existing grant in any way. The `bloodmoon` MySQL user has no
`CREATE DATABASE` privilege (confirmed via `SHOW GRANTS FOR
CURRENT_USER()` -- scoped to `ALL PRIVILEGES ON bloodmoon_local.*` only),
so this script must be run by a human with broader local MySQL access; it
cannot be executed by an agent session.

## Convention going forward

- Any Claude Code session in this repo doing destructive local-DB test
  work points `E2E_LOCAL_MYSQL_URL` (and `DATABASE_URL` for e2e specs, via
  `apps/api/test/support/disposable-mysql.ts`'s existing env-var
  short-circuit) at `bloodmoon_local_claude`, never `bloodmoon_local`.
- Before running `prisma migrate reset` or any other destructive operation
  against a shared local database, check `git status` for concurrent
  uncommitted work by another session, and treat "another session might
  depend on this database's contents" as the default assumption, not the
  exception -- this is what the incident above was missing.
- Tests must not assume a freshly reset database. Every fixture uses
  randomly-seeded usernames/emails/ids (already the established pattern
  after the Phase 3B `GameAccountIdentity` hardcoded-literal flake), so
  the same suite can run repeatedly against a persistent, un-reset
  database without manual cleanup between runs.

## Status as of this document

`bloodmoon_local_claude` creation is pending the user running the SQL
script above (outside this agent's available MySQL privileges). No
destructive operation has been run against `bloodmoon_local` since the
incident. `LOCAL_DB_ISOLATION` in the Phase 3D-B final report reflects
whatever the actual state is at report time -- this document describes the
design, not a claim that isolation is already in effect.
