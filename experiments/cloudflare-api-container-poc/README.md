# Cloudflare Container API proof

This directory defines the non-production Worker router for the current
NestJS/Express/Prisma API. Cloudflare Workers Builds builds the repository-root
`Dockerfile.cloudflare-poc`; local Docker is not required.

The remote proof runs one `basic` (1 GiB) Node 22 Container on port 8080, with a
ten-minute sleep policy, no custom domain and no production route. Outbound
network access is enabled solely for the disposable external TiDB database.
Every known operational, financial, payment, marketplace and provisioning flag
is forced off.

The runtime image installs OpenSSL and the public CA certificate bundle. Health
and readiness return 200, synthetic auth and TOTP pass, transaction/rollback/
unique-key semantics pass, SIGTERM closes Prisma cleanly, replacement restores
health, and `/tmp` data does not survive replacement.

TiDB is only a runtime feasibility target. It is not MySQL 8 migration proof:
`MYSQL_8_MIGRATION_REPLAY = NOT_PROVEN`. A disposable real MySQL 8 compatible
target is still required before any production-readiness conclusion.

The lifecycle control used for the one-time filesystem/SIGTERM test and its
secret were removed. The shadow remains publicly addressable; Cloudflare Access
is recommended before broader QA use.
