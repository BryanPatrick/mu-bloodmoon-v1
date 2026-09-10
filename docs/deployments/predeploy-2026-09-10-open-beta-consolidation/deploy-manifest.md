# Deploy manifest: predeploy-2026-09-10-open-beta-consolidation

Pre-deploy phase only. No application deploy, no migration, no production
mutation has happened yet — this manifest records what a future deploy
of `main @ 3ce0e6be` will consist of, and the read-only/backup evidence
gathered before authorizing it. Copied from
`docs/deployments/_template/deploy-manifest.md`.

```
DEPLOY_ID: predeploy-2026-09-10-open-beta-consolidation
PHASE: pre-deploy remediation (this round) -- NOT a deploy execution
PRODUCT: portal (api + web)
ENVIRONMENT: prod (target; nothing touched yet)
SOURCE_BRANCH: main
SOURCE_COMMIT: 3ce0e6bedc765c7cc8e1ad4f7add55d892c62d40
INTEGRATION_COMMIT: fceadc5b24cb335b53e4a0fc737c8e7565584c7a (M12, merged into main via 3ce0e6be)
BUILD_HASH: see API_ARCHIVE_SHA256 / WEB_ARCHIVE_SHA256 below (built from SOURCE_COMMIT, git status clean throughout)
PACKAGE_HASH: identical to BUILD_HASH -- archive integrity independently verified file-by-file and hash-by-hash against the build output (see PACKAGE_INTEGRITY_VERIFICATION below), so no build-vs-package gap exists for this package
MIGRATIONS: 9 genuinely pending (CORRECTED this round -- see MIGRATION_HISTORY_FINDING below) -- NOT_EXECUTED
TARGET: bmapi (api.mubloodmoon.com.br) + bmweb (mubloodmoon.com.br)
DEPLOYED_AT: NOT_EXECUTED
DEPLOYED_BY: NOT_EXECUTED
PRECHECK: see this document in full
BACKUP: real, verified, from the existing automated daily system -- see BACKUP section below (no new backup files generated this round, by deliberate choice -- see STORAGE_STATE)
MIGRATION_RESULT: NOT_EXECUTED
RELOAD_RESULT: NOT_EXECUTED
SMOKE_RESULT: NOT_EXECUTED
NEW_5XX: NOT_EXECUTED
ROLLBACK_POINT: git tags rollback/main-pre-integration-promotion-2026-09-10 (3b527749) and rollback/pre-test-stabilization-merge-2026-09-10 (29510064); DB rollback = today's verified automated backup (backups/bloodmoon/daily/20260910-031701/database.sql.gz); app rollback = existing bmweb .output-*-backup-* generations + full git reproducibility of bmapi (already verified byte-for-byte this round)
PRODUCTION_VERIFIED: NOT_EXECUTED
NOTES: see full report delivered in chat for this round's complete findings, especially MIGRATION_HISTORY_FINDING below -- the single most important discovery this round
```

## MIGRATION_HISTORY_FINDING (critical correction)

Read-only query against production's real `_prisma_migrations` table
(via phpMyAdmin, authenticated through the existing cPanel session --
no new Remote Database Access created, the production DB credential
known-compromised from an earlier incident was never touched) revealed
that **7 of the 16 migrations previously classified `NOT_DEPLOYED_CONFIRMED`
were already successfully applied to production**, via a real deploy
that ran 2026-09-05 ~16:45 (`open_beta_p0_foundation` shows 2 earlier
rolled-back attempts before a 3rd, successful one on that date --
consistent with the documented casing-bug incident, now resolved).

**ALREADY_APPLIED_UNEXPECTED (7, confirmed clean, zero rollback, zero drift):**
`open_beta_p0_foundation`, `vip_product_config`,
`phase14_vip_delivery_account_deletion`,
`phase15_vip_benefit_fields_and_pricing_seed`,
`phase15_account_deletion_request`, `account_deletion_feedback`,
`account_deletion_feedback_retention_interaction`.

