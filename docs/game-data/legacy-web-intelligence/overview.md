# Legacy web intelligence — overview

Read-only file audit of the vendor-supplied legacy portal/AdminCP, mined for
real evidence of MU Account ↔ Character ↔ SQL Server structure before
attempting live schema discovery. Nothing here was executed, connected to,
or modified — every finding below is a file the audit *read*.

## What was found and where

The legacy source is **not** inside `mu-bloodmoon-v1` — the repo only holds
generated catalog metadata (`docs/current-web-source-catalog.md`,
`docs/current-admincp-catalog.md`, `references/web-source-current/`,
`knowledge/audit/source-inventory.json`), all of which describe it as an
external backup. The real PHP source was located at two separate archive
locations on this machine:

- `D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\extracted\backup-7.16.2026_12-53-47_mubloodxz\homedir\public_html\` (2026-07-16 snapshot, already extracted)
- `D:\MU\backups\bloodmoon-production\public_html-legacy-pre-nuxt-20260816.tar.gz` (2026-08-16 snapshot, read via streaming `tar` extraction, nothing written to disk)

Both identify as **DmN MuCMS / PG MuCMS** (composer package `pulsep1986/free-mu-cms`, confirmed by `system/dmn.php` and a `'PG MuCMS'` user-agent string in `model.donate.php`), a custom PHP MVC framework, PHP ≥ 8.1, connecting to a real Microsoft SQL Server via **`pdo_dblib`** (`constants.php`'s `DRIVER` constant) — not MySQL. Server name in this install: `MuBloodMoon` / `mubloodxz` (cPanel account). Findings from both snapshots are treated as the same codebase at two points in time — not verified byte-identical, but consistent everywhere both were checked.

**`SECRET_PRESENT = YES`** — `public_html/constants.php` (both snapshots) contains a live SQL Server host/port, `sa` username/password, AdminCP username/password/PIN, and a security salt. No value is reproduced anywhere in this documentation set.

**Raw source provenance**: both archives are hashed and registered in
`references/game-data/legacy-web-source/provenance.json` — SHA-256,
size, collection date, and exactly which docs derive from which archive.
Neither archive is copied into git (per this repo's existing policy); this
record is the SOURCE → RAW → NORMALIZED → DERIVED chain for everything in
this directory. Classification: both **RAW_COMPLETE**. See that
directory's README for the one gap closed by this registration
(`bloodmoon-production-20260816` had no prior provenance record at all).

## The single most important structural fact

This CMS does **not** hardcode reset/master-level/ranking table or column
names in most of its query-building code. It reads them at runtime from
`application/config/table_config.json` (a per-server override merged with
a `DEFAULT` block), which itself ships **six different named presets**
(`igcn`, `igcn s10+`, `ex-team`, `mu engine`, `x-team/louis/mudevs/projectgamers`,
`z-team`, `titanstech` — see `pre_defined_table_config.json`) for different
MU server engine families. What is reported as evidence throughout this
document set is specifically **what this install's live `table_config.json`
`DEFAULT` block actually points to** — real evidence for this server's
database, not a universal MU Online constant. This is exactly why the rest
of this document set is careful to say "LEGACY_CODE_OBSERVED for this
install," never "true of all MU servers."

## Files in this set

- `account.md` — MEMB_INFO/MEMB_STAT, login, ban, credits-editor lookup.
- `character.md` — the `Character` table, `AccountCharacter`, and the
  account↔character join.
- `rankings.md` — the four (really five, including Duel) ranking tables.
- `guild.md` — `Guild`/`GuildMember`, Castle Siege ownership tables.
- `inventory-warehouse.md` — blob storage format, WRITE_PATH-flagged.
- `currencies.md` — the two parallel currency subsystems.
- `online-status.md` — the four distinct "online" concepts, kept separate.
- `stored-procedures.md` — every real `EXEC` call site found.
- `query-catalog.md` — the consolidated table/column/join reference.

## Classification discipline (unchanged from Phase 1/2A rules)

Every table/column below is **LEGACY_CODE_OBSERVED** or **LEGACY_CODE_CONFIRMED**
(the code demonstrably builds and executes a query using that name) — never
promoted to `SCHEMA_CONFIRMED` in `docs/game-data/schema/`, because that
category is reserved for real, live introspection of the current SQL
Server, which has not happened. The vendor may have changed schema/engine/
config since any backup was taken. See `docs/game-data/schema/README.md`
for the full classification set and `discovery/mu-schema-discovery-v2.sql`
for the narrowed, targeted discovery query this evidence now makes
possible.
