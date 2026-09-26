---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-26
---

# Cloudflare knowledge — source inventory and classification

Built in `BLOODMOON-AI-07` (2026-09-26) from `git ls-remote origin`,
`git merge-base --is-ancestor` between every pair of Cloudflare branches,
and a per-file diff against the fork point `456963d`. Read any file below
with `git show origin/<branch>:<path>`.

## Branches

| Branch (origin) | Tip | Date | Contains | Classification |
|---|---|---|---|---|
| `infra/cloudflare-web-shadow-rc-02` | `f2584a4` | 2026-09-24 | T lineage head (candidate + transition + RC check) | **CURRENT source** for Web/API/transition |
| `docs/cf-web-provider-api-transition-01` | `903e2e1` | 2026-09-24 | ancestor of rc-02 | `DUPLICATE` (fully contained in rc-02) |
| `infra/cloudflare-migration-candidate` | `4b0e8e6` | 2026-09-23 | ancestor of transition-01 | `SUPERSEDED` by rc-02 (its docs predate the 2026-09-24 decision) |
| `infra/cloudflare-backup-exit` | `3cab675` | 2026-09-24 | E lineage head (DNS + mail + exit + backup) | **CURRENT source** for domain/DNS, e-mail, exit audit, backup |
| `infra/provider-exit-audit` | `ff9fc30` | 2026-09-23 | ancestor of backup-exit | `DUPLICATE` |
| `infra/cloudflare-mail-exit` | `43fc0c4` | 2026-09-23 | ancestor of provider-exit-audit | `DUPLICATE` |
| `infra/cloudflare-dns-planning` | `f38323d` | 2026-09-23 | ancestor of mail-exit | `DUPLICATE` (RDAP finding carried forward in backup-exit) |
| `infra/cloudflare-api-container-poc` | `faee869` | 2026-09-23 | separate Codex line: API feasibility + Container POC + MySQL 8 validation | `IMPLEMENTATION_BRANCH_ONLY`; its reports are `CURRENT_DEEP_REFERENCE` for the API proof |
| `infra/cloudflare-web-shadow` | `40a2c45` | 2026-09-22 | early Web shadow line | `HISTORICAL` (its CSP change was carried to T as `b7a6b33`) |
| `architecture/agent-orchestration-foundation` | — | — | `engineering-agent-orchestration.md` (n8n/orchestration design) | `UNRELATED` to the provider transition (the old router listed it under "Cloudflare migration") |

**Named in the phase brief or in older docs but not on `origin`** (checked
2026-09-26): `infra/cloudflare-r2-parallel-readiness-01`,
`infra/cloudflare-r2-production-inventory-readonly-01`,
`infra/cloudflare-storage-db-integration`, `infra/cloudflare-api-feasibility`,
`infra/cloudflare-db-exit`, `infra/cloudflare-r2-storage-provider`. The
storage-db-integration (`456963d`), api-feasibility (`f47f0b6`) and
db-exit (`2be35ad`) commits **are** reachable from the branches above, so
their content is preserved. The two R2 branches and any newer R2 work
(production inventory, pre-copy design, pre-copy implementation, copy
rehearsal) have **no commit on `origin`**: their state is `UNKNOWN` from
the repository.

## Files in `docs/cloudflare-migration/` (per branch)

"T" = rc-02 @ `f2584a4`; "E" = backup-exit @ `3cab675`. "Changed" means
changed after the fork point `456963d`.

