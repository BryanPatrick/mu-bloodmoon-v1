# Blood Moon — engineering governance (macro map)

Status: canonical, versioned on `governance/engineering-pack` (see
`docs/architecture/branch-and-release-governance.md` for the detailed
branch/release/deploy rules this document sits above). This is the
entry point for "how engineering work happens here" — it does not
replace `docs/README.md` (the domain/architecture index) or any
individual protocol doc; it is the process map that sits alongside them.

## The official lifecycle

```
Objective → Phase → Planning → Branch → Implementation → Checkpoint →
Tests → Review → Integration → Deploy → Production Verification →
Release → Archive
```

Every stage from `Branch` onward is real, observable work — not an
implicit consequence of an earlier stage. Two stages are new relative
to earlier phases' informal practice and worth calling out:

- **Planning**: a real feature does not start at `Branch` — see the
  feature mini-plan template below. This is deliberately lightweight,
  not a stage-gate bureaucracy.
- **Checkpoint**: a coherent unit of work (a migration, a model, a
  service, a test, a doc) earns a commit as soon as it exists, not
  batched until the phase "feels done." This is the direct fix for the
  2026-09-08 recovery phase's root cause — `open-beta/p0-foundation`
  reached 220 dirty files, 143 of them untracked, before anyone
  stopped to checkpoint.

## `DONE` is not `DEPLOYED`

A feature is not `DONE` because it was committed, passed tests, or was
deployed. `DONE` requires, when applicable to that specific feature:

- implementation protected by a real commit;
- tests registered and actually run, not assumed;
- adequate documentation (technical doc, decision record, manual impact);
- the integration/trunk branch actually updated to include it;
- production verified;
- a release/tag recorded;
- its origin branch pointed toward archive.

Full detail and the `PLANNED → ... → ARCHIVED` state machine:
`docs/architecture/branch-and-release-governance.md`.

## Source-of-truth precedence

When two sources disagree, resolve in this order:

1. **Security/approval gates the agent itself enforces** — no document
   below overrides a standing safety rule.
2. **`AGENTS.md`** — universal invariants.
3. **The canonical document for that specific domain** (see the map
   below) — architecture, security, database, or policy docs.
4. **The relevant phase manifest** — current phase's own scope/state.
5. **`SKILL.md`** — procedural checklist, itself pointing back to 3-4.
6. **Temporary notes** (a session's own scratch reasoning, a chat
   message) — lowest precedence, never authoritative on its own.

`CLAUDE.md` is not in this list — it is a pointer to `AGENTS.md` plus
genuinely Claude-specific behavior, never a second rule set that could
conflict with it.

## Decision-record supersession

A specific case of `AGENTS.md`'s "history is never silently
overwritten" rule: when a product or architecture decision supersedes a
previously documented one (`docs/decisions/000N-*.md`), create a new
decision record with the next available number that explicitly
supersedes the old ruling — never edit or delete the original, and
never invent a replacement value that wasn't actually decided. The
superseded record stays exactly as written, as the real historical
account of what was true and why at the time.
Worked example: `docs/decisions/0029-progression-reset-policy-current-ruling.md`
(2026-09-08) supersedes parts of `0025`/`0026`/`0028` this way — see
that ADR for the full case, not repeated here.

## Canonical document map

Mapped against what already exists — the governance/protocol docs now
canonical on this branch (`governance/engineering-pack`), plus
feature-domain docs that remain cross-branch references (real content
in `mu-bloodmoon-v1-openbeta`, currently uncommitted there — recovered
2026-09-08, not yet consolidated — or in other feature branches). No
area below gets a new file where an existing one already covers it
adequately.

