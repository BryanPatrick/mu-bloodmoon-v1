# CF-API-01 — NestJS runtime feasibility: Workers vs Containers

**Date:** 2026-09-22

**Branch:** `infra/cloudflare-api-feasibility`

**Reviewed commit:** `b5a4321d1ccb88845fec767a5ab8537dc61a562d` (authorized Phase 17R fast-forward from the originally named main)

**Scope:** local/read-only architecture investigation; no production, DNS, database, provider, payment, push, or merge action.

## Outcome

Cloudflare Containers is the lower-risk first runtime for the **current** API.
It preserves Node 22, Express, Prisma's binary engine, native `sharp`, SMTP and
the current continuously-running worker model. Workers native is technically
viable only after a substantial platform adaptation: Fetch-based HTTP entry,
newer engine-less Prisma plus a MySQL adapter/Hyperdrive validation, durable
job triggers, R2-backed media, image-processing replacement, and a review of
every connection-scoped financial lock.

This does not select a production database host and does not authorize a
migration. D1 is explicitly excluded for the financial core.

## Evidence boundary

`docs/cloudflare-migration` did not exist in the reviewed branch. This report
therefore does not adopt conclusions from the concurrent web-shadow worktree.
The current main contains Mercado Pago payment code but does not contain the
unmerged Asaas Phase 7E/F/G implementation. The Asaas assessment below is a
read-only review of branch `payments/asaas-production-readiness` at
`e14c76a32aa27a213c4fb6af4d4f49055f3fd6a1`; it is not a claim about current
main or production.

## Current API inventory

| Area | Current fact | Workers-native classification |
|---|---|---|
| Runtime | Node 22.17.0 is pinned in CI/deploy documentation; NestJS 10.4.22, CommonJS API build | `REQUIRES_ADAPTER` |
| HTTP | `NestFactory.create(AppModule)`, `@nestjs/platform-express` 10.4.22, Express 4.22.1, Helmet, `app.listen()` | `REQUIRES_ADAPTER` |
| API size | 298 source files (273 TypeScript), 51 controllers | high adaptation surface |
| Prisma | 5.22.0, `prisma-client-js`, Rust binary targets, singleton connect/disconnect lifecycle | `UNSUPPORTED` as-is; `REQUIRES_ADAPTER` after upgrade |
| Database | Prisma MySQL; no separately installed `mysql2` driver in the API | `REQUIRES_ADAPTER` |
| Database usage | 93 Prisma-related files; 24 files use `$transaction`; one explicit Serializable path; five services use connection-scoped `GET_LOCK`/`RELEASE_LOCK` | high-risk semantic validation required |
| Crypto | 36 files use `node:crypto`; AES-256-GCM, hashes, HMAC, UUID/random bytes; `AsyncLocalStorage` for request context | `SUPPORTED_WITH_NODE_COMPAT` |
| Passwords | `bcryptjs` 3.0.3, cost 12 (pure JavaScript) | `SUPPORTED_WITH_NODE_COMPAT`; CPU limits must be measured |
| JWT | Nest JWT/jsonwebtoken for access, refresh and step-up tokens | `SUPPORTED_WITH_NODE_COMPAT`; empirical auth suite required |
| 2FA | `otplib`; AES-256-GCM encrypted TOTP secret and bcrypt recovery codes | `SUPPORTED_WITH_NODE_COMPAT`; empirical vectors required |
| Billing PII | AES-256-GCM exists only on the unmerged Asaas branch reviewed for 7E/F/G | `SUPPORTED_WITH_NODE_COMPAT`; AAD/key-version vectors required |
| Filesystem | 14 runtime files use `node:fs`/`node:path`; local media, launcher assets, guild media, config/export reads | `REQUIRES_ADAPTER` because Workers VFS is request-local/non-persistent |
| Upload/image | Multer/FileInterceptor, 8 MiB multipart uploads, native `sharp` 0.34.5 | multipart `REQUIRES_ADAPTER`; `sharp` `UNSUPPORTED` in current form |
| SMTP | Nodemailer 9.0.5 opens SMTP transport from environment configuration | `REQUIRES_ADAPTER`/`UNKNOWN`; port 25 is blocked and Nodemailer was not proven under Workers |
| Turnstile | ordinary HTTPS `fetch()` to Siteverify with timeout/hostname checks | `SUPPORTED` |
| Mercado Pago | HTTPS provider calls; durable webhook unique key and reconciliation | transport `SUPPORTED`; scheduling/DB path `REQUIRES_ADAPTER` |
| Asaas | not in current main; Phase 7E/F/G branch has durable inbox poller and leases | architecture `REQUIRES_ADAPTER` on Workers |
| Health | `GET /api/health` liveness and DB-backed `GET /api/ready` readiness | `SUPPORTED` after HTTP/DB adaptation |
| Timers/jobs | 9 TypeScript services use `setInterval` (10 matches including README); standalone marketplace/reconciliation scripts also exist | `UNSUPPORTED` as a reliable Workers process model |
| Child processes | no `child_process` use in the request-serving API source; operator scripts do use it | API `SUPPORTED`; scripts stay outside Worker |
| Raw sockets | no direct socket use in request-serving API source; Prisma/SMTP libraries own sockets | DB/SMTP need separate adapters/proofs |
| Native dependencies | Prisma engines and `sharp` native binaries | `UNSUPPORTED` as-is |

