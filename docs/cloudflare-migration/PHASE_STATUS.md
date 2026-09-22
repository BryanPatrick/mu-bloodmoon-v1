---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# Phase status

## Phase CF-00/CF-01 — canonical docs + Nuxt shadow deployment: **COMPLETE**

- Canonical documentation set created (this folder, 15 files).
- Agent bootstrap rule added (`AGENTS.md`).
- Service inventory, three-state architecture, DNS/domain control
  facts recorded.
- Nuxt/Nitro Workers-compatibility audit: **COMPATIBLE overall**, no
  architecture-level blockers found.
- Cloudflare-target build: **PASS** (`npm run web:build:cloudflare`,
  dedicated branch `infra/cloudflare-web-shadow`, dedicated worktree).
- Local Workers runtime test (`wrangler dev`/Miniflare): **PASS** —
  home/login/register/recovery/reset/recharge/marketplace-disabled all
  render correctly; a real auth shadow test (register → login →
  protected nav → token refresh → logout) passed against a real local
  API and a disposable test account.
- Security headers/CSP (Phase 17R): **verified surviving** the
  Cloudflare runtime, both locally and on the live edge — identical
  header set, correct per-response CSP script hashes.
- Shadow Worker **deployed**: `bloodmoon-web-shadow`, no routes, no
  custom domain, live at
  `https://bloodmoon-web-shadow.bryanelrick22.workers.dev`.
- Production: **untouched** — no DNS, no deploy, no CORS change, no
  database change.

## Phase CF-01B — reconcile web + API Cloudflare findings: **COMPLETE**

- Read and spot-checked `docs/cloudflare-api-feasibility.md` (branch
  `infra/cloudflare-api-feasibility`, commit `f47f0b6d`) — a concurrent,
  independent investigation. Its code was **not** merged or adopted;
  only its documented, spot-checked findings were folded into the
  canonical docs.
