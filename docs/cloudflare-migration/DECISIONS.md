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

## 2026-09-22 — Phase CF-01B: reconciled target architecture and API runtime

Bryan reviewed both concurrent investigations (this phase's web shadow
and the independent `infra/cloudflare-api-feasibility` report) and
decided the canonical initial target architecture:

> Nuxt web → Cloudflare Workers. NestJS API → Cloudflare Containers as
> the initial low-risk migration path. Public/static/media storage →
> Cloudflare R2. Financial/core DB → external MySQL-compatible
> database. D1 remains for appropriate Cloudflare-native services, NOT
> the financial core. Current hosting provider should progressively
> move toward ZERO responsibilities.
>
> Native Workers for the full NestJS API is NOT rejected permanently.
> It is a future optimization path after the low-risk Container
> migration.

Recorded fields: `API_INITIAL_MIGRATION_TARGET = CLOUDFLARE_CONTAINERS`
(reason: the current NestJS/Express/Prisma architecture is a
`LOW_TO_MEDIUM` change surface for Containers versus `HIGH` for
Workers-native — see `API_MIGRATION.md`; **Containers is not yet
production-proven, the container proof itself still needs to run**).
`API_WORKERS_NATIVE = FUTURE_OPTIMIZATION` (not rejected; real
blockers/adapters catalogued in `API_MIGRATION.md`: a Nest Fetch
adapter, an engine-less Prisma + MySQL driver adapter, durable
job/queue triggers in place of `setInterval`, R2-backed media, a
native-`sharp` replacement, and a full financial-semantics
revalidation).

Also decided this phase:

- **Keep `bloodmoon-web-shadow` alive** for continued testing — not
  deleted, no production domain attached, no DNS change.
- **Do not change production CORS yet** —
  `SHADOW_PRODUCTION_API_CORS = BLOCKED_PENDING_BRYAN_AUTHORIZATION`.
  The required future action stays small (add the shadow origin to
  `WEB_PUBLIC_URLS`, then a controlled API restart) and is not
  performed now.
- **R2 storage direction**: R2 should become durable storage for
  public images, wiki assets, user/community media, and
  launcher/download assets where appropriate — direction only, no
  upload/migration yet (`R2_ASSETS.md`).
- **Database direction**: financial/core DB keeps a MySQL-compatible
  requirement, never D1, for the reasons already recorded; provider
  remains undecided (`DATABASE_MIGRATION.md`).
- **Backup-restore P1 stays open**, to be closed using a disposable
  MySQL environment this project controls — no privileged production
  DB credential is to be requested.
- **Canonical next-phase sequence**: `CF-API-02R` (Container POC) →
  `CF-R2-01` (R2 inventory + shadow migration) → `CF-DB-01` (external
  MySQL options + disposable restore proof) → Container shadow
  deployment → database migration rehearsal → API shadow integration →
  DNS/cutover planning (`MIGRATION_ROADMAP.md`).

## Not yet decided (tracked in the relevant component doc, not here)

- Target database vendor (`DATABASE_MIGRATION.md`).
- Whether/when to add the shadow Worker's origin to production API
  CORS (blocked per the decision above until Bryan authorizes it).
- Domain/DNS control transfer timeline (`DNS_AND_DOMAIN.md`).
- Whether/when native Workers becomes worth pursuing as the
  `FUTURE_OPTIMIZATION` path, and on what trigger.
- Stash disposition, HSTS preload, and other small open items carried
  from Phase 17R.
