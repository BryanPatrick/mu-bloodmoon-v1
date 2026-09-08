# Blood Moon — repository-wide agent instructions

This file governs any AI coding agent working in this repository —
Claude Code, Codex, or any other tool. (`CLAUDE.md` exists alongside
this file for Claude Code's own tool-specific loading convention; its
content is a pointer to this file plus anything genuinely
Claude-specific, not a separate set of rules.) This repo has real
history of more than one agent/tool working here concurrently — keep
instructions here tool-agnostic so any of them behave consistently.

**Provenance note (2026-09-08)**: this file extends, not replaces, the
agent-bootstrap system originally built in `mu-bloodmoon-v1-openbeta`
(where it existed uncommitted; recovered and backed up at
`D:\MU\RecoveryBackups\openbeta-2026-09-08\`). Both `AGENTS.md` and
`docs/protocols/agent-bootstrap.md` now live canonically in this
dedicated governance branch (`governance/engineering-pack`, based on
`main`) instead. Rules 1-9 below restate that original system's core;
rules 10-22 are new, added this same day from the branch/dirty-worktree
recovery work — see `docs/architecture/branch-and-release-governance.md`
for the full reasoning behind each. Feature-domain docs the original
`docs/README.md` also indexed (`docs/vip/`, `docs/gamebridge/`,
`docs/manuals/`, `docs/decisions/`, etc.) are cross-branch references —
real, but not part of this governance-only tree; see the reconciliation
note in `docs/README.md` itself.

## Invariants (read before acting)

1. **Understand Objective/Phase before acting.** Follow
   [`docs/protocols/agent-bootstrap.md`](docs/protocols/agent-bootstrap.md)'s
   15-step sequence for any non-trivial engineering action — read
   [`docs/README.md`](docs/README.md), identify the domain, read current
   system docs and relevant [`docs/decisions/`](docs/decisions/) ADRs,
   check open risks/questions, only then act.
2. **Confirm branch/worktree before acting.** This project has multiple
   parallel git worktrees under `D:\MU\` — `git status` and confirm
   which one you're actually in before any non-trivial change. See
   `docs/architecture/branch-governance-audit-2026-09-08.md`.
3. **Branch state ≠ working-tree state.** To claim "a branch contains
   X," use `git ls-tree`/`git show <ref>:<path>` — never a plain
   directory listing, which mixes in whatever else is sitting there
   uncommitted. Classify a worktree separately: tracked-committed,
   tracked-modified, untracked. Full doc:
   `docs/architecture/branch-and-release-governance.md`.
4. **A worktree is not a backlog.** Don't let multiple unrelated
   features accumulate untracked in the same tree. When they start to,
   stop, classify, split into their own branches.
5. **Checkpoint early.** A migration, model, service, test, or doc that
   stands on its own as a coherent unit earns a real commit as soon as
   it exists — not batched for "later."
6. **Never develop a feature directly on `main`.** `main` is the stable
   consolidation target, not a working tree — small fixes get their own
   branch too.
7. **Commits are scoped by responsibility**, the same boundary a real
   PR would use — never `git add .` as a substitute for organization.
8. **No migration may exist only on a forgotten branch.** Once applied
   anywhere real data depends on it, it merges to trunk in the same
   cycle it shipped in.
9. **Recovery before cleanup.** A large dirty worktree is a recovery
   situation — classify and back up before any `git clean`/`reset`/
   consolidation, never the reverse.
10. **Secrets hygiene**: never a full/wide read of any page or file
    known to render secrets (see rule 15). Never print, log, or commit
    a credential value, even partially.
11. **Least privilege**: any new database login, API scope, or
    credential is scoped to exactly what the task needs — see
    `docs/security/game-write-boundary.md`.
12. **Evidence-first for any process/deploy action.** Before signaling
    or reloading a process, confirm PID **and** `CWD`/`CL_APP_ROOT` (or
    equivalent) independently — never PID alone.
13. **Never trust an automation tool's accessibility label alone** for
    a risk-bearing UI click (start/stop/restart/destroy). Confirm
    visually first.
14. **Never broad-read a page or file that renders environment
    variables or secrets** — `document.body.innerText`, `get_page_text`,
    a full screenshot OCR, or fixed-length slicing all count. Use a
    sanitized, whitelisted-output diagnostic script instead. This
    project has had three real incidents from skipping this — see
    `docs/security/secret-incident-history.md`.
15. **Migration privileges are derived from the SQL itself**, never
    guessed from a Prisma model — field types/constraints can differ
    from what a model definition implies.
16. **A `bmweb` (Nuxt) deploy is validated against its own build
    manifest**, never by file count or by checking one specific chunk's
    presence — see `docs/operations/nuxt-deploy-integrity.md`.
17. **No destructive action by improvisation.** Anything that drops,
    deletes, force-pushes, or overwrites without a backup requires
    explicit, fresh authorization — never inferred from an earlier,
    differently-scoped approval.
18. **A "zero errors" log read is only valid once the log's real path
    is confirmed for that specific process** — a wrong/missing path
    silently returns a false negative, not evidence of health.
19. **Credential rotation maps every real consumer before restart** —
    rotating a password without updating the runtime var that reads it
    causes an outage, not a rotation. Real incident:
    `docs/architecture/branch-governance-audit-2026-09-08.md`.
20. **A feature is not `DONE` at commit or deploy.** It needs
    integration into trunk and a release/tag recorded too — see the
    feature lifecycle in `docs/architecture/engineering-governance.md`.
21. **Approval is required for any consequential action, every time** —
    regardless of what an earlier, differently-scoped approval in the
    same conversation covered.
22. **No memory-only work.** Never work only from chat context, model
    memory, or a previous session's summary — check persisted
    documentation first; if it doesn't answer the question, search and
    document what's found, marking `UNKNOWN`/`NEEDS_VALIDATION` rather
    than guessing.

## Where things live

- **Central documentation index**: [`docs/README.md`](docs/README.md).
- **Engineering process/lifecycle**: [`docs/architecture/engineering-governance.md`](docs/architecture/engineering-governance.md).
- **Branch/release/deploy governance**: [`docs/architecture/branch-and-release-governance.md`](docs/architecture/branch-and-release-governance.md).
- **Control plane architecture**: [`docs/architecture/control-plane.md`](docs/architecture/control-plane.md).
- **Why something is the way it is**: [`docs/decisions/`](docs/decisions/) (ADRs).
- **Known gaps needing a decision**: [`docs/open-questions.md`](docs/open-questions.md).
- **Known technical/operational risks**: [`docs/open-risks.md`](docs/open-risks.md).

## Production safety

No production database write, no production deploy, and no push to a
shared branch without explicit, in-the-moment approval — regardless of
what an earlier approval in this conversation covered. Read-only
production access, where already set up, is fine; treat anything else
as requiring a fresh confirmation.

## Documentation discipline

A change that alters behavior is not done until the relevant technical
doc, decision/phase history, and (if it changes what an admin/GM/player
can do or see) the relevant manual are updated to match. A task missing
any of these is reported PARTIAL, with the gap named — never PASS
anyway.

History is never silently overwritten. A wrong past claim is corrected
visibly (`~~strikethrough~~` plus the correction, or a document-level
`SUPERSEDED` status), never by deleting the old text.

## Related

`docs/protocols/agent-bootstrap.md` (full 15-step protocol),
`docs/architecture/engineering-governance.md` (feature lifecycle),
`docs/architecture/branch-and-release-governance.md` (branch/release/
deploy rules), `CLAUDE.md` (Claude-specific notes only).
