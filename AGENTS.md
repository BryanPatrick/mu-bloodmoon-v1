# Blood Moon — repository-wide agent instructions

This file governs any AI coding agent working in this repository —
Claude Code, Codex, or any other tool. (`CLAUDE.md` exists alongside
this file for Claude Code's own tool-specific loading convention; its
content is a pointer to this file plus anything genuinely
Claude-specific, not a separate set of rules.) This repo has real
history of more than one agent/tool working here concurrently — keep
instructions here tool-agnostic so any of them behave consistently.

**Canonical source (2026-09-25, `ADR-0034`)**: `main` on
`github.com/BryanPatrick/mu-bloodmoon-v1` is the definitive canonical
source of truth for this file, `docs/protocols/`, `context/` and every
other governance/knowledge document. `docs/agent-automation-architecture`,
`governance/engineering-pack` and `preservation/main-snapshot-b5a4321d`
(the former local `D:\MU` `main`) are historical/preserved sources,
read only to recover content that has not reached `main` yet. This
file reached `main` in `BLOODMOON-AI-06`. Documents referenced below
that are not on `main` yet are marked as such.

**Provenance note (2026-09-08)**: this file extends, not replaces, the
agent-bootstrap system originally built in `mu-bloodmoon-v1-openbeta`
(where it existed uncommitted; recovered and backed up at
`D:\MU\RecoveryBackups\openbeta-2026-09-08\`). Both `AGENTS.md` and
`docs/protocols/agent-bootstrap.md` ~~now live canonically in this
dedicated governance branch (`governance/engineering-pack`, based on
`main`) instead~~ **live canonically on `main` since 2026-09-25
(`ADR-0034`); `governance/engineering-pack` is now a historical source**. Rules 1-9 below restate that original system's core;
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
   `docs/README.md` (not yet on `main`; until it lands, start at
   [`context/README.md`](context/README.md) and
   [`docs/knowledge/KNOWLEDGE_MASTER_INDEX.md`](docs/knowledge/KNOWLEDGE_MASTER_INDEX.md)), identify the domain, read current
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
23. **Host storage preflight before any space-consuming host action**
    (deploy, upload, archive extraction, `npm install`, `prisma
    generate`, backup, restore, `.output` replacement, runtime update,
    package creation) — collect account quota, host filesystem, and
    inode usage, and classify PASS/WARN/FAIL against the operation's
    own estimated peak extra space, never percentage alone. FAIL means
    STOP — do not proceed without resolving the space or getting fresh,
    explicit authorization. Full procedure, thresholds, and worked
    examples: `docs/operations/host-storage-preflight.md`.
24. **Applied migrations are immutable by default.** Once a
    `migration.sql` has `finished_at` set in ANY persistent environment
    (local dev, CI, staging, production), it must not be edited
    casually — a normal fix is a new, later migration. An exception
    requires all of: (1) a documented reason; (2) the old checksum;
    (3) the new checksum; (4) an inventory of every environment where
    it's already applied; (5) a real from-zero replay proving the new
    content still applies cleanly; (6) cross-engine/compatibility
    validation where relevant; (7) direct verification of the
    migration's actual real-world effect, not just its recorded
    status; (8) an explicit checksum-reconciliation plan per
    environment; (9) fresh, explicit authorization before any
    production reconciliation write; (10) incident/decision
    documentation recording all of the above. This is not optional
    tooling behavior to lean on — confirmed empirically (Prisma
    5.22.0): a modified already-applied migration produces **no
    warning and no failure** from either `prisma migrate status` or
    `prisma migrate deploy`, both exit 0. Nothing in the tooling
    enforces this; only this rule does. Full incident, procedure, and
    evidence: `docs/decisions/0030-migration-casing-static-audit.md`.

## Where things live

- **Canonical-source decision**: [`docs/decisions/0034-main-is-the-canonical-source-of-truth.md`](docs/decisions/0034-main-is-the-canonical-source-of-truth.md).
- **Bootstrap entry point on `main`**: [`context/README.md`](context/README.md) (Context Pack) and [`docs/knowledge/KNOWLEDGE_MASTER_INDEX.md`](docs/knowledge/KNOWLEDGE_MASTER_INDEX.md).
- **Central documentation index**: `docs/README.md` — not yet on `main` (historical copy on `docs/agent-automation-architecture`; it indexes many Open Beta docs that have not reached `main`).
- **Engineering process/lifecycle**: [`docs/architecture/engineering-governance.md`](docs/architecture/engineering-governance.md).
- **Branch/release/deploy governance**: [`docs/architecture/branch-and-release-governance.md`](docs/architecture/branch-and-release-governance.md).
- **Control plane architecture**: `docs/architecture/control-plane.md` — not yet on `main` (historical copy on `docs/agent-automation-architecture`).
- **Agent automation architecture**: [`docs/architecture/agent-automation-architecture.md`](docs/architecture/agent-automation-architecture.md).
- **Why something is the way it is**: [`docs/decisions/`](docs/decisions/) (ADRs).
- **Known gaps needing a decision**: `docs/open-questions.md` — not on any pushed branch (preserved Open Beta material); on `main` use [`context/OPEN_QUESTIONS.md`](context/OPEN_QUESTIONS.md) and [`docs/knowledge/KNOWLEDGE_GAPS.md`](docs/knowledge/KNOWLEDGE_GAPS.md).
- **Known technical/operational risks**: `docs/open-risks.md` — same status as above.

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
