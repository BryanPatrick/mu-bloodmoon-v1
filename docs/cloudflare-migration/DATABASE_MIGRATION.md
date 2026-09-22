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

## Backup-restore P1 — CLOSED (2026-09-22, Phase CF-DB-01)

Phase 17R proved the backup **creation** and **integrity-verification**
pipeline end to end (a genuine ~31 MB, 142-table mysqldump,
`verify-backup-integrity.sh`). The **restore** step was blocked because
the only local MySQL credential available had no `CREATE DATABASE`
privilege.

**Closed without requesting elevated credentials**: Phase CF-DB-01
created a wholly separate, disposable MySQL 8.0.46 instance (own fresh
data directory, own loopback-only port, own throwaway root/restore
credentials, generated locally and never committed) — entirely
independent of the shared MySQL install and its existing databases,
which were never touched. The full chain ran for real: checksum
re-verification → `restore-test.sh` (unmodified) → 142 tables / 147
foreign keys / 55 migrations, all matching the source exactly →
`prisma migrate status` reporting zero drift → the real generated
Prisma client connecting, reading, writing, and correctly enforcing the
real unique-constraint error path → financial-semantics proof
(Serializable + rollback, real concurrent unique-key race with exactly
one winner, real two-session `GET_LOCK`/`RELEASE_LOCK` mutual
exclusion). The disposable instance was fully deleted afterward. Full
detail, including the one explained (non-defective) row-count
difference found: `CF-DB-01-REPORT.md`.

**What this closure does and doesn't cover**: it proves the *method* —
mysqldump → disposable restore → integrity → Prisma → financial
semantics — works, against a same-major-version MySQL 8.0 instance.
It does **not** prove a restore against any specific *external* vendor
(network path, that vendor's exact version, that vendor's own
backup/restore tooling) — that repeats once a vendor is chosen from the
shortlist below, using the same proven method
(`apps/api/scripts/verify-disposable-restore-prisma.mjs` is reusable
as-is for the Prisma-layer half of that future proof).

## Vendor shortlist (research only, Phase CF-DB-01 — no selection made)

Five real, currently-verified (2026) candidates researched; full detail
including each one's exact TLS/backup/network/cost/limitation profile
is in `CF-DB-01-REPORT.md`. Summary:

| Candidate | Real MySQL or compatibility layer | Brazil/South America presence | Named-lock (`GET_LOCK`) compatibility |
|---|---|---|---|
| Google Cloud SQL for MySQL | Real MySQL | `southamerica-east1` (São Paulo/Osasco) | Expected to work unchanged (real MySQL engine) |
| Azure Database for MySQL Flexible Server | Real MySQL | Brazil South | Expected to work unchanged (real MySQL engine) |
| AWS RDS for MySQL | Real MySQL | `sa-east-1` (São Paulo), confirmed price premium vs. US regions | Expected to work unchanged (real MySQL engine) |
| PlanetScale | Vitess (MySQL-**compatible** proxy/sharding layer) | São Paulo (`sa-east-1`), added 2026 | **NOT supported through VTGate — confirmed via PlanetScale's own GitHub discussion and Vitess's own tracked issue.** A real, disqualifying gap for this project's current 5-service `GET_LOCK` usage unless those locks are redesigned first |
| Self-hosted MySQL on a Bryan-controlled VPS (Vultr São Paulo) | Real MySQL, full version control | São Paulo (Vultr region since 2021, recently expanded) | Full control — works unchanged |

None selected. This table exists so a future `DECISIONS.md` entry has
real, evidenced options — not to make the choice here.
