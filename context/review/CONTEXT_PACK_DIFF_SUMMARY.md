---
status: ACTIVE
category: context-pack
audience: internal (the assigned independent reviewer)
lastVerified: 2026-09-17
---

# Context Pack diff summary

Branch `phase-9/context-pack-v1-foundation` vs. `main` (`f5fd099a`).
Three real phases of work, all on this one branch, never merged:

## Phase 9 (foundation)

Created `context/` from nothing: 15 root docs + 12 domain stubs +
`validate.mjs`, plus `docs/operations/chat-history-ingestion.md`. Ran
the first real (non-synthetic) Claude staging pilot through the
Knowledge Hub's full orchestration lifecycle. 29 files, ~1,420
insertions.

## Phase 10 (reconciliation + hardening)

24 files changed, 921 insertions / 162 deletions. Added
`context/REPOSITORY_KNOWLEDGE_MAP.md` and
`docs/operations/context-pack-independent-review.md`. Read all 26
production Knowledge Hub decisions for real (read-only). Discovered
and incorporated 3 real unmerged design docs
(`architecture/agent-orchestration-foundation`) into the `n8n`/
`bloodmoon-ai`/`notifications` domain stubs. Reconciled the Asaas
payments branches. Added a 6-level source-authority model. Disabled
Knowledge Hub staging orchestration (idle policy).

## Phase 11 (preservation + review-package prep) — this pass

- Preserved all 125 real, untracked documentation files from
  `mu-bloodmoon-v1-openbeta` byte-exact into
  `context/preservation/openbeta-untracked/`, hash-verified 125/125.
- Read all 21 previously-missing ADRs (`0001-0018`/`0020`/`0022`/`0027`)
  in full, plus `docs/decisions/README.md`, `docs/open-questions.md`
  (OQ-001 through OQ-037), `docs/open-risks.md` (OR-001 through OR-026),
  and 6 more `docs/knowledge/*` files.
- New: `context/ADR_INDEX.md` (all 30 ADRs, committed + preserved),
  `context/preservation/OPENBETA_UNTRACKED_MANIFEST.md`,
  `context/review/` (this package).
- Resolved `OQ-CTX-003` fully (ADR-0016's real RMT policy content).
  Refined (not closed) `OQ-CTX-006` (the Hub decision conflict) with
  real partial evidence. Found a new gap (`OQ-CTX-008`): the real
  player/admin/super-admin/technical manuals `docs/README.md` names
  don't exist on `main` either, only preserved.
- Extended `validate.mjs` with a preservation hash-integrity check;
  self-caught and fixed an initial over-application of authoring
  checks to the frozen preservation archive.

## What did NOT happen, on purpose

No merge to `main`. No ChatGPT history import. No production Knowledge
Hub write (read-only `SELECT` only, both phases). No file deleted from
`mu-bloodmoon-v1-openbeta` — the originals are untouched.
