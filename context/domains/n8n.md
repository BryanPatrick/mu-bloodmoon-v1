---
status: EXPERIMENTAL
category: context-pack-domain
lastVerified: 2026-09-17
classification: PARTIAL
---

# Domain: n8n

**STATUS**: PLANNED. Not installed anywhere. Real design work exists on
an unmerged branch (found Phase 10 — Phase 9's `n8n.md` predates this
discovery and was a near-empty sketch).

**CURRENT STATE**: `architecture/agent-orchestration-foundation`
(commit `7b8c2799`, one commit on top of `main`'s `f5fd099a`, not
checked out in any worktree) adds
`docs/architecture/engineering-agent-orchestration.md`, whose §B3/B28/B29
evaluate n8n directly: `N8N_ROLE_RECOMMENDATION = INTEGRATION_LAYER`
(scheduler + notification/webhook fan-out), explicitly **not**
`ORCHESTRATOR_CORE` — n8n is not an agent-reasoning engine, task
decomposition/review stays with agents that understand this project's
own task/report/approval shape. Three hosting options are compared
(self-host Docker/VPS, n8n Cloud managed, a Cloudflare Worker-based
scheduler/webhook-router built instead of installing n8n at all, since
this project already runs Workers/D1 for the Knowledge Hub) — **no
hosting choice has been made**; the doc itself says not to treat any of
this as final until formally decided.

**ACTIVE DECISIONS**: none — this whole branch is `status: DESIGN`,
unmerged, a proposal, not a decision.

**AUTHORITATIVE SOURCES**: `docs/architecture/engineering-agent-orchestration.md`
§B3, B25-B29 (branch `architecture/agent-orchestration-foundation`,
read in full this phase).

**OPEN QUESTIONS**: which hosting option (self-host / n8n Cloud /
Cloudflare-Worker-alternative); whether the `INTEGRATION_LAYER`
recommendation itself is accepted by Bryan; cost is explicitly
"conceptual, not researched pricing" per the doc's own §B29 — no real
numbers exist yet for n8n Cloud or a WhatsApp provider.

**DEFERRED ITEMS**: n8n installation itself (Phase 10 brief, Part 19,
explicit); the AUTOMATION_MVP_PHASE_1 proposal (§B25) — a task-list
template + `AGENT_REPORT_SCHEMA_V1` + a manual reviewer pass, "no n8n,
no new infrastructure" — is itself the recommended *first* step before
n8n enters the picture at all.

**RELATED TASKS/HANDOFFS**: none in the Knowledge Hub or `docs/handoff/`
this phase.

**Non-negotiable constraint (unchanged from Phase 9)**: whenever n8n is
eventually adopted, it may create *candidate* knowledge, detect
duplicates, submit review tasks, notify Bryan — but must never silently
promote AI-generated knowledge to authoritative truth. See
[`../RAW_HISTORY_AND_INGESTION.md`](../RAW_HISTORY_AND_INGESTION.md).
Related: [`../DEFERRED.md`](../DEFERRED.md).