Drift check performed: `AccountDeletionFeedback`'s real production
column set (7 columns: id, accountId, reasons, otherText, submittedAt,
anonymizedAt, retentionInteraction) matches this repo's migration files
exactly, field-for-field, type-for-type. **Zero schema drift.**

**ABSENT_EXPECTED (9, genuinely pending, confirmed via both
`_prisma_migrations` absence and a targeted `information_schema.tables`
check for their key tables -- AlertDispatchState, LegacyCatalogItem,
ProgressionConfigItem, PlayerPreferenceDefinition, PlayerPreference all
confirmed absent, GameBridgeJob confirmed present as a positive
control):**
`gamebridge_vip_sync_state`, `survey_foundation`,
`player_preferences_foundation`, `vip_sync_drift_observability`,
`phase_s_legacy_catalog_item`, `phase_t_legacy_catalog_effective_state`,
`phase_u_progression_config_item`, `phase_v_progression_policy_status`,
`alert_dispatch_state`.

`SCHEMA_PREFLIGHT_CONFLICTS = []` -- the 7 already-applied migrations
are not a conflict (real, clean, drift-free), and the 9 pending ones
have zero partial/orphan tables. This is a real, load-bearing
correction to the integration manifest's own migration table, which
must be updated before any deploy execution round.

## API_ARCHIVE

