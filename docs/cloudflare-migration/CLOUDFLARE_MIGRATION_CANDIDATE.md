---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-23
---

# Cloudflare migration candidate — Container + Storage/DB reconciliation

Phase `CF-INTEGRATION-02` (2026-09-23). **This document records a
candidate, not a decision.** `infra/cloudflare-migration-candidate`
exists so the compatible, validated work from two independently-forked
tracks can be inspected, tested, and reasoned about together — it does
**not** authorize a `main` merge or a production deployment. See
`DECISIONS.md` for what Bryan has actually approved; nothing in this
document is that.

## Branches involved

| Branch | Tip | Relationship to `main` (`b5a4321d`) |
|---|---|---|
| `infra/cloudflare-storage-db-integration` | `456963d7` | direct descendant, `git merge-base` confirmed |
| `infra/cloudflare-api-container-poc` (Codex, unmerged, untouched) | `faee869e` | direct descendant, `git merge-base` confirmed — diverges from `main` at the **same commit** the storage/DB branch does (a clean two-way fork, zero shared history beyond `main` itself) |
| `infra/cloudflare-migration-candidate` (this branch) | `6a1fb571` | created from the storage/DB integration branch's tip; the container track's production-worthy changes applied on top by hand (see below), not merged |

## 1-2. Ancestry + Codex diff review

`git merge-base` confirmed both source branches fork from the exact
same `main` commit, independently — no shared commits with each other.
The Codex branch's **full diff against `main`** was reviewed file by
file (25 files, 2515 insertions, 2 deletions — much smaller than its
own commit-message narrative might suggest, because the branch's
intermediate commits added and then removed their own temporary
validation code, leaving a clean final diff):

