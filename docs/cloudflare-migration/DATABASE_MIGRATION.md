---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# Database exit — requirements only (no vendor chosen)

`DATABASE_EXIT_STATUS = PLANNING_ONLY`. This document records what any
target database **must** satisfy, per the brief. It does not select a
vendor unless a future `DECISIONS.md` entry does.

## Hard requirements

| Requirement | Why | Current evidence it's needed |
|---|---|---|
| MySQL-compatible (wire protocol or true MySQL) | The financial portal's transactions, escrow, wallet ledger, and marketplace flows are validated against real MySQL/MariaDB semantics — see `README.md`'s constraint. A SQLite-family engine (D1) does not have the same transaction/locking model. | `apps/api/prisma/schema.prisma` targets `mysql`; Phase 17R's own work this month (marketplace gate, recovery token races) depended on real row-level locking and `$transaction` semantics |
| Real transactions | Multi-statement atomicity across wallet/ledger/escrow writes | `marketplace-admin.service.ts`, `wallet` module, the Phase 17R `resetPassword` atomic-claim fix |
| Real locking semantics | Concurrent-request correctness (the exact class of bug Phase 17R found and fixed in password reset) | same |
| Financial idempotency semantics | Wallet/ledger/escrow writes rely on unique-key conflict handling and connection-scoped locking, not just generic transactions | 24 files use `$transaction` (1 Serializable path), 5 services use `GET_LOCK`/`RELEASE_LOCK` — counts confirmed this phase against `apps/api/src` (see `CURRENT_STATE.md`, sourced from the concurrent `docs/cloudflare-api-feasibility.md` investigation and spot-checked) |
| Prisma compatibility | The API's entire data layer is Prisma; a target requiring a full ORM rewrite is a different, much larger program | `apps/api/prisma/` |
| Backup/restore | Must support a real, provable backup → restore → integrity-check cycle | Phase 17R's own P1 (see below) exists specifically because this was unproven even on the *current* database |
| TLS | Any externally-reachable database must require encrypted connections | `README.md`'s "MySQL stays private" constraint — the current instance doesn't need this because it's never external; a future one always will be |
| Private credential management | Database credentials for a Cloudflare-reachable database are Worker/Container secrets (`wrangler secret put`), never committed, never in `vars` | matches the existing Game Data Worker secret convention |
| Reasonable Brazil latency | The player base and current host are Brazil-based; a database in a distant region would regress response times | not benchmarked this phase — a real requirement once candidates exist |
| Hyperdrive compatibility desirable | Only relevant if the `FUTURE_OPTIMIZATION` native-Workers path (`API_MIGRATION.md`, `DECISIONS.md`) is ever pursued — that's how a Worker would reach an external MySQL-compatible database without exposing it publicly | not required for the chosen initial path: a Container holds a normal TCP connection itself, the same way the current API does today |

## What this document deliberately does not do

- Name PlanetScale, Neon, a self-hosted MySQL on a Bryan-controlled VPS,
  or any other candidate as chosen or preferred.
- Estimate cost.
- Propose a migration timeline.

## Carried forward from Phase 17R: the backup-restore P1

Phase 17R proved the backup **creation** and **integrity-verification**
pipeline end to end for real (a genuine ~31 MB, 142-table mysqldump,
`verify-backup-integrity.sh` — which had a real pipefail bug, found and
fixed that phase). The **restore** step itself is still unproven in
this environment: the only local MySQL credential available has no
`CREATE DATABASE` privilege, so `restore-test.sh`'s isolated target
database cannot be created here.

**This program does not request elevated production credentials to
close that gap.** The requirement stands as recorded: **before any
database migration or cutover (Phase 5/6), a real
mysqldump → restore-into-a-disposable-MySQL → integrity-validation
cycle must be proven**, using a disposable database this project
controls — not production, not requiring new elevated access beyond
what a normal local/CI MySQL instance already grants its own creator.
This can be closed independently of any vendor decision, whenever a
disposable MySQL instance with `CREATE DATABASE` is available (a local
Docker/native MySQL with an admin user, a throwaway cloud instance, or
a grant on the existing local credential). Tracked as `CF-DB-01` in
`MIGRATION_ROADMAP.md`, alongside evaluating real external MySQL-
compatible candidates against the requirements above.
