---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-26
---

# Phase status — consolidated ledger (both lineages)

Reconciled in `BLOODMOON-AI-07`. One row per phase, with the commit that
records it. The full per-phase narrative stays in `PHASE_STATUS.md` on the
branch named in the "Branch" column (`git show <branch>:docs/cloudflare-migration/PHASE_STATUS.md`).
Lineages: **T** = transition (`migration-candidate` →
`cf-web-provider-api-transition-01` → `web-shadow-rc-02`); **E** = exit
(`dns-planning` → `mail-exit` → `provider-exit-audit` → `backup-exit`);
**C** = shared history before the fork at `456963d`; **X** = separate
branch not in either lineage.

## Program phases (work units)

| Phase | Date | Result | Production touched | Commit | Branch (tip that carries it) | Lineage |
|---|---|---|---|---|---|---|
| CF-00/CF-01 — canonical docs + Nuxt Web shadow Worker | 2026-09-22 | COMPLETE — `bloodmoon-web-shadow` created on `workers.dev` | No | `b053b89` | all `infra/*` | C |
| API feasibility (native Workers vs Containers) | 2026-09-22 | COMPLETE — report only | No | `f47f0b6` | `infra/cloudflare-api-container-poc` | X |
| CF-01B — reconcile Web shadow + API feasibility; Bryan's architecture decision | 2026-09-22 | COMPLETE | No | `3d148ef` | all `infra/*` | C |
| CF-DB-01 — disposable MySQL restore proof, DB shortlist | 2026-09-22 | COMPLETE — backup-restore P1 closed (non-production) | No | `2be35ad` | all `infra/*` | C |
| CF-R2-01 — R2 inventory + verified shadow asset copy | 2026-09-22 | COMPLETE — 3,162 files in a non-production bucket | No | `58aed01` | all `infra/*` | C |
| Web shadow CSP allows R2 shadow origin (redeploy of shadow Worker) | 2026-09-22 | COMPLETE (shadow only) | No | `40a2c45` (`infra/cloudflare-web-shadow`), same change as `b7a6b33` on T | `infra/cloudflare-web-shadow`, T | C/T |
| CF-R2-02 — `R2StorageProvider` hardening, guild/launcher media | 2026-09-22 | COMPLETE (code, env switch defaults `local`) | No | `ab7cf31` | all `infra/*` | C |
| CF-R2-03 — admin-content storage audit + migration | 2026-09-23 | COMPLETE (code) | No | `f548d82` | all `infra/*` | C |
| CF-R2-04 — real R2 E2E + Prisma migration proof | 2026-09-23 | COMPLETE — `CONTAINER_STORAGE_READY = YES` | No | `289a0dc` | all `infra/*` | C |
| CF-R2-05 — test portability cleanup | 2026-09-23 | COMPLETE | No | `01dc49b` | all `infra/*` | C |
| Storage/DB consolidation (fork point) | 2026-09-23 | COMPLETE | No | `456963d` | all `infra/*` | C |
| CF-API-02R — Container runtime POC + MySQL 8 validation (Codex) | 2026-09-23 | COMPLETE — `bloodmoon-api-container-shadow`, proof passed | No | `fc4854b`, `faee869` | `infra/cloudflare-api-container-poc` | X |
| CF-DNS-01 — DNS/domain inventory + cutover plan (RDAP) | 2026-09-23 | COMPLETE (read-only) | No | `f38323d` | E | E |
| CF-MAIL-01 — e-mail dependency audit + exit plan | 2026-09-23 | COMPLETE (read-only) | No | `43fc0c4` | E | E |
| CF-EXIT-01 — provider dependency audit + exit checklist | 2026-09-23 | COMPLETE (read-only) | No | `ff9fc30` | E | E |
| CF-INTEGRATION-02 — Container + storage/DB candidate reconciliation | 2026-09-23 | COMPLETE — `CLOUDFLARE_MIGRATION_CANDIDATE_READY = YES`; not merged, not live-redeployed | No | `6a1fb57`, `4b0e8e6` | T | T |
| CF-BACKUP-01 — off-host backup architecture + disposable restore proof | 2026-09-24 | COMPLETE | No | `1afd65d` | E | E |
| CF-BACKUP-02 — real encrypted off-host backup round-trip (private R2) | 2026-09-24 | COMPLETE — `MECHANISM_PROVEN = YES`, `PRODUCTION_WIRED = NO` | No (new private test bucket only) | `3cab675` | `infra/cloudflare-backup-exit` | E |
| CF-WEB-PROVIDER-API-TRANSITION-01 — Web-first transition preparation + runbook | 2026-09-24 | **PARTIAL / GATE CLOSED** — `WEB_CF_PROVIDER_API_TRANSITION_READY = NO` | No (read-only preflights) | `903e2e1` | T | T |
| Web RC config fail-closed build check | 2026-09-24 | COMPLETE (code; no new candidate deploy evidenced) | No | `f2584a4` | `infra/cloudflare-web-shadow-rc-02` | T |
| **R2 parallel readiness / production inventory / pre-copy design / pre-copy implementation / rehearsal** | — | **UNKNOWN** — no such branch or commit on `origin` (checked 2026-09-26) | — | — | not pushed | — |

## Roadmap phases (the 8-step program, `MIGRATION_ROADMAP.md`)

| # | Roadmap phase | State (latest evidence) |
|---|---|---|
| 1 | Nuxt Web → Workers, production cutover | NOT STARTED. Shadow exists; transition approved 2026-09-24; cutover not authorized, gate `NO` |
| 2 | Static assets → R2 | SHADOW PROVEN (CF-R2-01); production cutover NOT STARTED |
| 3 | Cloudflare edge in front of legacy API | NOT STARTED; no concrete need identified |
| 4 | API runtime | DECISION MADE (Containers); proof RUN AND RECONCILED (non-production) |
| 5 | MySQL exit | NOT STARTED; method proven on disposable instances; vendor UNDECIDED |
| 6 | API cutover | NOT STARTED; deliberately deferred by the 2026-09-24 decision |
| 7 | DNS/domain cutover | NOT STARTED; blocked on operational domain control (`UNKNOWN`) |
| 8 | Remove current provider | NOT STARTED; `CURRENT_PROVIDER_ZERO_READY = NO` |

## Next steps named by the evidence (not authorized here)

1. Bryan confirms `registro.br` / zone / nameserver change **and revert**
   access and resolves the second RDAP contact (risks CF-R2, CF-R21(E),
   CF-R21(T)).
2. Build a new Web candidate with the explicit production API base,
   verify CSP has no `localhost`, re-run the auth smoke (risk CF-R20(T)).
3. Choose and record the root/www routing mechanism (risk CF-R22(T)).
4. Separately: decide whether to wire the proven off-host backup into
   production cron (risk CF-R26(E)); decide the database vendor; decide
   the Container candidate's live redeploy and eventual merge.
5. Reconcile the two lineages on the branches themselves (this folder
   reconciles only the documents on `main`), and push or record any
   local-only R2 branches.
