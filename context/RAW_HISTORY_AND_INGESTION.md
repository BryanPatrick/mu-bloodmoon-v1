---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Raw history vs. canonical context — and the ingestion plan

## The distinction (permanent, not specific to chat history)

- **Raw history** — chat exports, old handoffs, superseded ADRs, git
  history itself — is an **immutable archive**. It is real evidence of
  what was said or decided at a point in time, but it is never treated
  as direct, current canonical truth. Reading a raw source and then
  writing "X is true" without passing through classification (see
  below) is exactly the mistake this rule exists to prevent.
- **Canonical context** — this Context Pack, current ADRs, current
  `docs/`, current Knowledge Hub state — is the curated, current
  account. It is what gets read by default (see `AGENT_OPERATING_MODEL.md`'s
  context budget).

Promotion from raw to canonical is always a deliberate act (human or
agent classification + cross-reference against existing decisions),
never automatic.

## The critical constraint this whole pack was built under

No ChatGPT conversation export or transcript was supplied this session.
This Context Pack was built **only** from: this repository, existing
Knowledge Hub data, existing docs, existing handoffs, existing decisions,
and artifacts explicitly examined this session. Nothing here claims a
`CHAT_TRANSCRIPT` source type without a transcript actually having been
supplied — see [`SOURCE_INDEX.md`](SOURCE_INDEX.md), which currently has
zero `SOURCE_PENDING` rows because nothing was flagged as
possibly-chat-derived without evidence.

## The ingestion plan (design only — see `docs/operations/chat-history-ingestion.md`)

The real plan for *how* Bryan can eventually provide chat history, and
how it gets processed, is written in this repository's own operations
docs (per this phase's own required path), not duplicated here:
[`../docs/operations/chat-history-ingestion.md`](../docs/operations/chat-history-ingestion.md).

Shape, summarized (see that doc for the real detail):

```
export → parse → candidate items → dedupe → classify →
cross-reference existing decisions → human/agent validation →
canonical promotion
```

Structured extraction output (never prose dumped into a doc):
`new_decisions[]`, `changed_decisions[]`, `ideas[]`, `requirements[]`,
`open_questions[]`, `tasks[]`, `knowledge_candidates[]`,
`source_references[]`.

## Knowledge classification taxonomy (for anything promoted from raw history, or captured fresh)

`FACT` / `DECISION` / `REQUIREMENT` / `IDEA` / `OPEN_QUESTION` /
`DEFERRED` / `SUPERSEDED` — never collapsed into each other. An `IDEA`
that Bryan later confirms becomes a `DECISION` (new record, not an edit);
a `DECISION` that's replaced becomes `SUPERSEDED` (see
[`SUPERSEDED_DECISIONS.md`](SUPERSEDED_DECISIONS.md)) — never silently
reclassified in place.

This taxonomy is for **project/engineering knowledge**. It is a
different axis from the existing **game-content** knowledge pipeline in
`docs/knowledge/` (source-authority, conflict-resolution, VPS/YouTube
ingestion) and the root-level `knowledge/` library (canonical item/set
data) — those already have their own, separate, mature methodology for
a different kind of knowledge (player-facing game data, not project
decisions). Do not merge the two axes. See
[`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md).
