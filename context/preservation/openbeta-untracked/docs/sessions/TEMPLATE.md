---
status: TEMPLATE
category: sessions
lastVerified: 2026-08-31
---

# Session record template

Copy this file to `docs/sessions/YYYY-MM-DD-short-slug.md` and fill in
every field. See [`README.md`](README.md) for when a session warrants a
record at all — do not create one for a trivial edit.

```
SESSION_ID:       YYYY-MM-DD-short-slug
DATE:             (real calendar date(s) covered)
AGENT:            (which agent/model, or engineer)
TASK:             (what was actually asked, in the requester's own terms)
START_STATE:      (what docs/decisions/code were checked before starting —
                   agent-bootstrap protocol step 8)
DOCS_CONSULTED:   (real file paths)
DECISIONS_USED:   (docs/decisions/ ADRs that governed choices, if any)
FILES_INSPECTED:  (real paths touched or read in depth)
WORK_DONE:        (concretely — not a restatement of TASK)
TESTS:            (what ran, real pass/fail counts)
DISCOVERIES:      (anything found that wasn't the task itself)
BUGS_FOUND:       (real bugs found — fixed or flagged; link the fix/task)
DOCS_UPDATED:     (which files — agent-bootstrap protocol step 11)
RISKS:            (named, not implied — link docs/open-risks.md entries)
OPEN_QUESTIONS:   (link docs/open-questions.md entries if applicable)
NEXT_STEP:        (if incomplete, what specifically comes next)
BRANCH:           (git branch/worktree)
COMMIT:           (commit SHA(s), or "none (uncommitted)")
HANDOFF:          (one paragraph — what the next session/engineer needs
                   to know to continue correctly)
```
