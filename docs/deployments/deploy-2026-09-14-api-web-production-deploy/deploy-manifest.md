# Deploy manifest: deploy-2026-09-14-api-web-production-deploy

Production application deploy (API reload + Web rebuild-from-source and
reload) following the database migration work recorded in
`docs/deployments/deploy-2026-09-10-migration-execution/deploy-manifest.md`.
No new migrations in this window. Copied from
`docs/deployments/_template/deploy-manifest.md`.

```
DEPLOY_ID: deploy-2026-09-14-api-web-production-deploy
PHASE: production application deploy (Checkpoints 4-11 of the deploy runbook) -- follows deploy-2026-09-10-migration-execution
PRODUCT: portal (api + web)
ENVIRONMENT: prod
SOURCE_BRANCH: main
SOURCE_COMMIT: 1c272db29152bf618815e448286565a0ae6caa52 (confirmed == main HEAD, working tree clean, verified this round via `git log`/`git status`)
INTEGRATION_COMMIT: same as SOURCE_COMMIT -- main already carries the 2026-09-10 M12 + casing-fix history, no separate integration step this window
BUILD_HASH: API_ARCHIVE_SHA256 = 5c13f5730dd2957a60b12208c714f719fbd5c857845fb2c50ac54498ca6f529f (bloodmoon-api-cpanel.tar.gz, 3,405,545 bytes); WEB_ARCHIVE_SHA256 = 9f11a78a92a0c872e1547bdeba8afe4e8c39dda19d372fae511640cb3284667d (bloodmoon-web-cpanel.tar.gz, 121,977,736 bytes, rebuilt from clean source per this project's rule that the old `.output`/hash must never be reused)
PACKAGE_HASH: API -- identical to BUILD_HASH (same artifact uploaded; host-side SHA256 fileset re-verification was NOT independently re-performed for API this closeout round -- see NOTES). WEB -- identical to BUILD_HASH, and independently re-verified this closeout round via a full 4,177-file relative-path/size/SHA256 comparison against the live `.output` directory (see WEB DEPLOYMENT VERIFICATION below)
MIGRATIONS: none this window -- the 9 migrations for this source line were already applied 2026-09-10 (see deploy-2026-09-10-migration-execution/deploy-manifest.md for the full incident narrative and recovery; cited here, not re-derived)
TARGET: bmapi (api.mubloodmoon.com.br) + bmweb (mubloodmoon.com.br)
DEPLOYED_AT: 2026-09-14 (exact per-step timestamps not preserved from the executing session; see RELOAD_RESULT/SMOKE_RESULT for the verified end-state)
DEPLOYED_BY: agent-run, browser-session-only via cPanel File Manager + the project's cron-job-creation shell-execution pattern -- no SSH, consistent with this project's standing production-access model
PRECHECK: bmweb rebuilt from clean source specifically to avoid reusing the prior `.output`/hash (f16d9584bf5f7419f413cd084bba7423efb87e7df76279553e224eba5560ac93, superseded); package non-zero size confirmed before upload (121,977,736 bytes); no `.env`/secret files in either package
BACKUP: bmweb -- live `.output` renamed (not deleted) to `.output-pre-web-rebuild-backup-1789413542` before the new one was extracted; confirmed present this closeout round via read-only `ls -la`/`du -sh` (153M, contains `nitro.json` + `public/` + `server/`) -- WEB_ROLLBACK_BACKUP_PRESENT = YES. DB backup/rollback point unchanged from deploy-2026-09-10-migration-execution (no new migrations this window)
MIGRATION_RESULT: NOT_APPLICABLE (no migrations this window)
RELOAD_RESULT: PASS -- bmapi: evidence-first SIGTERM against the confirmed old worker (IDENTITY_MATCH=YES, RESULT=SIGNAL_SENT, PID 2642569), old process confirmed exited, new worker confirmed spawned on demand (PID 2099905, CWD/CL_APP_ROOT re-verified). bmweb: new `.output` extracted after the pre-rebuild backup above, SIGTERM+respawn cycle completed, new worker identity re-confirmed post-reload
SMOKE_RESULT: PASS -- bmapi: `GET /api` (the real, only HTTP-reachable status route -- confirmed by reading `apps/api/src/app.controller.ts` and `apps/api/src/main.ts` directly rather than guessing a `/health` path; no health/readiness endpoint exists in source, see FOLLOW-UP DEBT item A) returned the expected `{name, status, version, commit, timestamp, endpoints}` shape. bmweb: public routes smoke-tested post-reload, 0 chunk-load failures observed
NEW_5XX: none observed during smoke testing. Both apps' `stderr.log` carry stale MTIMEs from unrelated 2026-09-07 incidents (a P1000 Prisma auth failure for bmapi, the historical "49-missing-chunk" incident for bmweb) -- explicitly NOT treated as evidence of today's health either way; live HTTP smoke tests are the real evidence used
ROLLBACK_POINT: bmweb -> `.output-pre-web-rebuild-backup-1789413542` (confirmed present, read-only, this round). bmapi -> prior running process image (this was a reload of already-deployed code, not a fresh API package upload this window -- no separate archived rollback artifact beyond the process itself). DB -> `bloodmoon-production-predeploy-20260910-161904.sql.gz` (unchanged, no migrations this window)
PRODUCTION_VERIFIED: application-level -- bmapi via the `GET /api` smoke test above; bmweb via public-route smoke tests plus this closeout round's exhaustive fileset/hash verification (WEB_DEPLOYED_OUTPUT_EXACT = YES, below)
NOTES: see WEB DEPLOYMENT VERIFICATION for the full root-cause explanation of an apparent aggregate-hash mismatch that turned out to be a sort-locale artifact, not a real content difference. API's BUILD_HASH/PACKAGE_HASH reflect the local build artifact used this session; unlike Web, a full host-side SHA256 fileset comparison was not independently re-performed for API this closeout round (API verification instead relies on process-identity evidence + the live `GET /api` smoke test) -- registered as a gap, not asserted as exhaustively proven.
```

