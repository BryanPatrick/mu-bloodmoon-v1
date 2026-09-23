# CF-API-02R2 — remote Cloudflare Container runtime POC

**Date:** 2026-09-23

**Branch:** `infra/cloudflare-api-container-poc`

**Status:** `REMOTE_SHADOW_RUNTIME_PASS_WITH_TIDB_LIMITATION`

## Verified remote result

Cloudflare Workers Paid and Containers are active. Workers Builds is linked to
the private GitHub repository only for the isolated
`bloodmoon-api-container-shadow` Worker. It has no custom domain, production
route or production database. The Container is limited to one `basic` instance
(1 GiB memory), uses port 8080 and sleeps after ten minutes.

The remote builder successfully produces the Node 22 multi-stage image,
generates the Prisma Linux client, compiles NestJS and deploys the image. The
runtime image explicitly installs OpenSSL and the public CA certificate bundle;
the latter fixed the observed Prisma `P1011` TLS certificate-chain failure when
connecting to the disposable TiDB database. The Worker allows outbound network
access only because this test database is external.

Only disposable TiDB data and synthetic JWT, refresh, 2FA and session secrets
were used. Every known operational, financial, marketplace and provisioning
loop remains forced off. No production database, secret, DNS, SMTP service,
payment provider or hostname was used.

## Runtime evidence

- `/api/health` returned 200 with `{"status":"ok"}`.
- `/api/ready` returned 200 with `{"status":"ready"}`.
- The first measured health request took 7.113 s. Warm health and readiness
  requests took 0.785 s and 0.901 s respectively.
- Synthetic registration/login, refresh, protected profile and logout passed.
- Synthetic TOTP setup and verification passed; no credential or token was
  logged.
- Image-build crypto checks passed for AES-256-GCM, JWT, bcrypt, TOTP and QR.
  The application 2FA and game-credential-envelope suites passed 18/18 tests.
- Billing PII application crypto is not present on this branch, so it was not
  claimed or tested.
- Disposable-DB transaction, rollback and unique-key idempotency checks passed.
- A harmless `/tmp` marker existed before replacement and was absent after the
  Container restart, proving local filesystem ephemerality.
- SIGTERM reached the Nest child, Prisma disconnected, the process did not hang,
  and the Container stopped with exit code 0. Health returned after replacement
  in 11.179 s and the database reconnected.

The temporary authenticated lifecycle probe and its dedicated shadow secret
were removed after validation. The ordinary API entrypoint is restored.

## Database boundary

The runtime POC uses a disposable TiDB Serverless database. Prisma connection,
read/write, transaction, rollback, unique-key behavior, boot and auth work on
that target. TiDB rejected portions of the literal canonical migration replay,
so this result is not MySQL 8 migration equivalence.

Canonical conclusions:

- `TIDB_RUNTIME_POC = PASS`
- `MYSQL_8_MIGRATION_REPLAY = NOT_PROVEN`
- MySQL `SERIALIZABLE` equivalence is not claimed.
- MySQL named-lock (`GET_LOCK`) equivalence is not claimed.

Final production-database proof still requires a disposable external MySQL 8
compatible target and a literal replay of all canonical migrations.

## Retained architecture boundaries

- The six durable-required interval services must not run as ordinary sleeping
  Container timers in production.
- Payments, marketplace, real-money, provisioning and reconciliation remain
  disabled.
- Local media and generated files require durable object storage; Container
  disk is ephemeral and must not hold persistent data.
- The Workers.dev shadow is publicly addressable. Configure Cloudflare Access
  before using it with broader or longer-lived QA credentials.
- This POC is not production authorization and does not change `main`.

## Recommended continuation

Keep the isolated shadow for follow-up work. The next database-validation phase
should use a disposable real MySQL 8 compatible external database, replay every
canonical migration literally, then repeat the narrow health, auth, transaction
and restart checks. Do not connect production until that gate passes.
