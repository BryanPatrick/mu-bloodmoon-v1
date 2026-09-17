---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Source index

Stable IDs for everything this Context Pack actually drew from. Nothing
below is invented — every `VERIFIED` row was read or run for real this
session (or cites the specific prior phase where it was). Future
`SRC-CHAT-*` IDs are reserved for real chat transcripts once actually
supplied — never created speculatively.

## Source types

`REPOSITORY_DOC` / `CODE` / `DATABASE_SCHEMA` / `KNOWLEDGE_HUB_DECISION` /
`HANDOFF` / `CHAT_TRANSCRIPT` / `ADMIN_DECISION` / `EXTERNAL_REFERENCE`

## Repository sources (this repo, `mu-bloodmoon-v1`, branch `main`, HEAD `f5fd099a`)

| ID | Type | Path | Verified how |
|---|---|---|---|
| SRC-REPO-001 | REPOSITORY_DOC | `AGENTS.md` | Read in full, this session |
| SRC-REPO-002 | REPOSITORY_DOC | `CLAUDE.md` | Read in full, this session |
| SRC-REPO-003 | REPOSITORY_DOC | `docs/protocols/agent-bootstrap.md` | Read in full, this session |
| SRC-REPO-004 | REPOSITORY_DOC | `docs/README.md` | Read (partial — 596/720 lines; large phase-log tail not read), this session |
| SRC-REPO-005 | REPOSITORY_DOC | `docs/architecture/engineering-governance.md` | Read (first 80 lines), this session |
| SRC-REPO-006 | REPOSITORY_DOC | `docs/decisions/0030-migration-casing-static-audit.md` | Read in full, this session |
| SRC-REPO-007 | REPOSITORY_DOC | `docs/decisions/0019,0021,0023,0024,0025,0026,0028,0029.md` | Not read this session — listed via `git ls-tree` only; titles taken from filenames, not content |
| SRC-REPO-008 | REPOSITORY_DOC | `knowledge/README.md` (root-level game-content library) | Read in full, this session |
| SRC-REPO-009 | CODE/CONFIG | `git ls-tree -r HEAD -- docs/` (231 files) | Run directly, this session — authoritative for "what actually exists on `main`" |
| SRC-REPO-010 | REPOSITORY_DOC | `docs/handoff/*` (10 files) | Listed via `git ls-tree`, not read this session |

## Knowledge Hub sources (`D:\MU\hub`, separate repository)

| ID | Type | Path/Location | Verified how |
|---|---|---|---|
| SRC-HUB-001 | REPOSITORY_DOC | `docs/operations/orchestration-staging.md` | Read in full, earlier this session (pre-compaction) |
| SRC-HUB-002 | REPOSITORY_DOC | `docs/operations/orchestration-staging-validation.md` | Read earlier this session; content large, not fully re-quoted here |
| SRC-HUB-003 | REPOSITORY_DOC | `docs/operations/orchestration-remote-adoption.md` | Read earlier this session; content large, not fully re-quoted here |
| SRC-HUB-004 | DATABASE_SCHEMA | Production `ai-knowledge-hub-db` — 44 tasks / 418 events / 26 decisions | Phase 6 read-only audit (prior session) — **not re-verified this session** |
| SRC-HUB-005 | CODE | `src/repositories/*.ts`, `src/services/*.ts` (Hub Worker) | Read/edited across Phases 5-8 (prior sessions) |

## What is explicitly `SOURCE_PENDING` (believed to originate in a prior
Bryan/ChatGPT conversation, but no transcript was ever supplied this
session — never dated, never quoted, never treated as evidence)

None recorded. This Context Pack was built entirely from SRC-REPO-* and
SRC-HUB-* sources above, per the explicit constraint given for this
phase: no automatic access to Bryan's ChatGPT history exists, and none
was fabricated. If a future session believes some piece of context
originated in a prior chat, it should add a row here with status
`SOURCE_PENDING` rather than write it into any other document as fact.

## Honesty note on partial reads

`SRC-REPO-004` (`docs/README.md`) and several ADRs (`SRC-REPO-007`) were
only partially read or only listed by filename. Anything this Context
Pack says about their content is scoped to what was actually read —
where a summary above says "titles taken from filenames, not content,"
treat any ADR title paraphrase elsewhere in this pack as provisional,
not a confirmed summary of that ADR's actual reasoning.