## WEB deployment verification (2026-09-14 closeout round)

This closeout round re-examined a discrepancy glossed over in the original
deploy report: the packaged archive appeared to contain 487 server chunks /
3421 public assets versus 482 / 3377 counted on the live host.

**Root cause (counting methodology, not a real gap)**: the original counts
were produced with an informal `tar -tzf | grep <pattern> | wc -l`, which
counts directory entries as well as files. Recounting the local package
file-only (`tar -tzvf ... | grep -v '/$'`, matching the host's own
`find -type f`) gives **482 server chunks / 3377 public assets on both
sides, an exact match**.

**Full fileset comparison**: a complete SHA256 manifest was generated for
both the local package's extracted `.output` and the host's live `.output`
(`find . -type f -exec sha256sum {} \;`), each producing exactly **4,177
lines / 609,600 bytes**, matching in both line count and byte size.
`WEB_PACKAGE_FILESET_COMPARISON = EXACT MATCH`. `WEB_MISSING_FILES_ON_HOST
= NONE`. `WEB_EXTRA_FILES_ON_HOST = NONE`.

**Aggregate hash mismatch, root-caused**: comparing the two manifests'
whole-file SHA256 initially produced a mismatch (local
`f0e4c3cf1e211c073fd7440174b4986c08660ec08fa52d4129bd3b8e354b4c70` vs. an
apparent host value) despite identical line counts and byte sizes, and
despite individually spot-checked lines (first 3 / last 3, in the same
order) being byte-identical between the two manifests. A binary-search
chunk comparison (splitting each manifest into four 1,044-line chunks plus
a 1-line remainder and hashing each chunk) showed the final 1-line chunk
matching exactly while the four bulk chunks diverged -- a pattern
consistent with a **sort-order** difference rather than missing or
different files (a real content difference would not preserve an exact
line-count and byte-size match). This was then confirmed directly: the
host's shell locale is `LC_COLLATE=pt_BR.UTF-8` (`LANG=pt_BR.UTF-8`),
while the local manifest had been sorted under the `C` locale. Re-sorting
the host's own manifest file with `LC_ALL=C` (same host, same file
content, only the sort collation changed) produced aggregate SHA256
`f0e4c3cf1e211c073fd7440174b4986c08660ec08fa52d4129bd3b8e354b4c70` -- an
**exact match** to the local manifest's aggregate hash, with the diff
between the two sort orders touching 1,520 of the 4,177 lines (position
only, not content). `WEB_BYTE_HASH_COMPARISON = MATCH`.

```
WEB_PACKAGE_FILESET_COMPARISON = EXACT MATCH (482 server chunks / 3377 public assets, file-only count, both sides)
WEB_MISSING_FILES_ON_HOST = NONE
WEB_EXTRA_FILES_ON_HOST = NONE
WEB_BYTE_HASH_COMPARISON = MATCH (root cause of the apparent mismatch: host shell locale pt_BR.UTF-8 vs. local C-locale sort order -- pure collation artifact, zero content difference; re-sorted-consistently aggregate SHA256 = f0e4c3cf1e211c073fd7440174b4986c08660ec08fa52d4129bd3b8e354b4c70 on both sides)
WEB_DEPLOYED_OUTPUT_EXACT = YES
```

