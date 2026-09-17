---
status: EXPERIMENTAL
category: context-pack-domain
lastVerified: 2026-09-17
classification: PARTIAL
---

# Domain: Blood Moon AI

**STATUS**: PLANNED. No implementation exists. Two real, complementary
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

**ACTIVE DECISIONS**: none — both are proposals, `bloodmoon-ai-assistant.md`
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
