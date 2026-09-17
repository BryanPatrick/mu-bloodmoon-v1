---
status: ACTIVE
category: context-pack
audience: internal (the assigned independent reviewer)
lastVerified: 2026-09-17
---

# Independent review package

Start here. This directory is a compact entry point into the real
Context Pack — not a copy of it. Each file below is short and either
summarizes or points at the real source; none duplicates a full
document. Reviewer instructions (objective, what counts as a real
finding, how to report): [`../../docs/operations/context-pack-independent-review.md`](../../docs/operations/context-pack-independent-review.md).

## Reading order

1. [`CONTEXT_PACK_DIFF_SUMMARY.md`](CONTEXT_PACK_DIFF_SUMMARY.md) — what changed, branch vs. `main`
2. [`SOURCE_SUMMARY.md`](SOURCE_SUMMARY.md) — where every claim comes from
3. [`DECISION_INDEX.md`](DECISION_INDEX.md) — every ADR + Hub decision, one table
4. [`PRESERVED_SOURCES_SUMMARY.md`](PRESERVED_SOURCES_SUMMARY.md) — the 125-file openbeta rescue, condensed
5. [`CONFLICTS.md`](CONFLICTS.md) — every conflict found, unresolved ones flagged
6. [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) — condensed pointer to the real list
7. [`VALIDATION_RESULT.md`](VALIDATION_RESULT.md) — last real `validate.mjs` run + secret scan

## What you do NOT need to read first

The full `docs/` tree, every worktree, or the Knowledge Hub's raw
database — this package is deliberately sufficient on its own for a
first pass. Go deeper only where a specific claim looks wrong and you
need to check its cited source.
