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

**Update, Phase CF-INTEGRATION-02 (2026-09-23) — `CONTAINER_RUNTIME_PROVEN
= YES`**: the container proof (`CF-API-02R`) has run for real. A
concurrent, independent Codex branch (`infra/cloudflare-api-container-poc`,
tip `faee869e`) deployed the actual NestJS/Prisma API via Cloudflare
Workers Builds (no local Docker/Podman/nerdctl needed) to an isolated
shadow Container: health/readiness returned 200, synthetic register/
login/refresh/protected-route/logout and TOTP setup/verify passed,
container-disk ephemerality was proven directly (a `/tmp` marker
absent after a restart), and `SIGTERM` reached the Nest process
cleanly with a 0 exit code. **The database gate — this program's own
hardest bar — closed for real**: 55 migrations replayed against a
disposable MySQL 8.0.46/8.4.11 instance inside the same Container,
proving Serializable commit/rollback, unique-key idempotency, and real
concurrent `GET_LOCK`/`RELEASE_LOCK` mutual exclusion.

This program then **independently code-reviewed that branch's full
diff** against `main` (25 files, but only 2 real changes inside
`apps/api/src`/`prisma` — `app.enableShutdownHooks()` + an explicit
`'0.0.0.0'` bind, and one additive Prisma `binaryTargets` entry) and
**independently confirmed, by direct `git diff --name-status`, that
zero POC-only route/secret/endpoint remained anywhere in the final
`apps/api/src` tree** — not merely trusting the branch's own cleanup
claims. Those 2 runtime changes plus the Container image definition
(`Dockerfile.cloudflare-poc`) were integrated onto a new branch,
`infra/cloudflare-migration-candidate` (based on the completed storage/
DB integration work), and the database gate was **independently
re-proven a third time** — a fresh disposable MySQL 8.0.46 instance,
all 56 *current* migrations (the Codex branch's "55" predates the
`admin_content_storage_provider` migration), zero drift — alongside
242 real-DB e2e tests (beta-critical, community, guilds, launcher
content) and 127 unit tests, all passing. Full detail:
`CLOUDFLARE_MIGRATION_CANDIDATE.md`.

**What this is not**: not a `main` merge, not a live redeploy of this
exact integrated candidate to Cloudflare (deliberately not attempted —
would consequentially replace Codex's own already-proven shadow
Container without fresh authorization), and not production
authorization — the Codex document's own words remain accurate: "this
POC is not production authorization." Billing/payments (Asaas) crypto
remains deliberately excluded, isolated on its own separate,
also-unmerged branch.

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
  Containers/VM path for that specific job. **Update, Phase CF-R2-02/03/04**:
  this bullet is about the *native-Workers* path specifically (`sharp`
  has no Workers equivalent regardless of storage backend) — the
  separate, Containers-relevant question (local disk being ephemeral
  under Containers) was tracked in `RISKS.md` CF-R12 and is now
  **RESOLVED, real-evidence-backed** (`CODE_READY = YES`, real E2E/R2
  proof `CF-R2-04`): community, guild, launcher-studio, and
  admin-content all have a working `local`/`r2` `StorageProvider`
  switch, an exhaustive filesystem re-audit found zero remaining raw,
  unabstracted `node:fs` write paths anywhere in `apps/api/src`
  (`CF-R2-03`), and all four domains' real R2 paths were proven
  end-to-end against a real, non-production R2 bucket with a real
  test-scoped credential, alongside the CF-R2-03 Prisma migration
  applied cleanly to a real disposable MySQL 8.0.46 instance
  (`CF-R2-04`). `PRODUCTION_ACTIVATED = NO`
  still — no domain is actually switched to `r2` anywhere real, which
  is a separate, later, explicitly-authorized activation step, not an
  architecture blocker for `CF-API-02R`.
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
not merged here) **but not run**: ~~Docker/Podman/nerdctl were
unavailable in that investigating environment~~ — **correction, Phase
CF-R2-01 (2026-09-22):** local container tooling is no longer assumed
necessary. The approved direction is to run this proof via Cloudflare's
own remote build (Workers Builds) instead of local Docker/Podman/
nerdctl — that's what the `CF-API-02R` naming (the `R` suffix, added
this phase) now specifically denotes. Running it — with a disposable
MySQL/MariaDB, proving boot, health/ready, graceful shutdown, one auth
flow, one Serializable wallet transaction, SMTP to a local test sink,
and one upload through temporary object storage — is the next concrete
step (`CF-API-02R`, see `MIGRATION_ROADMAP.md`). Not run this phase —
CF-R2-01 is the R2/storage phase, not the Container phase.

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

**Update, Phase CF-INTEGRATION-02 (2026-09-23)**: the container proof
this section previously recommended running has run, and its findings
are now reconciled with this program's own storage/DB work on
`infra/cloudflare-migration-candidate` (`CLOUDFLARE_MIGRATION_CANDIDATE.md`).
The recommended next step is a real decision from Bryan: whether to
validate this exact candidate against a live Cloudflare redeploy, and/or
whether to begin planning a `main` merge — neither attempted or
recommended by this phase itself. In parallel, external MySQL vendor
selection remains fully actionable and independent of that decision —
see `DATABASE_MIGRATION.md` and `RISKS.md`.