Cloudflare now provides native or compatible Node APIs for crypto,
AsyncLocalStorage, Buffer, HTTP, net, path, process and timers. That does not
turn a conventional long-running Express server into a Worker: a Worker still
needs a Fetch handler and invocation-scoped lifecycle. Its filesystem is a VFS:
bundled files are read-only and `/tmp` is memory-backed, request-local and not
persistent. Sources: [Node compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/), [Workers filesystem](https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/), [Workers crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/).

## Workers native assessment

### Bootstrap and Nest

The current entry point opens an Express TCP listener, mounts two local static
directories, and initializes the complete application graph. A Worker instead
exports `fetch`, `scheduled`, or queue handlers. Nest domain providers could be
reused, but the Express adapter, middleware/response assumptions and request
lifecycle need an adapter or route extraction. The local proof confirms the
distinction:

- minimal Fetch Worker bundled (21.05 KiB), booted under local `workerd`, and
  returned HTTP 200 from `/health`;
- importing the current `AppModule` failed during bundling before runtime,
  because Nest's dynamic optional WebSockets/Microservices requires were not
  resolvable. Marking those externals would only expose later blockers; it does
  not solve Prisma binaries, native `sharp`, Express listening, storage, or
  lifecycle assumptions.

Workers impose a 1-second global startup limit, 128 MiB memory, plan-specific
CPU budgets, and a 64 MiB uncompressed bundle limit. The 298-file application
graph and bcrypt/image work must be benchmarked rather than assumed safe.
Source: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

### Prisma, MySQL and Hyperdrive

