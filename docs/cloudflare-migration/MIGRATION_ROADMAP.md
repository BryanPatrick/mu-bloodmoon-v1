---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-24
---

# Migration roadmap

Eight phases, Bryan's stated order (`docs/cloudflare-migration/README.md`
carries the constraints; this file carries entry/exit criteria only).
Each phase is shadow-first and independently reversible until its own
explicit cutover decision is recorded in `DECISIONS.md`. See
`PHASE_STATUS.md` for what is actually done versus planned.

| # | Phase | Moves | Entry criteria | Exit criteria (what makes it "done") | Reversible by |
|---|---|---|---|---|---|
| 1 | Nuxt web → Workers | apps/web runtime | Cloudflare-target build passes locally; compatibility audit shows no `REQUIRES_ARCHITECTURE_CHANGE` items | A shadow Worker serves the real app correctly on a `workers.dev` URL; later, a production custom domain is attached only after Phase 7 | deleting/disabling the Worker; production stays on the cPanel Node deploy throughout |
| 2 | Static assets → R2 | public/static files, later user uploads | `R2_ASSETS.md` inventory complete and classified | Assets served from R2 with correct cache headers, verified against the current CDN-less baseline | assets stay dual-hosted until the old path is deliberately retired |
| 3 | Cloudflare edge/gateway in front of the legacy API | request routing only, where useful (WAF, rate limiting, caching of safe GETs) | Phase 1 stable; a concrete need identified (not done speculatively) | edge layer proven to pass through correctly with no behavior change to the legacy API | remove the edge rule/route; legacy API keeps its own direct path available |
| 4 | API runtime: Containers (chosen initial target) | apps/api runtime | `API_MIGRATION.md` compatibility findings for both options | **DECIDED 2026-09-22**: `API_INITIAL_MIGRATION_TARGET = CLOUDFLARE_CONTAINERS`, `API_WORKERS_NATIVE = FUTURE_OPTIMIZATION` (`DECISIONS.md`). **Update, `CF-INTEGRATION-02` (2026-09-23)**: the container proof (`CF-API-02R`) has run for real (concurrent Codex branch) and been independently code-reviewed, cleanup-verified, and reconciled with the storage/DB work onto `infra/cloudflare-migration-candidate` — see `RISKS.md` CF-R4, `CLOUDFLARE_MIGRATION_CANDIDATE.md` | this was a decision phase for *which runtime*; the proof now exists on a real, evidenced candidate branch — a `main`-merge/live-redeploy decision is what's still outstanding, not a from-scratch proof |
| 5 | MySQL exit | database | `DATABASE_MIGRATION.md` requirements met by a chosen vendor (not selected yet); Phase17R's backup-restore P1 closed with a real disposable-DB proof | data replicated/migrated to the new database, integrity-verified, **while the old MySQL keeps serving production** | old MySQL stays live and authoritative until Phase 6 cuts over reads/writes |
| 6 | API cutover to Cloudflare Containers + external MySQL | apps/api production traffic | `CF-API-02R` container proof passed; Phase 5 database live and proven | production API traffic served from Cloudflare Containers, old cPanel API process stopped only after verification | redeploy the cPanel API build (kept warm/available) and point traffic back |
| 7 | DNS/domain cutover | authoritative DNS | Bryan has confirmed sufficient registrar/DNS control (`DNS_AND_DOMAIN.md` — currently `PENDING_TRANSFER`) | production hostnames resolve through Cloudflare, TLS re-verified end to end | revert nameservers at the registrar; this is the highest-blast-radius single step in the program and gets its own dedicated runbook before it is attempted |
| 8 | Remove current provider completely | everything remaining | Phases 1–7 all complete and stable for an agreed observation period | `CURRENT_PROVIDER = ZERO`: no service, DNS record, or credential still depends on the old host | not reversible in the same sense — this is the program's actual finish line, approached last and only with explicit sign-off |

## Canonical immediate next-phase sequence (2026-09-22, Phase CF-01B)

The 8-phase table above is the strategic view. Bryan's decided
near-term execution order, more granular:

1. **`CF-API-02R` — Container POC.** Run the prepared container proof
   (`API_MIGRATION.md`) on a machine with working container tooling:
   boot, health/ready, graceful shutdown, cold start, one auth flow,
   one Serializable wallet transaction, SMTP to a local test sink, one
   upload through temporary object storage — against a disposable
   MySQL/MariaDB, never production. **Update, `CF-INTEGRATION-02`
   (2026-09-23)**: done, for real, on a concurrent Codex branch, and
   now reconciled onto `infra/cloudflare-migration-candidate` — see
   `RISKS.md` CF-R4, `CLOUDFLARE_MIGRATION_CANDIDATE.md`. A `main`-merge
   or live-redeploy decision is the remaining step, not a re-run.
2. **`CF-R2-01` — R2 inventory + shadow migration.** Build on
   `R2_ASSETS.md`'s inventory; move a first real (non-production-traffic)
   asset set into R2 as a shadow proof, not a bulk/production cutover.
3. **`CF-DB-01` — external MySQL options + disposable restore proof.**
   Evaluate real MySQL-compatible candidates against
   `DATABASE_MIGRATION.md`'s requirements, and close Phase 17R's
   carried-forward backup-restore P1 using a disposable MySQL
   environment this project controls (no elevated production
   credentials).

Then, in order: Container shadow deployment (the proof from
`CF-API-02R` running continuously, still non-production) → database
migration rehearsal (real data, disposable target, not production) →
API shadow integration (the web shadow talking to the Container shadow,
closing the loop this phase's CORS gap currently blocks) → DNS/cutover
planning (Phase 7, still blocked on `DNS_AND_DOMAIN.md`'s control
question).

## What this program deliberately does not schedule

- A specific calendar date for any phase.
- A chosen database vendor — stays an open question until
  `DECISIONS.md` records a real choice (the API runtime question is
  now decided — see above and `API_MIGRATION.md`).
- Any DNS change, at any point before Phase 7's own explicit
  authorization.
- Any production CORS change, before Bryan explicitly authorizes it
  (`SHADOW_PRODUCTION_API_CORS = BLOCKED_PENDING_BRYAN_AUTHORIZATION`,
  see `DECISIONS.md`).

## Revised near-term order — approved 2026-09-24

The eight-phase table remains the eventual provider-exit strategy. Its
old near-term ordering is superseded for the transition window by:

1. Correct and revalidate a Web shadow candidate with explicit
   `NUXT_PUBLIC_API_BASE=https://api.mubloodmoon.com.br/api`.
2. Confirm registro.br/current-zone control and Web-only rollback access.
3. Prepare the complete Cloudflare zone while preserving API, update and
   all mail records; do not change nameservers yet.
4. Cut over only root/www after a fresh authorization and the runbook
   gate passes.
5. Keep API and MySQL co-located on the provider; do not expose MySQL.
6. Observe Web/auth/CORS/CSP/Turnstile/assets using the evidence list in
   `WEB_PROVIDER_API_TRANSITION_RUNBOOK.md`.
7. Continue R2, backup and email as independent tracks.
8. Revisit API/database exit only in a future decision phase.

This order intentionally decouples the low-risk Web move from the
high-risk API/database move. It does not authorize any production action.
