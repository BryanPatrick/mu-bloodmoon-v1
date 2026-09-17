---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
---

# Domain: Orchestration (task/resource/approval/review lifecycle)

**Authoritative docs**: `D:\MU\hub\docs\protocols\orchestration-primitives.md`,
`D:\MU\hub\docs\policies\orchestration-risk-policy.md`.

**Real, race-tested pattern** (the single most important thing to know
before writing orchestration code): every state transition uses an
atomic conditional `UPDATE ... WHERE <condition only one writer can
satisfy> RETURNING *`. A pre-fetch snapshot check is not equivalent —
this caused five real, previously-undetected bugs found via genuine
concurrent-request testing against real D1 (Phases 7-8), not simulation.

**Actors that exist today** (staging, `ai-knowledge-hub-db-staging`):
`claude-staging`, `codex-staging` (both synthetic, `ai`, least-privilege
capabilities), `bryan-staging` (`human`, `APPROVAL_GRANT`/
`RESOURCE_RECOVERY`), `admin-staging` (`human`, `SYSTEM_ADMIN` only).

**This Context Pack's own pilot** (Phase 9): the first genuinely real
Claude staging pilot, using a new, distinct real actor (not the
synthetic `claude-staging`) — tracked through creation → claim →
resource claim → work → report → review → completion. Real, ran against
`ai-knowledge-hub-db-staging` on 2026-09-17:

- `REAL_CLAUDE_STAGING_ACTOR`: `claude-code-real-staging` (agent_id
  `0f52ff49-dc78-4638-bf49-a0c8931e3ad6`), capabilities `TASK_CLAIM`/
  `TASK_RELEASE`/`RESOURCE_CLAIM`/`REPORT_INGEST`/`TASK_REVIEW` only —
  no `APPROVAL_REQUEST` (not genuinely needed for this task), no
  `APPROVAL_GRANT`/`RESOURCE_RECOVERY`/`SYSTEM_ADMIN`.
- `PILOT_TASK_ID`: `58358ff6-2001-48e8-ba2b-406ddc92eb56` ("Build Blood
  Moon Context Pack v1 foundation"), final status `completed`.
- `PILOT_PROJECT_ID`: `staging-proj-1` (project slug `staging-pilot`).
- Resource claim: `a41f77db-0e06-4999-b8aa-6b389bed2223` (`repo:context`,
  exclusive) — claimed, then released after the report was ingested.
- Review: `90fb8d30-26c2-45fe-877b-7c3115e0d1c8` (`PRODUCT`), requested
  by the real actor, claimed and approved by `codex-staging` — an
  explicitly independent identity, never self-reviewed. **Caveat,
  stated plainly**: `codex-staging` is a synthetic fixture, not a real
  second AI session — this proves the *lifecycle* (request → claim →
  independent decision → gate unblocked), not a genuine independent
  content review of the Context Pack itself. That real review is still
  owed — see `../DEFERRED.md`.
- Report: `6cd3c369-4c55-4121-aa68-6f6bf9de2040`, `trust_status:
  accepted` (passed shape validation and the secret scanner).
- Completion gate, checked before completing: `can_complete: true`,
  zero missing reviews/approvals/dependencies, `policy_version 1.0.0`.
- Full real event trail (`task.created` → `task.claimed` →
  `resource.claimed` → `review.requested` → `review.claimed` →
  `review.approved` → `report.ingested` → `resource.released` →
  `task.completed`) confirmed via `GET /projects/staging-pilot/events`.
- Timing: task created→claimed in 893ms; end-to-end pilot (claim through
  completion) ≈112s of real HTTP round-trips: This run resumed after an
  earlier invocation of the same script failed on a field-name bug
  (`reviewType` vs. the API's real `review_type`) — the real task/claim/
  resource-claim from that first attempt were reused rather than
  abandoned, which is itself closer to how a real interrupted session
  would resume than starting a second parallel task would have been.

**Disable switch**: `ORCHESTRATION_ENABLED` — see
[`knowledge-hub.md`](knowledge-hub.md).
