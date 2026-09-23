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

## CF-API-02R3 — final MySQL 8 runtime validation (2026-09-23)

The remaining database-runtime gate is now proven. A wholly disposable local
MySQL 8.0.46 instance applied the 55 canonical Prisma migrations from zero with
`prisma migrate deploy`; `prisma migrate status` was clean and `prisma migrate
diff` reported no difference. No `db push`, baseline, production database or
production credential was used. The instance was shut down and its temporary
directory removed after validation.

The shadow was also temporarily rebuilt around a real MySQL 8.4.11 process in
the same disposable Cloudflare Container microVM. This was a validation harness,
not a proposed production topology. It replayed all 55 migrations, booted Nest,
returned 200 from health and readiness, and passed synthetic registration,
login, TOTP setup/verification, TOTP login, refresh, protected profile and
logout. It also passed Serializable commit, rollback, unique-key idempotency,
real concurrent row-lock serialization and `GET_LOCK`/`RELEASE_LOCK` checks.

Measured remote timings were 42.222 s for the first cold boot (including MySQL
initialization, migration replay and Nest startup), 66.418 s for the controlled
restart, 0.746–1.199 s for warm health and 0.758–0.787 s for warm readiness.
SIGTERM reached the application, the database was shut down and the Container
exited with code 0; the existing Prisma shutdown hook remains present.

The validation-only MySQL image, supervisor, diagnostics endpoints and control
binding are not retained in the candidate. The only permanent runtime change is
the Prisma `rhel-openssl-3.0.x` binary target needed by the Oracle Linux 9 image.

Billing PII AES-256-GCM remains isolated on
`payments/asaas-production-readiness`, commit
`1e6b0768777a517380c22a5854465756c9d908fd`, in
`billing-crypto.ts` and `billing-profile.service.ts`. Its isolated unit suite
passed 19/19 without merging or activating payments. A future Cloudflare
candidate that incorporates Asaas billing profiles must deliberately include
that implementation.

Cloudflare Access was evaluated in the live dashboard. The shadow is public and
the account reports that a Zero Trust organization/authentication domain must be
set up before Worker sign-in protection can be enabled. The prepared narrow
configuration is: protect only `bloodmoon-api-container-shadow` (all traffic),
allow Bryan's account email, and add a separate Service Auth policy/service
token for automated checks. No account-wide policy, production hostname or
Access credential was created. Applying this configuration is intentionally
deferred until onboarding and credential creation are explicitly authorized.
