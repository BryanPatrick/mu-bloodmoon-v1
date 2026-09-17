---
status: ARCHITECTURAL_DIRECTION — no licensing/billing implemented
category: knowledge
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: HYPOTHESIS for the specific bundle groupings below (this document's own proposal); CONFIRMED for the underlying module boundaries it's built from (see module-map.md)
---

# Commercial modularity — future package-bundle direction

Extends [`docs/decisions/0017-modular-component-product-direction.md`](../decisions/0017-modular-component-product-direction.md)
(the ADR establishing *why* module boundaries are preserved) with a
concrete sketch of *what* a future modular commercial offering could look
like, grounded in the real dependency data in
[`module-map.md`](module-map.md). **Nothing here is implemented.** No
licensing, billing, or module-gating code exists. This is a planning
artifact only.

## Possible offering shapes

**Full platform** — everything, as Blood Moon runs today.

**Smaller packages**, each requiring Core + Accounts (the two modules
every other module depends on transitively, per `module-map.md`):

| Package | Modules included | Real dependency notes |
|---|---|---|
| Core + Accounts | CORE, ACCOUNTS, AUTH, SECURITY, ADMIN | The mandatory floor — every other package requires this one |
| Launcher | LAUNCHER (+ CMS's launcher-studio slice) | Depends on Auth, GameAccountIdentity |
| CMS | CMS (generic content slice) | Standalone-capable — the public `/content/*` read path has no auth dependency at all |
| GameBridge | GAMEBRIDGE, GAMESERVER | MU-Online-specific; would need genericizing (a different game's write path) to sell outside this exact game |
| Payments | PAYMENTS | Coupled to Mercado Pago specifically; a real commercial package would need a provider-abstraction layer first |
| VIP | VIP | Depends on GameBridge + Wallet/Economy |
| Market | MARKET, ECONOMY, WCOIN | Wallet/Economy is the real dependency floor for this package — cannot ship Market without it |
| Community | COMMUNITY | Depends on Media, Auth |
| Wiki | WIKI | **Zero dependencies** — the cleanest, most independently-shippable module in the entire system |
| Support | SUPPORT | Depends on Auth, Audit; currently reuses Accounts' own permission (see `module-map.md`'s SUPPORT entry) — would need its own dedicated permission before being cleanly separable |
| Surveys | SURVEYS | Not yet built — schema-only; would need real implementation before this is a sellable package at all |
| Privacy | PRIVACY | Depends on Accounts, GameBridge |
| Analytics | ANALYTICS | Not yet a real module — currently scattered across Marketplace/Community/admin-reports; would need actual extraction before this is a sellable package |

## What already helps, and what's still missing, for real separability

**Already real, found during Phase M module-map research** (not created
by this document — this document only observes and organizes it):

- NestJS modules are already physically separated by folder/import
  boundary (`apps/api/src/modules/`).
- The Prisma schema deliberately avoids a physical foreign key on
  `accountId` in tables that must survive account deletion (ADR-0006) —
  a side effect that also makes future per-module data separation
  easier, since those tables aren't hard-wired to a single `Account`
  table's lifecycle.
- Some modules genuinely have zero or near-zero cross-module coupling
  today (Wiki has zero imports; CMS's public content read path has no
  auth dependency).

**Missing, if any real modularization work ever started**:

- **No module-level access gating** exists — every module is always
  active if it's registered in `AppModule`; there is no "package X is
  licensed, package Y is not" concept anywhere in the code.
- **Payments is provider-specific** (Mercado Pago) — a real commercial
  Payments package would need a provider abstraction before it could
  serve a customer outside Brazil.
- **GameBridge/GameServer are MU-Online-specific** by construction (the
  whole point is talking to *this* game's SQL Server schema) — "sell
  GameBridge as a package" would really mean "sell the pattern/design,"
  not a drop-in reusable component, unless a customer is also running a
  MU Online server with a compatible schema.
- **Support's permission reuse** (see `module-map.md`) is a real
  small blocker to clean separation — fix before ever packaging Support
  independently.
- **Analytics and Surveys** are not real, extracted modules yet — see
  above.

## Explicitly not done, and not planned for this phase

No licensing system, no per-package billing, no module feature-flagging
by license tier, no customer-facing installer/deployment tooling for a
subset of modules. This document exists so a *future* decision to build
any of that starts from an accurate picture of real dependencies, not
from scratch.

## Documentation implication

If commercial documentation is ever written (per ADR-0017's own note),
it must describe these modules generically — without exposing Blood
Moon's own production credentials, exact topology, or real player data —
a constraint to hold in any new technical documentation from now on, not
something to retrofit later.