The current Prisma 5.22 generated client ships Rust engines for Linux targets.
It is not a Worker deployment model. Prisma's documented edge model requires an
engine-less client and a driver adapter; engine-less support became GA in Prisma
6.16, so this is an ORM upgrade plus generated-client/lifecycle change, not a
flag flip. Cloudflare Hyperdrive's MySQL support is GA and supports `mysql2`
3.13+ under Node compatibility, but current API code does not use that driver
directly. Sources: [Prisma Cloudflare deployment](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/edge/deploy-to-cloudflare), [Hyperdrive MySQL](https://developers.cloudflare.com/hyperdrive/examples/connect-to-mysql/).

Future Workers experiment:

`Worker -> Hyperdrive -> externally reachable private/protected MySQL`

This requires a future database endpoint reachable by Hyperdrive; localhost,
private cPanel-only access and the current provider DB are not candidates in
this phase. Migrations remain an out-of-band CI/operator job using the direct
database URL, never a Worker startup side effect.

Before any financial claim, prove on the exact target database and adapter:
interactive transactions, requested Serializable isolation, rollback behavior,
unique-key conflict handling, connection pinning, and named-lock semantics.
Hyperdrive pooling can invalidate assumptions that rely on a specific physical
connection; the five `GET_LOCK` flows should be redesigned as durable DB leases
or otherwise proven end to end, not presumed equivalent.

### Background work and Asaas inbox

`setInterval` is not a durable scheduler in an evictable isolate. Architecture
only:

- periodic detection/reconciliation: Cron Trigger invokes a bounded batch;
- durable event fan-out/single-step asynchronous work: Queue;
- multi-step retry state machine only when needed: Workflow;
- Durable Object only for a real single-writer/coordination requirement, not as
  a default replacement for MySQL locks.

Cloudflare documents Cron Triggers as scheduled invocations and Queues as the
buffer for background jobs. Sources: [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

The unmerged Asaas 7E worker polls every 10 seconds, claims a DB row with an
atomic conditional update, owns/renews a 120-second lease, recovers expired
leases, retries with backoff, and relies on a Serializable wallet transaction
plus a unique idempotency key. Under Workers, the HTTP webhook ACK can persist
the minimal inbox row, but the continuous poller must become a Cron/Queue
consumer. Lease recovery remains valid only if the exact database atomic-update
and transaction tests pass. A one-minute Cron alone cannot reproduce a
10-second latency target; Queue delivery from the ACK path is the natural fast
path, while a Cron sweep remains the recovery path. This architecture was not
implemented here.

### Files, uploads, SMTP and crypto

Local media/config directories cannot be durable Worker storage. Published
assets and uploads need R2 (or another external object store); static read-only
configuration can be bundled only when immutable. `sharp` needs Cloudflare
Images/Media Transformations, a separate image service, or a container path.

Nodemailer is not accepted as compatible merely because `node:net` exists.
Workers supports outbound TCP, but blocks port 25 by default and TLS is only
partially Node-compatible. Use an HTTPS transactional-email provider adapter,
or prove the exact SMTP host/port/TLS/Nodemailer combination locally and in a
non-production Worker. Source: [Workers TCP sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).

AES-256-GCM, HMAC, hashing and random generation are supported by `node:crypto`.
JWT, otplib and bcryptjs remain empirical compatibility/performance gates;
existing ciphertext, AAD, token and recovery-code vectors must round-trip
unchanged.

## Cloudflare Containers assessment

Cloudflare Containers runs an ordinary image behind a Worker/Durable Object
router and explicitly supports full filesystems, native libraries and existing
runtime images. The current Node 22/Nest/Express/Prisma process can therefore
run with minimal application change: listen on the injected port, expose 8080,
retain `/api/health` and `/api/ready`, inject secrets as environment variables,
and allow egress to the future MySQL/SMTP/provider endpoints. Source:
[Cloudflare Containers overview](https://developers.cloudflare.com/containers/).

The prepared proof uses Node 22, installs the locked monorepo, builds the API,
listens on port 8080, and provides a one-instance Worker router. It was not
built because `docker`, `podman`, and `nerdctl` were absent. The first container
experiment must optimize the image after functional proof; the current
single-stage Dockerfile intentionally favors fidelity.

Containers do not make local state durable. Their disk is ephemeral. Existing
local media and launcher/guild assets must still move to object storage before
horizontal scaling or sleep/restart is allowed. Timers run while an instance is
alive, but `sleepAfter`, eviction, rollout and scale-to-zero mean they are not a
durability guarantee. For a first proof, keep an instance continuously alive or
move critical jobs to external schedules. The Asaas lease/restart model can run
unchanged inside a continuously running container, but Queue/Cron recovery is
still the stronger target architecture.

Rollouts are not atomic: Worker routing can activate before image rollout
finishes; SIGTERM is sent before replacement, then SIGKILL after the drain
window; cold start is on the order of seconds and requests can wait/fail.
Health/readiness, graceful shutdown, version compatibility and rollback must be
tested explicitly. Disk is ephemeral. Source: [Container rollouts](https://developers.cloudflare.com/containers/configuration/rollouts/).

Secrets should use Cloudflare secret bindings/secret management and be passed
only to the container instance; never bake `.env` or credentials into the
image. Database migrations stay a separately authorized release gate.

## Operational comparison

| Concern | Workers native | Containers |
|---|---|---|
| Cold start | isolate-oriented, but 1-second startup validation and large graph risk | seconds possible; image/startup/readiness sensitive |
| Current process model | incompatible | largely preserved |
| Deploy/rollback | small Worker versions after rewrite | image + Worker rollout; mixed-version window must be handled |
| Logging/observability | Workers logs/traces; context adaptation | normal stdout plus Workers/container telemetry |
| Jobs | Cron/Queue/Workflow rewrite required | timers can run but are not durable across stop/scale; external scheduling still advised |
| Secrets | Worker secrets/bindings | secret binding to container environment |
| DB | Hyperdrive + newer Prisma/adapter, deep semantics proof | direct MySQL first; Hyperdrive optional only if architecture supports it |
| Cost category | request/CPU/bindings usage | Workers Paid plus container instance resources; no price assumed |
| Vendor lock-in | high for bindings, Queue, Workflow, DO | medium; Docker image remains portable, routing/lifecycle is Cloudflare-specific |
| Maintenance | broad code/platform split | container/image patching and startup/rollout operations |

## Migration size

`WORKERS_NATIVE = HIGH`.

The lower bound touches the entry/platform layer, Prisma generator/client and
93 DB-related files for validation, 9 timer services, 14 filesystem/path files,
4 upload/Sharp files, SMTP, request-context handling, and all 51 controllers in
HTTP regression. Not every file requires editing, but all are in the proof
surface. A realistic implementation is multiple phases, not one patch.

`CONTAINERS = LOW_TO_MEDIUM`.

Initial lift-and-shift is approximately 4–10 infrastructure/bootstrap files
(Dockerfile, ignore/build config, Worker router, port/shutdown/readiness config,
CI/release runbook). Application changes can be near zero. Durable media and
job hardening are separate cross-runtime work, affecting the same storage/job
modules but not required to prove the API boots.

## Transition and edge gateway

A staged path is technically sound:

1. Prove the unchanged API in a container with a disposable MySQL/MariaDB.
2. Move persistent media to R2 and critical timers to durable triggers.
3. Cut only low-state, edge-suitable routes into Workers after contract tests.

This reduces simultaneous changes and preserves a portable image. It does not
commit the project to permanent Containers.

An interim edge Worker gateway in front of the existing API is also feasible
for request IDs, coarse rate limiting, security headers, routing and sanitized
edge observability. It must not cache authenticated/private responses, rewrite
payment webhook bodies/signatures, hide origin readiness, or become a second
authorization source. It adds an extra failure layer and does not remove cPanel
dependency, so its value should be proven on a non-production hostname first.

## Required pre-cutover test plan

1. Boot, SIGTERM/drain, crash, restart, cold-start, liveness and DB readiness.
2. Registration/login/logout, access/refresh/session revocation, RBAC and step-up
   authentication.
3. 2FA setup/verify/recovery/key-version migration and ciphertext vectors.
4. Turnstile success/failure/timeout/hostname validation.
5. Wallet concurrency, exactly-once ledger writes, unique-key retries,
   Serializable rollback and transfer isolation against disposable MySQL and
   MariaDB matching the future provider version.
6. Payments disabled by default; separate authorized sandbox tests for enabled
   checkout, signature/auth rejection, duplicate webhook, crash boundaries,
   provider timeout and reconciliation.
7. Asaas 7E lease claim, heartbeat, lost ownership, expiry, retry, restart and
   exactly-one credit if that branch is ever merged.
8. Mercado Pago webhook/reconciliation equivalence.
9. SMTP connection, TLS, timeout, provider rejection, retry and secret redaction.
10. Multipart limits, image validation/transformation, object durability and
    authorization for every upload/read path.
11. Every background job with duplicate scheduler invocations, overlapping
    workers, crash/retry, clock skew and backlog.
12. Full API regression, route/response contract diff, load/latency, CPU/memory,
    logs/traces/alerts, secret scan, migration replay and rollback rehearsal.

## Next experiment

Run the prepared container proof on a machine with Docker-compatible tooling,
using Node 22 and a disposable MySQL/MariaDB. Prove `/api/health`, `/api/ready`,
graceful shutdown, cold start, one representative auth flow, one Serializable
wallet transaction, SMTP to a local test sink, an upload through temporary
object storage, and one durable-job crash/restart. This yields the most decision
value without touching production or committing to a database provider.
