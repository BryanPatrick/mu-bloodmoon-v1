---
status: ACTIVE
category: infrastructure
lastVerified: 2026-09-23
---

# Cloudflare migration risks — CF-API-02R3

## Closed

- **MySQL 8 canonical replay/runtime equivalence:** closed by real MySQL 8.0.46
  and 8.4.11 evidence, including transactions, locks and concurrency.
- **Oracle Linux Prisma engine availability:** closed by including the
  `rhel-openssl-3.0.x` binary target.
- **Billing PII implementation existence:** located and tested in isolation,
  19/19, without merging the Asaas branch.

## Open

- **Shadow remains public:** Zero Trust onboarding is incomplete. Do not use
  long-lived or production credentials on the shadow before the narrow
  Worker-only Access policy is applied and both human and Service Auth paths are
  tested.
- **Database provider/topology not selected:** the co-located MySQL Container
  was validation-only and must not be mistaken for a production design.
- **Asaas integration boundary:** any future candidate containing billing
  profiles must deliberately incorporate and revalidate commit
  `1e6b0768777a517380c22a5854465756c9d908fd`; payments remain off.
