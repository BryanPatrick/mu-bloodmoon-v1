---
status: ACTIVE
category: operations
audience: internal (the assigned independent reviewer)
lastVerified: 2026-09-17
---

# Context Pack independent review — reviewer instructions

## Who this is for

A real, independent agent (Codex, or another human/agent explicitly
assigned by Bryan) reviewing `context/` on branch
`phase-9/context-pack-v1-foundation` before it merges into `main`. **Not
`codex-staging`** — that synthetic Knowledge Hub fixture already
lifecycle-validated the orchestration mechanics (see
`context/domains/orchestration.md`) and does not count as this review,
by explicit instruction (Phase 10, Part 37). If no real Codex/independent
session is assigned yet, this review's status is
`REAL_INDEPENDENT_REVIEW_PENDING` — do not fake one to close the gap.

## Your objective

Find real problems, not style preferences. Specifically:

- **Incorrect facts** — a claim that doesn't match what the cited source
  actually says.
- **Unsupported claims** — a statement with no traceable source at all
  (see `context/GOVERNANCE.md`'s authority-level model; anything that
  isn't `EXECUTABLE_FACT`/`CANONICAL_DECISION`/`CURRENT_DOC`/
  `ACCEPTED_HANDOFF`/`HISTORICAL_SOURCE`/explicitly-attributed-to-Bryan
  should not be stated as fact).
- **Stale decisions presented as current** — check
  `context/KNOWLEDGE_HUB_MAPPING.md`'s per-decision table and
  `context/REPOSITORY_KNOWLEDGE_MAP.md` §6 for the one conflict already
  found (`cf5f14c2`/`53034c0c` vs. `fa8e9ad0`); look for others this
  pass may have missed.
- **Idea/decision confusion** — especially in `context/domains/n8n.md`,
  `bloodmoon-ai.md`, `notifications.md`, `referral.md`, `marketing.md`.
  These domains contain a lot of future/proposal content; confirm every
  such file says PLANNED/PROPOSED and never implies something is built
  when it isn't.
- **Missing supersessions** — a decision that repo evidence contradicts
  but that isn't flagged anywhere (`context/SUPERSEDED_DECISIONS.md`,
  `context/OPEN_QUESTIONS.md`).
- **Wrong authority** — a source cited as more authoritative than it
  actually is (e.g. an unmerged design-branch doc treated as a decided
  architecture — see `GOVERNANCE.md`'s `CURRENT_DOC` vs.
  `CANONICAL_DECISION` distinction).
- **Broken sources** — run `node context/validate.mjs` yourself; don't
  just trust the last recorded PASS.
- **Important omissions** — something the pack should cover for its
  stated purpose (bootstrap-time orientation) but doesn't.

**You must not simply rewrite style, tone, or wording.** A finding is
only real if it's one of the categories above.

## What you need — the review package (nothing else required first)

You should **not** need to read the entire repository before reviewing.
Everything below is real, already exists, and is the intended entry
point:

1. **The diff itself**: `git diff main phase-9/context-pack-v1-foundation`
   (29 files, ~1,540 insertions across both Phase 9 and Phase 10 work) —
   or read `context/` directly on this branch, it's small.
2. **Knowledge map**: [`../../context/REPOSITORY_KNOWLEDGE_MAP.md`](../../context/REPOSITORY_KNOWLEDGE_MAP.md)
   — where every relevant doc actually lives, and the real
   docs/README.md gap resolution.
3. **Source index**: [`../../context/SOURCE_INDEX.md`](../../context/SOURCE_INDEX.md)
   — every source this pack cites, with an authority level and how it
   was verified.
4. **Decision index**: [`../../context/DECISIONS.md`](../../context/DECISIONS.md)
   and [`../../context/KNOWLEDGE_HUB_MAPPING.md`](../../context/KNOWLEDGE_HUB_MAPPING.md)
   — the ADR index and the full 26-Hub-decision table.
5. **Conflict list**: `REPOSITORY_KNOWLEDGE_MAP.md` §6 (the Hub decision
   conflict) — the one explicit conflict record produced so far; look
   for more.
6. **Open questions**: [`../../context/OPEN_QUESTIONS.md`](../../context/OPEN_QUESTIONS.md)
   — everything already flagged as unresolved; don't re-report these as
   new findings, but do check whether any of them should have been
   resolved and weren't.
7. **Validation output**: run `node context/validate.mjs` yourself (see
   above) — current state as of this doc: `PASS, 28 files, 0 issues`.

## Reporting your findings

Use whatever format the assigning session asks for. At minimum, for
each finding: which file, what's wrong, what category (from the list
above), and what evidence you checked. If you find zero real issues,
say so explicitly — a review that "found nothing" is only credible if
it also names what you checked and concluded was fine.

## What happens after your review

Per the Phase 10 merge gate: repository reconciliation PASS (done) +
context validation PASS (done) + **your real independent review PASS**
+ any critical findings resolved. Only then does merging
`phase-9/context-pack-v1-foundation` into `main` become appropriate —
and even then, that merge itself needs its own explicit go-ahead, not
an automatic follow-on from your review passing.
