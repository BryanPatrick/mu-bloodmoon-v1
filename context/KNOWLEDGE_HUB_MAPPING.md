---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Context Pack ↔ Knowledge Hub mapping

| Context Pack concept | Knowledge Hub entity | Notes |
|---|---|---|
| A decision record (`DECISIONS.md`, an ADR) | `decisions` table row | Hub rows have opaque IDs today; no auto-sync — see `DECISIONS.md`'s ID-scheme resolution |
| A knowledge item / summary | `knowledge_items` table row | Distinct from `docs/knowledge/`'s game-content pipeline — see `RAW_HISTORY_AND_INGESTION.md` |
| A source (`SOURCE_INDEX.md`) | `sources` table row | This pack's `SRC-REPO-*`/`SRC-HUB-*` IDs are repo-local; the Hub has its own source rows for its own ingested material — not currently unified |
| A domain stub (`domains/*.md`) | No direct Hub equivalent | Hub tracks work (tasks/projects), not documentation structure |
| A pilot/task (`domains/orchestration.md`) | `tasks` table row | Real IDs recorded there once the Phase 9 pilot task is created |
| A handoff (`docs/handoff/`) | `handoffs` table row | Both exist; repo handoffs are for humans/agents reading docs, Hub handoffs are structured and queryable |
| A pilot's deliverable | `artifacts` table row (if registered) | Not mandatory for every task — only where the orchestration lifecycle calls for it |

## File-vs-Hub authority — restated from `GOVERNANCE.md`

- Hub authoritative: task/resource/approval/review/event state — anything
  that changes multiple times a day and needs concurrency-safe writes.
- Repo authoritative: why something is true, what the architecture is,
  what a business rule is — anything meant to be read by a human or a
  cold-starting agent as durable truth.
- No silent auto-sync either direction. A future sync job is a real,
  separate, explicitly-approved piece of work — not assumed here.

## How to query the Hub for real (when a task actually needs it)

Use the Hub's own CLI (`D:\MU\hub\cli\`) or a direct authenticated HTTP
call against the relevant environment's URL (see `INFRASTRUCTURE.md`).
Never guess Hub state from this repo's docs — the Hub is the
authoritative source for anything it tracks, per the rule above.
