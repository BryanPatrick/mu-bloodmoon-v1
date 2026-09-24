---
status: ACTIVE — audit complete, findings not yet acted on
category: architecture
audience: internal (Bryan + any engineering agent)
lastVerified: 2026-09-18
confidence: CONFIRMED (every figure below is a direct git measurement this phase, none estimated)
---

# Repository continuity audit — local `main` vs. `origin/main` (2026-09-18)

**Read-only audit, `REPO-CONTINUITY-AUDIT-01`.** No push, merge, rebase,
or reset of `main` was performed or is authorized by this document.
Produced as a direct consequence of `DOCUMENTATION_IS_AGENT_INFRASTRUCTURE`
(`docs/architecture/agent-automation-architecture.md` §3) — this finding
is exactly the kind of thing that must not remain only in a chat
transcript.

## Headline finding

**`origin` (`github.com/BryanPatrick/mu-bloodmoon-v1`) currently holds
only 8 branches, total, for this entire project**: `main`,
`ci/dotnet-tests-workflow`, `ci/linux-mariadb-migration-validation`,
`infra/cloudflare-api-container-poc`, `infra/cloudflare-migration-candidate`,
plus the three branches this session's own preservation work just added
(`architecture/agent-orchestration-foundation`,
`research/agent-skills-ecosystem`, `docs/agent-automation-architecture`).
Roughly 35-40 real local feature/worktree branches — the entire Open
Beta feature-branch history among them — exist **only** on this one
machine. This audit was scoped to the `main`/`origin-main` drift
specifically; the wider local-only-branch exposure is a separate,
larger fact worth its own attention (see `DECISIONS_REQUIRED` in this
phase's own report to Bryan).

## Exact measurements

| Field | Value |
|---|---|
| `LOCAL_MAIN_HEAD` | `b5a4321d1ccb88845fec767a5ab8537dc61a562d` ("Phase 17R: resume Open Beta hardening from the paused Phase 17 stash") |
| `ORIGIN_MAIN_HEAD` | `3adfd0532fa8354187c355d0a9a26e49bc2f325e` ("Hotfix: case-sensitive table identifiers in launcher_cms_studio migration + least-privilege backup") |
| `MERGE_BASE` | `3adfd0532fa8354187c355d0a9a26e49bc2f325e` — i.e. `origin/main` itself |
| `LOCAL_ONLY_COMMIT_COUNT` | **110** (measured via `git rev-list --count origin/main..main`, corrects the "~140" estimate reported into this phase's own brief) |
| `REMOTE_ONLY_COMMIT_COUNT` | **0** |
| `DIVERGENCE_TYPE` | `FAST_FORWARD_GAP` — `git merge-base --is-ancestor origin/main main` exits 0; `origin/main` is a strict, unmodified prefix of local `main`'s history |

## Divergence cause — evidence, not inference

`origin/main`'s tip is a standalone hotfix commit. Every one of the 110
local-only commits comes strictly after it. The local-only range's own
shape gives a direct, evidenced explanation, not a guess:

1. A large body of Open Beta feature work (economy/wallet, VIP +
   GameBridge delivery, account lifecycle/privacy, Legacy Catalog and
   Progression control-plane extraction, Survey/Player-Preferences
   schemas, Beta rewards/Bug Hunters, payment risk isolation, ops
   hardening) was developed across ~15 separate named feature branches
   (`feature/*`, `fix/*`, `open-beta/*` — all still present as real
   local worktrees today).
2. Those branches were merged, one by one, into a dedicated integration
   branch, `integration/open-beta` (still present locally) — 12 real
   `Merge feature/X into integration/open-beta`-shaped commits in the
   local-only range confirm this directly.
3. `integration/open-beta` was itself merged into local `main`
   (commit `3ce0e6be`, "Merge integration/open-beta into main").
4. After that merge, further work continued directly against local
   `main` (or an equivalent branch kept in lockstep with it — the
   currently-checked-out `hardening/open-beta-blockers-2026-09-resumed`
   is, right now, byte-identical to `main`'s tip): migration-casing
   fixes, CI infrastructure, the Context Pack build, Phase 18-20
   knowledge consolidation, and security-hardening code (CSP/security
   headers middleware, marketplace beta-gate).
5. At no point in this measured range was `origin/main` ever pushed to
   again after its one hotfix commit.

**`DRIFT_CAUSE` classification: `PROVEN`** — local `main` was operated
as the real, continuously-advancing integration point for Open Beta
work, while pushes to `origin/main` simply stopped after that one
hotfix. No rebase, squash, or cherry-pick artifact was found — the
history is a clean, linear, fully-explained fast-forward gap.

**Not established (`UNKNOWN`)**: *why* pushes to `origin/main` stopped
specifically at that hotfix — no document found states this as a
deliberate policy ("withhold main pushes during Open Beta") versus an
unintentional gap. No document was found distinguishing "local main"
from "origin/main" as separate authorities at all; `AGENTS.md` and
`CLAUDE.md` both refer to "`main`" as a single concept throughout.
Given the observed behavior (real consolidation work always lands on
local `main`; pushes to `origin/main` are rare — only 5 branches
existed on origin before this session's own preservation work),
**local `main` appears, in practice, to be the branch actually treated
as authoritative** — but this is a behavioral inference from git
evidence, not a documented rule, and is reported as such rather than
overstated as `DOCUMENTED_DECISION`.

## What exists only because local `main` is ahead

| Category | Local-only content |
|---|---|
| Code | VIP/GameBridge delivery services, Legacy Catalog + Progression control-plane extraction and admin UI, Survey/Player-Preferences schema code, Privacy Center page, marketplace beta-gate code, `auth.service.ts`/`marketplace.service.ts` changes |
| Database migrations | **20 distinct migration directories**, `20260723...` through `20260905090000_alert_dispatch_state` — see full list below |
| Documentation | Engineering governance pack, control-plane architecture, branch-governance audit, ~15 phase manifests, ADR-0024/0029 |
| Infrastructure config | Linux/MariaDB migration-validation CI (partially preserved remotely, see below), npm/TypeScript pin fixes, health/readiness endpoints |
| Security work | Credential-key rotation tooling (preserved on a local branch), payment risk/chargeback isolation, **`apps/web/server/middleware/00.security-headers.ts` + `csp-inline-script-hashes.ts` + `security-headers.ts`** — real CSP/security-header middleware with no separate preserving branch found |
| Payment work | Risk/chargeback control isolation (`ef43b8b3`), the `phase_p_payment_risk_and_chargeback_case` migration |
| Cloudflare work | None in this specific range — Blood Moon's Cloudflare migration work lives on separate `infra/cloudflare-*` branches; one (`infra/cloudflare-migration-candidate`) is already on `origin` independently of this audit |
| Game data / GameBridge | GameBridge Agent extension (`GRANT_VIP`/`SYNC_VIP_TIER`/`ANONYMIZE`/`PURGE`), Phase 20A/20B lab evidence for `WZ_SetCoin`/`CashShopData`, GameBridge disambiguation knowledge |
| Knowledge / context | The full Context Pack build (now separately preserved via `research/agent-skills-ecosystem`), **Phase 18-20 knowledge consolidation** (`docs/knowledge/*`, `knowledge/vendor-sweep/*` — large real datasets, no remote copy, no separate local branch either) |
| Other | Test-stabilization batch (7 commits), 152 pre-existing `vue-tsc` type errors fixed |

### Database migrations in the drift

`DATABASE_MIGRATIONS_IN_DRIFT`: **present, count = 20**.

```
20260723003000_launcher_integration
20260830120000_open_beta_p0_foundation
20260830121500_vip_product_config
20260830130000_phase14_vip_delivery_account_deletion
20260830140000_phase15_vip_benefit_fields_and_pricing_seed
20260830150000_phase15_account_deletion_request
20260830160000_gamebridge_vip_sync_state
20260830170000_account_deletion_feedback
20260830180000_account_deletion_feedback_retention_interaction
20260830190000_survey_foundation
20260830191000_player_preferences_foundation
20260831120000_vip_sync_drift_observability
20260831130000_phase_p_payment_risk_and_chargeback_case
20260902100000_phase_s_legacy_catalog_item
20260902110000_phase_t_legacy_catalog_effective_state
20260903120000_phase_u_progression_config_item
20260904090000_phase_v_progression_policy_status
20260904100000_beta_participation_record
20260904110000_bug_hunters_foundation
20260905090000_alert_dispatch_state
```

Not altered, not replayed, not compared against production by
executing anything — read-only `git diff --name-only` inspection only.

## Secret-scan (sanitized)

Every filename in the local-only diff matching a secret-shaped pattern
(`.env`, `secret`, `credential`, `password`, `.pem`, `.key`) was
reviewed by path only — no content was printed. All matches are
expected, legitimate artifacts: `.env.example` templates (×2, both
example files, never real values), credential-handling **code**
(`migrate-game-credential-keys.ts`, `game-credential-envelope.service.ts`,
`GameCredentialDecryptor.cs` + its test — implementing rotation/
decryption, not containing secret values), and one security-audit
markdown doc. **No raw secret file, no real `.env`, no key/cert file
found.**

## Recoverability

| Branch/work | Classification |
|---|---|
| The Context Pack build (`717d8ab6`…`aec88961`) | `PRESERVED_REMOTE_BRANCH` — via `research/agent-skills-ecosystem`, pushed this session |
| `architecture/agent-orchestration-foundation`'s own commit | `PRESERVED_REMOTE_BRANCH` — pushed this session |
| Linux/MariaDB CI work up to `f5fd099a` | `PRESERVED_REMOTE_BRANCH` — `ci/linux-mariadb-migration-validation` was already on `origin` independently of this session |
| The ~15 Open Beta feature branches (progression-reset, legacy-catalog, account-lifecycle, survey-schema, beta-feedback-rewards, ops-hardening, wcoin-peg-guard, regression-recovery, player-preferences, integration-test-stabilization, reconcile-fix, credential-key-rotation, `integration/open-beta` itself) | `LOCAL_BRANCH_ONLY` — confirmed present as real local worktrees, confirmed absent from `origin`'s 8-branch listing |
| The `3ce0e6be` integration merge and its immediate bookkeeping siblings | `MAIN_ONLY_COMMIT` |
| Phase 18-20 knowledge consolidation (`docs/knowledge/*`, `knowledge/vendor-sweep/*`) | `MAIN_ONLY_COMMIT` — no separate branch found, no remote copy |
| CSP/security-headers middleware, marketplace beta-gate code | `MAIN_ONLY_COMMIT` — no separate branch found, no remote copy |

**Most irreplaceable if this machine were lost**: the Phase 18-20
knowledge consolidation (large, hand/agent-curated datasets under
`docs/knowledge/` and `knowledge/vendor-sweep/`) and the CSP/security-
headers middleware — both real, substantial, and currently unrecoverable
from anywhere but this one machine.

## Future `main` push — status only, not executed

`FUTURE_MAIN_PUSH.technically_fast_forward` = **YES** (`origin/main` is
a strict ancestor of local `main`; a plain `git push origin main`
would succeed as a clean fast-forward, zero rebase/force needed).
`governance_authorized` = **NO** — `AGENTS.md`'s "Production safety"
section requires explicit, in-the-moment approval for any push to a
shared branch, and this phase's own brief explicitly forbids it.
**Not executed.**

## Preservation options (not executed — for Bryan's review)

- **A. Push a preservation branch created from local `main`** (e.g.
  `preservation/main-snapshot-2026-09-18`) to `origin` under a new
  name, leaving `origin/main` untouched. Lowest consequence: adds a
  ref, changes nothing existing, reversible by deleting the ref later
  if unwanted.
- **B. Push local `main` directly to `origin/main` later.** Technically
  a clean fast-forward (see above) — but a real, visible, likely
  team/CI-affecting change, and a decision in its own right, not a
  backup action.
- **C. Create a tagged preservation point** (e.g.
  `git tag main-snapshot-2026-09-18 main` then push just the tag).
  Similar consequence profile to Option A, slightly less discoverable
  than a named branch.
- **D. Preserve the ~15 identified `LOCAL_BRANCH_ONLY` feature branches
  individually**, the same low-risk pattern already used successfully
  three times this session for the automation branches — directly
  addresses the largest actual exposure (most real work already has a
  named branch; those branches are what's actually unpreserved).

**Recommended (least consequential, addresses the real gap):** a
combination of A and D — a single preservation-branch push from local
`main` (captures the `MAIN_ONLY_COMMIT` tail, including the knowledge
consolidation and security-headers work that exist nowhere else) plus
individually preserving the named feature branches, all via the exact
same non-force, new-branch-name-only pattern this session's three
prior pushes already proved safe. Option B (pushing `main` itself) is
explicitly **not** the recommendation — it is a real production/team-
visible decision, not a backup action, and stays Bryan's to make
separately.

## References

`docs/architecture/agent-automation-architecture.md` (this document's
sibling, same branch), `AGENTS.md` ("Production safety" section).
