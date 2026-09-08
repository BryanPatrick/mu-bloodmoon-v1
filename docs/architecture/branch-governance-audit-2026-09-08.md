# Branch/worktree governance audit — 2026-09-08

Read-only. No merge, rebase, delete, or push was performed to produce
this document. All 10 directories under `D:\MU\` are confirmed linked
git worktrees of one repository (`github.com/BryanPatrick/mu-bloodmoon-v1`),
sharing one `.git` and one remote — not separate clones.

## Correction to an earlier finding this same day

Earlier the same day, a prior pass (feeding
`docs/architecture/control-plane-domain-audit.md`) read
`mu-bloodmoon-privacy-feedback-release`'s migrations folder directly off
disk and concluded it was a superset containing
`payment-risk-release`'s and `beta-feedback-rewards`' own migrations.
**That was wrong** — verified here via `git ls-tree` (the actual
committed tree) vs. `git status --porcelain` (the working directory):
`20260831130000_phase_p_payment_risk_and_chargeback_case` and
`20260904110000_bug_hunters_foundation` are **untracked (`??`)** in
`privacy-feedback-release`'s worktree — stray, uncommitted copies, not
real branch content. `privacy-feedback-release`'s actual committed
scope is exactly what its name says: account-deletion privacy feedback,
the same shape and generation as its three sibling branches, not a
superset of them. `docs/architecture/control-plane-domain-audit.md`'s
Progressão/Reset finding (attributed to `mu-bloodmoon-v1-openbeta`) has
the same caveat — see below.

## Branch lineage (verified via `git merge-base` / `git merge-tree`)

```
main (3adfd053, 2026-08-27) — 36 real committed migrations, stale since
  │                            this date but not empty/broken
  └─ open-beta/p0-foundation (mu-bloodmoon-v1-openbeta)
      │   own commits add ZERO new tracked migrations (GameBridge Agent
      │   extension is Agent-side C#, the Blood Coin rename is a label
      │   change — neither touches Prisma schema)
      └─ e90c29df (2026-08-30) — fork point for all 4 siblings below,
         itself 5 tracked migrations ahead of main (the shared
         open-beta-P0/VIP baseline)
          ├─ open-beta/ops-hardening          (+1: alert_dispatch_state)
          ├─ open-beta/payment-risk-release   (+1: phase_p_payment_risk_and_chargeback_case)
          ├─ open-beta/beta-feedback-rewards  (+2: beta_participation_record, bug_hunters_foundation)
          └─ open-beta/privacy-feedback-release (+2: account_deletion_feedback, account_deletion_feedback_retention_interaction)
