---
status: ACTIVE — model decided, implementation not started
category: decisions
audience: internal (engineering)
lastVerified: 2026-09-18
confidence: CONFIRMED (direct Bryan instruction, this session, dated)
---

# ADR-0031: Initial Multi-Agent Automation Model

**DATE**: 2026-09-18.

**STATUS**: ACTIVE — decided, not yet implemented. No specialist agent
exists yet; this ADR records the *model*, not a build.

## Why this ADR exists

`AGENT-AUTOMATION-RECOVERY-01` and `AGENT-AUTOMATION-RECONCILE-01`
(both this session) recovered a large body of unmerged, local-only
design work on multi-agent orchestration (`architecture/agent-
orchestration-foundation`, `research/agent-skills-ecosystem`, and the
Knowledge Hub's own `orchestration/mvp-phase-1`). That design work
proposed a conceptual multi-agent roster (Claude, Codex, a future
player-facing assistant) but never settled which agents actually
compose the *first* real multi-agent automation attempt. This ADR
closes that gap with a real, dated decision.

## Decision

**`INITIAL_MULTI_AGENT_MODEL` = Claude + one internal specialist
agent.**

- **Claude** — primary engineering/reasoning agent, unchanged from
  today's real usage.
- **Internal specialist agent** — a new role, intended to become deeply
  knowledgeable about the target system through canonical persisted
  project documentation (see
  `docs/architecture/agent-automation-architecture.md` §5 for the full
  intended role — not restated here). Its permissions remain governed
  by the project's existing security/capability rules; it is explicitly
  **not** an unrestricted autonomous executor.
- **OpenAI/Codex: DEFERRED** for the automated multi-agent ecosystem,
  specifically for cost reasons — not a technical or trust
  disqualification. May be added later.

**Manual Codex use in the current development workflow is unaffected**
by this decision. The distinction is between a human-driven Codex
session (continues exactly as today) and Codex holding an automated,
capability-granted role inside the orchestration layer (deferred).

## Why (reasoning)

- Cost: adding a second paid model provider to the automated ecosystem
  before the first (Claude-only) pilot has even run adds expense
  without yet-proven need.
- The Knowledge Hub's own actor model already treats `openai-codex` as
  a first-class row (`agents.type = 'ai'`, real capability grants
  possible) — deferring Codex is a scheduling decision, not a schema
  limitation. Adding Codex later requires no schema change, only a real
  actor row and capability grant, exactly the same steps already used
  for the one real Claude staging pilot (`context/domains/
  orchestration.md`, Phase 9).
- A specialist agent grounded in documentation (rather than a second
  general implementer) directly serves
  `DOCUMENTATION_IS_AGENT_INFRASTRUCTURE` (ADR-0032, and
  `agent-automation-architecture.md` §3) — its whole value proposition
  depends on the documentation discipline this project already has, so
  starting there tests both ideas together rather than deferring one to
  test the other in isolation.

## Alternatives considered

- **Claude + Codex, no specialist agent** — closer to the original
  design docs' conceptual roster, but reintroduces the exact cost
  concern this decision exists to avoid, and doesn't test the
  documentation-as-infrastructure idea at all.
- **Claude alone, no automation yet** — the status quo. Rejected as the
  *initial automation model* specifically because Bryan's brief this
  phase explicitly calls for a real (if minimal) multi-agent
  composition to document and plan toward, not a decision to wait
  further.

## Consequences

- The future readiness checklist
  (`agent-automation-architecture.md` §12) is scoped to a Claude +
  specialist-agent pilot, not a three-agent one — smaller, cheaper
  first real test.
- A future decision (not this one) is required before Codex re-enters
  the automated ecosystem — tracked as an open decision, not assumed.
- Nothing about this ADR authorizes building the specialist agent yet;
  see `agent-automation-architecture.md` §11 for what remains explicitly
  not authorized.

## Clarification (2026-09-25, `SPECIALIST-02B`)

**Explicit, not a change of decision**: this ADR's "Claude + internal
specialist agent" model does not mean two autonomous peers. Restated
precisely, since the original text left room to misread it that way:

```
AUTONOMOUS_EXECUTION_V1 = Claude only
INTERNAL_SPECIALIST_V1  = supporting knowledge/context component --
                          NOT independently scheduled, NOT independently
                          task-claiming, NOT an autonomous executor
CODEX                   = manual development/research usage only,
                          not part of the initial autonomous agent loop
```

The specialist may later operate as a Claude subagent/tool that Claude
itself invokes (`specialist-agent-foundation.md` §12-13) — it never
independently claims work, schedules itself, executes an autonomous
workflow, deploys, modifies production, or approves a consequential
action. This was already implicit in this ADR's own §5.2 boundary
(`agent-automation-architecture.md`) and in the real identity created
under `SPECIALIST-02B`
(`blood-moon-specialist-v1-staging`: zero Hub capability grants, no
scheduler, no task-claim capability) — stated explicitly here so the
distinction is never assumed rather than read.

Codex's exclusion remains a **cost/scope decision**, restated per
explicit instruction: **not a technical incapability**. Reason
unchanged: token/cost availability and operational simplicity for the
first real automation pass.

## Related

`docs/decisions/0032-agent-automation-architecture-direction.md`,
`docs/architecture/agent-automation-architecture.md`,
`docs/architecture/specialist-agent-foundation.md`,
`docs/agents/blood-moon-specialist-profile.md`.
