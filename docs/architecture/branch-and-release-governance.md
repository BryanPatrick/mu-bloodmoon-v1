# Blood Moon branch & release governance

**Status**: RULES DOCUMENTED, NOT YET ENFORCED BY TOOLING. Written
2026-09-08 after a read-only audit found the underlying problem this
document exists to prevent: nine feature branches, at least one already
confirmed live in production, none merged back to `main`, and two
worktrees carrying real uncommitted feature work at real risk of loss.
Full evidence: `docs/architecture/branch-governance-audit-2026-09-08.md`.

## The target flow

```
Objective → Phase → Branch → Implementation → Tests → Review →
Consolidation → Deploy → Production Verification → Merge → Tag → Archive
```

Every step from `Branch` onward is real work; the flow is not
considered finished at `Deploy`. A branch that reached production but
never continued to `Merge → Tag → Archive` is exactly the failure mode
this document exists to stop recurring.

## Hard rules

1. **A feature is not "done" until**: tested, reviewed, deployed,
   smoke-tested, **merged back to trunk**, tagged/release-noted when
   relevant, and its branch marked for archive/delete. Reaching
   production is not the finish line.
2. **No migration may exist "only on a forgotten branch."** Once a
   migration has been applied anywhere real data depends on it
   (production, or a shared staging environment), it must be merged
   into trunk in the same cycle — not left stranded on the isolation
   branch it shipped from.
3. **No operationally-critical doc may exist only in a side worktree.**
   If a doc describes something true about production (an incident, a
   procedure, a policy), it belongs in the branch that's on its way to
   trunk, not permanently parked on a branch nobody merges.
4. **Every deploy registers a real record**, not just a chat message:
   ```
   SOURCE_BRANCH = ...
   SOURCE_COMMIT = ...
   TARGET = ...
   MIGRATIONS = [...]
   BUILD_HASH = ...
   DEPLOY_TIME = ...
   VERIFICATION = ...
   ```
   Where this record actually lives (a `docs/` log, a `deploy/` file, a
   future DB-backed control-plane record) is a separate decision — the
   rule is that one must exist for every deploy, not the storage
   mechanism.
5. **A branch is not a knowledge base.** Documentation that needs to
   survive belongs in `docs/` on a branch actually headed for trunk —
   not accumulated indefinitely on a feature branch as its permanent
   home.
6. **A large dirty worktree is a recovery situation, not a normal
   branch state.** Confirmed twice in the 2026-09-08 audit: both
   `mu-bloodmoon-privacy-feedback-release` (106 dirty files) and
   `mu-bloodmoon-v1-openbeta` (220 dirty files, 143 of them untracked)
   had uncommitted work mixed with stray cross-branch copies and dev
   artifacts. Once a worktree crosses from "a few files mid-edit" into
   this territory, the right move is to triage and either commit or
   deliberately discard each piece — not keep building on top of it as
   if it were a clean branch.
7. **Prefer a temporary integration branch over informally treating one
   phase branch as a superset of the others.** The 2026-09-08 audit
   found `privacy-feedback-release` had *looked* like a superset of
   `payment-risk-release` and `beta-feedback-rewards` — it wasn't; that
   was untracked clutter in its working tree, not real branch history.
   A dedicated `integration/*` branch, built explicitly and
   deliberately from `main`, is safer than letting any single feature
   branch drift into being trusted as "probably has everything."

## Feature lifecycle

```
PLANNED → IN_PROGRESS → IMPLEMENTED → TESTED → REVIEWED → INTEGRATED →
DEPLOYED → VERIFIED → RELEASED → ARCHIVED
```

A feature is not `DONE` just because it was committed, passed tests, or
was deployed. `DONE` requires **all** of:

- implementation protected by a real commit (not sitting dirty in a
  worktree — see rule 6/7 above, and the 2026-09-08 recovery audit that
  is the reason this rule exists);
- tests registered, not just run once informally;
- adequate documentation;
- the integration/trunk branch actually updated to include it;
- production verified, when the feature is production-facing;
- a release/tag recorded (see Tagging below);
- its origin branch pointed toward archive.

Reaching `DEPLOYED` is progress, not completion — this is the same point
rule 1 makes, restated as an explicit state machine so "done" has one
unambiguous meaning across phases.

## Phase manifest (minimum useful format, not yet rolled out per-phase)

Proposed location: `docs/phases/<phase-id>/phase-manifest.md`. Minimum
fields — deliberately small; expand only when a real phase needs a
field this doesn't have, not speculatively:

```
Phase ID:
Objective:
Scope:
Non-scope:
Source branch:
Base commit:
Owner:
Dependencies:
Migrations:
Feature flags:
Files/modules (principais):
Tests:
Deployment requirements:
Rollback:
Production status:
Integration status:
Release/tag:
Known debt:
```

