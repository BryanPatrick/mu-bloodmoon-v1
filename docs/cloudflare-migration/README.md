---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# Cloudflare migration program

Blood Moon is migrating infrastructure away from the current hosting
provider (cPanel/LiteSpeed at a Brazilian host, DNS at
`ns1/ns2.srv41.hinetworks.com.br`) toward infrastructure Bryan controls,
with Cloudflare as the primary application/edge platform. The long-term
goal is `CURRENT_PROVIDER = ZERO` once domain/DNS control and data
migration are complete — **not** decided or scheduled here, only the
direction.

This is a **shadow-deployment, evidence-based program**, never a
big-bang cutover. Every phase produces a reversible, non-production
artifact first; nothing here changes what a real player, in-game
character, or payment touches until a phase is explicitly authorized to
go live.

## Read this first (agent bootstrap)

Before any Cloudflare migration work, read, in order:

1. This file
2. [`CURRENT_STATE.md`](CURRENT_STATE.md) — only verified reality
3. [`DECISIONS.md`](DECISIONS.md) — only what Bryan has actually approved
4. [`PHASE_STATUS.md`](PHASE_STATUS.md) — what's done, current, next
5. [`RISKS.md`](RISKS.md) — unresolved risks and unknowns
6. The specific component document for the area you're touching
   (`WEB_MIGRATION.md`, `API_MIGRATION.md`, `DATABASE_MIGRATION.md`,
   `R2_ASSETS.md`, `DNS_AND_DOMAIN.md`, `SECURITY_MODEL.md`)

See `AGENTS.md` for the one-line pointer that sends agents here — the
full contract lives in this folder, not duplicated into `AGENTS.md`.

## Document contract

| File | Contains | Never contains |
|---|---|---|
| `CURRENT_STATE.md` | only verified, currently-true reality (code/config/live-checked facts, cited) | plans, recommendations, anything not yet true |
| `TARGET_ARCHITECTURE.md` | the intended future state | claims that any of it is deployed yet |
| `MIGRATION_ROADMAP.md` | the 8 phases, in order, with entry/exit criteria | phase completion claims not backed by `PHASE_STATUS.md` |
| `SERVICE_INVENTORY.md` | every current service/dependency, mapped current → target | migration decisions not yet made |
| `DNS_AND_DOMAIN.md` | verified DNS/domain control facts, `UNKNOWN` where unverified | assumed nameserver authority |
| `WEB_MIGRATION.md` | apps/web → Cloudflare Workers specifics | API or DB migration content |
| `API_MIGRATION.md` | NestJS API → Cloudflare options (native Workers vs. Containers) | a chosen option, unless `DECISIONS.md` says so |
| `DATABASE_MIGRATION.md` | MySQL exit requirements | a chosen vendor, unless `DECISIONS.md` says so |
| `R2_ASSETS.md` | asset inventory and classification | a completed or scheduled bulk upload |
| `SECURITY_MODEL.md` | CSP/CORS/secrets/edge security implications of the migration | changes to production security posture |
| `ROLLBACK_PLAN.md` | how to undo each phase's artifacts | anything implying production is already migrated |
| `DECISIONS.md` | **only** decisions Bryan has actually approved, dated, verbatim | recommendations, options, agent opinions |
| `RISKS.md` | open risks/unknowns, one row each, owner + status | resolved items (move those to `PHASE_STATUS.md`) |
| `PHASE_STATUS.md` | completed / current / next, per phase | aspirational timelines |

**A recommendation is never promoted to a decision, an inference is
never promoted to a fact, and a planned service is never described as
deployed** — anywhere in this folder. If a document would need to say
"this should work" or "this is probably fine," it says that explicitly
and cites `RISKS.md`, rather than stating it as settled.

## Program-wide constraints (apply to every phase)

- **No big-bang migration.** Every cutover is reversible until explicitly
  finalized.
- **Cloudflare Hyperdrive is not a database.** It is a connection-pooling
  proxy from Workers to an *external* MySQL/Postgres database. It never
  replaces MySQL and is not proposed as one anywhere in this program.
- **The current cPanel MySQL stays bound to `127.0.0.1`.** No phase in
  this program proposes exposing it publicly; Hyperdrive-style access
  requires either a database that already accepts external TLS
  connections (a future managed MySQL, Phase 5) or a tunnel, never a
  public bind on the current host.
- **The financial portal (recharge, VIP, wallet, marketplace escrow)
  does not move to D1 at any point in this program.** It has already
  been validated against MySQL/MariaDB semantics (transactions, FK
  constraints, row locking) that D1/SQLite do not provide the same way.
  Any future database exit target must be MySQL-compatible for exactly
  this reason — see `DATABASE_MIGRATION.md`.
- **No production DNS change, no production deploy, no production
  database write** happens under this program without its own,
  separate, explicit authorization at the time — a decision recorded
  here under `DECISIONS.md` from an earlier phase is not blanket
  authorization for a later one.

## Existing Cloudflare footprint (do not confuse with this program)

Cloudflare is **not new** to this project — two unrelated workloads
already run in the same Cloudflare account (`docs/game-data/cloudflare-resources.md`):
the **Game Data Platform** (`bloodmoon-game-data-worker`, D1 database
`bloodmoon-game-data`, the `GAME_COMMAND_TRANSPORT` Worker/Queue) and the
separate **AI Knowledge Hub** project (`ai-knowledge-hub`, its own
Worker/D1/R2). Both are **read-scope/telemetry and internal-tooling
workloads**, never the public web or the financial API. This program is
the first time the public-facing web/API/database move toward
Cloudflare — see `CURRENT_STATE.md` for the exact, current account
inventory.
