---
status: ACTIVE
category: infrastructure
lastVerified: 2026-09-23
---

# API migration — CF-API-02R3 runtime evidence

Cloudflare Containers remains the initial API migration target. On the isolated
`bloodmoon-api-container-shadow` Worker, a disposable co-located MySQL 8.4.11
validation harness booted the real Nest/Prisma API and passed health, readiness,
registration, login, TOTP, refresh, protected-route and logout checks. The
harness is test-only and is not a recommended production database architecture.

The Prisma client now includes `rhel-openssl-3.0.x`, required by the Oracle
Linux 9 runtime image. Validation-only supervisors, endpoints and secrets are
not part of the final candidate.

Cloudflare Access is not active: the account has not completed Zero Trust
organization/authentication-domain onboarding. The prepared configuration is a
Worker-level `worker` destination for this shadow only, an allow policy for
Bryan's email, plus a separate Service Auth policy for automated probes. It must
not be applied account-wide or to a production hostname.

`CONTAINER_RUNTIME_PROVEN = YES`
