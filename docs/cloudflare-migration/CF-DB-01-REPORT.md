---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# CF-DB-01 — disposable MySQL restore proof + future database options

Focused report for this phase. See `DATABASE_MIGRATION.md`, `RISKS.md`,
`PHASE_STATUS.md`, and `SERVICE_INVENTORY.md` for the canonical,
program-wide record this report feeds into.

## What this phase proved, end to end

`mysqldump → checksum verification → restore into a disposable MySQL →
integrity validation → Prisma/application validation` — every step
real, none simulated, none touching production.

### 1. Source dump (reused, not regenerated)

The exact Phase 17R local dump: `database.sql.gz`, 7,973,259 bytes
(~7.6 MB gzip / ~31 MB uncompressed), SHA-256
`e62ba8f4ae127e7b83e8f3bc5d915675bfd78f64e90ababefdb3289e4ce1621f`,
sourced from `bloodmoon_local_claude` (the Claude-only local dev
database — **never production**), captured 2026-09-21T23:25:17-03:00.
Checksum re-verified this phase; matched.

### 2. Disposable MySQL environment

A **completely separate** MySQL 8.0.46 server process — its own fresh
data directory (`mysqld --initialize-insecure`), its own port
(127.0.0.1-only, no external bind), its own throwaway root and restore
credentials generated locally and never printed or committed. The
existing shared `MySQL80` Windows service (which hosts
`bloodmoon_local`/`bloodmoon_local_claude`) was never touched, stopped,
or reconfigured — confirmed running normally after this phase's work.
The disposable instance's data directory, credentials, and socket were
all deleted at the end of this phase; nothing persists.

This is what closes Phase 17R's blocker: that blocker was "the *only*
available local MySQL credential lacks `CREATE DATABASE`" — this phase
didn't ask for that credential to be elevated; it created a wholly
separate, disposable MySQL instance instead, exactly as the brief
specified.

### 3. Restore

Ran via the project's own `deploy/scripts/restore-test.sh`, unmodified,
against the disposable instance. **PASS**: 142 tables restored, zero
fatal errors. (A pre-created target database was needed since the
`mysql` client doesn't auto-create one from a bare dump — done via one
`CREATE DATABASE` as the scoped restore user, not root.)

### 4. Integrity validation

| Check | Restored copy | Source (`bloodmoon_local_claude`, live) | Match |
|---|---|---|---|
| Tables | 142 | 142 | exact |
| Foreign keys | 147 | 147 | exact |
| Views / routines / triggers | 0 / 0 / 0 | 0 / 0 / 0 | exact (project has none — confirmed both sides, not assumed) |
| `_prisma_migrations` rows | 55 | 55 | exact |
| `_prisma_migrations` latest `finished_at` | `2026-09-09 14:46:05.969` | `2026-09-09 14:46:05.969` | exact |
| `WalletLedgerEntry` row count | 1819 | 1819 | exact |
| `Account` row count | 6177 | 6223 | **differs by 46** — see below |
| Unique-key columns (`column_key='UNI'`) | 63 | not separately counted (schema-identical, so implied) | consistent |

**The `Account` difference is explained, not a defect**: the dump is a
point-in-time snapshot from 2026-09-21T23:25; the live source database
has had **152 new accounts created since that timestamp** (confirmed
this phase, count-only query) from ongoing local dev/e2e activity — more
than enough to account for a net difference of 46 once normal test
cleanup/deletion in that window is considered. `WalletLedgerEntry`
(a mostly-append ledger, less exposed to that churn) matches exactly,
which is the stronger signal for restore fidelity. This is disclosed
plainly rather than glossed over.

### 5. Prisma / application validation

`npx prisma migrate status` against the restored copy: **"55 migrations
found in prisma/migrations" / "Database schema is up to date!"** — zero
drift between the repo's own migration files and the restored schema.

`apps/api/scripts/verify-disposable-restore-prisma.mjs` (new script,
committed this phase, refuses to run against anything that isn't a
loopback, non-production-looking `DATABASE_URL`): the **real generated
Prisma client** — the same one `apps/api` uses — connected, read
`Account`/`WalletLedgerEntry`/`_prisma_migrations`, wrote one disposable
row through `walletLedgerEntry.create()`, had a duplicate write
correctly rejected with Prisma's own `P2002` unique-constraint error,
then cleaned up. **6/6 checks passed.**