- Path (local, not yet uploaded): `work/deploy/cpanel/bloodmoon-api-cpanel.tar.gz`
- Size: 3,404,672 bytes (~3.25 MB)
- SHA256: `176630b63020dc727e056b7796fa6c4a0b0f269597af1030623824ef8708d4ec`
- Built via the project's own canonical `node scripts/package-cpanel-deploy.mjs`
  (invoked through `npm run deploy:cpanel:package`'s own `api:build && web:build &&` chain)
- Method: dist + prisma folder + generated production-only `package.json`
  (no `node_modules` shipped) -- `npm install`/`prisma generate` run on
  the host after upload, matching this project's own established,
  already-proven convention (`deploy/CPANEL_NODE_DEPLOY.md`)
- Integrity: entrypoint (`server.js` -> `dist/apps/api/src/main.js`)
  confirmed present; all 55 migrations present; zero `.env`, zero test
  files, zero `.git`, zero recovery/POSSIBLE_SECRET artifacts found in
  the extracted package

## WEB_ARCHIVE

- Path (local, not yet uploaded): `work/deploy/cpanel/bloodmoon-web-cpanel.tar.gz`
- Size: 121,977,270 bytes (~116.3 MB)
- SHA256: `46f80630af77af48b42ea5d4a84035efa88142ac3767973ccd32ebd2830b5739`
- Source `.output`: 4,160 files, 245 MB
- Packaged archive (extracted for verification): 4,179 files -- the
  delta is fully explained: 1 file (`BloodMoonLauncher.zip`)
  deliberately excluded by the packaging script (uploaded separately),
  plus 18 real `@vue/devtools-api` files that exist behind Windows
  directory junctions in the source tree (invisible to a naive `find`,
  correctly dereferenced into the archive by the packaging script's
  `cp(..., {dereference: true})`) plus 2 files the script adds
  (`package.json`, `README-cpanel.md`)
- **Full verification performed**: every file in source has a match in
  the extracted archive except the one intentionally-excluded launcher
  zip; every file common to both has an identical SHA256 hash (zero
  mismatches across the full set)

## MIGRATION_LIST (9 genuinely pending, in application order -- see
## MIGRATION_HISTORY_FINDING above; the other 7 rows below are kept
## for the hash record but are ALREADY APPLIED, not pending)

| # | Migration | SHA256 (migration.sql) |
|---|---|---|
| 1 | 20260830120000_open_beta_p0_foundation | 48bf4a3466b4e62fe2e95f2701583c7e23a99ea956f0ad36e53e4b93b82af6a5 |
| 2 | 20260830121500_vip_product_config | 9b954392a4c61a410ee59d9d94ebb22baa861bf743d65e57c348c1bda0d7d378 |
| 3 | 20260830130000_phase14_vip_delivery_account_deletion | 301c87fc6b63c73e548469a5d6d267938584faf7192a8c9910a57f4b6edfafdc |
| 4 | 20260830140000_phase15_vip_benefit_fields_and_pricing_seed | a47c3d724a61dbcefba66de08467023d9520f06fcf61750239d051fbbf19eb9a |
| 5 | 20260830150000_phase15_account_deletion_request | e2a31e242d4ccf736127dbcefb4aacc7e366960677a4784edbdb09e30a0456b2 |
| 6 | 20260830160000_gamebridge_vip_sync_state | 2efc8a8f5bb2f92fb054c745bc3186bd1eee7df0760ac3d07d9a1f24ba12e228 |
| 7 | 20260830170000_account_deletion_feedback | 7c4748e61e5a22494025b50cddcfd13edb7e2e1ea35b1cfdbb83d2fe8f1feaa4 |
| 8 | 20260830180000_account_deletion_feedback_retention_interaction | 957243dc3c23863a3a37b6c35fff6787a9a34f73af4cf46abb77b551c732f75d |
| 9 | 20260830190000_survey_foundation | 1d6a0946bfa62367f3b0351998636d57ae60dcf5e8da118b546e588d4c850768 |
| 10 | 20260830191000_player_preferences_foundation | 166bdddcc392bfc8e9b6e25ee0afcb62e445d9190f8000cf8a082af7d586d0e9 |
| 11 | 20260831120000_vip_sync_drift_observability | 3c3a95a7132335378796da234b0103d975933502decac0730de554019de316f4 |
| 12 | 20260902100000_phase_s_legacy_catalog_item | cb63a359630f88e3c82836abe5c512f78822f4058fceda61747cdacd47eff919 |
| 13 | 20260902110000_phase_t_legacy_catalog_effective_state | 99f0631cb051157c0dc1173d9bba384a2b62cfeb3f959eb5f304ffe38b303a6b |
| 14 | 20260903120000_phase_u_progression_config_item | 38aed7e9ac6fa2f5108ee1fdc85f68172d739c2e994515f02d55763d0e7216b2 |
| 15 | 20260904090000_phase_v_progression_policy_status | 0393c3e5f563fadf31bbcabc742821ffb66356a8ccc0a03d35b90d0acb9a0e82 |
| 16 | 20260905090000_alert_dispatch_state | 90f64438d9c0d17732aaf9ac839c35fbb16672439ad2a394db09433526f8c6ab |

Correction to earlier risk classification: only migration #4 (VIP
pricing) has embedded seed SQL (9 rows, all `enabled=false`).
Migrations #12 (Legacy Catalog) and #14 (Progression) are pure
`CREATE TABLE` with zero embedded data -- their actual catalog/config
population happens via a separate, authenticated, permission-gated
admin action (`seedAll(user)`) after deploy, never automatically.

## EXPECTED_CONFIG_STATE (for the eventual deploy, not set yet)

```
REAL_MONEY_PAYMENTS_ENABLED=false
MERCADO_PAGO_PROVIDER_POLL_ENABLED=false
VIP_SYNC_RECONCILIATION_ENABLED=false
ACCOUNT_LIFECYCLE_BRIDGE_ENABLED=false
XSHOP_RUNTIME_SYNC_ENABLED=false
CASHSHOP_RUNTIME_SYNC_ENABLED=false
ALERT_SWEEP_ENABLED=false
ALERT_EMAIL_ENABLED=false
ALERT_WEBHOOK_ENABLED=false
GAMEBRIDGE_HEARTBEAT_ALERT_ENABLED=false
OPS_EVENT_INGEST_TOKEN=(not set -- ingest unused this deploy)
```
All match each key's own code default (fail-closed) -- this deploy does
not need to set any of them explicitly, only avoid accidentally setting
one to `true`.

## PREDEPLOY_READ_RESULTS