| File | T | E | Classification for `main` | On `main`? |
|---|---|---|---|---|
| `DECISIONS.md` | changed (adds 2026-09-24) | unchanged | **CURRENT_REQUIRED_ON_MAIN** — T is a strict superset | Yes, verbatim from T |
| `WEB_PROVIDER_API_TRANSITION_RUNBOOK.md` | only in T | — | **CURRENT_REQUIRED_ON_MAIN** | Yes, verbatim from T |
| `CURRENT_STATE.md` | changed | changed | `CONFLICTING` (each lineage lacks the other's facts) | Reconciled rewrite |
| `TARGET_ARCHITECTURE.md` | changed (2026-09-24 transition) | changed (`update.` host) | `CONFLICTING` | Reconciled rewrite |
| `PHASE_STATUS.md` | changed | changed | `CONFLICTING` (disjoint phase lists) | Reconciled ledger |
| `RISKS.md` | changed | changed | `CONFLICTING` — CF-R20..R24 mean different risks in each | Reconciled, lineage-suffixed IDs |
| `PROVIDER_EXIT_CHECKLIST.md` | 2 KB addendum | 36 KB full audit | `CONFLICTING` (different scopes; T says not to replace E) | Reconciled gate table; E audit stays deep reference |
| `README.md` | changed | unchanged | `SUPERSEDED` by the `main` README | New README |
| `DNS_AND_DOMAIN.md` | changed (2026-09-24 preflight; registrant "UNKNOWN") | changed (RDAP registrant, control matrix) | `CONFLICTING` on registrant; `CURRENT_DEEP_REFERENCE`. E contains a third party's name and e-mail | **Not copied** (summarized in `CURRENT_STATE.md` without the personal data) |
| `R2_ASSETS.md` | changed (small) | unchanged | `CURRENT_DEEP_REFERENCE` (75 KB) | Not copied |
| `BACKUP_STRATEGY.md` | — | only in E | `CURRENT_DEEP_REFERENCE` (38 KB) | Not copied |
| `EMAIL_MIGRATION.md` | — | only in E | `CURRENT_DEEP_REFERENCE` (30 KB) | Not copied |
| `SERVICE_INVENTORY.md` | unchanged | changed (adds `update.`) | `CURRENT_DEEP_REFERENCE` (E newer) | Not copied; summarized |
| `API_MIGRATION.md` | changed | changed | `CURRENT_DEEP_REFERENCE` (analysis) | Not copied |
| `DATABASE_MIGRATION.md` | changed | unchanged | `CURRENT_DEEP_REFERENCE` | Not copied |
| `CF-DB-01-REPORT.md` | unchanged | unchanged | `HISTORICAL` phase report (evidence) | Not copied |
| `CLOUDFLARE_MIGRATION_CANDIDATE.md` | only in T | — | `CURRENT_DEEP_REFERENCE` (Container candidate) | Not copied |
| `WEB_MIGRATION.md` | changed | unchanged | `CURRENT_DEEP_REFERENCE` | Not copied |
| `MIGRATION_ROADMAP.md` | changed | changed | `CURRENT_DEEP_REFERENCE`; 8-phase status summarized in `PHASE_STATUS.md` | Not copied |
| `ROLLBACK_PLAN.md` | changed | unchanged | `CURRENT_DEEP_REFERENCE` (Web rollback now in the runbook) | Not copied |
| `SECURITY_MODEL.md` | unchanged | unchanged | `CURRENT_DEEP_REFERENCE` | Not copied |

## Other Cloudflare documents

| Path | Where | Classification |
|---|---|---|
| `docs/cloudflare-api-feasibility.md` | `infra/cloudflare-api-container-poc` | `HISTORICAL` analysis (folded into `API_MIGRATION.md`) |
| `docs/cloudflare-api-container-poc.md`, `experiments/cloudflare-api-*` | `infra/cloudflare-api-container-poc` | `IMPLEMENTATION_BRANCH_ONLY` |
| `Dockerfile.cloudflare-poc`, `scripts/build-cloudflare-web.mjs`, `scripts/cloudflare-web-rc-config.mjs` | T | `IMPLEMENTATION_BRANCH_ONLY` (code, not knowledge) |
| `docs/game-data/cloudflare-resources.md` | `main` | `CURRENT` for the Game Data Platform — `UNRELATED` to the provider transition |
| `docs/handoff/production-tls-validation.md` | `main` | `CURRENT` evidence (2026-08-09 production DNS/TLS audit) |

## `main` summaries that pointed at older Cloudflare states

| Location on `main` | What it says | Classification now |
|---|---|---|
| `docs/architecture/bloodmoon-ai-product-vision.md` §22 row B | "Production unchanged; non-production shadow" citing the 2026-09-22 `TARGET_ARCHITECTURE.md` on `infra/cloudflare-migration-candidate` | `HISTORICAL` — correct for its date; the 2026-09-24 approved transition is newer (annotated in PR #3, not merged yet) |
| `docs/architecture/bloodmoon-ai-product-vision.md` §21 test 1 | registrant = Bryan, access unconfirmed | Still `CURRENT` |
| `docs/architecture/specialist-mvp-validation-2026-09-25.md` Test B | same 2026-09-22 plan | `HISTORICAL` |
| `.claude/skills/bloodmoon-knowledge-router/SKILL.md` domain map | "Cloudflare … none merged to `main`" | `SUPERSEDED` by this folder (updated in `BLOODMOON-AI-07`) |
