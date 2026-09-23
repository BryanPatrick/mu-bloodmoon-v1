---
status: ACTIVE
category: infrastructure
lastVerified: 2026-09-23
---

# Cloudflare migration current state

- Shadow Worker: `bloodmoon-api-container-shadow`, non-production.
- Container runtime: proven with Nest/Prisma on Node 22.
- Real MySQL 8 migration replay: proven, 55/55, clean/no drift.
- MySQL runtime suite: health, readiness, auth/TOTP and financial semantics pass.
- Billing PII: exists only on `payments/asaas-production-readiness` at commit
  `1e6b0768777a517380c22a5854465756c9d908fd`; isolated tests pass 19/19; not
  merged and payments remain disabled.
- Shadow Access: public. Exact Worker-only policy prepared; not applied because
  Zero Trust organization onboarding is incomplete.
- Production database, DNS, secrets, payments and marketplace: untouched.
