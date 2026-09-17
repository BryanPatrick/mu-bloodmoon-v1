---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
---

# Domain: Knowledge Hub

**Authoritative docs** (separate repository, `D:\MU\hub`):
`docs/operations/orchestration-remote-adoption.md`,
`docs/operations/orchestration-staging.md`,
`docs/operations/orchestration-staging-validation.md`,
`docs/policies/orchestration-risk-policy.md`,
`docs/protocols/orchestration-primitives.md`.

**One-paragraph orientation**: a Cloudflare Worker + D1 service that is
the durable operational truth for cross-agent orchestration — tasks,
resource claims, approvals, reviews, reports, and an immutable event
log. Built across Phases 5-8 of a sibling project: review model + report
ingestion (Phase 5), declarative policy gates so a required review/
approval can't be skipped by never requesting it (Phase 6), a real D1
concurrency proof that found and fixed five real race/gap bugs (Phase
7), and a real, permanent staging environment separate from production
(Phase 8). See [`../INFRASTRUCTURE.md`](../INFRASTRUCTURE.md) for real
identifiers.

**Authorization model**: actor + capability rows
(`TASK_CLAIM`/`TASK_RELEASE`/`RESOURCE_CLAIM`/`REPORT_INGEST`/
`TASK_REVIEW`/`APPROVAL_REQUEST`/`APPROVAL_GRANT`/`RESOURCE_RECOVERY`/
`SYSTEM_ADMIN`), least-privilege by design — see
[`orchestration.md`](orchestration.md) for the real actors that exist
today.

**Related decisions**: Knowledge Hub's own `decisions` table (26 real
rows in production, Phase 6 audit, not re-verified this session) — see
[`../DECISIONS.md`](../DECISIONS.md).

**Emergency control**: `ORCHESTRATION_ENABLED` — set per-environment in
`wrangler.jsonc`/`wrangler.staging.jsonc`'s own `vars`, checked before
authentication even runs.