- Canonical architecture decided and recorded (`DECISIONS.md`):
  Nuxt web → Workers, NestJS API → **Cloudflare Containers** (initial
  target; not yet proven — the container proof itself hasn't run),
  native Workers → `FUTURE_OPTIMIZATION` (not rejected), storage → R2
  (direction only), financial/core DB → external MySQL-compatible
  (vendor undecided, D1 excluded).
- Updated: `TARGET_ARCHITECTURE.md`, `API_MIGRATION.md`,
  `DATABASE_MIGRATION.md`, `R2_ASSETS.md`, `MIGRATION_ROADMAP.md`,
  `CURRENT_STATE.md`, `DECISIONS.md`, `RISKS.md`,
  `SERVICE_INVENTORY.md` (also fixed a pre-existing malformed table row
  in the MySQL service line, missing its "Production criticality"
  cell).
- `bloodmoon-web-shadow` **kept alive**, unchanged, per Bryan's
  instruction. Production CORS **not** changed
  (`SHADOW_PRODUCTION_API_CORS = BLOCKED_PENDING_BRYAN_AUTHORIZATION`).
- Canonical near-term sequence recorded: `CF-API-02` (Container POC) →
  `CF-R2-01` (R2 inventory + shadow migration) → `CF-DB-01` (external
  MySQL options + disposable restore proof) → Container shadow
  deployment → database migration rehearsal → API shadow integration →
  DNS/cutover planning.
- Production: **untouched** — no DNS, no deploy, no CORS change, no
  database change, no container deployed.

## Phase CF-DB-01 — disposable MySQL restore proof + future database options: **COMPLETE**

- **`BACKUP_RESTORE_P1 = CLOSED`.** Full chain proven for real: the
  exact Phase 17R dump (checksum re-verified) restored into a wholly
  separate, disposable MySQL 8.0.46 instance (own data directory, own
  port, own throwaway credentials — the shared `MySQL80` service and
  `bloodmoon_local*` databases were never touched). 142 tables, 147
  foreign keys, 55 migrations, all matching the source exactly; one
  explained (not defective) row-count difference on `Account` from
  ongoing local dev activity since the dump was taken.
- `npx prisma migrate status`: **"Database schema is up to date!"**
  against the restored copy — zero migration drift.
- New script `apps/api/scripts/verify-disposable-restore-prisma.mjs`
  (refuses to run against anything non-loopback/production-looking):
  real Prisma client connect/read/write/unique-constraint/cleanup, 6/6
  checks passed.
- Financial semantics proven with real concurrency, not simulated:
  unique-key idempotency, Serializable transaction + rollback, a real
  6-way concurrent race for one unique key (exactly 1 winner), and real
  two-session `GET_LOCK`/`RELEASE_LOCK` mutual exclusion.
- Disposable instance fully torn down afterward — process stopped, data
  directory deleted, credentials deleted, zero residue anywhere.
- Vendor shortlist researched (5 candidates, current 2026 evidence, no
  selection made): Google Cloud SQL (`southamerica-east1`), Azure
  Database for MySQL Flexible Server (Brazil South), AWS RDS
  (`sa-east-1`), PlanetScale (São Paulo — **`GET_LOCK` not supported
  through Vitess, a real disqualifying gap unless locks are redesigned
  first**), and a self-hosted MySQL on a Bryan-controlled Vultr São
  Paulo VPS.
- `HYPERDRIVE_REQUIRED_NOW = NO` (unchanged — Containers doesn't need
  it).
- Full detail: `CF-DB-01-REPORT.md`. Updated:
  `DATABASE_MIGRATION.md`, `RISKS.md`, `SERVICE_INVENTORY.md`, this
  file.
- Production: **untouched** — no production DB access, no DNS, no
  payments, no CORS change.

## Phase 1 (Nuxt web → Workers, production cutover) — NOT STARTED

Shadow deployment exists (see above); a real production cutover
(custom domain, then Phase 7's DNS work) is separate, unscheduled work.

## Phase 2 (static assets → R2) — NOT STARTED

Inventory only (`R2_ASSETS.md`). No upload has happened.

## Phase 3 (Cloudflare edge in front of the legacy API) — NOT STARTED

No concrete need identified yet, per the phase's own entry criteria.

## Phase 4 (API runtime) — **DECISION MADE (CF-01B)**, proof NOT STARTED

`API_INITIAL_MIGRATION_TARGET = CLOUDFLARE_CONTAINERS`,
`API_WORKERS_NATIVE = FUTURE_OPTIMIZATION` (`DECISIONS.md`,
`API_MIGRATION.md`). The decision itself is recorded; the actual
container proof (`CF-API-02`) has not been run — Containers is
**not yet production-proven**. The Prisma-on-Workers question
(`RISKS.md` CF-R3) is deprioritized, not blocking, since it only
matters for the future-optimization path.

## Phase 5 (MySQL exit) — NOT STARTED, one entry-criteria item now closed

Requirements documented (`DATABASE_MIGRATION.md`) and now
**empirically proven**, not just asserted: Serializable isolation,
unique-key idempotency under real concurrency, and
`GET_LOCK`/`RELEASE_LOCK` mutual exclusion all confirmed working
against a real MySQL 8.0.46 instance restored from the project's own
dump (`CF-DB-01-REPORT.md`). The backup-restore P1
(`RISKS.md` CF-R5) is **CLOSED**. Vendor selection is still open — a
5-candidate shortlist exists (`CF-DB-01-REPORT.md`), none chosen.

## Phase 6 (API cutover) — NOT STARTED

Depends on Phases 4 and 5.

## Phase 7 (DNS/domain cutover) — NOT STARTED, blocked on control

`DNS_AND_DOMAIN.md`: registrar/DNS control is `PENDING_TRANSFER`,
currently non-Cloudflare, confirmed via a 2026-08-09 live audit
(unchanged since).

## Phase 8 (remove current provider) — NOT STARTED

Depends on all preceding phases.

## Next recommended step

`CF-API-02` (the Container POC) is now the single highest-leverage next
step — it's the critical path for the chosen Containers target and
currently has zero empirical proof behind it. `CF-DB-01` is complete;
the remaining database work is a real vendor decision among the 5
shortlisted candidates (`CF-DB-01-REPORT.md`), then a restore proof
against that specific vendor (not done here — this phase proved the
*method*, not a specific external target). The CORS addition
(`RISKS.md` CF-R9) stays explicitly blocked pending Bryan's
authorization.
