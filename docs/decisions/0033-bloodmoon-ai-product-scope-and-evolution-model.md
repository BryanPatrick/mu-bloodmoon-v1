---
status: ACTIVE — scope decided, roadmap conceptual, nothing player-facing authorized
category: decisions
audience: internal (engineering)
lastVerified: 2026-09-25
confidence: CONFIRMED (direct Bryan instruction, this session, dated)
---

# ADR-0033: Blood Moon AI Product Scope and Evolution Model

**DATE**: 2026-09-25.

**STATUS**: ACTIVE. Scope and roadmap decided; only `STAGE 0`/`STAGE 1`
(architecture, foundation, Claude integration) are authorized to build.
Every later stage remains explicitly unauthorized until its own,
separate decision.

## Why this ADR exists

`ADR-0031` recorded the initial automation model (Claude + internal
specialist, Codex deferred) as if the specialist's own scope were
settled — a reasonable reading at the time, but one Bryan has now
clarified was too narrow. The specialist is not a bounded internal tool
that happens to exist; it is the **first real capability of a much
larger intended product**, Blood Moon AI. This ADR records that
clarification as a real decision, without rewriting `ADR-0031` or
`ADR-0032` — both remain correct as far as they went, and neither is
edited.

## Decision

**Blood Moon AI is a first-class product AI platform, intended for deep
integration into the Blood Moon portal and eventually the wider game
ecosystem.** Its long-term scope: player questions, FAQ intelligence,
knowledge escalation, site navigation, full portal documentation
understanding, Wiki assistance, Journal/news assistance, game telemetry
awareness, personal player assistance, and bounded, governed action
execution.

**The reclassification**:

```
BLOOD MOON AI                     = the complete future product
  |
  +-- BLOOD MOON KNOWLEDGE SPECIALIST = the current, real knowledge/
  |                                     retrieval kernel (built across
  |                                     SPECIALIST-01..03) -- Blood
  |                                     Moon AI's first real capability
  |
CLAUDE AGENT                      = autonomous development/research/
                                     execution agent building and
                                     supervising the system during
                                     early stages
```

**No existing identifier is renamed.** `blood-moon-specialist-v1-staging`,
the 4 `bloodmoon-*` skills, and every prior document keep their real
names — this is a conceptual reclassification, documented in
`docs/architecture/bloodmoon-ai-product-vision.md`, not a migration.

**An 8-stage roadmap** (`STAGE 0` through `STAGE 8`, full detail in
`bloodmoon-ai-product-vision.md` §20) governs how the product grows —
each stage gated on the previous one's real evidence, never a calendar,
and **only `STAGE 0` (architecture/foundation) and `STAGE 1` (Claude +
specialist integration) are authorized by this ADR.** `STAGE 2` onward
each require their own future, separate authorization — this ADR does
not pre-approve them.

## What this ADR does NOT decide

- No player-facing AI surface, API, or feature is authorized.
- No FAQ production database, Wiki auto-publisher, or Journal
  auto-publisher is authorized.
- No telemetry system is authorized.
- No player personalization is authorized.
- No action execution (any category in `bloodmoon-ai-product-vision.md`
  §15) is authorized.
- `n8n` adoption/installation/hosting remains exactly as undecided as
  `ADR-0032` left it — this ADR does not touch that question.

## Why (reasoning)

- The specialist's own real, proven capabilities (source-authority
  classification, `UNKNOWN` discipline, conflict exposure, Hub
  retrieval) are not specific to being "an internal Claude helper" —
  they are exactly the primitives a player-facing knowledge assistant
  would also need. Building them once, generically, and pointing them
  at internal use first is the same "prove it small, expand
  deliberately" discipline this project has already used successfully
  for the Knowledge Hub's own orchestration primitives (staged,
  concurrency-proven, then piloted, never deployed all at once).
- Reusing existing structures (Hub `knowledge_items` for FAQ, the same
  source-authority model, the same capability/approval infrastructure
  for the future action model) avoids building a second, competing
  knowledge/permission system for "the product AI" separate from "the
  engineering agent ecosystem" — one platform, two consumers.
- Gating every stage past `STAGE 1` behind its own authorization keeps
  this ADR honest: it records a real, large product decision without
  pretending that deciding the vision also decided to build all of it.

## Alternatives considered

**Keep the specialist scoped as originally documented** (an internal
Claude helper only, `ADR-0031`'s original framing) — rejected: this is
the interpretation Bryan explicitly corrected this phase as "too
narrow." **Design and build the full player-facing product now** —
rejected: explicitly out of this phase's authorized scope, and would
skip the same staged-evidence discipline that has worked well for every
other real infrastructure build in this project (the Hub's own
orchestration primitives being the closest precedent).

## Consequences

- `docs/architecture/agent-automation-architecture.md`,
  `specialist-agent-foundation.md`, and
  `docs/agents/blood-moon-specialist-profile.md` are updated with
  pointers to this ADR and `bloodmoon-ai-product-vision.md` — their own
  content is not rewritten, only cross-referenced, per "never
  duplicate."
- Future stage authorizations (`STAGE 2` onward) should each cite this
  ADR as the scope decision they're building toward, not re-litigate
  the product vision itself.
- The canonical-skill-source model (§4 of `bloodmoon-ai-product-vision.md`)
  and the Claude-integration subagent (§5) are real, built artifacts
  this ADR's own `STAGE 1` authorization covers — not separately gated.

## Related

`docs/decisions/0031-initial-multi-agent-automation-model.md`,
`docs/decisions/0032-agent-automation-architecture-direction.md`,
`docs/architecture/bloodmoon-ai-product-vision.md`,
`docs/architecture/agent-automation-architecture.md`,
`docs/architecture/specialist-agent-foundation.md`.

## Addendum (2026-09-26, `BLOODMOON-AI-07`) — `STAGE 2` authorization record

This ADR said `STAGE 2` needs "its own future, separate authorization".
That authorization exists: the `BLOODMOON-AI-05` phase brief (2026-09-25)
authorized the start of `STAGE 2 — INTERNAL QUESTION ANSWERING PILOT`,
which ran the same day (commit `803466a`, on `main` as `96464bd`;
`docs/architecture/bloodmoon-ai-product-vision.md` §22). Bryan confirmed
it on 2026-09-26 in the `BLOODMOON-AI-07` brief. It was not written down
as a decision record at the time (`GAP-AI06B-03`); it now is:
[`context/DECISIONS.md`](../../context/DECISIONS.md) `DEC-BLOODMOON-AI-001`.

Recorded values: `STAGE2_AUTHORIZED = YES` (2026-09-25),
`STAGE2_INTERNAL_PILOT_STATUS = ACTIVE`. Scope is unchanged by this
addendum: internal use only. Stages 3-8 remain unauthorized, and
everything under "What this ADR does NOT decide" still holds.
