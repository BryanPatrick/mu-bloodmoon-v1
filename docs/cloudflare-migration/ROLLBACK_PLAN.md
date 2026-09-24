---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-24
---

# Rollback plan

## Current phase (CF-01): shadow-only — production is simply untouched

There is nothing to roll back on the production side, because nothing
in production changed. The web app deployed this phase
(`bloodmoon-web-shadow`) is a separate, non-production Worker at its
own `workers.dev` subdomain. Rollback options, in order of preference:

1. **Delete the shadow Worker** — `wrangler delete bloodmoon-web-shadow`
   (from `apps/web`, with the wrangler config present). Fully removes
   it; the URL stops resolving.
2. **Disable it** without deleting — remove its routes (it already has
   none) or use the Cloudflare dashboard to pause it; keeps the
   deployment history.
3. **Deploy a previous Worker version** — Cloudflare Workers keeps
   version history per deployment (`Current Version ID` is recorded
   per deploy, e.g. this phase's `c055ce6d-3139-4833-9096-d2d411a49583`);
   `wrangler rollback` or the dashboard can select an earlier version.

Current production web (`mubloodmoon.com.br`, cPanel Node deploy)
**was never touched this phase** — no rollback action is needed there
because no forward action happened there.

## Future real cutover rollback (Web only)

The previous placeholder is now resolved by
`WEB_PROVIDER_API_TRANSITION_RUNBOOK.md`. The core rollback is:

1. restore only root/www routing to the pre-recorded provider target;
2. keep the current cPanel Web deploy intact throughout the transition;
3. do not redeploy/restart API and do not change MySQL, `DATABASE_URL`,
   update, e-mail, Turnstile or R2 flags;
4. verify homepage, login, protected API request and logout through the
   restored Web;
5. preserve the failed Worker version and evidence.

The exact DNS/route command remains intentionally absent until Bryan
chooses the routing mechanism and proves authenticated rollback access.
That is an execution blocker, not a reason to improvise during cutover.

## Database rollback (future, Phase 5/6)

Not designed yet — depends on the chosen target vendor
(`DATABASE_MIGRATION.md`). The one fixed requirement already recorded:
the old MySQL stays live and authoritative throughout Phase 5's data
migration, so "rollback" during that phase is simply "keep reading
from and writing to the old database," not a data-recovery operation.
