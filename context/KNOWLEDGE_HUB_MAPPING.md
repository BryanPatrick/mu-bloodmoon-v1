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

## The 26 production Knowledge Hub decisions (read in full, Phase 10, READ-ONLY)

**Per DECISÕES #1 of the Phase 10 brief: Knowledge Hub decision IDs
remain canonical. Nothing below mints a replacement `DEC-<DOMAIN>-NNN`
ID — the "Alias" column is an optional, non-canonical human-readable
label that always maps back to the real Hub UUID (shown truncated to 8
chars; the full UUID is the only canonical identifier).** All 26 rows
have Hub `status = active` and `supersedes_decision_id = NULL` — the
"Current?" column below is this pack's own cross-check against repo
evidence, not a Hub field, and is never written back to the Hub.

Project `ai-knowledge-hub` (17 rows — decisions about the Hub tool itself):

| Hub ID (8) | Alias (non-canonical) | Domain | Date | Current? |
|---|---|---|---|---|
| `8d0d0e44` | agent-agnostic-data-model | knowledge-hub | 2026-08-07 | YES |
| `1c266e98` | apikey-agent-decoupling | knowledge-hub | 2026-08-07 | YES |
| `77683ffc` | d1-storage-architecture | knowledge-hub / infrastructure | 2026-08-07 | YES |
| `e42935db` | r2-reserved-future-artifacts | knowledge-hub / infrastructure | 2026-08-07 | YES (still unused, per Phase 8's own staging config choosing no R2 binding) |
| `e9f9884f` | vectorize-future-d1-remains-authoritative | knowledge-hub | 2026-08-07 | YES |
| `4db2f24f` | handoff-explicit-written-record | knowledge-hub / orchestration | 2026-08-07 | YES |
| `0ae494c4` | apikey-sha256-hash-once | knowledge-hub / security | 2026-08-07 | YES |
| `502ff391` | rate-limit-120-per-60s | knowledge-hub / infrastructure | 2026-08-07 | YES |
| `de8755b6` | akh-cli-standard-interface | knowledge-hub | 2026-08-07 | YES |
| `02946a67` | hub-truth-plus-git-cross-check | knowledge-hub / orchestration | 2026-08-07 | YES |
| `a80d5856` | security-baseline-security-md | knowledge-hub / security | 2026-08-07 | YES |
| `8a791970` | untrusted-content-policy | knowledge-hub / security | 2026-08-07 | YES |
| `9a9b7288` | github-remote-backup | knowledge-hub / infrastructure | 2026-08-07 | YES |
| `0a996cb3` | artifact-quarantine-on-upload | knowledge-hub | 2026-08-07 | YES |
| `495f5232` | artifact-validation-magic-bytes | knowledge-hub | 2026-08-07 | YES |
| `fa75a711` | knowledge-items-separate-from-ops-state | knowledge-hub | 2026-08-08 | YES |
| `a5e54cc5` | knowledge-sources-never-operational-authority | knowledge-hub | 2026-08-08 | YES — directly informs this pack's own `RAW_HISTORY_AND_INGESTION.md` |

Project `bloodmoon` (9 rows — real product decisions, older, cross-checked against repo evidence):

| Hub ID (8) | Alias (non-canonical) | Domain | Date | Current? |
|---|---|---|---|---|
| `fa3fd2f1` | first-e2e-jest-supertest | (no matching context/ domain — testing methodology) | 2026-08-08 | NEEDS_REVIEW — not re-verified against current test suite shape |
| `8200f60a` | community-media-local-storage-kept | (no matching domain — community/infrastructure) | 2026-08-08 | NEEDS_REVIEW |
| `3acb56e0` | feed-load-more-not-cursor | (no matching domain — community) | 2026-08-08 | NEEDS_REVIEW |
| `d1637a85` | privacy-visibility-partial-enforcement | (no matching domain — security/privacy) | 2026-08-08 | NEEDS_REVIEW — `docs/privacy/` has since seen real migration+QA work per `docs/README.md`'s Phase L narrative; this decision predates it |
| `183be585` | community-beta-ready-e2e-111 | (no matching domain — community) | 2026-08-08 | NEEDS_REVIEW |
| `86fc102b` | community-beta-ready-formal-audit | (no matching domain — community) | 2026-08-08 | NEEDS_REVIEW |
| `cf5f14c2` | site-beta-blocked-6-blockers | payments / marketplace / security | 2026-08-08 | **UNRESOLVED — the later implementation disproves literal code nonexistence, but end-to-end delivery/release remains unproven; see REPOSITORY_KNOWLEDGE_MAP.md §6** |
| `53034c0c` | no-go-public-launch-7-blockers | payments / marketplace / security | 2026-08-08 | **UNRESOLVED — same partial conflict; requires fresh beta-readiness evidence, not automatic supersession** |
| `fa8e9ad0` | password-recovery-design-and-implementation | security | 2026-08-09 | PARTIAL — tokens/endpoints implemented; its own context says mail delivery was blocked then; later SMTP work still awaits deployed end-to-end proof |

Phase 12 added deliberately narrow `community`, `security`, and
`testing` stubs. The earlier absence among the original 12 was a real
gap; the stubs do not imply that the six older product decisions marked
`NEEDS_REVIEW` above have now been revalidated. See
`OPEN_QUESTIONS.md` OQ-CTX-007.

## How to query the Hub for real (when a task actually needs it)

Use the Hub's own CLI (`D:\MU\hub\cli\`) or a direct authenticated HTTP
call against the relevant environment's URL (see `INFRASTRUCTURE.md`).
Never guess Hub state from this repo's docs — the Hub is the
authoritative source for anything it tracks, per the rule above.
