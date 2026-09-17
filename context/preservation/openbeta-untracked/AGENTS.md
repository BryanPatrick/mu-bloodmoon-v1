# Blood Moon — repository-wide agent instructions

This file governs any AI coding agent working in this repository —
Claude Code, Codex, or any other tool. (`CLAUDE.md` exists alongside this
file for Claude Code's own tool-specific loading convention; its content
is a pointer to this file plus anything genuinely Claude-specific, not a
separate set of rules.) This repo has real history of more than one
agent/tool working here concurrently — keep instructions here
tool-agnostic so any of them behave consistently.

## BEFORE ANY ACTION

Before any non-trivial engineering action, follow
[`docs/protocols/agent-bootstrap.md`](docs/protocols/agent-bootstrap.md)
in full. Summary of its 8-step core (the full document has the complete
15-step sequence, including test/doc/handoff steps after the work
itself):

1. Read [`docs/README.md`](docs/README.md) — the central documentation
   index.
2. Identify which domain(s) the task touches.
3. Read the relevant CURRENT-state documentation for that domain (use
   [`docs/knowledge/module-map.md`](docs/knowledge/module-map.md) to find
   it quickly).
4. Read the relevant [`docs/decisions/`](docs/decisions/) ADRs.
5. Read the latest relevant phase/session/handoff record
   ([`docs/sessions/`](docs/sessions/), [`docs/handoff/`](docs/handoff/)).
6. Check [`docs/open-risks.md`](docs/open-risks.md) and
   [`docs/open-questions.md`](docs/open-questions.md) for anything
   already known and relevant.
7. Verify branch/worktree/environment state (`git status`, confirm which
   worktree you're actually in).
8. Only then act.

This is scoped reading, not exhaustive reading — see
`docs/protocols/agent-bootstrap.md`'s own "Scoped reading" section for
how to bound step 3 to what the task actually touches, so this rule
produces consistency without flooding context on every task.

## NO MEMORY-ONLY WORK

**Never work only from chat memory, model memory, a previous session's
summary, or an assumption.** Persisted project knowledge
(`docs/`) must be consulted first. If the documentation doesn't answer
the question, search the actual code/data and document what's found —
mark it `UNKNOWN`/`NEEDS_VALIDATION` if it stays unresolved after a real
search, never guess and present the guess as fact.

If persisted docs conflict with what the code actually does:
investigate, and document the discrepancy explicitly (which one is
stale, and why) — never silently trust one side without saying so.

This is a real, consequential rule, not boilerplate: this project's own
history includes a case where skipping this exact check let a wrong
claim ("no legacy CMS source exists locally") stand across two phases
before a broader search corrected it — see the visible correction in
`docs/gameserver/database/legacy-unknown-structures.md`. A second,
independent instance: `docs/launcher/cache-and-fallback.md` claimed a
service was "not yet wired into `MainWindow`" long after it actually
was — found and corrected during Phase M (2026-08-31) specifically
because this rule was followed.

## Where things live (quick map)

- **Current system truth**: domain folders under `docs/` (`docs/vip/`,
  `docs/gamebridge/`, `docs/security/`, etc.) and
  `docs/knowledge/module-map.md` for a cross-system view.
- **Why something is the way it is**: `docs/decisions/` (ADRs).
- **What happened in a past work session**: `docs/sessions/`.
- **Operational continuity across sessions/projects** (task tracking,
  cross-project coordination): the external Knowledge Hub, not this
  repo — see `docs/knowledge/knowledge-hub-boundary.md` for the exact
  split and how to bootstrap from both.
- **Manuals** (Player/ADM/Super ADM/Technical Operator):
  `docs/manuals/`.
- **Known gaps needing a decision**: `docs/open-questions.md`.
- **Known technical/operational risks**: `docs/open-risks.md`.
- **What's actually been tested, and how recently**:
  `docs/test-evidence-index.md`.
- **Machine-readable document index**: `docs/index.json` (honestly
  scoped — see its own `_meta` field for coverage).

## Production safety

No production database write, no production deploy, and no push to a
shared branch without explicit, in-the-moment user approval — regardless
of what any earlier approval in this conversation covered. Read-only
production access, where already set up, is fine; treat anything else as
requiring a fresh confirmation.

## Documentation discipline (permanent completeness rule)

A phase or task that changes behavior cannot be reported PASS if any of
these are missing: the implementation itself, tests, the relevant
technical doc update, phase/decision history, manual impact (if it
changes what an admin/GM/player can do or see), and a central-index
update where applicable. If any are missing, report PARTIAL and name
what's missing — do not report PASS anyway.

History is never silently overwritten. When a past claim in the docs
turns out to be wrong, correct it visibly (`~~strikethrough~~` with the
correction next to it, or a document-level `SUPERSEDED`/`OUTDATED`
status per `docs/protocols/freshness-standard.md`), never by deleting
the old text.

## Session records

For a significant session (a real decision made, a real bug found, work
left incomplete, or anything touching production), write a session
record per `docs/sessions/README.md`'s standard. Do not write one for a
trivial edit — see that file for the exact bar.

## Related

`docs/protocols/agent-bootstrap.md` (the full protocol this file
summarizes), `docs/protocols/freshness-standard.md`,
`docs/protocols/footnote-standard.md`, `docs/README.md`.