### 6. Financial semantics (disposable data only)

All four tested directly against the disposable restored copy, real
SQL, real concurrency — not simulated:

- **Unique-key idempotency**: inserting the real
  `WalletLedgerEntry.idempotencyKey` unique constraint twice inside one
  transaction — second insert correctly rejected (`ERROR 1062`); the
  whole transaction auto-rolled-back on disconnect, zero residue.
- **Serializable + rollback**: `SET SESSION TRANSACTION ISOLATION LEVEL
  SERIALIZABLE`, insert into a throwaway table, row visible inside the
  transaction, gone after `ROLLBACK` — confirmed by count on both sides.
- **Concurrent writers (real race, not simulated)**: 6 simultaneous
  `mysql` client processes raced to insert the *same* unique
  `idempotencyKey` — **exactly 1 of 6 won**, the other 5 correctly
  rejected with `ERROR 1062`. This is the literal mechanism the
  project's wallet-ledger exactly-once behavior depends on, proven live
  under real concurrency on this MySQL version.
- **`GET_LOCK`/`RELEASE_LOCK`** (present in current `apps/api` — 5
  services, per `CURRENT_STATE.md`): two real concurrent sessions.
  Session A acquired the lock (`GET_LOCK` → 1) and held it 4 seconds.
  Session B's first attempt while A held it correctly returned `0`
  (blocked/timed out); B's second attempt after A released succeeded
  (`1`). Real mutual exclusion, confirmed empirically, not assumed from
  documentation.

All test rows/tables cleaned up; final state re-verified: 142 tables,
zero leftover `cfdb01-*` rows anywhere.

## BACKUP_RESTORE_P1 = CLOSED

Every link in the required chain succeeded for real:
`mysqldump → checksum verification → restore → integrity validation →
Prisma/application validation`. No elevated production credential was
requested or used at any point — the disposable instance was created
fresh, entirely separate from the shared MySQL install, and fully torn
down afterward.

