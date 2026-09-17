---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Source index

Stable IDs for everything this Context Pack actually drew from. Nothing
below is invented. Each row now carries an authority level (see
`GOVERNANCE.md`'s Phase 10 addition) and, per Part 23, a commit ref
where one makes the reference stable across branch-layout changes
(preferred over a bare path when the source is a specific commit's
content, not a living file this pack should always track the tip of).
Future `SRC-CHAT-*` IDs are reserved for real chat transcripts once
actually supplied — never created speculatively.

## Source types

`REPOSITORY_DOC` / `CODE` / `DATABASE_SCHEMA` / `KNOWLEDGE_HUB_DECISION` /
`HANDOFF` / `CHAT_TRANSCRIPT` / `ADMIN_DECISION` / `EXTERNAL_REFERENCE`

## Repository sources — `mu-bloodmoon-v1`

| ID | Type | Ref | Authority | Verified how |
|---|---|---|---|---|
| SRC-REPO-001 | REPOSITORY_DOC | `main:AGENTS.md` | CURRENT_DOC | Read in full |
| SRC-REPO-002 | REPOSITORY_DOC | `main:CLAUDE.md` | CURRENT_DOC | Read in full |
| SRC-REPO-003 | REPOSITORY_DOC | `main:docs/protocols/agent-bootstrap.md` | CURRENT_DOC | Read in full |
| SRC-REPO-004 | REPOSITORY_DOC | `main:docs/README.md` (719 lines, commit `b89f3e25`) | CURRENT_DOC | Partial (596/720 lines) |
| SRC-REPO-005 | REPOSITORY_DOC | `main:docs/architecture/engineering-governance.md` | CURRENT_DOC | Partial (first 80 lines) |
| SRC-REPO-006 | REPOSITORY_DOC | `main:docs/decisions/0030-migration-casing-static-audit.md` | CANONICAL_DECISION | Read in full |
| SRC-REPO-007 | REPOSITORY_DOC | `main:docs/decisions/{0019,0021,0023,0024,0025,0026,0028,0029}-*.md` | CANONICAL_DECISION | Listed via `git ls-tree` only; titles from filenames, not content |
| SRC-REPO-008 | REPOSITORY_DOC | `main:knowledge/README.md` | CURRENT_DOC | Read in full |
| SRC-REPO-009 | EXECUTABLE_FACT | `git ls-tree -r HEAD -- docs/` (231 files, `main`) | EXECUTABLE_FACT | Run directly |
| SRC-REPO-010 | REPOSITORY_DOC | `main:docs/handoff/*` (10 files) | CURRENT_DOC | Listed only, not read |
| SRC-REPO-011 | EXECUTABLE_FACT | `git log --all --diff-filter=A -- <path>` for every Phase-9-flagged missing file | EXECUTABLE_FACT | Run directly, Phase 10 — 0 hits for every path, across all 26 branches |
| SRC-REPO-012 | REPOSITORY_DOC | Untracked files in `mu-bloodmoon-v1-openbeta` (`docs/decisions/0001-0028+README`, `docs/open-questions.md`, `docs/open-risks.md`, `docs/knowledge/module-map.md`+5 siblings, `docs/gameserver/`, `docs/store/`, original `AGENTS.md`/`CLAUDE.md`/`docs/README.md`) | HISTORICAL_SOURCE | Confirmed present + untracked via `git status --short`, Phase 10; content not individually read beyond filenames/diff-stats |
| SRC-REPO-013 | CODE/DOC | `architecture/agent-orchestration-foundation:docs/architecture/engineering-agent-orchestration.md` (commit `7b8c2799`) | CURRENT_DOC (proposal, not a decision) | Read in full, Phase 10 |
| SRC-REPO-014 | CODE/DOC | `architecture/agent-orchestration-foundation:docs/architecture/bloodmoon-ai-assistant.md` (commit `7b8c2799`) | CURRENT_DOC (proposal) | Read in full, Phase 10 |
| SRC-REPO-015 | CODE/DOC | `architecture/agent-orchestration-foundation:docs/architecture/notification-intelligence.md` (commit `7b8c2799`) | CURRENT_DOC (proposal) | Read in full, Phase 10 |
| SRC-REPO-016 | HANDOFF | `payments/asaas-local-hardening-claude:docs/payments/asaas-sandbox-phase4-claude-handoff.md` (commit `223b111c`) | ACCEPTED_HANDOFF (status `HANDOFF_FOR_CODEX`, unconsumed) | Read in full, Phase 10 |
| SRC-REPO-017 | EXECUTABLE_FACT | `git log`/`git diff --stat` across `payments/asaas-sandbox`, `payments/asaas-local-hardening-claude`, `main` | EXECUTABLE_FACT | Run directly, Phase 10 |
| SRC-REPO-018 | REPOSITORY_DOC | `payments/asaas-sandbox-phase5-codex:docs/payments/asaas-sandbox-phase5.md` (commit `066ad3be`) | ACCEPTED_HANDOFF | Read and cross-checked in Phase 12; local DB parity report, no real provider call |
| SRC-REPO-019 | REVIEW_REPORT | `context/review/CODEX_PHASE12_INDEPENDENT_REVIEW.md` (this branch) | CURRENT_DOC | Independent content audit, Phase 12; not an approval or merge authorization |
| SRC-REPO-020 | REPOSITORY_DOC | `payments/asaas-sandbox-phase5-codex:docs/payments/asaas-sandbox-phase6.md` (head `56b05054`, core code at `ed326e90`) | ACCEPTED_HANDOFF (isolated branch; not canonical production policy) | Read against real Sandbox/local DB test evidence, Phase 6 |
| SRC-REPO-021 | REPOSITORY_DOC | `docs/handoff/auth-recovery-provider-blocker.md` (this branch) | CURRENT_DOC | Read in full for the Phase 12 beta NO-GO correction; deployed end-to-end QA remains open |
| SRC-OPENBETA-* | REPOSITORY_DOC (125 rows) | `mu-bloodmoon-v1-openbeta` untracked working tree, preserved to `preservation/openbeta-untracked/`, HEAD `2811522d` | HISTORICAL_SOURCE (per-group nuance — see manifest) | All 125 hash-verified (PASS); 21 ADRs + `open-questions.md`/`open-risks.md`/`decisions/README.md`/6 `knowledge/*` siblings read in full; the rest (gameserver/manuals/legacy/payments/etc.) title+frontmatter-read, not deep-read. Full detail: [`preservation/OPENBETA_UNTRACKED_MANIFEST.md`](preservation/OPENBETA_UNTRACKED_MANIFEST.md). ID scheme: `SRC-OPENBETA-<n>` = the `<n>`th alphabetical row of `preservation/_hashes_reference.tsv` — see the manifest's own "Source IDs" section for why a flat 125-row table isn't duplicated here. |

## Knowledge Hub sources (`D:\MU\hub`, separate repository)

| ID | Type | Ref | Authority | Verified how |
|---|---|---|---|---|
| SRC-HUB-001 | REPOSITORY_DOC | `docs/operations/orchestration-staging.md` | CURRENT_DOC | Read in full, earlier this session |
| SRC-HUB-002 | REPOSITORY_DOC | `docs/operations/orchestration-staging-validation.md` | CURRENT_DOC | Read earlier this session; not fully re-quoted |
| SRC-HUB-003 | REPOSITORY_DOC | `docs/operations/orchestration-remote-adoption.md` | CURRENT_DOC | Read earlier this session; not fully re-quoted |
| SRC-HUB-004 | DATABASE_SCHEMA | Production `ai-knowledge-hub-db` — 44 tasks / 418 events (Phase 6 count) | HISTORICAL_SOURCE (count only, not re-verified) | Phase 6 read-only audit (prior session) |
| SRC-HUB-005 | CODE | `src/repositories/*.ts`, `src/services/*.ts` (Hub Worker) | CURRENT_DOC | Read/edited across Phases 5-8 |
| SRC-HUB-006 | KNOWLEDGE_HUB_DECISION | Production `ai-knowledge-hub-db`, `decisions` table, all 26 rows (`SELECT ... ORDER BY created_at ASC`) | CANONICAL_DECISION | **Read in full, Phase 10**; six targeted texts independently re-read read-only in Phase 12, zero mutation; see `KNOWLEDGE_HUB_MAPPING.md` |
| SRC-HUB-007 | EXECUTABLE_FACT | Production `ai-knowledge-hub-db`, `decisions.created_at` timestamps used for the `cf5f14c2`/`53034c0c`/`fa8e9ad0` conflict timeline | EXECUTABLE_FACT | Read directly, Phase 10 |
| SRC-HUB-008 | EXECUTABLE_FACT | Staging `ai-knowledge-hub-db-staging`, `tasks` table, active-task check before the idle-policy disable | EXECUTABLE_FACT | Read directly, Phase 10 |
| SRC-HUB-009 | CODE/CONFIG | `wrangler.staging.jsonc`, `ORCHESTRATION_ENABLED` (`true` → `false`, commit `2feab7f` on `orchestration/mvp-phase-1`) | EXECUTABLE_FACT | Edited + deployed + verified (503 on a write attempt), Phase 10 |

## What is explicitly `SOURCE_PENDING` (believed to originate in a prior
Bryan/ChatGPT conversation, but no transcript was ever supplied this
session — never dated, never quoted, never treated as evidence)

