---
status: ESTABLISHED
category: sessions
audience: internal (any agent or engineer)
lastVerified: 2026-08-31
---

# Work session records

A formal, lightweight record of a significant work session — what was
asked, what was found, what was done, what's left. This is **repo docs**
territory (see
[`docs/knowledge/knowledge-hub-boundary.md`](../knowledge/knowledge-hub-boundary.md)):
a durable, version-controlled record of what happened, distinct from the
Knowledge Hub's own operational session/task tracking, which this does
not replace or duplicate.

## When to write one

Write a session record for a session that:

- Made or changed an architectural/product decision (should also become
  or update a `docs/decisions/` ADR).
- Found a real bug, security issue, or documentation error worth
  remembering.
- Left work genuinely incomplete, in a state a future session needs to
  pick up correctly.
- Touched production, ran a real migration, or otherwise did something
  with lasting consequence.

**Do not** write one for a trivial edit (a typo fix, a one-line config
change, answering a question without changing anything). The bar is "a
future session would benefit from knowing this happened," not "a session
occurred."

## Format

One file per session: `docs/sessions/YYYY-MM-DD-short-slug.md`. Copy
[`TEMPLATE.md`](TEMPLATE.md). Required fields:

```
SESSION_ID       -- a short, stable identifier (date + slug is fine)
DATE             -- real calendar date(s) the session covered
AGENT            -- which agent/model, or engineer, did the work
TASK             -- what was actually asked, in the requester's own terms
START_STATE      -- what docs/decisions/code were checked before starting
                    (the agent-bootstrap protocol's step 8)
DOCS_CONSULTED   -- real file paths, not "I checked the docs"
DECISIONS_USED   -- which docs/decisions/ ADRs (if any) governed choices
FILES_INSPECTED  -- real paths touched or read in depth
WORK_DONE        -- concretely, not a restatement of TASK
TESTS            -- what ran, real pass/fail counts
DISCOVERIES      -- anything found that wasn't the task itself
BUGS_FOUND       -- real bugs found, fixed or flagged (link the fix or
                    the flagged task)
DOCS_UPDATED     -- which files, matching the agent-bootstrap protocol's
                    step 11
RISKS            -- named, not implied
OPEN_QUESTIONS   -- link to docs/open-questions.md entries if applicable
NEXT_STEP        -- if incomplete, what specifically comes next
BRANCH           -- git branch/worktree this session worked in
COMMIT           -- commit SHA(s) if any were made, or "none (uncommitted)"
HANDOFF          -- one paragraph: what the next session/engineer needs
                    to know to continue correctly
```

## Index

| Session | Date | Summary |
|---|---|---|
| [`2026-08-31-phase-l-closure-and-phase-m-knowledge.md`](2026-08-31-phase-l-closure-and-phase-m-knowledge.md) | 2026-08-31 | VIP-expiry bug SQL audit table + drift detection completed and tested (125/125); provider-web legacy panel second pass; Phase M knowledge/ADR/module-map foundation |
| [`2026-08-31-phase-n-policy-reconciliation.md`](2026-08-31-phase-n-policy-reconciliation.md) | 2026-08-31 | Reconciled WCoin 1:1 peg (real code conflict found and fixed locally), RMT policy, and Bug Hunter reward policy against Bryan's actual decisions; produced the Payment readiness contract |

This index is manually maintained — add a row when you add a session
file. It is not auto-generated (no tooling currently reads
`docs/sessions/` programmatically; see `docs/index.json` for the
separate machine-readable document index, which does NOT currently
include session records — see that file's own scope note).