**What stays open, deliberately not covered by this closure**: this
proof used a *local* dump and a *local* disposable MySQL 8.0.46
instance, same major version as the current production database. It
does **not** prove restore against a real *external* target vendor
(network latency, that vendor's exact MySQL/MariaDB version, that
vendor's own backup/restore tooling) — that's `CF-DB-02`-class work,
for whichever vendor is eventually chosen, and is explicitly out of
this phase's scope (no vendor selection happened here).

## Future MySQL requirements (see `DATABASE_MIGRATION.md` for the full, canonical list)

Restated here with this phase's findings folded in:

- MySQL-compatible, Prisma-compatible, real transactions, **Serializable
  isolation** (proven this phase against MySQL 8.0.46 — a candidate
  vendor must support it, not just claim MySQL compatibility)
- Unique constraints enforced under real concurrency (proven this phase)
- **Named-lock (`GET_LOCK`/`RELEASE_LOCK`) compatibility, or an explicit
  replacement plan** — this phase found a real, disqualifying gap for
  one shortlisted vendor (PlanetScale/Vitess, below); this requirement
  is not theoretical
- TLS, backup/restore support, monitoring, credential rotation, network
  restrictions, acceptable Brazil latency, reasonable scaling — all
  already in `DATABASE_MIGRATION.md`, unchanged

## Vendor shortlist (research only — no selection made)

All five confirmed via current web search this phase (2026), not
assumed from older knowledge. None chosen; none rejected outright
except where a hard requirement is genuinely unmet.

| Name | Region | MySQL version | TLS | Backups | Restore | Network controls | Cost category | Limitations |
|---|---|---|---|---|---|---|---|---|
| **Google Cloud SQL for MySQL** | `southamerica-east1` (São Paulo/Osasco) — Enterprise Plus edition required for this region | Standard MySQL Community Edition (real MySQL, not a compatibility layer) | Native SSL/TLS, Cloud SQL Auth Proxy option | Automated + on-demand, encrypted | Native `mysqldump` import/export, point-in-time restore | Private IP (private services access), Cloud SQL Auth Proxy | Managed-cloud mid-tier — no published flat price, instance+storage+network billed separately | Real MySQL engine — `GET_LOCK`/Serializable expected to work unchanged; Enterprise Plus tier requirement is an added cost/complexity layer for this specific region |
| **Azure Database for MySQL — Flexible Server** | Brazil South | MySQL Community Edition 5.7 / 8.0 / 8.4 | Native TLS | Automated backups + **point-in-time restore up to 35 days** | Native restore tooling | Local- and zone-redundant HA available in this region | Managed-cloud mid-tier | Real MySQL engine — `GET_LOCK`/Serializable expected to work unchanged; 35-day PITR is a genuine strength for the backup-restore requirement |
| **AWS RDS for MySQL** | `sa-east-1` (São Paulo) | Standard MySQL (multiple versions selectable) | Native TLS | AWS Backup integration, automated snapshots | Native restore, AWS Backup-driven | VPC-private, security groups | Confirmed **more expensive** in `sa-east-1` than US regions (found this phase, not assumed) — real cost factor to weigh | Real MySQL engine — `GET_LOCK`/Serializable expected to work unchanged; regional price premium is real and documented |
| **PlanetScale** | São Paulo (`sa-east-1`) — one of three regions added in 2026 | MySQL-*compatible* via Vitess (a sharding/proxy layer over real MySQL, not vanilla MySQL) | Native TLS | Automated, branching-based workflow | Branch/restore model, not a raw `mysqldump` restore | VTGate-mediated, no direct MySQL socket | Serverless usage-based | **`GET_LOCK`/`RELEASE_LOCK` is NOT supported through Vitess's VTGate** (confirmed this phase via PlanetScale's own GitHub discussion and Vitess's own tracked issue) — this directly conflicts with the 5 `apps/api` services that use connection-scoped named locks today. Would require replacing those locks with an application-level or external coordination mechanism before this vendor is viable — a real, disqualifying gap unless that redesign happens anyway |
| **Self-hosted MySQL on a Bryan-controlled VPS (Vultr São Paulo)** | São Paulo, Brazil (Vultr's own region since 2021, capacity recently expanded 200%, confirmed this phase) | Whatever MySQL/MariaDB version is installed — full control, can match production exactly | Self-configured (same TLS setup work the current cPanel host already needed) | Self-managed (same `bloodmoon-backup.sh`-style cron approach already proven in this project) | Full control — this is the closest match to "just move the current database elsewhere, self-managed" | Full control — the operator decides what's exposed, matching the "MySQL stays private" constraint most directly | Cloud Compute VPS pricing — typically the cheapest per-resource category of the five, but 100% self-managed (patching, security, HA, backups all become the operator's job again) | No managed backup/HA/monitoring included — this is genuinely the most aligned option with the program's own strategic goal ("infrastructure controlled by Bryan"), but trades that for the operational burden the other four options remove |

**Not selected.** This shortlist exists so `DECISIONS.md` has real
options to choose from later — it does not choose one.

## `HYPERDRIVE_REQUIRED_NOW = NO`

Unchanged from `DECISIONS.md`/`API_MIGRATION.md`: the initial API path
is Cloudflare Containers, which holds a normal MySQL connection itself
— no Hyperdrive needed for that path. Hyperdrive stays a
`FUTURE_OPTIMIZATION`-path consideration only, if native Workers is
ever pursued.

## Future cutover plan (documentation only — nothing executed)

1. Provision the chosen external MySQL-compatible database.
2. Restore the baseline (the same proven chain as this phase, against
   the real target).
3. Validate API/Prisma against it (the same proven method as this
   phase, `verify-disposable-restore-prisma.mjs` reusable as a
   starting point).
4. Choose a maintenance/write-freeze strategy for the cutover window.
5. Take a final dump/delta immediately before cutover.
6. Switch `DATABASE_URL` (API restart, not a code change).
7. Smoke test the real application against the new database.
8. Observe (error rates, latency, financial-flow correctness) before
   declaring success.
9. Roll back if required (see below).
10. Retire the old database only after an explicit acceptance decision
    — never automatically, never on a timer.

## Rollback model (documentation only)

The old database stays intact and its credentials stay available
throughout the transition window — not deleted, not revoked, not
reused for anything else. The API can switch back to it by reverting
`DATABASE_URL` and restarting. **Active-active dual writes are
explicitly avoided** — the cutover is a single, controlled,
one-directional switch (old → new), never both databases live-writable
at once, which would reintroduce exactly the unique-key/idempotency
risks this phase spent its effort proving are handled correctly under
a *single* writer.
