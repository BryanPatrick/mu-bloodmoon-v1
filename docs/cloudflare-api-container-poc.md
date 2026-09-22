# CF-API-02 — local Cloudflare Container POC

**Date:** 2026-09-22

**Branch:** `infra/cloudflare-api-container-poc`

**Source:** `f47f0b6da58f88a4dfe00018016d9f9307ed6e33`

## Status

`BLOCKED_BEFORE_EXECUTION`.

The required engine gate failed. Windows has no `docker`, `podman` or
`nerdctl` command, no matching service, and no engine in the known default
installation paths. Ubuntu on WSL2 also has no compatible engine. WSL2 itself
is present at version 2.7.14 and Ubuntu is configured as the default version-2
distribution. The reported Windows build is 19044, below Docker Desktop's
current Windows 10 requirement of 22H2 build 19045.

Per the phase safety rule, no container software was installed automatically.
Consequently no image, disposable database, SMTP sink or API container was
created, and none of the requested runtime results are claimed.

## Installation prerequisite

First update Windows to a supported build (Windows 10 build 19045+ or a
supported Windows 11 build). Then install Docker Desktop for Windows with the
WSL2 Linux-container backend using Docker's official instructions:
<https://docs.docker.com/desktop/setup/install/windows-install/>. The current
Docker documentation recommends per-user installation for most users and
requires WSL 2.1.5 or later. After Docker Desktop is started, run
`experiments/cloudflare-api-container-poc/check-prerequisites.ps1`. The POC may
resume only if the script reports an available Linux server and Docker Compose.

This is a user prerequisite, not authorization to deploy anything to
Cloudflare or production.

## Evidence not produced

Because the engine prerequisite failed, all of these remain `NOT_RUN`:

- Node 22 image build and image-size measurement;
- Linux Prisma 5.22 engine load and migration inspection;
- disposable MySQL/MariaDB migration replay;
- liveness/readiness with database up and down;
- synthetic login, JWT, refresh, protected route, bcrypt and 2FA;
- AES-256-GCM, billing PII, HMAC and hash compatibility in Linux;
- representative Serializable financial transaction;
- SMTP TCP/TLS delivery to a local sink;
- Multer/Sharp upload and ephemeral-disk demonstration;
- SIGTERM, Nest/Prisma/timer shutdown, restart and crash recovery;
- startup, health and readiness timing;
- local validation of the Cloudflare Container router.

The final item was partially unblocked without a container engine: Wrangler
4.136.2 generated binding/runtime types and a deployment dry run with
`--containers-rollout=none` succeeded. The router bundle measured 53.31 KiB
(13.09 KiB gzip), and Wrangler recognized the Durable Object binding and
Dockerfile. This validated configuration/bundling only; it did not build an
image, create a resource or contact production.

The Asaas Phase 7E/F/G implementation remains outside current main and was not
merged, copied or tested.

## Current shutdown gap

The current-main `apps/api/src/main.ts` does not call
`app.enableShutdownHooks()`. Therefore graceful Nest lifecycle handling on
SIGTERM is not yet proven and may require one minimal application change. That
change was not made without an executable container test to validate it.

## Interval/background service classification

The current API contains nine TypeScript services that create continuous
intervals:

| Service | Function | Classification |
|---|---|---|
| `AccountLifecycleBridgeService` | Dispatch/reconcile account anonymize and purge commands | `MUST_BECOME_DURABLE_BEFORE_PRODUCTION` |
| `AlertSweepService` | Dispatch persisted operational alerts | `SAFE_TEMPORARILY_IN_CONTAINER` |
| `GameBridgeHeartbeatAlertService` | Detect and notify heartbeat state | `NON_CRITICAL` |
| `PaymentReconciliationService` | Financial anomaly detection and optional provider polling | `MUST_BECOME_DURABLE_BEFORE_PRODUCTION` |
| `StoreAdminService` | Publish scheduled store products | `MUST_BECOME_DURABLE_BEFORE_PRODUCTION` |
| `GameProvisioningReconciliationService` | Recover/reconcile account provisioning | `MUST_BECOME_DURABLE_BEFORE_PRODUCTION` |
| `RoadmapService` | Roadmap scheduling/maintenance work | `NON_CRITICAL` |
| `VipSyncService` | Maintain Portal/GameServer VIP convergence | `MUST_BECOME_DURABLE_BEFORE_PRODUCTION` |
| `VipDeliveryService` | Deliver and retry VIP GameBridge jobs | `MUST_BECOME_DURABLE_BEFORE_PRODUCTION` |

Summary: 1 temporarily safe, 6 durable-required, 2 non-critical, 0 unknown.
Feature flags still default most consequential loops off, but default-off does
not turn a timer into durable scheduling.

## R2 boundary retained

The following local-file behaviors still require durable object storage before
horizontal scaling, sleeping instances or production Container migration:

- community media storage and static serving;
- guild emblems and banners;
- launcher-studio assets and media serving;
- generic local media storage;
- any generated/exported file expected to survive restart.

Read-only legacy configuration/export inputs may instead be immutable image
content when operationally appropriate. No asset was migrated in this phase.

## Database boundary retained

The external MySQL provider remains `UNDECIDED`. It must be MySQL-compatible,
support TLS, tested backups/restores, Prisma 5.22 behavior, existing transaction
and isolation semantics, monitoring, and acceptable latency to Brazil and the
future Cloudflare placement. D1 is not introduced for the financial core.

## Resume point

Once Docker Desktop is installed and the prerequisite script passes, resume
this same branch and execute the full local POC. Do not create paid Cloudflare
infrastructure merely to complete the local proof.
