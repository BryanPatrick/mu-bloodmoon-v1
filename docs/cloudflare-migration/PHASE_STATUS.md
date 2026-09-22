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

## Phase 1 (Nuxt web → Workers, production cutover) — NOT STARTED

Shadow deployment exists (see above); a real production cutover
(custom domain, then Phase 7's DNS work) is separate, unscheduled work.

## Phase 2 (static assets → R2) — NOT STARTED

Inventory only (`R2_ASSETS.md`). No upload has happened.

## Phase 3 (Cloudflare edge in front of the legacy API) — NOT STARTED

No concrete need identified yet, per the phase's own entry criteria.

## Phase 4 (API runtime decision) — NOT STARTED

Both options inventoried (`API_MIGRATION.md`); the real
Prisma-on-Workers question (`RISKS.md` CF-R3) is unresolved.

## Phase 5 (MySQL exit) — NOT STARTED

Requirements only (`DATABASE_MIGRATION.md`). Phase 17R's backup-restore
P1 (`RISKS.md` CF-R5) is an explicit entry-criteria blocker, carried
forward, not closed.

## Phase 6 (API cutover) — NOT STARTED

Depends on Phases 4 and 5.

## Phase 7 (DNS/domain cutover) — NOT STARTED, blocked on control

`DNS_AND_DOMAIN.md`: registrar/DNS control is `PENDING_TRANSFER`,
currently non-Cloudflare, confirmed via a 2026-08-09 live audit
(unchanged since).

## Phase 8 (remove current provider) — NOT STARTED

Depends on all preceding phases.

## Next recommended step

See this phase's final report for the specific
`DECISIONS_REQUIRED_FROM_BRYAN` list. In order of leverage: (1) decide
whether to allow the CORS addition so the shadow deploy can actually
exercise a real login against production data read-only-safe
endpoints; (2) decide the Phase 17R backup-restore P1's credential
question, since it blocks Phase 5 entry criteria regardless of which
database vendor is eventually chosen; (3) if there's appetite, a small
isolated spike on the Prisma/Workers driver-adapter question
(`RISKS.md` CF-R3) would make Phase 4's eventual decision much cheaper.
