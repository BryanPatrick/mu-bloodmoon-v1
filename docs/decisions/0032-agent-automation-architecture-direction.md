---
status: ACTIVE — direction decided, implementation not authorized
category: decisions
audience: internal (engineering)
lastVerified: 2026-09-18
confidence: CONFIRMED (direct Bryan instruction, this session, dated) for the direction itself;
  MIXED for underlying capabilities (see agent-automation-architecture.md §7 for per-item PRODUCTION/
  STAGING/DESIGN_ONLY labels)
---

# ADR-0032: Agent Automation Architecture Direction (Option A)

**DATE**: 2026-09-18.

**STATUS**: ACTIVE. Direction decided. **This ADR does NOT authorize
n8n adoption, installation, or hosting** — see "What this ADR does not
decide" below.

## Why this ADR exists

`docs/architecture/engineering-agent-orchestration.md` (branch
`architecture/agent-orchestration-foundation`, §B4) proposed three
architecture options for Blood Moon's future agent automation and
recommended one (`Option A`) without that recommendation ever being
ratified by Bryan — it stayed `PROPOSED_NOT_RATIFIED` through two full
investigation phases this session. This ADR records that Bryan has now
accepted the direction.

## Decision

**Option A is accepted as the architecture direction:**

```
Knowledge Hub                        →  record of truth / durable
                                         coordination core
n8n                                   →  future integration layer
                                         (scheduling, external triggers,
                                         notifications, webhooks, human
                                         workflow integration)
Claude + internal specialist agent    →  initial execution/reasoning
                                         layer (see ADR-0031)
```

n8n's explicit non-responsibilities (source of truth, canonical task
database, approval authority, canonical project history, agent-state
authority, primary reasoning engine) are unchanged from the original
design — see `agent-automation-architecture.md` §8 for the evidenced
quotes this rests on.

## What this ADR does NOT decide

- **`N8N_ADOPTION`** — not authorized. Accepting the *direction* n8n
  would occupy if adopted is not the same as deciding to adopt it.
- **`N8N_INSTALLATION`** — not authorized. Nothing is installed,
  configured, or run as a result of this ADR.
- **`N8N_HOSTING`** — not decided. The three options named in the
  original design (self-host, n8n Cloud, a Cloudflare-Worker-built
  alternative) remain open, unresearched for cost, and unchosen.

This split mirrors how this project already treats other direction-vs-
implementation decisions (e.g. the Control Plane pattern being
"PATTERN DEFINED, NOT YET IMPLEMENTED AS A FRAMEWORK" per
`docs/architecture/control-plane.md`) — a real precedent for recording
a direction decision distinctly from its build authorization.

## Why (reasoning)

- The Knowledge Hub side of this direction is not speculative — it has
  real, staging-proven capabilities (task lifecycle, leases, resource
  claims, approvals, reviews, reports, concurrency guarantees, a kill
  switch) built and verified across Phases 5-8 of a sibling project,
  plus one real (non-synthetic) Claude pilot. Accepting Hub-as-core
  ratifies a direction with real evidence behind it, not a pure guess.
- n8n's role was independently arrived at from two angles that never
  cross-referenced each other during their own development — the
  original orchestration design (§B3/B4) and the later skills-ecosystem
  research (`N8N_CLAUDE_SKILL_ARCHITECTURE.md`) — and both concluded
  the same non-authoritative, integration-only role. Convergent
  independent analysis is a reasonable basis for accepting the
  direction, even while its implementation stays unauthorized.
- Explicitly deferring adoption/installation/hosting keeps this ADR
  honest about what's actually decided versus what remains open —
  consistent with this project's own "never invent a decision to fill
  a gap" rule.

## Alternatives considered

Options B (custom worker/orchestrator instead of n8n) and C
(n8n-centric, agents subordinate) were evaluated in the original design
document (§B4) and are not re-litigated here — Option A was the
original recommendation and remains the one accepted. See that
document for the full comparison this ADR relies on rather than
repeats.

## Consequences

- Future work on the specialist agent (ADR-0031) and any future n8n
  work should be designed *toward* this direction, without treating any
  n8n-specific implementation detail as pre-approved.
- Production activation of Hub migrations 0008-0010 remains a separate,
  future decision — this ADR does not authorize it (see
  `agent-automation-architecture.md` §11).
- A future ADR is expected once n8n adoption itself is decided — this
  one should be cited by it, not amended to cover it.

## Related

`docs/decisions/0031-initial-multi-agent-automation-model.md`,
`docs/architecture/agent-automation-architecture.md`,
`docs/architecture/engineering-agent-orchestration.md` (branch
`architecture/agent-orchestration-foundation`, preserved on origin).
