---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# API migration (apps/api → Cloudflare)

**Decided (2026-09-22, Phase CF-01B)**: `API_INITIAL_MIGRATION_TARGET =
CLOUDFLARE_CONTAINERS`. `API_WORKERS_NATIVE = FUTURE_OPTIMIZATION` — not
rejected, not scheduled. See `DECISIONS.md` for Bryan's exact words.
**Containers is not yet production-proven** — the container proof
itself has not been run (Docker/Podman/nerdctl were unavailable in the
investigating environment); this is a direction, not a completed
migration.

This document folds in the findings of a concurrent, independent
investigation (`docs/cloudflare-api-feasibility.md`, branch
`infra/cloudflare-api-feasibility`, commit `f47f0b6d`, dated
2026-09-22) that ran in parallel with Phase CF-01's own web-shadow
work. **Its code was not merged or adopted** — only its documented
findings, spot-checked this phase against the real `apps/api` source
(package.json versions, `setInterval`/`GET_LOCK`/`sharp`/`node:fs`
usage counts) before being folded in here. Where a claim below is that
report's own assessment rather than something re-verified independently
this phase, it's marked as such.

## Why this is harder than the web migration

`apps/api` is a full NestJS application: Prisma (MySQL, native binary
engine), long-lived service classes, `AsyncLocalStorage`-based request
context (`RequestContextService`, Phase 17R), in-memory rate-limit and
5xx-burst state, `setInterval`-based background jobs, connection-scoped
`GET_LOCK`/`RELEASE_LOCK` locking (5 services), file-serving middleware
for community/guild media, native `sharp` for images, and direct TCP
connections to MySQL, SMTP, and payment providers. None of this
disqualifies Cloudflare, but none of it is a drop-in the way `apps/web`
was.

## Option A — Native Cloudflare Workers: `FUTURE_OPTIMIZATION`, not rejected

Classified `HIGH` migration size (source: `docs/cloudflare-api-feasibility.md`,
spot-checked). Concretely, in the order a migration would have to
tackle them:

- **HTTP/Nest bootstrap** — the current entry point opens an Express
  TCP listener and mounts two local static directories; a Worker
  instead exports a `fetch` handler. A minimal Nest-Fetch adapter is
  the known pattern, but importing the *current* `AppModule` as-is
  failed to bundle under `workerd` in that report's own local proof
  (Nest's optional WebSockets/Microservices dynamic requires weren't
  resolvable) — not yet proven working, only attempted.
- **Prisma** — ships a Rust binary query engine (`@prisma/client
  ^5.0.0`, confirmed in `apps/api/package.json` this phase), which
  Workers cannot execute. An engine-less client + driver adapter is
  Prisma's real Workers path, but engine-less support only reached GA
  in Prisma 6.16 — this is a real ORM upgrade with a generated-client
  and lifecycle change, not a flag flip. Cloudflare Hyperdrive's MySQL
  support is GA and works with `mysql2` 3.13+, but the current API
  doesn't use that driver directly today.
- **Financial semantics** — 24 files use `$transaction` (one explicit
  Serializable path), and 5 services use connection-scoped
  `GET_LOCK`/`RELEASE_LOCK` (both counts confirmed this phase by direct
  grep of `apps/api/src`). Hyperdrive's connection pooling can
  invalidate assumptions that depend on a specific physical connection
  — the `GET_LOCK` flows in particular would need to become durable DB
  leases or be otherwise proven equivalent, never presumed.
- **Background jobs** — 10 files use `setInterval`, which is not a
  durable scheduler in an evictable isolate (confirmed this phase by
  grep). The real replacements are Cron Triggers (periodic batches),
  Queues (durable fan-out), Workflows (multi-step retry), and Durable
  Objects only for genuine single-writer coordination — never a default
  stand-in for a MySQL lock.
- **Filesystem/uploads/images** — community/guild media and launcher
  assets read local disk (`node:fs`, ~11–14 files depending on how
  `node:path`-only files are counted); Workers' filesystem is a
  request-local, non-persistent VFS. Native `sharp` (image processing)
  has no Workers equivalent as-is — needs Cloudflare Images/Media
  Transformations, a separate image service, or staying on a
  Containers/VM path for that specific job.
- **SMTP** — Workers supports outbound TCP but blocks port 25 by
  default, and Nodemailer's exact host/port/TLS combination has not
  been proven under Workers. An HTTPS transactional-email provider, or
  a proven Nodemailer configuration, would be needed.
