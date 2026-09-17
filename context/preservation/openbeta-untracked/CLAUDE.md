# Blood Moon — agent instructions (Claude Code)

**The full repository-wide agent rules live in
[`AGENTS.md`](AGENTS.md)** — read it. This file exists only for Claude
Code's own tool-specific auto-loading convention; it is not a separate
or divergent rule set. Every rule below is a restatement or pointer, not
new content.

## BEFORE ANY ACTION

Follow [`docs/protocols/agent-bootstrap.md`](docs/protocols/agent-bootstrap.md)
(summarized in `AGENTS.md`): read [`docs/README.md`](docs/README.md),
identify the domain, check [`docs/decisions/`](docs/decisions/) and the
relevant system docs, check [`docs/open-risks.md`](docs/open-risks.md)/
[`docs/open-questions.md`](docs/open-questions.md) — only then act.

**Never work from chat context, model memory, a previous session's
summary, or an assumption alone when current persisted documentation can
answer the question.** Mark `UNKNOWN`/`NEEDS_VALIDATION` if genuinely
unresolved after a real search — never guess and present it as fact. If
documentation conflicts with code, investigate and document the
discrepancy — never silently pick one side.

This is a real rule with real cost when skipped — see `AGENTS.md`'s
own two documented examples of what happens when it isn't followed.

## Production safety

No production database write, no production deploy, and no push to a
shared branch without explicit, in-the-moment user approval — regardless
of what any earlier approval in this conversation covered. Read-only
production access, where already set up, is fine; treat anything else as
requiring a fresh confirmation.

## Documentation discipline

A change that alters behavior is not done until the relevant technical
doc, decision/phase history, and (if it changes what an admin/GM/player
can do or see) the relevant manual are updated to match. Reporting a
task "complete" without those updates is inaccurate — report it partial
and say what's missing instead.

History is never silently overwritten. When a past claim in the docs
turns out to be wrong, correct it visibly (e.g. `~~strikethrough~~` with
the correction next to it), not by deleting the old text.
