---
status: ACTIVE
category: context-pack
audience: internal (any agent or engineer bootstrapping onto this project)
lastVerified: 2026-09-17
version: v1
---

# Blood Moon — Context Pack v1

**What this is**: a canonical, bootstrap-readable layer for agent/engineer
continuity — a short set of documents an agent (Claude, Codex, a future
n8n workflow, or a human) can read *before* touching the much larger
existing `docs/` tree, to get oriented fast. It was created in Phase 9 of
the Knowledge Hub orchestration project, alongside the first real Claude
staging pilot (see [`domains/orchestration.md`](domains/orchestration.md)
and [`domains/knowledge-hub.md`](domains/knowledge-hub.md)).

**What this is not**: a replacement for [`docs/README.md`](../docs/README.md)
(the existing, much richer central documentation index),
[`docs/protocols/agent-bootstrap.md`](../docs/protocols/agent-bootstrap.md)
(the existing, mandatory 15-step bootstrap protocol), or
[`docs/decisions/`](../docs/decisions/) (the existing ADR log). Every one
of those already existed before this Context Pack and remains
authoritative for its own subject. This pack **summarizes, indexes, and
cross-references** them — it does not duplicate their content, and it
must never drift into being a second, competing source of truth. See
[`GOVERNANCE.md`](GOVERNANCE.md) for the explicit precedence rule.

## Why this exists (the real gap it closes)

`docs/README.md` is a rich index, but it is also **honest that it mixes
in cross-branch content** — some of what it describes (e.g.
`docs/open-questions.md`, `docs/open-risks.md`, `docs/decisions/README.md`,
most of the files it lists under `docs/knowledge/`) is real work done in
*other* worktrees (`mu-bloodmoon-v1-openbeta`, `governance/engineering-pack`,
various feature branches) that has not yet been merged into this
repository's `main` branch. Confirmed directly this session via
`git ls-tree -r HEAD -- docs/` (231 tracked files) — those specific paths
do not exist on `main` today, despite being referenced in `docs/README.md`'s
own prose. This is not a new problem introduced by this Context Pack; it
is the same "worktree sprawl" this project's own `AGENTS.md` (invariants
2-4) already names. See [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) OQ-CTX-001
for the honest record of this gap, and
[`SOURCE_INDEX.md`](SOURCE_INDEX.md) for exactly which files were verified
present-on-`main` vs. referenced-but-absent.

A second, newer gap this pack closes: nothing in the existing `docs/`
tree mentions the **Knowledge Hub orchestration layer** (built in a
sibling repository, `D:\MU\hub`, Phases 5-9 of a separate but related
project) at all — `docs/protocols/agent-bootstrap.md` predates it.
[`AGENT_OPERATING_MODEL.md`](AGENT_OPERATING_MODEL.md) bridges the two
without editing the original bootstrap protocol.

## How to use this pack (bootstrap order)

1. [`AGENTS.md`](../AGENTS.md) at the repo root — universal invariants,
   still the highest-precedence document for *how* to act.
2. [`docs/protocols/agent-bootstrap.md`](../docs/protocols/agent-bootstrap.md) —
   the real, mandatory 15-step sequence. Follow it. This Context Pack's
   [`AGENT_OPERATING_MODEL.md`](AGENT_OPERATING_MODEL.md) only adds a
   Knowledge Hub-aware step on top, never replaces any of the 15.
3. [`CURRENT_STATE.md`](CURRENT_STATE.md) — short, current snapshot
   (kept deliberately shorter than a phase history).
4. Your current task's domain — see [`domains/`](domains/) for a stub
   per domain, each pointing at the real authoritative docs.
5. [`DECISIONS.md`](DECISIONS.md) — which real decisions (ADRs +
   Knowledge Hub) govern your domain.
6. The latest relevant [`docs/handoff/`](../docs/handoff/) entry for your
   domain, if one exists.
7. Begin work, per `docs/protocols/agent-bootstrap.md` steps 8-15.

## Contents

| File | Purpose |
|---|---|
| [`CURRENT_STATE.md`](CURRENT_STATE.md) | Short, bootstrap-readable current snapshot — never project history |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | CURRENT/PLANNED/EXPERIMENTAL map across every real and future system |
| [`BUSINESS_RULES.md`](BUSINESS_RULES.md) | CONFIRMED/PROPOSED/UNKNOWN business rules, each sourced, never assumed |
| [`DECISIONS.md`](DECISIONS.md) | Decision status model + index of real ADRs and Knowledge Hub decisions |
| [`SUPERSEDED_DECISIONS.md`](SUPERSEDED_DECISIONS.md) | Pointer-only index of real supersession relationships already recorded in ADRs |
| [`GOVERNANCE.md`](GOVERNANCE.md) | Source-of-truth precedence, file-vs-Hub authority rule, validation, security classification |
| [`AGENT_OPERATING_MODEL.md`](AGENT_OPERATING_MODEL.md) | Roles (Hub/Claude/Codex/n8n/Bryan), bootstrap bridge, task-scoped context retrieval, context budget |
| [`INFRASTRUCTURE.md`](INFRASTRUCTURE.md) | Real infrastructure inventory — Blood Moon hosting, Knowledge Hub prod+staging, GameServer, worktrees |
| [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) | Real open questions, including this pack's own honest gaps |
| [`DEFERRED.md`](DEFERRED.md) | Work explicitly designed but not executed (design-only by decision, not by oversight) |
| [`SOURCE_INDEX.md`](SOURCE_INDEX.md) | Every source this pack actually drew from, with a stable ID and type — never a fabricated one |
| [`RAW_HISTORY_AND_INGESTION.md`](RAW_HISTORY_AND_INGESTION.md) | Raw-history-vs-canonical-truth policy + pointer to the chat-history ingestion plan |
| [`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md) | Context Pack concepts ↔ Knowledge Hub entities |
| [`VALIDATION.md`](VALIDATION.md) | The lightweight consistency checks this pack runs on itself |
| [`domains/`](domains/) | One short stub per domain, each pointing at its real authoritative docs — never a copy of them |

Phase 12 adds `community`, `security` and `testing` as deliberately
`STUB`/`PARTIAL` orientations only; no new product decision or claim of
production readiness is implied.

## What this pack deliberately does not do yet

- It does not ingest any ChatGPT conversation history. **No such
  transcript was supplied this session.** Anything that might have
  originated in a prior Bryan/ChatGPT conversation but has no actual
  transcript available is marked `SOURCE_PENDING` or omitted entirely —
  never dated or quoted as if it were real. See
  [`RAW_HISTORY_AND_INGESTION.md`](RAW_HISTORY_AND_INGESTION.md).
- It does not renumber or restate any existing `docs/decisions/` ADR or
  any Knowledge Hub decision — see [`DECISIONS.md`](DECISIONS.md)'s
  explicit ID-scheme resolution.
- It does not sync automatically with the Knowledge Hub in either
  direction — see [`GOVERNANCE.md`](GOVERNANCE.md)'s file-vs-Hub
  authority rule.