None recorded. This Context Pack was built entirely from SRC-REPO-* and
SRC-HUB-* sources above, per the explicit constraint given for this
phase: no automatic access to Bryan's ChatGPT history exists, and none
was fabricated. If a future session believes some piece of context
originated in a prior chat, it should add a row here with status
`SOURCE_PENDING` rather than write it into any other document as fact.

**A related but distinct category, not `SOURCE_PENDING`**: a direct,
current-session instruction from Bryan (e.g. `domains/bloodmoon-ai.md`'s
answer-source-ladder concepts, given in this phase's own brief) is a
real, attributable, dated source — just not a repository document and
not a past ChatGPT transcript. These are cited in-place as "Bryan,
Phase N brief, <date>" rather than given a `SRC-*` row, since they're
not a stable artifact this pack can re-read later the way a file or a
Hub row can.

**Running totals**: ~~Phase 10: 17 `SRC-REPO-*` + 9 `SRC-HUB-*` = 26~~
Phase 12: 21 `SRC-REPO-*` + 9 `SRC-HUB-*` = 30 sources,
0 `SOURCE_PENDING`.

## Honesty note on partial reads

`SRC-REPO-004` (`docs/README.md`) and several ADRs (`SRC-REPO-007`) were
only partially read or only listed by filename. Anything this Context
Pack says about their content is scoped to what was actually read —
where a summary above says "titles taken from filenames, not content,"
treat any ADR title paraphrase elsewhere in this pack as provisional,
not a confirmed summary of that ADR's actual reasoning.