```

`git merge-tree` dry-runs (read-only, no working-tree changes) confirm
**all three pairwise combinations among the 4 siblings merge cleanly**,
no conflict markers: payment-risk-release+beta-feedback-rewards,
+ops-hardening, +privacy-feedback-release. They touch disjoint files by
construction (each is a narrow, single-purpose isolation from the same
fork point).

## Uncommitted-work risk, quantified

| Worktree | Dirty files | Of which untracked | Notable untracked content |
|---|---|---|---|
| `mu-bloodmoon-v1-openbeta` | 220 | 143 | `AGENTS.md`, `CLAUDE.md`, dev server logs, **13 migration folders** including `phase_u_progression_config_item`/`phase_v_progression_policy_status` (the Progressão/Reset policy work — real code, never committed anywhere), 47+ doc files |
| `mu-bloodmoon-privacy-feedback-release` | 106 | includes 3 stray migration folders (see correction above) + this session's own new docs (not yet committed) | |
| `mu-bloodmoon-launcher-phase1` | 13 | 10 doc entries | |
| `mu-bloodmoon-v1` (main) | 6 | 0 | minor |
| `mu-bloodmoon-ops-hardening` | 1 | 1 (this session's `phase-aa-pre-deploy-review.md`) | |
| `mu-bloodmoon-launcher-2d-release` | 1 | 1 | |
| all others | 0 | 0 | |

`v1-openbeta`'s apparent richness (55 total migrations, 284 total docs)
is mostly this uncommitted layer — its actual **committed** history is
tied with the narrowest sibling branches (5 unique migrations vs.
main's 36-migration baseline). The real, tested Progressão/Reset
control-plane work documented earlier this session exists as real code
on disk, but is not protected by a git commit anywhere — a `git clean`,
a bad `git checkout -- .`, or a machine failure would lose it.

## Classification matrix

| WORKTREE | BRANCH | CLASSIFICATION | Why |
|---|---|---|---|
| mu-bloodmoon-v1 | `main` | — (trunk) | Stale (12 days), stable, 36 real migrations, not broken |
| mu-bloodmoon-v1-openbeta | `open-beta/p0-foundation` | **DIRTY_REQUIRES_RECOVERY** | 143 untracked files including real, uncommitted feature work (Progressão/Reset control plane) at real loss risk — must be triaged before being treated as a normal branch again |
| mu-bloodmoon-ops-hardening | `open-beta/ops-hardening` | **DEPLOYED_NOT_CONSOLIDATED** — correction: **CONSOLIDATION_CANDIDATE** (confirmed NOT yet deployed, per this session's own pre-deploy review) | Clean, tested, ready; merges cleanly with its 3 siblings per `merge-tree` |
| mu-bloodmoon-payment-risk-release | `open-beta/payment-risk-release` | **DEPLOYED_NOT_CONSOLIDATED** | Confirmed live in production 2026-09-07 (Phase AC = PASS), never merged to main |
| mu-bloodmoon-beta-feedback-rewards | `open-beta/beta-feedback-rewards` | **DEPLOYED_NOT_CONSOLIDATED** | Referenced as already-live ("PHASE_Z_PRESERVED") during Phase AC's own closure this session; never merged to main |
| mu-bloodmoon-privacy-feedback-release | `open-beta/privacy-feedback-release` | **DIRTY_REQUIRES_RECOVERY** | 106 dirty files, includes stray untracked cross-branch copies (see correction above) that must be triaged (kept if intentional reference, discarded if accidental) before this branch's real, narrow scope (account-deletion feedback) can be safely assessed for consolidation |
| mu-bloodmoon-launcher-2d-release | `launcher/phase-2d-release` | **ACTIVE_FEATURE** | Recent (2026-09-04), narrowly scoped, minimal dirt |
| mu-bloodmoon-launcher-phase1 | `launcher/desktop-phase-1` | **SUPERSEDED** (tentative) | Shares its one unique migration with launcher-2d-release, which is newer — likely an ancestor stage of the same work, not independent; needs your confirmation before archiving |
| mu-bloodmoon-v1-phase11 | `product/economy-phase-11` | **UNKNOWN** | Only 2 commits ahead of main, 0 unique tracked migrations — plausibly already superseded by later economy work in `p0-foundation`, not confirmed |
| mu-bloodmoon-v1-phase7 | `knowledge/beta-readiness-phase-7` | **HISTORICAL** (tentative) | Oldest of the nine (2026-08-28), 0 unique tracked migrations, 0 unique tracked docs — lowest apparent risk to archive, but not confirmed live/dead |

## Answers to the direct questions asked

- **Maior superset funcional confiável (committed, not working-directory)**:
  none of the 9 branches is a clean superset of the others — they are
  siblings forked from the same point, each narrow. `main` plus the 4
  siblings merged (proven conflict-free) would be closer to a real
  superset than any single existing branch.
- **Branch mais próxima do estado real de produção**: no single branch
  — production today is best understood as `payment-risk-release` UNION
  `beta-feedback-rewards`' own additions, which exists nowhere as one
  committed ref.
- **Features em produção ausentes de main**: `phase_p_payment_risk_and_chargeback_case`
  (Payment Risk/Chargeback), `beta_participation_record` +
  `bug_hunters_foundation` (Bug Hunters/Beta Rewards) — both entirely
  absent from `main`.
- **Migrations em produção ausentes do candidato a tronco**: same list
  as above, plus the 5-migration shared open-beta/p0-foundation
  baseline itself, which `main` also lacks.
- **Docs exclusivos de branch**: real, but the raw counts gathered
  today (ops-hardening/privacy-feedback-release ~26 each,
  payment-risk-release/beta-feedback-rewards ~21 each, openbeta ~143)
  are **not verified tracked-only** the way the migration counts above
  are — openbeta's figure in particular is known to be inflated by
  untracked files and should be treated as an upper bound, not a
  confirmed number, until re-verified the same way the migrations were.
- **Arquivos duplicados manualmente entre branches**: confirmed —
  `payment-risk-release`'s and `beta-feedback-rewards`' migration
  folders exist as untracked, byte-identical copies inside
  `privacy-feedback-release`'s working tree (see correction above).