- **What's already fine**: `node:crypto` (AES-256-GCM, HMAC, hashing,
  `AsyncLocalStorage`), `bcryptjs`, JWT, `otplib`, and Turnstile's plain
  `fetch()` calls are all `SUPPORTED_WITH_NODE_COMPAT` — real
  compatibility, still needing empirical vectors (existing ciphertext,
  tokens, and recovery codes must round-trip unchanged) before trusting
  them in production.
- **Upside, unchanged from before**: no separate compute product, same
  account, same deployment model as the web app, once the above is
  actually done.

Workers' own platform limits (1-second global startup, 128 MiB memory,
64 MiB uncompressed bundle) apply to whatever graph size Option A ends
up with — this project's 298-file API has not been benchmarked against
them.

## Option B — Cloudflare Containers: the chosen initial target

Classified `LOW_TO_MEDIUM` migration size (same source, spot-checked).
Containers run an ordinary container image behind a Worker/Durable
Object router, with full filesystem and native-library support — the
current Node 22/Nest/Express/Prisma/`sharp` process can run largely
unchanged: listen on the injected port, expose it, keep
`/api/health`/`/api/ready`, inject secrets as environment variables via
Cloudflare's own secret bindings (never baked into the image).

**Real constraints, not glossed over**:
- Container disk is **ephemeral** — local media/launcher/guild assets
  still need to move to R2 before horizontal scaling or scheduled
  sleep/restart is safe, same as Option A eventually needs.
- `setInterval`-based timers run fine while an instance stays alive,
  but `sleepAfter`, eviction, rollout, and scale-to-zero mean a running
  timer is not a durability guarantee — for a first proof, keep an
  instance continuously alive or move critical jobs to external
  schedules.
- Rollouts are **not atomic**: routing can activate before an image
  finishes rolling out; the platform sends SIGTERM before replacement,
  then SIGKILL after the drain window; cold start is on the order of
  seconds. Health/readiness, graceful shutdown, and rollback all need
  explicit testing, not assumed correct.
- This account's OAuth token is missing `containers:write` (confirmed
  this phase via `wrangler whoami`) — using Containers needs a fresh
  `wrangler login` with updated scopes first.

**A container proof was prepared** (Dockerfile + minimal Worker router,
`experiments/cloudflare-api-container-poc/` on the feasibility branch —
not merged here) **but not run**: Docker/Podman/nerdctl were
unavailable in that investigating environment. Running it — with a
disposable MySQL/MariaDB, proving boot, health/ready, graceful
shutdown, one auth flow, one Serializable wallet transaction, SMTP to a
local test sink, and one upload through temporary object storage — is
the next concrete step (`CF-API-02`, see `MIGRATION_ROADMAP.md`).

## What this program does NOT do regardless of runtime

- Never proposes D1 for the financial portal's data (`README.md`'s
  program-wide constraint) — the database connection is to an external
  MySQL-compatible database (`DATABASE_MIGRATION.md`), whether reached
  via Hyperdrive (if Workers) or a direct connection (if Containers).
- Never weakens the in-memory abuse-protection model
  (`AuthRateLimitService`, `Http5xxBurstDetector`) without an explicit,
  proven replacement.
- Never treats a payment/wallet code path as safe on a new runtime
  without re-proving its exact transaction/locking/idempotency
  behavior against the real target database — this applies to both
  options equally.

## Suggested pre-cutover test plan (for whichever runtime, adapted from the feasibility report)

Boot/shutdown/crash/cold-start/readiness; full auth regression
(register/login/logout/refresh/RBAC/step-up); 2FA setup/verify/recovery
with real ciphertext vectors; Turnstile success/failure/timeout;
wallet concurrency and Serializable rollback against a disposable
MySQL/MariaDB matching the eventual target version; payments-disabled-
by-default plus a separately authorized sandbox pass if a real provider
sandbox is exercised; SMTP connection/TLS/retry/secret-redaction;
upload/image authorization and durability; every background job under
duplicate-invocation and crash/retry; full route/contract regression,
load/latency, and a secret scan. None of this has been run yet — it's
the shape of the next real validation phase, not a completed checklist.

## Recommended next step

Run the prepared container proof (`CF-API-02`) on a machine with
working container tooling. This yields the most decision value without
touching production or committing to a database provider — see
`RISKS.md` and `PHASE_STATUS.md`.
