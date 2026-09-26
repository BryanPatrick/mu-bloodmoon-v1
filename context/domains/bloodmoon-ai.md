---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-25
classification: PARTIAL
---

# Domain: Blood Moon AI

**CURRENT STATE (2026-09-25, `BLOODMOON-AI-06`) — read this first**:

- **Scope**: Blood Moon AI is a first-class product AI platform
  (`ADR-0033`, `CANONICAL_DECISION`): player questions, FAQ
  intelligence, knowledge escalation, portal navigation, Wiki/Journal
  assistance, telemetry awareness, personal assistance and, much later,
  bounded governed actions — each stage separately gated.
- **What exists**: the Blood Moon Knowledge Specialist, its first real
  capability — `.claude/agents/bloodmoon-knowledge-specialist.md` plus
  the skills `bloodmoon-context-bootstrap`, `bloodmoon-knowledge-router`,
  `bloodmoon-khub-query`, `bloodmoon-source-authority`, all on `main`
  (PR #1, `dd11117`). It is read-only and non-autonomous: Claude invokes
  it; it answers with sources, authority and `CONFIRMED`/`UNKNOWN`
  status, and never acts. Claude is the only autonomous agent in V1
  (`ADR-0031` addendum, `ADR-0033`).
- **Stages**: `STAGE 0` DONE; **`STAGE 1` COMPLETE** (fresh-session
  discovery + by-name invocation from `main`, 8/8 PASS,
  `BLOODMOON-AI-05C`); **`STAGE 2` internal question answering ACTIVE**;
  Stages 3-8 not authorized.
- **Authoritative sources (all on `main`)**: `ADR-0031`, `ADR-0032`,
  `ADR-0033`, `docs/architecture/bloodmoon-ai-product-vision.md`
  (§20 roadmap, §22 Stage 2 pilot, §23 Stage 1 closure),
  `docs/architecture/specialist-agent-foundation.md`,
  `docs/architecture/agent-automation-architecture.md`,
  `docs/agents/blood-moon-specialist-profile.md`,
  `docs/architecture/specialist-mvp-validation-2026-09-25.md`.

The 2026-09-17 text below is kept as the historical record of the
design inputs; its "no implementation exists" line is superseded.

~~**STATUS**: PLANNED. No implementation exists.~~ Two real, complementary
sources of design intent exist — a repo design doc (permission/data
model) and Bryan's own Phase 10 brief (answer-routing model) — kept
separate below since neither has been reconciled with the other yet,
and conflating them would misattribute one as the other.

**CURRENT STATE — repo design** (`architecture/agent-orchestration-foundation`,
`docs/architecture/bloodmoon-ai-assistant.md`, read in full this phase):
a single conversational surface (site/game/support/wiki/account/
marketplace/events/progression). Core principle: **"knowledge access is
not action permission"** — a 7-tier permission model (`PUBLIC` →
`AUTHENTICATED_PLAYER` → `ACCOUNT_READ` → `ACCOUNT_ACTION` →
`MARKETPLACE_ACTION` → `PAYMENT_READ` → `ADMIN`), a 4-tier data-source
classification (`PUBLIC`/`PRIVATE_PLAYER`/`SENSITIVE`/`ADMIN_ONLY`)
enforced at the retrieval boundary (not left to the model to
self-censor), a memory boundary (preferences/goals only, never
credentials or security state), and a 6-phase future-game-AI roadmap
where the assistant/bot line sits explicitly between Phase 4
(read-only, notify) and Phase 5 (narrow, opt-in, per-action permission
grants) — never blurred earlier.

**CURRENT STATE — Bryan's own direction (Phase 10 brief, Part 20,
2026-09-17)**: an answer-source ladder — `STATIC_FAQ` → `KNOWLEDGE_BASE`
→ `GAME_DATA` → `CACHE` → `CLAUDE` → `HUMAN` — plus `AI_DEFLECTION_RATE`
(a metric), question deduplication, knowledge candidates, a
verified-vs-unverified knowledge split, versioned answers, and a
paid-LLM fallback (Claude API as the initial candidate). **This is a
real, current instruction from Bryan in this exact session — not a
chat-history claim and not fabricated** — but it does not yet appear in
any repo document, so it is recorded here as PLANNED direction
attributed directly to Bryan, not as something already designed in
`docs/architecture/`. The two models are complementary, not
contradictory: the ladder is about *where an answer comes from*
(routing/cost), the repo doc's tiers are about *what the assistant is
allowed to know/do* (permission) — a real design pass would need to
compose both, not pick one.

**ACTIVE DECISIONS**: ~~none~~ (2026-09-25: `ADR-0031`, `ADR-0032`,
`ADR-0033` — see the current-state block above; the two design inputs
below are still proposals) — both are proposals, `bloodmoon-ai-assistant.md`
is explicitly `status: DESIGN`, unimplemented.

**AUTHORITATIVE SOURCES**: `docs/architecture/bloodmoon-ai-assistant.md`
(branch `architecture/agent-orchestration-foundation`); this session's
own Phase 10 brief (attributed directly, not as a repo doc).

**OPEN QUESTIONS**: whether/how the answer-source ladder and the
permission-tier model get reconciled into one design; `AI_DEFLECTION_RATE`'s
exact definition/target has not been specified anywhere yet.

**DEFERRED ITEMS**: building any of this — explicit, this phase and
Phase 9 both. See [`../DEFERRED.md`](../DEFERRED.md).

**RELATED TASKS/HANDOFFS**: none in the Knowledge Hub or `docs/handoff/`
this phase.

**Non-negotiable constraint (unchanged)**: strict separation between
`INTERNAL ENGINEERING KNOWLEDGE` (this repo's `docs/`, `context/`, the
Knowledge Hub) and `PLAYER-SAFE KNOWLEDGE` (the root-level
[`knowledge/`](../../knowledge/) library) — no accidental leakage. See
[`../GOVERNANCE.md`](../GOVERNANCE.md)'s security classification table.