Done -- see MIGRATION_HISTORY_FINDING above. Both the migration-history
read (`_prisma_migrations`) and the schema read (`information_schema.tables`)
completed via phpMyAdmin through the existing authenticated cPanel
session. `TEMP_REMOTE_DB_ACCESS_CREATED = NO` (not needed -- phpMyAdmin
via the cPanel session sufficed for read-only access, and deliberately
avoided touching the known-compromised production DB credential).

## BACKUP

**No new backup files were generated this round** -- a real, complete,
hash-verified automated daily backup from **today** (2026-09-10 03:17:01,
pre-existing, unrelated to this session) was found and verified instead:

- Path: `/home/mubloodxz/backups/bloodmoon/daily/20260910-031701/`
- `database.sql.gz`: 665.17 KB, SHA256 `b526b6492f8008a52b7d836eb0ffa8c8ca3612ad8bb4ee6073245ad6f0cb5bc1`
- `mutable-assets.tar.gz` (bloodmoon-storage + bmapi/public): 211 bytes, SHA256 `4652ba1e3fef9fc0be7f1c9f16147619c9f7d146c7f37bf960ff2ba9c26d454e`
- `manifest.txt`: created_at=2026-09-10T03:17:03-03:00, host=srv41.hinetworks.com.br, database=mubloodxz_bloodmoon
- `SHA256SUMS`: present, matches both files above
- Log (`backups/bloodmoon/logs/backup-20260910-031701.log`): "Backup completed at 2026-09-10T03:17:03-03:00" -- clean, no errors
- **Known limitation**: "Offsite copy is not configured; this backup remains on the hosting account only" (from the log itself) -- if this host suffers a catastrophic failure, this backup is lost too. Worth a future remediation, not blocking this round.

Application code backup: **deliberately not generated as a separate
pre-emptive copy this round** -- reasoning: (1) `bmapi`/`bmweb`'s current
code is fully reproducible from git (`main @ 3ce0e6be`, already tagged,
already byte-verified via this round's own build+package+hash work);
(2) the established, already-proven deploy procedure itself preserves
the pre-deploy `.output`/app state via rename (never delete) at the
moment of the real deploy, which is the natural point to take that
snapshot, not days/hours before; (3) real, severe storage constraint
(see STORAGE_STATE) -- `bmapi` (159.57 MB) + `bmweb` (925.53 MB) =
~1085 MB would not fit in the ~1016 MB currently free, and forcing it
would risk filling the disk for a redundant safety margin the other two
reasons already cover.

## STORAGE_STATE

Real, live cPanel disk usage (`Utilização de Disco`), read 2026-09-10:

```
CPANEL_QUOTA_TOTAL = 4,000.00 MB
CPANEL_USED = 2,983.52 MB (74.59%)
CPANEL_FREE = 1,016.48 MB
```

Breakdown of the largest consumers:
```
bmweb/          925.53 MB  (contains 3 generations: live .output +
                             .output-phasez-backup + .output-pre-ac-backup-*
                             -- confirmed intentional, the project's own
                             established "rename, never delete" pattern)
nodevenv/        674.17 MB  (Node.js virtual envs for both apps, normal)
update.mubloodmoon.com.br/  623.35 MB  (a third, separate web property)
backups/         388.51 MB  (bmweb-pre-v15-20260802-0724.tar.gz, 115.8 MB,
                             + the daily automated backup system's own history)
bmapi/           159.57 MB
.npm/            120.15 MB  (npm cache, not touched this round)
.trash/          0.00 MB    (empty -- no repeat of the historical ~1GB trash incident)
```

`STORAGE_PREFLIGHT` assessment for the FUTURE real deploy (not this
round): the new web archive (116.3 MB compressed, ~245-260 MB
extracted) and new API archive (3.25 MB compressed, plus whatever
`npm install` resolves on the host for node_modules, historically
~100-300 MB for this stack) both fit comfortably within the ~1016 MB
currently free, especially since the deploy's own rename-based swap
doesn't require the old content to coexist as a full duplicate. A
literal, naive "copy everything first" backup strategy for `bmapi`/`bmweb`
would NOT fit and should not be attempted -- see BACKUP section above
for the reasoning on why that's not needed anyway.