| Area | Existing canonical doc | Missing? | Action |
|---|---|---|---|
| 1. Universal Agent Rules | `AGENTS.md` (this pack) + `docs/protocols/agent-bootstrap.md` (openbeta) | No | `SHOULD_MERGE` — reconcile the two into one once worktrees consolidate |
| 2. Engineering Governance | `docs/architecture/engineering-governance.md` (this file) | No, just created | — |
| 3. Feature Lifecycle | `docs/architecture/branch-and-release-governance.md` | No | `SHOULD_REFERENCE_ONLY` from here |
| 4. Branch Governance | `docs/architecture/branch-and-release-governance.md`, `branch-governance-audit-2026-09-08.md` | No | `SHOULD_REFERENCE_ONLY` |
| 5. Release Governance | `docs/architecture/branch-and-release-governance.md` (tagging section) | No | `SHOULD_REFERENCE_ONLY` |
| 6. Deployment Governance | `docs/deployment-architecture.md`, `deploy/CPANEL_NODE_DEPLOY.md`, `deploy/CPANEL_BACKUP_AUTOMATION.md` | No | `SHOULD_REFERENCE_ONLY` |
| 7. Database Governance | `docs/database/migration-history-reconciliation.md` | Partial — no single "how to run a migration safely here" doc exists outside the `bloodmoon-deploy` skill's own reference file | `SHOULD_CREATE` (future, not now) a `docs/database/migration-governance.md` distilling `.claude/skills/bloodmoon-deploy/references/migration-and-remote-access.md` into a docs-native form |
| 8. Security Governance | `docs/security/{secret-incident-history,secret-rotation,data-classification,game-credential-envelope,game-write-boundary,two-factor-key-rotation}.md` | No | `SHOULD_REFERENCE_ONLY` |
| 9. Testing Standards | `docs/testing/{beta-test-baseline,incremental-quality-gate}.md` (openbeta lineage, not independently re-verified this session) | Unclear if current | `SHOULD_REFERENCE_ONLY`, re-verify freshness when next touched |
| 10. UI/UX Standards | `docs/design-system.md`, `docs/design/visual-identity.md`; debt: `docs/design/admin-native-dialogs-debt.md` | Partial — no single accessibility/responsive standard doc confirmed current | `SHOULD_REFERENCE_ONLY` for what exists; Global UI/UX Quality Pass (below) is where gaps get closed |
| 11. Control Plane Architecture | `docs/architecture/control-plane.md`, `control-plane-domain-audit.md` | No | `SHOULD_REFERENCE_ONLY` |
| 12. Coding Standards | Not found as a dedicated doc | Yes | `MISSING_DOC` — not created now, out of this task's scope |
| 13. Observability | `docs/observability-and-audit.md` | Unclear if current | `SHOULD_REFERENCE_ONLY`, re-verify when next touched |
| 14. Incident Handling | `docs/security/secret-incident-history.md` (secrets only); no general incident-response doc in this repo lineage — `docs/operations/incident-response-runbook.md` exists only in `mu-bloodmoon-ops-hardening` (Phase AA, unmerged) | Partial | `SHOULD_REFERENCE_ONLY` both, flag the cross-repo gap |
| 15. Phase Manifests | `docs/phases/_template/phase-manifest.md` (new, this task) | No, just created | Template only, not retroapplied |
| 16. Deploy Manifests | `docs/deployments/_template/deploy-manifest.md` (new, this task) | No, just created | Template only |
| 17. Agent Skills | `.claude/skills/bloodmoon-deploy/` (ops-hardening, v0.1); `~/.claude/skills/` (canonical location, approved not yet populated) | No | `SHOULD_REFERENCE_ONLY` |

## Rule improvement loop

Every relevant incident asks one mandatory question: **"What process
failure let this happen?"** The answer resolves to exactly one of:
update a rule, update a doc, update a skill, update a checklist, add a
test, add a guardrail, or — a valid answer — no change needed. Not
every incident becomes process ceremony; only where a real, reusable
lesson exists. This session's own governance pack is itself several
rounds of this loop in action: the credential-envelope incident → the
secret-bearing-page rule; the 49-missing-chunk incident → the Nuxt
deploy-integrity rule; the dirty-worktree discovery → the recovery/
checkpoint rules above; and Execution Batch 1's Progression extraction
(2026-09-08) → **static file audit is not sufficient for feature
recovery**. A file-list audit correctly identified every source file to
copy, but the branch only compiled and passed once actually run: a
missing module registration (`ProgressionModule` never wired into
`app.module.ts`), missing RBAC permission keys, and a missing runtime
data-file dependency were all invisible to a file inventory and only
surfaced by `npx tsc --noEmit` and the real e2e suite. Feature recovery
requires inventory + dependency tracing + build/typecheck + tests
before it is `TESTED`, never the file copy alone.

## Feature mini-plan (required before `Branch`)

Not bureaucratic — small enough to fit in a phase manifest's own
`SCOPE` section when one exists:

```
OBJECTIVE:
SCOPE:
NON_SCOPE:
BRANCH:
BASE_COMMIT:
EXPECTED_FILES:
MIGRATIONS:
TESTS:
DOCS:
DEPLOY_TARGET:
EXIT_CRITERIA:
```

## Global Quality Pass — registered as future debt, not scheduled

A future, dedicated phase, not started now:

- **MICRO**: fields, buttons, messages, loaders, forms, components,
  queries.
- **MESO**: modules, APIs, permissions, tests, contracts, duplication,
  performance.
- **MACRO**: architecture, Control Plane convergence, branch/release
  process itself, deployment, security, observability, database,
  player UX, admin UX, technical debt.
- **Global UI/UX Quality Pass** (a named sub-scope): forms, inline
  errors, toasts, dialogs, native `alert`/`confirm`/`prompt` removal
  (already tracked individually as `docs/design/admin-native-dialogs-debt.md`),
  loading states, empty states, accessibility, responsive layout,
  keyboard navigation, short-viewport behavior, double-submit
  prevention, technical-error leakage to end users, design consistency.

This entry exists so the scope isn't lost — not to schedule the work.
