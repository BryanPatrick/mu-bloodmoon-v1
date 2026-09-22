---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
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
| 4 | API runtime decision: native Workers vs. Containers | apps/api runtime | `API_MIGRATION.md` compatibility findings for both options | a recorded `DECISIONS.md` entry choosing one, with the losing option's blockers documented | this is a decision phase; no rollback needed until Phase 6 builds on it |
| 5 | MySQL exit | database | `DATABASE_MIGRATION.md` requirements met by a chosen vendor (not selected yet); Phase17R's backup-restore P1 closed with a real disposable-DB proof | data replicated/migrated to the new database, integrity-verified, **while the old MySQL keeps serving production** | old MySQL stays live and authoritative until Phase 6 cuts over reads/writes |
| 6 | API cutover to Cloudflare runtime + external MySQL | apps/api production traffic | Phase 4 decision implemented and tested; Phase 5 database live and proven | production API traffic served from Cloudflare, old cPanel API process stopped only after verification | redeploy the cPanel API build (kept warm/available) and point traffic back |
| 7 | DNS/domain cutover | authoritative DNS | Bryan has confirmed sufficient registrar/DNS control (`DNS_AND_DOMAIN.md` — currently `PENDING_TRANSFER`) | production hostnames resolve through Cloudflare, TLS re-verified end to end | revert nameservers at the registrar; this is the highest-blast-radius single step in the program and gets its own dedicated runbook before it is attempted |
| 8 | Remove current provider completely | everything remaining | Phases 1–7 all complete and stable for an agreed observation period | `CURRENT_PROVIDER = ZERO`: no service, DNS record, or credential still depends on the old host | not reversible in the same sense — this is the program's actual finish line, approached last and only with explicit sign-off |

## What this program deliberately does not schedule

- A specific calendar date for any phase.
- A chosen API runtime (Workers vs. Containers) or database vendor —
  both stay open questions until `DECISIONS.md` records a real choice.
- Any DNS change, at any point before Phase 7's own explicit
  authorization.
