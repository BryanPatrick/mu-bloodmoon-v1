---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
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

## Future real cutover rollback (Phase 1's eventual production cutover)

Not designed in detail yet — this is a placeholder for when a Phase 1
production cutover is actually authorized:

- The current cPanel Node deployment stays warm/deployable throughout
  the cutover window (matches the existing `bloodmoon-deploy` skill's
  rename-not-delete convention for `.output` backups).
- A real cutover rollback needs a DNS-level or edge-routing-level
  revert plan specific to whatever mechanism Phase 7 actually uses
  (Cloudflare proxy toggle vs. a full nameserver revert) — written when
  Phase 7 is scoped, not now, since it depends on decisions not yet
  made (`DNS_AND_DOMAIN.md`).

## Database rollback (future, Phase 5/6)

Not designed yet — depends on the chosen target vendor
(`DATABASE_MIGRATION.md`). The one fixed requirement already recorded:
the old MySQL stays live and authoritative throughout Phase 5's data
migration, so "rollback" during that phase is simply "keep reading
from and writing to the old database," not a data-recovery operation.