Not implemented for existing phases yet — this is the format proposal
only, per instruction. Retrofitting one manifest per already-shipped
phase (AA/AC/Z/privacy) is a reasonable next step once the format
itself is confirmed, not before.

## Deploy manifest (format proposal)

Every future deploy should produce a structured record with these
fields — where it's stored (a `docs/` log today, a real DB-backed
record if/when `bloodmoon-deploy`'s own domain becomes part of the
control plane per `docs/architecture/control-plane.md`) is a separate,
later decision:

```
DEPLOY_ID:
PHASE:
SOURCE_BRANCH:
SOURCE_COMMIT:
INTEGRATION_COMMIT:
BUILD_HASH:
PACKAGE_HASH:
MIGRATIONS:
TARGET:
DEPLOYED_AT:
DEPLOYED_BY:
PRECHECK:
BACKUP:
MIGRATION_RESULT:
RELOAD_RESULT:
SMOKE_RESULT:
NEW_5XX:
ROLLBACK_POINT:
PRODUCTION_VERIFIED:
```

This is meant to eventually be produced by `bloodmoon-deploy`'s own
post-deploy step (Phase 11 in that skill's `SKILL.md`) — not built now,
noted here so the skill's future revision has a concrete target format.

## Branch is not the source of truth

A branch is a temporary vehicle. The durable source of truth for a
feature's real state is, in order of authority: the commit history
itself → the integration/trunk branch → the phase manifest → `docs/`
policy/architecture docs → a release tag. Nothing should ever depend on
"the branch still existing" — the 2026-09-08 audit found real feature
work whose only home was an uncommitted worktree, which is precisely
the failure mode this principle rules out going forward.

## Tagging

Recommended shape: `<environment>/<product>/<phase-id>/<date>`, e.g.
`prod/portal/phase-ac/2026-09-07`. Readable, chronologically sortable
within a phase, and traceable back to exactly what was running when —
without inventing semantic versioning where this project has never
needed it (no external consumers depend on a Blood Moon "version
number"; every deploy is a specific, dated, targeted event, which a
date-stamped tag already captures correctly). `environment` distinguishes
`prod` from a future `staging`; `product` distinguishes `portal` from
`launcher`/`gamebridge` if their release cadences ever diverge.

## Branch state vs. working-tree state are different things

**Never infer branch content from the filesystem.** To claim "a branch
contains X," use the committed tree (`git ls-tree`/`git show
<ref>:<path>`) — never a plain directory listing of a checked-out
worktree, which mixes in whatever else happens to be sitting there
uncommitted. To describe what a *worktree* contains, always classify
separately: tracked-committed, tracked-modified, and untracked. This
project made this exact mistake twice in one day (2026-09-08): once
concluding `privacy-feedback-release` was a migration superset of two
sibling branches (it wasn't — the extra files were untracked stray
copies), and once attributing the Progression/Reset control-plane work
to `open-beta/p0-foundation` as if it were durable branch history (it
was, and remains, entirely uncommitted). Both were corrected the same
day; this rule exists so a third occurrence doesn't happen.

## No real work stays untracked indefinitely

Once a feature starts producing code, a migration, a test, or docs, a
scoped git checkpoint must exist before the volume grows large enough
that recovering it becomes its own project — which is exactly what
happened to `open-beta/p0-foundation` (143 untracked files, including
real, tested, otherwise-unprotected work) and required a dedicated
recovery phase to even inventory safely. `git add .` is never an
acceptable substitute for real organization — commit by
responsibility/feature, the same boundary a real PR would use, not by
"whatever happens to be dirty right now."

## A worktree is not a backlog

A single worktree must not become the informal holding area for
several unrelated features at once. Confirmed on 2026-09-08: `open-beta/p0-foundation`
accumulated Legacy Catalog, Progression/Reset, VIP admin UI, Launcher
auth/captcha, a partial currency rename, and stray duplicate copies of
three other phases' work, all uncommitted, all at once. When more than
one coherent feature starts coexisting untracked in the same worktree:
stop, classify what's there, create each feature its own branch, make
scoped commits, and don't let the pile grow further before doing so.

## Checkpoint early

Every real feature earns a git checkpoint as soon as it exists as a
coherent unit — not "eventually," not "once the phase is done." A
coherent unit means a migration, a model, a service, a test, or docs
that stands on its own, not a fully-finished feature. This does not
mean committing broken or half-written code; it means not letting real,
working increments accumulate uncommitted for days while unrelated
other work piles up around them in the same tree, which is precisely
how `open-beta/p0-foundation` reached 220 dirty files and required a
dedicated recovery phase to even inventory safely.

## Open question this document does not resolve

Where the per-deploy record (rule 4) and the merge/tag/archive tracking
(rule 1) actually live — a `docs/` log, a lightweight script, or a
future `SHOULD_BECOME_CONTROL_PLANE` deploy-tracking domain per
`docs/architecture/control-plane.md` — is a separate decision, not made
here. This document fixes the *process*, not yet its tooling.
