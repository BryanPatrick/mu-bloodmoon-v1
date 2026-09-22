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

## Phase 5 (MySQL exit) — NOT STARTED

Requirements only (`DATABASE_MIGRATION.md`), now including explicit
financial-idempotency semantics (unique-key conflicts,
`GET_LOCK`/`RELEASE_LOCK`, Serializable transactions). Phase 17R's
backup-restore P1 (`RISKS.md` CF-R5) is an explicit entry-criteria
blocker, carried forward, not closed; tracked as `CF-DB-01`.

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
currently has zero empirical proof behind it. In parallel: `CF-DB-01`
can start closing the backup-restore P1 (`RISKS.md` CF-R5) independently
of any vendor choice, using a disposable MySQL this project controls.
The CORS addition (`RISKS.md` CF-R9) stays explicitly blocked pending
Bryan's authorization — see `DECISIONS_REQUIRED_FROM_BRYAN` in the
Phase CF-01B final report.
