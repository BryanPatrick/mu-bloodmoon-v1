# CF-API-02R — remote Cloudflare Container POC

**Date:** 2026-09-22

**Branch:** `infra/cloudflare-api-container-poc`

**Status:** `REMOTE_SHADOW_DEPLOYED_WITH_DB_BOOT_BLOCKER`

## Verified remote result

Cloudflare Workers Paid and Containers are available. Workers Builds is linked
to the private GitHub repository only for the isolated shadow Worker
`bloodmoon-api-container-shadow`, whose production branch is the dedicated
experiment branch. The deploy command rejects every other branch.

Cloudflare's managed builder successfully built the Node 22 multi-stage image,
installed dependencies, generated the Prisma Linux client, compiled NestJS,
published the image, updated the single Container application, and deployed the
Workers.dev shadow endpoint. The application uses the `lite` resource class,
`max_instances = 1`, no assigned IPv4, no custom domain, no production route,
and a ten-minute sleep policy.

Only disposable synthetic JWT, refresh, 2FA and database values were supplied.
Internet access inside the Container is disabled and every known operational,
financial, marketplace and provisioning loop is forced off in the shadow
environment. No production database, secret, SMTP service or hostname was
used.

## Runtime boundary discovered

Both `/api/health` and `/api/ready` reach the Worker but return HTTP 500 because
the Container process exits before opening port 8080. Remote logs report that
the Container crashed while Cloudflare was checking for ports. This matches the
current `PrismaService.onModuleInit()` behavior, which eagerly calls
`$connect()`. The intentionally nonexistent synthetic database therefore makes
boot-without-database impossible even though the health controller itself is
database-independent.

This is a valid POC finding, not permission to weaken readiness or to connect
production. Database, auth, filesystem-persistence, restart and graceful
shutdown tests remain blocked until an approved disposable MySQL/MariaDB is
available. Production `main.ts` still does not enable Nest shutdown hooks.

## Retained architecture boundaries

- The six durable-required interval services must not run as ordinary sleeping
  Container timers in production.
- Payments, marketplace, real-money, provisioning and reconciliation remain
  disabled.
- Local media and generated files still require durable object storage; local
  Container disk is not accepted as permanent storage.
- External MySQL remains undecided and must be tested with Prisma 5.22, TLS,
  transactions, isolation behavior, backups and acceptable latency.
- Production migration readiness is not claimed from this shadow POC.

## Recommended continuation

Keep the isolated resource as the permanent API shadow because it has no
production route and is cost-bounded. The next authorized phase should attach
an approved disposable MySQL/MariaDB, then repeat boot, health/readiness, auth,
filesystem replacement and SIGTERM tests. Bryan decides eventual cleanup.
