---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# Decisions (Bryan-approved only)

Only decisions Bryan has actually made, dated, in his own recorded
words or a faithful paraphrase. Recommendations, options, and agent
opinions belong in the component documents, never here.

## 2026-09-22 — Strategic direction (Phase CF-00/CF-01 brief)

> "Blood Moon will migrate as much infrastructure as safely possible
> away from the current hosting provider and toward infrastructure
> controlled by Bryan, with Cloudflare as the primary
> application/edge platform. The current provider should eventually
> contain the MINIMUM possible services... after domain/control and
> data migration are complete... Do NOT perform a big-bang migration.
> Use shadow deployments, evidence and reversible cutovers."

Target order: (1) Nuxt web → Workers, (2) static assets → R2, (3)
Cloudflare edge in front of the legacy API where useful, (4) evaluate
API runtime (native Workers vs. Containers), (5) MySQL exit, (6) API
cutover, (7) DNS/domain cutover, (8) remove current provider
completely.

**Explicit constraints, also decided**: Cloudflare Hyperdrive is not a
database and never replaces MySQL; the current cPanel MySQL stays
bound to `127.0.0.1` (never exposed publicly, in any phase); the
financial portal does not move to D1 in this program, at any phase.

## 2026-09-22 — Phase CF-01 execution authorization

Bryan authorized, for this phase specifically: creating the canonical
documentation set; a Nuxt Workers-compatibility audit; building
against the Cloudflare target; local Wrangler runtime testing;
creating a shadow Worker at a clearly non-production `workers.dev`
name (suggested concept `bloodmoon-web-shadow`) if Cloudflare auth was
already available and creation was safe; explicitly **no** production
DNS change, no deploy to the current production hostname, no cPanel
modification, no production database modification, no payments/
marketplace/GameBridge enablement, no database migration, no deletion
of current-provider files, no push, no `git add .`.

## Not yet decided (tracked in the relevant component doc, not here)

- API runtime: native Cloudflare Workers vs. Cloudflare Containers
  (`API_MIGRATION.md`).
- Target database vendor (`DATABASE_MIGRATION.md`).
- Whether/when to add the shadow Worker's origin to production API
  CORS (`WEB_MIGRATION.md` — prepared, not applied).
- Domain/DNS control transfer timeline (`DNS_AND_DOMAIN.md`).
- Stash disposition, HSTS preload, and other small open items carried
  from Phase 17R.
