---
status: ARCHITECTURAL_DIRECTION — not implemented, no licensing/billing built
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0017: Preserve modular component boundaries now, for a possible future commercial-modularity offering

**DATE**: 2026-08-31 (backfilled — original decision recorded 2026-08-30, Phase K, Part 20, `docs/README.md`)
**STATUS**: ARCHITECTURAL_DIRECTION — no implementation, no licensing/billing exists; this governs how *current* work should be structured, not a shipped feature

## CONTEXT

Blood Moon might eventually be offered, in whole or in modular parts, as
a reusable product to third parties (see also
`docs/knowledge/module-map.md`'s "commercial modularity potential" column
for the per-module version of this same question). If that ever happens,
extracting clean module boundaries retroactively from an already-coupled
monolith is far more expensive than preserving those boundaries as the
system is built in the first place.

## DECISION

Blood Moon's systems should, progressively, preserve clear modular
boundaries — Core, Accounts, Launcher, CMS, GameBridge, Payments, VIP,
Market, Community, Wiki, Support, Surveys, Privacy Center, Analytics —
so that *if* the platform or parts of it are ever offered as a reusable
product, those boundaries already exist rather than needing to be
retroactively extracted from a coupled system.

**No licensing or per-module billing is implemented in this phase, or
planned for any near-term phase.** What is already real today,
independent of this decision (i.e., this decision recognizes and commits
to preserving existing structure, it did not create it): the NestJS
modules (`apps/api/src/modules/`) are already physically separated by
folder/import boundary; the Prisma schema deliberately avoids a physical
foreign key on `accountId` in every table that must survive account
deletion (see ADR-0006), which incidentally also makes future per-module
data separation easier. No code changes were made specifically for this
preservation goal — it is an observation about current structure and a
guideline for future decisions, not a refactor performed now.

If Blood Moon or parts of its platform are ever offered commercially,
any resulting documentation must describe reusable modules **without
exposing Blood-Moon-exclusive internal secrets** (credentials, exact
production topology, real player data) — a design principle to hold from
now on in any new technical documentation, not something to apply
retroactively later.

## WHY

Module boundaries are cheap to preserve incrementally (mostly a matter
of discipline about what imports what) and extremely expensive to
retrofit after years of organic coupling. Committing to this direction
now costs nothing beyond awareness — it changes no current
implementation — while keeping a real future option open.

## ALTERNATIVES CONSIDERED

- **Build without regard to module boundaries, extract later if
  needed**: rejected — this is exactly the expensive-retrofit scenario
  this decision exists to avoid; the cost asymmetry (cheap now, expensive
  later) is the entire justification for deciding this early rather than
  deferring it.
- **Design and build a licensing/billing system now**: rejected —
  premature; there is no confirmed commercial-modularity product yet,
  only the possibility of one. Building infrastructure for an
  unconfirmed future product would be speculative engineering effort
  better spent on the actual current product.

## CONSEQUENCES

- Any new module added to `apps/api/src/modules/` should be evaluated
  against this boundary discipline: does it import cleanly from other
  modules via their exported services (as `GameCommandTransportClient` is
  explicitly exported for reuse — see ADR-0002/`game-account-identity.module.ts`),
  or does it reach into another module's internals?
- `docs/knowledge/module-map.md` (Phase M) is the concrete artifact this
  decision motivates — it exists specifically so future modularity
  decisions have a real, current picture of dependencies to reason
  about, rather than needing to rediscover them from code each time.
- This ADR does not commit to *which* modules would ever actually be
  sold separately, or to selling anything at all — it commits only to
  not making that option artificially harder through careless coupling.

## RELATED SYSTEMS

`docs/knowledge/module-map.md`, `apps/api/src/modules/`,
`apps/api/prisma/schema.prisma` (no-FK-on-accountId pattern), ADR-0006.
