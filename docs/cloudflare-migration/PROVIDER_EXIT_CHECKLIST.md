---
status: TRANSITIONAL_ADDENDUM
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-24
---

# Provider exit checklist — transition addendum

This candidate branch did not contain the comprehensive provider-exit
audit that exists separately on `infra/provider-exit-audit`
(`ff9fc305`). This scoped addendum records only what the approved
Web-first transition changes. It must not silently replace that larger
historical audit during future reconciliation.

## Dependencies intentionally retained

| Dependency | Transition state | Exit implication |
|---|---|---|
| NestJS API | stays on current provider | provider cannot be removed |
| MySQL | stays co-located with API | provider cannot be removed; never expose remotely |
| SMTP/e-mail | stays on current provider | preserve MX/SPF/DKIM/DMARC |
| `update.mubloodmoon.com.br` | stays on current provider | launcher update path remains provider-dependent |
| local mutable media | may stay on provider | R2 migration remains an independent track |
| backup cron/logs | stay on provider unless separately migrated | provider-exit gates remain open |
| root/www Web | future Cloudflare target | only dependency this transition prepares to move |

## Rules

- `CURRENT_PROVIDER = ZERO` is **not** an objective or valid result of
  the Web-only cutover.
- API and MySQL co-location is a deliberate risk reduction, not an
  untracked blocker.
- No provider service may be deleted after the Web cutover solely because
  root/www moved.
- The cPanel Web deployment remains available for rollback until a later
  explicit retirement decision.
- Reconcile this addendum with the full `infra/provider-exit-audit`
  document before any eventual provider retirement phase.

`WEB_EXIT_READY = NO` until the Web runbook gate passes.
`API_EXIT_READY = NO`.
`DATABASE_EXIT_READY = NO`.
`EMAIL_EXIT_READY = NO`.
`UPDATE_EXIT_READY = NO`.
`CURRENT_PROVIDER_ZERO_READY = NO`.