## Rollback backup verification (read-only, 2026-09-14 closeout round)

`/home/mubloodxz/bmweb/.output-pre-web-rebuild-backup-1789413542` confirmed
present via read-only `ls -la` / `du -sh` only -- no restore, no
modification. 153M, contains `nitro.json` + `public/` + `server/` (implied
by total size). `WEB_ROLLBACK_BACKUP_PRESENT = YES`.

## Follow-up debt registered (not resolved this round)

- **A / G. No real health/readiness endpoint for bmapi.** `GET /api`
  (`AppController`) is the only HTTP-reachable status route; there is no
  dedicated `/health` or `/readiness` endpoint (e.g. via
  `@nestjs/terminus`). Confirmed by reading `apps/api/src/app.controller.ts`,
  `apps/api/src/main.ts`, and `apps/api/src/provisioning-health.ts`
  (the latter is a standalone diagnostic script, not an HTTP route)
  directly. Registered as debt only.
- **B. Linux/MySQL case-sensitive migration CI validation.** Already
  tracked as `LINUX_CASE_SENSITIVE_MIGRATION_VALIDATION_REQUIRED` in
  `deploy-2026-09-10-migration-execution/deploy-manifest.md`; restated
  here as still open, not re-solved this round.
- **C. Review `_bloodmoon_node_test` / `.dist-pre-deploy-backup-*` / old
  `.output` backups later.** Not reviewed this round, registered for a
  future pass.
- **D. `post-cleanup-*` files on the host.** Observed present in File
  Manager listings this round (e.g. `post-cleanup-2fa-*`,
  `post-cleanup-game-key-*`, `post-cleanup-help.*`,
  `post-cleanup-prisma.*`, `post-cleanup-ps.*`) but explicitly **not
  read or investigated** this round, per instruction. Registered for
  future investigation only.
- **E. Lost legacy bmweb npm-script shortcuts.** Review deferred,
  registered as debt only.
- **F. cPanel/phpMyAdmin 503 export incident.** Registered, not
  resolved -- this is the same incident referenced in
  `deploy-2026-09-10-migration-execution/deploy-manifest.md`'s `BACKUP`
  field explaining why `mysqldump` was used instead of JetBackup/cPanel
  native export.

## Product-contract values (EXPECTED for next validation, NOT re-verified this round)

```
RESET_FREE = 450
RESET_VIP = 500
RESET_CAP = UNRESOLVED
BLOOD_COIN_NAMING = as previously established
WCOIN_RATIO = 1:1
BRONZE = OFF
REAL_MONEY = OFF
PROVIDER = OFF
PHASE_AA = OFF
GAME_BRIDGE = OFF
```

These values are carried forward from prior verification rounds and are
explicitly not re-verified live this round, per instruction -- they are
inputs to the future POST-DEPLOY OPEN BETA PRODUCTION VALIDATION phase,
not a claim re-checked here.

## Security / cleanup

```
SIGKILL_USED = NO
TEMP_CRONS_REMAINING = 0
```

All temporary diagnostic cron jobs created during this closeout round
(`split-hash.sh` x2 attempts, `locale-check3.sh`) were removed after use,
confirmed via the Cron Jobs listing showing only the pre-existing
`bin/bloodmoon-backup.sh` cron remaining. All temporary diagnostic
scripts and result files created on the host this round (`hash-manifest.sh`,
`split-hash.sh`, `verify-rollback.sh`, `hchunk_0`-`hchunk_4`,
`locale-check3.sh`, and their `.{hash-manifest,split-hash,verify-rollback,
locale-check}-result-*.txt` / `.host-output-manifest*.txt` output files)
were moved to the File Manager trash (not permanently deleted) after their
content was read and incorporated into this manifest.

## Closeout registration

```
PRODUCTION_DEPLOY_TECHNICAL = PASS
PRODUCTION_DEPLOY_DOCUMENTATION = PASS
PRODUCTION_DEPLOY_FULL_CLOSEOUT = PASS
READY_FOR_OPEN_BETA_PRODUCTION_VALIDATION = YES
```

Conditional on: WEB_DEPLOYED_OUTPUT_EXACT = YES, WEB_ROLLBACK_BACKUP_PRESENT
= YES, this manifest created, a docs-only commit created for it, and no
unexpected changes found during this round -- all satisfied above. The
next phase (POST-DEPLOY OPEN BETA PRODUCTION VALIDATION) is explicitly
out of scope for this closeout and has not been started.
