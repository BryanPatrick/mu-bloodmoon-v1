---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# API migration (apps/api → Cloudflare)

**No decision has been made.** This document lays out the two options
the brief named (Phase 4) and what's already known about each from the
current codebase; see `DECISIONS.md` for anything Bryan has actually
chosen, and `PHASE_STATUS.md` — this phase (CF-01) did not build or
test either option, it only inventories.

## Why this is harder than the web migration

`apps/api` is a full NestJS application: Prisma (MySQL), long-lived
service classes, `AsyncLocalStorage`-based request context
(`RequestContextService`, Phase 17R), scheduled/cron-adjacent worker
scripts (`worker:game-bridge`, `worker:marketplace-expirations`,
backup cron), file-serving middleware for community/guild media, and
direct TCP connections to MySQL, SMTP, and payment providers. None of
this is disqualifying for Cloudflare, but none of it is a drop-in the
way `apps/web` was either.

## Option A — Native Cloudflare Workers

- NestJS **can** run on Workers with `nodejs_compat`, but Prisma's
  default query engine is a native binary, which Workers cannot
  execute — Prisma's Workers-compatible paths require either the
  **Accelerate**/**Driver Adapters** approach (e.g.
  `@prisma/adapter-planetscale` / a generic MySQL driver adapter) or
  swapping the query engine for the WASM engine. **Not evaluated this
  phase** — a real spike (does this project's actual Prisma schema and
  query patterns work under a driver adapter, at what latency) is
  needed before this is more than a plausible option.
- Long-lived, stateful things NestJS does today (in-memory rate-limit
  buckets in `AuthRateLimitService`, the `Http5xxBurstDetector`'s
  in-memory window) do not survive a Worker's lack of persistent
  in-process memory across requests the way they do on a long-running
  Node process — these would need a Durable Object, KV, or D1-backed
  replacement, which is a real design change, not a config flag.
- Upside: no separate compute product, same account, same deployment
  model as the web app.

## Option B — Cloudflare Containers

- Runs the existing NestJS app largely as-is (a container image, not a
  rewrite) — closer to "lift and shift" than Option A.
- Keeps native Prisma, in-memory rate limiting, and the existing
  worker scripts' assumptions about a long-running process intact.
- Newer Cloudflare product; this account's current OAuth token is
  **missing** the `containers:write` scope (confirmed this phase via
  `wrangler whoami` — see `CURRENT_STATE.md`), so using it would need a
  fresh `wrangler login` with updated scopes first, in addition to
  whatever Containers-specific provisioning Cloudflare requires.
- Upside: smallest code-risk path for the highest-criticality part of
  the system (auth, payments, marketplace, game accounts).

## What this program does NOT do regardless of which option wins

- Never proposes D1 for the financial portal's data (see `README.md`'s
  program-wide constraints) — whichever runtime wins, its database
  connection is to an external MySQL-compatible database (`DATABASE_MIGRATION.md`),
  reached via Hyperdrive or an equivalent private path, never D1.
- Never weakens the in-memory abuse-protection model without an
  explicit, reviewed replacement — losing `AuthRateLimitService`'s
  effectiveness by accident during a runtime migration would be a real
  regression, not an acceptable side effect.

## Recommended next step (not a decision, a suggestion)

A small, isolated spike on Option A's Prisma-driver-adapter question
would resolve the single biggest unknown cheaply, before Phase 4 has to
choose. Not started this phase — flagged in `RISKS.md`.