| File(s) | Classification | Disposition |
|---|---|---|
| `apps/api/src/main.ts` (2-line diff: `app.enableShutdownHooks()`, explicit `'0.0.0.0'` bind) | **REQUIRED_FOR_CONTAINER**, also **SAFE_FOR_CANDIDATE** | Integrated — see §7 |
| `apps/api/prisma/schema.prisma` (`binaryTargets` +`rhel-openssl-3.0.x`) | **REQUIRED_FOR_CONTAINER** (Oracle Linux 9 base image needs this OpenSSL target), purely additive | Integrated |
| `Dockerfile.cloudflare-poc` + its `.dockerignore` + root `.dockerignore` | **REQUIRED_FOR_CONTAINER**, **SAFE_FOR_CANDIDATE** | Integrated, byte-verified identical to the source branch |
| Embedded inline crypto self-test inside `Dockerfile.cloudflare-poc` (one `RUN node -e "..."` line, AES-GCM/HMAC/bcrypt/JWT/TOTP/QR round-trip using literal test strings like `'synthetic-test-secret'`) | **TEMPORARY_VALIDATION** | Kept as-is (harmless build-time sanity check, no real secret, doesn't affect the runtime image) — not stripped this phase, flagged here for a future cleanup pass if ever desired |
| `experiments/cloudflare-api-container-poc/` (Worker router `src/index.ts`, `wrangler.jsonc`, `package.json`/`package-lock.json`, `check-prerequisites.ps1`, `README.md`) | **POC_ONLY** | **Not integrated.** The `Container`/`getContainer` class structure is a genuinely useful reference pattern, but its `envVars` block is POC-shaped (`NODE_ENV: 'test'`, `AUTH_CAPTCHA_TEST_BYPASS: '1'`, `SESSION_TTL_HOURS: '1'`) — real values a production deployment must never inherit by copy-paste. Cited here, not duplicated as committed candidate config |
| `experiments/cloudflare-api-workers-poc/` (`baseline.ts`, `current-api-entry.ts`, `wrangler.*.jsonc`) | **MUST_NOT_INTEGRATE** as candidate infrastructure | This is leftover scaffolding from the earlier, separate native-Workers feasibility investigation (`docs/cloudflare-api-feasibility.md`, Phase CF-01B) — unrelated to the Containers path this program actually chose (`DECISIONS.md`). Not touched, not carried forward |
| `docs/cloudflare-api-container-poc.md`, `docs/cloudflare-api-feasibility.md`, `context/CURRENT_STATE.md` | **DOCUMENTATION** | Not imported wholesale — cited by reference from this program's own canonical docs (§11), matching the exact precedent CF-01B already set for the original feasibility branch ("its code was never merged; its documented findings were spot-checked... before being folded in") |
| `docs/cloudflare-migration/{API_MIGRATION,CURRENT_STATE,DATABASE_MIGRATION,PHASE_STATUS,RISKS}.md` (Codex's own edits to these files) | **DOCUMENTATION**, **MUST_NOT_INTEGRATE as a git merge** | These files diverged independently on both branches since `main`. Rather than attempt a `git merge` (which would conflict, since the storage/DB branch also edited most of these same files for unrelated reasons), this phase hand-reconciles the *combined* evidence into fresh versions of these files (§11) — the correct approach per the brief's own instruction to update docs "so they reflect the combined evidence," not to merge two divergent edit histories |

## 3. POC cleanup — independently verified, not just trusted

The Codex report claims `VALIDATION_HARNESS_REMOVED = YES`,
`TEMPORARY_ENDPOINTS_REMOVED = YES`, `TEMPORARY_CLOUDFLARE_SECRET_REMOVED
= YES`. Verified independently this phase, not taken on faith:

```
git diff --name-status main infra/cloudflare-api-container-poc -- apps/api/src/
M       apps/api/src/main.ts
```

**The entire `apps/api/src/` tree has exactly one modified file and
zero added or deleted files**, on the branch's *final* state (not an
intermediate commit) — this is the strongest possible independent
confirmation available without live network access to the shadow
Worker itself: there is no leftover controller, route, middleware, or
diagnostic endpoint anywhere in the API source. A full-diff secret
scan (`AKIA`, `cfat_`, `-----BEGIN`, literal `password=`/`secret=`
assignments) found zero real credential values anywhere in the
branch's diff — every credential-shaped reference in
`experiments/cloudflare-api-container-poc/src/index.ts` reads from
`env.*` (Cloudflare Worker secret bindings), never a literal value.
**Confirmed: `POC_CLEANUP_VERIFIED = YES`, independently, not merely
asserted.**

## 4. Candidate branch creation

`infra/cloudflare-migration-candidate` created from
`infra/cloudflare-storage-db-integration`'s tip (`456963d7`) — the
newer, more complete coherent baseline (full 15-document canonical
set, all storage/DB work already consolidated). The container track's
5 production-worthy files (§2 above) were then applied by hand (`Edit`/
`Write`, byte-verified against the source branch, not `git merge` or
`git cherry-pick` — this avoided pulling in either branch's own
divergent documentation commits, keeping the integration auditable as
exactly 5 files, 76 insertions, 2 deletions). Final commit: `6a1fb571`.

## 5. Prisma migration reconciliation

`infra/cloudflare-storage-db-integration` already has **56** migrations
(confirmed by directory count, excluding `migration_lock.toml`),
including `20260923090000_admin_content_storage_provider` — the Codex
branch's own "55 canonical migrations" figure predates this migration,
exactly as this phase's brief anticipated. The candidate inherits all
56 from its base branch; no migration was added, removed, or
duplicated by this phase's own integration work.

**Re-run for real, independently, against a third disposable MySQL 8
instance** (own fresh data directory, own loopback port `33061`, own
throwaway credentials, generated locally, never committed — neither
`CF-DB-01`'s nor the Codex branch's own disposable instance was reused
or touched):

- `prisma migrate deploy`: **all 56 migrations applied successfully**.
- `prisma migrate status`: **"56 migrations found... Database schema is
  up to date!"** — zero drift.
- `DESCRIBE ReferenceAsset`: both `storageProvider`/`storageKey`
  columns present exactly as `CF-R2-03` designed them.
- `information_schema.tables` count: **142** — matching `CF-DB-01`'s
  own independently-obtained table count exactly.
- `apps/api/scripts/verify-disposable-restore-prisma.mjs` (the same
  reusable script from `CF-DB-01`): **6/6 checks passed** — real
  Prisma-client connect, `Account`/`WalletLedgerEntry` reads,
  `_prisma_migrations` read (**count=56**, an independent confirmation
  via a completely different code path than `prisma migrate status`),
  a real disposable write, a real `P2002` unique-constraint
  enforcement, and zero-residue cleanup.
- Disposable instance fully torn down after (`Stop-Process` on the
  real listening PID, data directory deleted, confirmed absent).

`MIGRATION_COUNT = 56`, `ADMIN_CONTENT_MIGRATION = PRESENT`,
`MYSQL8_REPLAY = PROVEN (this phase's own independent third
confirmation — CF-DB-01, the Codex branch, and this phase, three
separate disposable instances, same result)`, `DRIFT = NONE`.

## 6. Container + storage reconciliation

Confirmed present and correctly named in the candidate's
`apps/api/.env.example`: `MEDIA_STORAGE_PROVIDER`,
`GUILD_MEDIA_STORAGE_PROVIDER`, `LAUNCHER_MEDIA_STORAGE_PROVIDER`,
`ADMIN_CONTENT_STORAGE_PROVIDER`, plus the shared `R2_*` credential
vars and each domain's own `*_R2_BUCKET` override — every switch
still defaults to `local`, zero production R2 activation implied or
performed. The Container image (`Dockerfile.cloudflare-poc`) installs
and builds the exact same `apps/api` source that already carries all
four `StorageProvider`/R2 code paths — nothing about the container
runtime integration required any change to the storage code itself,
confirming the two tracks are genuinely orthogonal and compose
cleanly. **No R2 activation was performed or is proposed here.**

## 7. Shutdown hooks — retained, with reasoning

`app.enableShutdownHooks()` is retained in the candidate. Reasoning,
per the brief's own instruction to document why:

- It is what makes NestJS actually invoke every registered
  `OnModuleDestroy`/`beforeApplicationShutdown` hook when the process
  receives `SIGTERM`/`SIGINT` — without it, those hooks silently never
  fire, regardless of runtime.
- Two real, already-existing hooks in this codebase depend on it:
  `MailTransportService.onModuleDestroy()` (closes the `nodemailer`
  transporter cleanly) and Prisma's own shutdown behavior. Neither
  currently fires cleanly on a bare `SIGTERM` without this call.
- **Not Container-specific** — this is a general Nest best practice
  that benefits the *current* cPanel/LSAPI runtime exactly as much as
  a future Container: `bloodmoon-deploy` skill's own Phase 4 procedure
  already sends `SIGTERM` (never `SIGKILL` without fresh
  authorization) as the standard graceful-reload mechanism on the
  current host today. This change makes that existing procedure
  measurably safer everywhere it's already used, not just under
  Containers.
- **Verified safe this phase**: the full 127-test unit suite and the
  242 real-DB e2e tests run this phase (§10) all passed with this
  change active — no hook depends on shutdown NOT being wired up.

## 8. Billing PII boundary — explicitly not integrated

**Not merged, not referenced as code, not touched.**
`payments/asaas-production-readiness` (commit
`1e6b0768777a517380c22a5854465756c9d908fd`) contains Billing PII
AES-256-GCM crypto (`billing-crypto.ts`, `billing-profile.service.ts`),
validated in isolation on that branch (19/19 unit tests, per the Codex
container document's own citation) — but that branch's code does not
exist anywhere in this candidate. `BILLING_PII_INTEGRATED = NO`. A
future Cloudflare candidate that incorporates real Asaas billing
profiles must deliberately include that work as its own explicit,
separate decision — this phase does not make that decision or move
toward it.

## 9. Cloudflare Access — explicitly not a blocker here

Per the brief's own instruction, this integration is **not** blocked
on Zero Trust/Access configuration. Recorded: the Codex shadow
Container's runtime is proven; whether/when to protect it with
Cloudflare Access remains its own separate, not-yet-scheduled item
(`CF-ACCESS-01`, not opened this phase — naming it only as a forward
reference, matching this program's convention of naming future work
without scheduling it). No Access configuration was applied, proposed,
or evaluated further this phase.

## 10. Full candidate validation

All of the below ran against **this exact candidate commit**
(`6a1fb571`), not a source branch, not a simulation:

| Check | Result |
|---|---|
| `npm run api:build` | **PASS**, zero errors |
| `npm run check` (11 structure-check scripts + `tsc --noEmit`) | **PASS**, exit 0 |
| Unit tests (`jest --config ./jest.config.js`) | **127/127 passed, 14 suites** — matches the storage/DB branch's own known baseline exactly, confirming the container-track integration introduced zero regression |
| `prisma validate` + `prisma format` | **PASS** — `format` made zero additional changes beyond this phase's own single-line `binaryTargets` edit (confirmed via `git diff --stat`) |
| 56-migration replay (disposable MySQL 8.0.46) | **56/56, zero drift** (§5) |
| Real Prisma-client script (`verify-disposable-restore-prisma.mjs`) | **6/6 passed** (§5) |
| `test:beta:critical` (portal-critical, password-recovery, error-handling) | **30/30 passed, 3 suites** |
| `test:beta:community` (8 community-\* suites, including `community-media.e2e-spec.ts`) | **125/125 passed** |
| `guilds.e2e-spec.ts` + `launcher-remote-content-contract.e2e-spec.ts` | **87/87 passed** (78 + 9, matching known baselines exactly) |
| Container configuration | **Static validation only** — `Dockerfile.cloudflare-poc` syntax/structure reviewed, referenced `package.json` paths confirmed to exist (`apps/api`, `apps/game-data-worker`, `apps/web`, `packages/shared`), CMD/EXPOSE/ENV values consistent with the proven Codex deployment. **No live remote build or redeploy was attempted** — see below |
| Secret scan | **Clean** — the one grep match was the known, literal `'synthetic-test-secret'` build-time placeholder (§2), not a real credential |

**Remote Container redeployment — deliberately not attempted.**
Per the brief's own instruction ("if redeployment is consequential,
stop and report"): actually pushing this candidate's `Dockerfile.cloudflare-poc`
through Cloudflare Workers Builds to the existing shadow Container
would replace Codex's own already-proven, currently-running shadow
deployment with this phase's own build — a real, consequential
Cloudflare-account-state change this phase was not asked to make and
did not have fresh, explicit authorization for. **Reported, not
performed.** If Bryan wants this candidate's exact integrated code
validated against a *live* remote Container (as opposed to the strong,
real local/disposable-DB validation already completed), that is a
distinct, explicit next step for him to authorize.

**Total real tests passed this phase, across every layer**: 127 (unit)
+ 6 (Prisma script) + 30 (beta-critical) + 125 (community) + 87
(guilds/launcher-content) = **375**, plus the 56-migration replay
itself and the two independent secret/cleanup scans — all against this
exact candidate commit, all torn down cleanly afterward.

## 12. Backup gap — carried forward, not solved

`BACKUP_EXIT_READY = NO`, unchanged from `CF-EXIT-01`/`RISKS.md`
CF-R26 — no off-host backup destination is decided anywhere in this
program. Explicitly added to this candidate's own next-phase list
(§13) rather than silently dropped now that the Container/DB/storage
tracks are converging.

## 13. Final readiness

`CLOUDFLARE_MIGRATION_CANDIDATE_READY = YES` — Container, database, and
R2-capable storage code coexist coherently on one branch; all 56
current migrations exist exactly once; no POC-only route, secret, or
temporary backdoor entered the candidate (independently verified, not
just trusted); build/typecheck/375 real tests/Prisma/secret-scan all
pass; documentation now agrees (§11 below).

**This does not authorize a `main` merge or a production deployment.**
Remaining before either of those could ever be considered: a real
external MySQL vendor decision (database still runs locally/disposable
here, never production, never the chosen final vendor), a decision on
whether/how to validate this exact candidate against a *live* Cloudflare
Container redeploy (§10), the billing/payments integration decision
(§8, explicitly out of scope), and the pre-existing DNS/mail/backup
gaps this program has tracked all along (`PROVIDER_EXIT_CHECKLIST.md`).

## Next-phase list (not scheduled, recorded for continuity)

- External MySQL vendor selection (unchanged blocker, `DATABASE_MIGRATION.md`).
- A real decision on live-redeploying this exact candidate to Cloudflare Containers (§10).
- `CF-ACCESS-01` — Cloudflare Access/Zero Trust configuration for the shadow Container (§9, not opened, named only).
- Backup destination decision (§12, `RISKS.md` CF-R26).
- Billing/payments (Asaas) integration, if/when Bryan decides to pursue it (§8).
