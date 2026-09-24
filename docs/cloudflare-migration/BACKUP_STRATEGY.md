---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-24
---

# Off-host backup architecture + recovery plan

Phase `CF-BACKUP-01` (2026-09-24). **Design and validation phase — no
production migration.** No production system was touched, no existing
backup was deleted, no production cron was modified, no DNS/database
change was made, no secret was exposed. This document closes the gap
`RISKS.md` CF-R26 named: the backup **method** was already proven
(`CF-DB-01`), but where backups actually *live* once the current
provider is gone was never decided. This phase decides the
architecture (not yet the specific off-host destination — that stays
a real decision for Bryan, §3/§14).

## 1. Current backup implementation — full audit

Three real, already-committed artifacts, read in full this phase:
`deploy/scripts/cpanel-production-backup.sh` (the daily job),
`deploy/scripts/verify-backup-integrity.sh` (post-hoc integrity
re-check), `deploy/scripts/restore-test.sh` (the proven restore-test
methodology), plus `deploy/CPANEL_BACKUP_AUTOMATION.md`.

| Aspect | Current state |
|---|---|
| **What's backed up** | Full `mysqldump` (`--single-transaction --quick --skip-routines --skip-triggers --skip-events --hex-blob --default-character-set=utf8mb4`), gzip -9 compressed; whichever of 5 configured mutable-asset directories actually exist (`~/bloodmoon-storage`, `~/bmapi/storage`, `~/bmapi/public`, `~/bmweb/storage`, `~/public_html/uploads`), tarred together; a `SHA256SUMS` file for every artifact in the run; a `manifest.txt` (created_at, host, database, asset_paths) |
| **What's NOT backed up** | Application code (explicitly, deliberately — "protected by Git and the deploy packages" per the script's own doc); logs; secrets/credentials (the DB password is read transiently from the cPanel Node Selector's protected config or `~/.bloodmoon-backup.env`, used only in-process, explicitly `unset` immediately after the dump — never written into the archive); a full cPanel account backup (explicitly ruled out — "the current 2 GB quota doesn't fit full-backup retention") |
| **Retention** | 3 days local by default (`LOCAL_RETENTION_DAYS`), backup logs kept 30 days. **The doc recommends** an external policy (7 daily / 4 weekly / 6 monthly, monthly restore test) — but this is written guidance only, no automation implements it anywhere |
| **Compression** | gzip -9 (database), tar.gz (assets) |
| **Encryption** | **None.** The dump and asset archive are plain gzip/tar — a real, current gap, not something this phase is inventing |
| **Verification** | Two real layers: (1) inline in the backup job itself, `gzip -t` proves the archive is readable before the run is trusted; (2) `verify-backup-integrity.sh`, a separate, independently-runnable script — re-verifies `SHA256SUMS`, `gzip -t`, sniffs the decompressed header for a real mysqldump signature, `tar -tzf` on the asset archive, and manifest field presence. **Neither proves the SQL actually restores** — that is what `restore-test.sh` is for, explicitly documented as a separate, deliberate step |
| **Off-host copy** | **A real mechanism already exists and is provider-agnostic**: an `RCLONE_REMOTE` env var, unset by default. When set, the script runs `rclone copy "$run_dir" "$RCLONE_REMOTE/$timestamp" --checksum` after the local artifacts are verified. The doc explicitly lists Backblaze B2, Amazon S3, **Cloudflare R2**, or "another server" as valid targets. **This is currently unconfigured in production** — confirmed, matches `RISKS.md` CF-R26 exactly: the mechanism exists, the destination was never chosen |
| **Failure alerting** | **Also already wired**, not something this phase has to invent: `report_event()` posts `BACKUP_STARTED`/`BACKUP_COMPLETED`/`BACKUP_FAILED`/`BACKUP_VERIFICATION_FAILED`/`BACKUP_OFFSITE_FAILED` to `/internal/ops-events` (Phase AA's alerting pipeline, `apps/api/src/modules/alerting`) when `OPS_EVENT_INGEST_URL`/`OPS_EVENT_INGEST_TOKEN` are set (currently unset, same as `RCLONE_REMOTE`) — plus a local `mail` fallback if `BACKUP_ALERT_EMAIL` is set. A `trap ... ERR` guarantees `notify_failure` fires on any command failure, not just checked ones |
| **Restore path** | Documented, manual: `sha256sum -c` first, then `gzip -dc database.sql.gz \| mysql ...` and `tar -xzf mutable-assets.tar.gz`. The doc's own words: "every restore must be tested first against a temporary database and directory" |
| **Concurrency safety** | `flock` (if available) prevents two overlapping runs; gracefully degrades (a warning-free no-op) if `flock` isn't present |

**Real, independently re-run proof this phase** (§9 has the full
detail): both `verify-backup-integrity.sh` and `restore-test.sh` were
run **unmodified**, for real, against a freshly-produced backup of a
disposable, fully-migrated (56/56) database — not simulated, not
assumed working from reading the code alone.

## 2. Data classification

| Category | Classification | Notes |
|---|---|---|
| **DATABASE** (MySQL — all portal/financial/community/marketplace data) | `MUST_BACKUP` | The one category where loss is genuinely unrecoverable; already the best-covered category today |
| **APPLICATION_CONFIG** (env vars, `.env`-shaped runtime config) | `MUST_BACKUP`, but **never as plaintext secret values** — see §11. The non-secret shape (which vars exist, their non-secret values, deploy manifests) is worth preserving; the application *code* itself is `REBUILDABLE` from Git |
| **R2/MEDIA** (community/guild/launcher-studio/admin-content uploads, once activated) | `MUST_BACKUP` once real, but with a fundamentally different strategy than the DB — see §10. Today: `REBUILDABLE`-adjacent, since `PRODUCTION_MEDIA_MODE = UNKNOWN` (`RISKS.md` CF-R1) and no domain has R2 actually activated yet |
| **SECRETS** (SMTP/DB/JWT/payment-provider/service-auth credentials) | `EXTERNAL_PROVIDER_MANAGED` / recovery-by-reissue, **explicitly never bundled into normal backup archives** — see §11 |
| **LOGS** (`stderr.log`-style application logs) | `REBUILDABLE` — operationally useful for a short window, not a source of truth for anything that needs durable recovery. Not in scope for this backup architecture; if retention is ever wanted, that is Cloudflare's own Logpush/Observability story once the API moves, not this backup pipeline |
| **MAIL** (transactional email history, any human mailbox content) | `OUT_OF_SCOPE` for this document — `EMAIL_MIGRATION.md` owns the mail track entirely; this phase does not touch mail infrastructure or mailbox backup at all, matching that document's own scope boundary |
| **GAME DATA** (Windows VPS GameServer/SQL Server, `game-vps-backup-site-windows.ps1`) | `OUT_OF_SCOPE` — the Windows VPS is out of scope for this entire Cloudflare migration program (`README.md`'s own constraint, unchanged). Noted only for completeness: that script is a local-only, no-offsite-copy site-file archiver, unrelated to this document's architecture and not evaluated further here |
| **Cloudflare D1** (Game Data Platform: `request_nonce`, `event_dedupe`, etc.) | `EXTERNAL_PROVIDER_MANAGED` — Cloudflare's own D1 durability applies; this program has never proposed D1 for financial data and doesn't start now. Out of scope for this document |

## 3. Off-host target options — compared, not assumed

| Target | Durability | Restore speed | Cost | Automation | Encryption | Vendor independence | Ransomware/operator-risk | Retention control |
|---|---|---|---|---|---|---|---|---|
| **A. Private Cloudflare R2 bucket** | High (Cloudflare's own object durability); no egress fee, which specifically matters for a full-restore download | Fast (same infrastructure family the future web/API may already sit behind) | Low at this project's real volume (storage-only pricing, no egress) — matches `R2_ASSETS.md`'s own cost framing (no invented monthly figures) | Already has a working upload path today (`rclone`'s S3-compatible target support covers R2 directly) — this program's own `R2StorageProvider`/`wrangler` tooling is proven, reusable | Must be applied **before** upload — R2 itself doesn't encrypt backup *content* for you (it encrypts at rest as a platform feature, but that protects against Cloudflare-side disk loss, not against a compromised R2 credential reading your backups in the clear) | **Real coupling risk**: if the future architecture is Cloudflare-heavy (Workers/Containers/R2 for media), an R2-only backup destination means one compromised Cloudflare account credential threatens both the live app *and* its backups — mitigated, not eliminated, by object lock (below) and a distinct, narrowly-scoped API token | R2 has native Object Lifecycle Management (expire-after-N-days, Standard→Infrequent Access transitions, per-prefix rules, max 1000 rules) — confirmed current (2026) capability, not assumed |
| **B. External MySQL vendor's native automated backups/PITR** | Very high for the *database* specifically — this is the vendor's own core competency (Google Cloud SQL, Azure Database for MySQL, AWS RDS all include automated backups + point-in-time recovery as a standard managed feature) | Fastest possible for DB-only recovery — no manual dump/restore cycle | Bundled into the vendor's own pricing, not a separate line item | Fully automated by the vendor, zero custom scripting to maintain | Vendor-managed at rest; some (AWS RDS, GCP Cloud SQL) support customer-managed encryption keys | **Low** — this is the *one* target genuinely independent of Cloudflare entirely, a real hedge against a Cloudflare-account-level incident | Real protection against accidental deletion/corruption on the primary; does **not** protect against the vendor account itself being compromised (a distinct credential to protect) | Vendor-defined retention windows (typically 7-35 days for PITR); rarely offers indefinite monthly/yearly retention without extra configuration |
| **C. Bryan-controlled VPS/object storage** | Depends entirely on that VPS's own reliability — a real single point of failure unless it itself has redundancy | Depends on that VPS's network path | Real infrastructure cost Bryan bears directly | Needs the same self-managed script (`cpanel-production-backup.sh` + `rclone`) — no less maintenance burden than today, just a different destination | Fully under Bryan's own control, easiest to align with a specific compliance/preference | Highest — entirely outside any third-party vendor | Depends on how that VPS itself is secured; a single compromised VPS credential threatens the only off-host copy if this were the *only* target | Fully Bryan-controlled, most flexible, but also fully Bryan-*maintained* |
| **D. Dual-copy strategy (combine two of the above)** | Highest — no single provider/account compromise or outage can destroy every copy | Depends on which copy is used for the actual restore | Sum of whichever two targets are chosen — real but modest at this project's volume | Requires two automated paths instead of one, more to maintain but each individually simple | Each copy encrypted independently — a real advantage, not just belt-and-suspenders | Highest of any single-target option — this is the actual mitigation for R2's "same-vendor" coupling risk above | The strongest available mitigation against ransomware/operator-risk: an attacker (or a mistaken operator) would need to compromise **two** independent systems, not one | Each target's own retention policy applies independently |

## 4. Recommended architecture — verified against current architecture, not assumed

The brief's own expected direction is **evaluated, not blindly adopted**:

- **PRIMARY DB BACKUP: future DB vendor automated snapshots/PITR** —
  **confirmed appropriate**, once a vendor is actually chosen
  (`DATABASE_MIGRATION.md`, still undecided). This is real, already-
  built vendor functionality for the three managed candidates
  (Google Cloud SQL, Azure Database for MySQL, AWS RDS); it does
  **not** apply to the self-hosted-VPS candidate, which would need
  this document's own SECONDARY-layer method as its *only* method
  (worth flagging as a real trade-off of that vendor choice, not
  previously stated this explicitly anywhere in `DATABASE_MIGRATION.md`).
- **SECONDARY INDEPENDENT COPY: encrypted logical dump to a private R2
  bucket** — **confirmed appropriate**, and crucially **already
  mechanically proven this phase** (§9): the exact `mysqldump`/
  `gzip`/`SHA256SUMS`/manifest shape this project already produces
  restores cleanly via its own existing, unmodified tooling. Adding
  encryption (§6) and an R2 destination via the already-present
  `RCLONE_REMOTE` mechanism is the only real gap, not a redesign.
- **APPLICATION/CONFIG: versioned encrypted archive to private R2** —
  **confirmed appropriate**, small addition to the same pipeline —
  the non-secret config shape (which variables exist, deploy
  manifests, this document itself) is worth a small versioned archive
  alongside the DB dump; genuinely low effort given the DB path
  already exists.
- **MEDIA: R2-native copy/versioning/lifecycle rather than
  re-uploading everything** — **confirmed appropriate, and the
  correct call**, not assumed: once community/guild/launcher/
  admin-content media is actually R2-activated (`RISKS.md` CF-R1,
  still `UNKNOWN`/not activated anywhere real), that media **already
  lives in a durable, versioned-key object store** per `R2_ASSETS.md`'s
  own object-key policy (immutable/versioned keys, established
  `CF-R2-02`). Treating this as "already backed up by construction,"
  with only a periodic cross-check (checksum manifest, §10), is
  correct — duplicating every media object into a second bucket
  wholesale would be real, unnecessary cost with no corresponding
  durability gain over R2's own object durability, unless the
  ransomware/operator-risk case specifically justifies it (§10 weighs
  this directly, doesn't assume it away).

**This is a layered, not single-target, architecture — matching
option D's dual-copy principle at the database layer specifically**
(vendor PITR + an independent encrypted dump), while media leans on
R2's own durability plus a lightweight verification layer rather than
a second full copy.

## 5. R2 backup bucket — created and validated for real (`CF-BACKUP-02`)

**Update, `CF-BACKUP-02` (2026-09-24)**: created for real, under
explicit authorization ("Create ONE private NON-PRODUCTION R2 backup
bucket," Bryan's own brief) — no longer design-only.

- **Real bucket**: `bloodmoon-backups-private`, created via
  `wrangler r2 bucket create`. **Confirmed private** via direct
  Cloudflare API checks (not assumed from the dashboard UI alone):
  the bucket's own metadata carries no public-access fields, and the
  managed `r2.dev` domain endpoint explicitly returns `"enabled": false`.
  No custom domain was ever created. Never reuses the public asset
  bucket (`bloodmoon-shadow-public-assets`), matching `R2_ASSETS.md`'s
  own private-media-model principle.
- **Real prefix layout, exercised for real**:
  ```
  database/<YYYY>/<MM>/<DD>/<timestamp>-mysql.sql.gz.age
  database/<YYYY>/<MM>/<DD>/<timestamp>-mutable-assets.tar.gz.age
  application/<YYYY>/<MM>/<DD>/<timestamp>-config-manifest.tar.gz.age
  manifests/<timestamp>-manifest.json
  ```
  (The manifest itself is the one object left unencrypted — by design,
  since it contains no secrets, only checksums/keys/sizes/validation
  results, matching §11's own requirement.)
- **Credentials**: the narrowest possible scope, per the brief's own
  instruction — an Account API token limited to `Object Read & Write`
  on `bloodmoon-backups-private` only (never account-wide), 24-hour
  TTL (auto-expiring, not `Forever`). **A real, honest finding from
  this phase**: the first token created was mis-transcribed while
  manually reading its value from a screenshot, producing a persistent
  `SignatureDoesNotMatch`/403 on every request including the simplest
  possible one (`HeadBucket`) — traced by testing a minimal request in
  isolation, then confirmed by recreating the token and copying the
  exact value via clipboard instead of visual transcription, which
  worked immediately. Both tokens are scoped/short-lived enough to be
  low-risk, but the working one (`cf-backup-02-v2`) and the unused,
  mis-copied one should both be treated as disposable — see the final
  report's credential-revocation guidance.

## 6. Encryption

**Requirement-by-requirement, not glossed over:**

- **Backup contents protected at rest**: encrypt *before* upload, not
  relying on R2's own platform-level at-rest encryption alone (that
  protects against Cloudflare-side disk loss, not against anyone who
  obtains the R2 read credential). Recommended tool: **`age`**
  (evaluated this phase, not assumed) — modern, Unix-pipe-native
  (composes directly with the existing `mysqldump | gzip` pipeline
  with one more stage: `| age -p`), meaningfully faster than GPG for
  large archives, supports passphrase-based symmetric encryption via
  `scrypt` key derivation, and has no legacy web-of-trust complexity
  to misconfigure. GPG remains a valid fallback if Bryan has an
  existing GPG-based operational preference, but `age` is the better
  technical fit for this exact pipeline shape.
- **Credentials not embedded in the archive**: already true today —
  confirmed via the existing script's own discipline (`DB_PASSWORD`
  unset immediately after the dump, never written to any output file)
  — the encryption key itself must follow the same rule: never placed
  inside the backup archive it protects, never committed to git,
  never logged.
- **Encryption key separate from the backup destination**: the `age`
  key (or passphrase) must **not** live in the same R2 bucket as the
  backups it protects — store it via a Cloudflare Worker secret
  binding (matching this program's existing convention, e.g.
  `BACKUP_ENCRYPTION_KEY` set via `wrangler secret put`, never a
  plaintext env file) or a password manager Bryan controls directly,
  never co-located with the encrypted objects.
- **Rotation possible**: `age`'s key model is a plain text keypair/
  passphrase, trivially rotatable — re-encrypt going forward with a
  new key, keep the old key only long enough to decrypt anything
  still under retention that was encrypted with it (a real, documented
  transition window, not an instant cutover).
- **Restore process documented**: `age -d` decrypts to stdout,
  composing with the existing `gzip -dc | mysql` restore pipeline
  exactly as cleanly as encryption composed with the dump pipeline —
  no architecture change to the proven restore path, just one
  additional pipe stage.

**Update, `CF-BACKUP-02` (2026-09-24) — proven for real**: a full
encrypt → upload → download → decrypt round-trip was executed against
the real `bloodmoon-backups-private` bucket, for both the database
dump and the mutable-asset archive, using the official `age-encryption`
npm package (`FiloSottile/typage`, the same project/maintainer as the
`age` CLI — used because no `age` binary was available on the Windows
machine this phase ran on; the cryptographic mechanism, passphrase/
scrypt-based symmetric encryption, is identical either way). Every
checksum matched at every stage: plaintext SHA-256 before encryption,
ciphertext SHA-256 after encryption *and* after the R2 round-trip, and
the re-decrypted plaintext SHA-256 matched the original exactly. The
passphrase was generated locally (32 random bytes), held in a
scratchpad file never uploaded/committed/logged, and deleted as part
of this phase's own cleanup (§13) once validation was complete — the
R2 test objects it protected are now permanently opaque ciphertext,
which is fine since they were never meant as a durable real backup,
only proof. A real, production-shaped script implementing this same
pipeline (`deploy/scripts/age-encrypt-backup.sh`) now exists in the
repo, isolated and **not wired into production cron** — its exact
`age`-CLI invocation syntax is a documented, explicit gap (untested,
since this phase's proof used the npm package, not the CLI) to verify
before real use, stated plainly in the script's own header comment,
not glossed over.

## 7. Retention

Practical, three-tier scheme (already recommended in the current
doc's prose — this phase makes it R2-lifecycle-enforceable, not just
written guidance):

| Tier | Local (unchanged) | Off-host (R2, proposed) |
|---|---|---|
| Daily | 3 days (`LOCAL_RETENTION_DAYS`, unchanged) | 7 days |
| Weekly | none locally | 4 weeks (one run/week retained) |
| Monthly | none locally | 6 months (one run/month retained) |

**Lifecycle cleanup**: R2's native Object Lifecycle Management
(confirmed current 2026 capability, §3) can enforce the `database/`
and `application/` prefixes' expiration directly — an expire-after-N-
days rule per tier-appropriate prefix, so backups don't grow forever
without a separate cleanup script to maintain. **Not implemented this
phase** — this is the retention *design*, ready to configure once a
real bucket exists under explicit authorization.

## 8. Backup validation — what "valid" actually requires

Per the brief's own framing, upload success alone is not validity.
Full proof chain, each step **already has a real mechanism** (proven
or designed):

| Step | Status |
|---|---|
| Archive created | **Proven** — real `mysqldump`/`gzip`/`tar`, `CF-BACKUP-01` and re-proven `CF-BACKUP-02` |
| Checksum generated | **Proven** — `SHA256SUMS`, real |
| Encrypted | **Proven, `CF-BACKUP-02`** — real `age` passphrase encryption, both the database dump and the asset archive |
| Upload successful | **Proven, `CF-BACKUP-02`** — real `PutObjectCommand` against the real `bloodmoon-backups-private` bucket |
| Remote object size/hash validated | **Proven, `CF-BACKUP-02`** — a real `HeadObjectCommand` post-upload check, comparing remote `ContentLength` and a custom `sha256` object-metadata field against the local values; exact match for every uploaded object |
| Download works | **Proven, `CF-BACKUP-02`** — real `GetObjectCommand` into a clean directory, independent of the upload step |
| Decryption works | **Proven, `CF-BACKUP-02`** — real `age` decryption using the separately-held passphrase; decrypted plaintext SHA-256 matched the pre-encryption original exactly |
| Restore works | **Proven** — `CF-BACKUP-01` (local shape) and **`CF-BACKUP-02`** (the full encrypted-round-trip artifact), both via the real, unmodified `restore-test.sh` |
| Prisma/database checks pass | **Proven, `CF-BACKUP-02`** — a real `PrismaClient` connected to the restored database and read back the correct account count and migration count |

**Every step in this chain is now real, proven evidence, not design** — `CF-BACKUP-02` closed every gap this section previously listed as pending.

## 9. MySQL restore — real proof, twice over

**Update, `CF-BACKUP-02` (2026-09-24)**: the local-only proof below
(`CF-BACKUP-01`) has now been repeated end-to-end **through the full
encrypted off-host round-trip** — a fresh disposable source database,
representative financial rows (`Account` + `WalletLedgerEntry`, with
real unique/foreign-key constraints), the exact backup shape,
`age`-encrypted, uploaded to the real `bloodmoon-backups-private`
bucket, downloaded into a clean directory, decrypted, and restored
into a **second, independent** disposable target via the same real,
unmodified `restore-test.sh` — 142 tables, 56/56 migrations, both
synthetic accounts and both ledger entries present with correct
values. The `UNIQUE` constraint on `idempotencyKey` and the `FOREIGN
KEY` on `accountId` were both **actively tested, not just inspected**:
a duplicate-key insert and an FK-violating insert were both attempted
and both correctly rejected by MySQL (`1062`, `1452`) on the restored
schema. A real `PrismaClient` connected afterward and read back the
correct counts. Full detail in this section's own steps below remains
the `CF-BACKUP-01` local-only version; this update records that the
identical chain now has a second, independent, off-host-inclusive
proof on top of it.

**Original, local-only proof (`CF-BACKUP-01`) — executed for real**,
reusing the existing proven methodology, not a new script:

1. Disposable source MySQL 8.0.46 instance created (own data dir,
   port, throwaway credentials), all 56 current migrations applied
   cleanly (`prisma migrate deploy`).
2. Two synthetic `Account` rows inserted (never real/production data)
   so the restore proof covers real row-level content, not just an
   empty schema.
3. **The exact `mysqldump` command `cpanel-production-backup.sh` uses**
   run against this disposable source (`--single-transaction --quick
   --skip-routines --skip-triggers --skip-events --hex-blob
   --default-character-set=utf8mb4`), piped to `gzip -9`, matching the
   script's own output shape exactly. **Note on fidelity**: the real
   script's DATABASE_URL-parsing step depends on `python3`, unavailable
   on this Windows validation machine (present on the real cPanel
   host) — this one step was reproduced by hand with the equivalent
   `mysqldump` invocation; every other artifact (`SHA256SUMS`,
   `manifest.txt`, the mutable-asset `tar.gz`) was produced in the
   exact format the real script emits.
4. **`deploy/scripts/verify-backup-integrity.sh` run unmodified**:
   5/5 checks passed (`SHA256SUMS`, gzip readability, real-dump-header
   sniff, tar readability, manifest fields).
5. A second, independent disposable MySQL 8.0.46 instance created as
   the restore target (`bloodmoon_restore_test_20260924`, matching
   the script's own required test-name-prefix guard).
6. **`deploy/scripts/restore-test.sh` run unmodified**: re-verified
   integrity, restored the dump, confirmed **142 tables** present
   (matching this program's known table count exactly, `CF-DB-01`/
   `CF-INTEGRATION-02`).
7. **Independently re-confirmed with real `COUNT(*)` queries** (not
   trusting `restore-test.sh`'s own summary alone, which uses
   `information_schema.tables.table_rows` — a known InnoDB
   *estimate*, not an exact count, and did print a misleadingly low
   number for `_prisma_migrations` for exactly that reason): real
   count was **56/56 migrations**, **2/2 synthetic accounts**, both
   with fully correct field values. This distinction — the script's
   own summary output being an estimate vs. the real exact count — is
   worth fixing in a future small polish to `restore-test.sh` itself
   (use `SELECT COUNT(*)` instead of `information_schema.tables.table_rows`
   for at least the headline number), noted here, not fixed this
   phase (out of scope for a design/validation pass).
8. Both disposable instances and all scratch files fully torn down
   after — zero residue, confirmed.

**What this proves**: the restore *chain* — dump → integrity check →
off-host-shaped artifact → restore → verify — works correctly, using
the project's own real tooling, unmodified. **What this does not yet
prove**: the encryption leg (§6, not implemented) and a real R2
upload/download round-trip (§5, no bucket created this phase) — both
remain real, scoped, and fairly small follow-up work.

## 10. R2 media backup strategy

Verified against the actual current architecture (`R2_ASSETS.md`),
not assumed:

- **Versioning**: not a separate feature to add — the object-key
  policy already established (`CF-R2-02`) makes ordinary uploads
  immutable/content-addressed by construction (a "replace" is always
  a new key, never an overwrite of a live public key). This already
  gives media a durability property closer to "versioned" than a
  traditional mutable-file backup target ever has.
- **Second bucket for media specifically**: **not recommended by
  default** — duplicating potentially large media volume into a
  second bucket has a real, ongoing storage cost with limited
  marginal durability gain over R2's own object durability, *unless*
  the ransomware/operator-risk scenario specifically justifies it
  (a compromised R2 API credential with delete permission could still
  delete "immutable" keys — object immutability by convention is not
  the same as R2 Bucket Locks, which are a real, available mitigation
  worth considering for the media bucket specifically, not evaluated
  in depth this phase since no media bucket is production-activated
  yet).
- **Cross-provider backup**: not recommended at this phase — genuine
  cost without a concrete threat model justifying it yet; revisit once
  real media volume and real activation exist (`RISKS.md` CF-R1 is
  still `UNKNOWN`/not activated).
- **Periodic inventory/checksum manifest**: **recommended, low-cost,
  real value** — a lightweight, scheduled job (could run alongside the
  DB backup job) that lists the media bucket's object keys + ETags and
  writes that manifest into the `manifests/` prefix of the *backup*
  bucket (§5). This is cheap (list-only, no data transfer), gives a
  real point-in-time record to detect unexpected deletion, and is the
  proportionate response — not a full duplicate copy — matching the
  brief's own "do not blindly duplicate all data without cost/benefit
  analysis" instruction.

## 11. Secrets recovery strategy

**Never included in normal app backup archives** — already true today
(§1), and this design keeps it that way explicitly:

| Secret category | Recovery approach |
|---|---|
| Cloudflare secrets (`wrangler secret put` values: `JWT_ACCESS_SECRET`, `DATABASE_URL`, etc.) | Not backed up as data — recovery is **re-issuance**: rotate/regenerate and re-set via `wrangler secret put`, following this program's existing credential-rotation discipline (map every real consumer first, `bloodmoon-deploy` skill Phase 8). Document *which secrets exist and where they're consumed* (already effectively done — `RISKS.md`/`CURRENT_STATE.md`'s env-var classification work), never their values |
| DB credentials | Same re-issuance model; the future external MySQL vendor's own credential-rotation mechanism applies once a vendor is chosen |
| SMTP credentials | Same — `EMAIL_MIGRATION.md` already documents the exact `SMTP_*` variable names (never values); recovery is re-obtaining credentials from whichever transactional-email provider is eventually chosen |
| Payment provider credentials (Asaas, Mercado Pago) | Explicitly out of this program's scope (`README.md`'s payments boundary, unchanged) — those credentials' recovery is the payment integration's own operational runbook, not this backup architecture |
| Service-auth credentials (Game Command Transport, GameBridge) | Same re-issuance model; out of scope for this document beyond noting the pattern applies uniformly |

**What IS worth backing up for secrets**: metadata and instructions —
which variables must exist, in which service, with what shape/format
requirements (already substantially captured across `RISKS.md`'s
env-var classification and `EMAIL_MIGRATION.md`'s SMTP inventory) —
never a plaintext value, ever.

## 12. Cron/scheduler exit — design only

Current: cPanel cron, `17 3 * * *`, invoking a script with real
filesystem access to the local MySQL socket and local storage paths.

| Option | Needs filesystem/DB access? | Fit for this pipeline |
|---|---|---|
| Cloudflare scheduled Worker (Cron Triggers) | No direct filesystem access to a Container's local disk between invocations (a Cron-Trigger Worker is a separate, stateless invocation) — but it **can** reach an *external* MySQL-compatible database directly (the same way the API itself would, post-migration) and read/write R2 directly | **Good fit for the database dump + R2 upload legs specifically**, once the database itself is external (Phase 5) — this is the natural long-term home for this job once `CURRENT_PROVIDER` no longer hosts the database at all |
| External CI scheduler (e.g. a scheduled GitHub Actions workflow) | Needs network-reachable DB credentials passed in as CI secrets — real, but adds a dependency on CI infrastructure staying available and correctly scoped | Viable middle-ground during the transition period, before Phase 5 is complete, if a scheduled job is wanted sooner than the Cloudflare-native path is ready |
| Future VPS cron | Needs a VPS to exist at all — only relevant if a self-hosted MySQL/general-purpose VPS ends up being the chosen database vendor (`DATABASE_MIGRATION.md`'s 5th candidate) | Only the right choice if that specific vendor path is chosen; otherwise adds an unnecessary VPS dependency this program has generally tried to avoid |
| Database-provider scheduler | The managed vendors' own PITR/snapshot automation (§4's primary layer) already **is** this, for the database specifically — no separate scheduler needed for that leg at all | Correct default for the primary DB-backup layer once a managed vendor is chosen; doesn't cover the *secondary* encrypted-dump-to-R2 leg, which still needs one of the options above |

**Recommended sequencing** (design only, matching this document's own
layered architecture): keep the current cPanel cron unchanged through
the transition (it's proven, it works, changing it early adds risk
for no benefit); move the secondary encrypted-dump-to-R2 leg to a
Cloudflare Cron Trigger once the database itself is external (natural
alignment with Phase 5/6); retire the cPanel cron job only as part of
Phase 8 (`CURRENT_PROVIDER = ZERO`), never before.

## 13. Failure alerting — mostly already built

Per §1's audit: `report_event()`/`OPS_EVENT_INGEST_URL`/
`OPS_EVENT_INGEST_TOKEN` already exist and already flow into the same
`SystemAlert`/`AlertDispatchService` pipeline every other operational
condition in this codebase uses (Phase AA, confirmed merged into
`main` — `CF-EXIT-01`'s own finding). **Success metadata**: the
existing `manifest.txt` (`created_at`, `host`, `database`) already is
this, per run. **Last successful backup timestamp**: derivable today
by listing the newest `daily/<timestamp>` directory locally, or the
newest off-host object once R2 is configured — not a new field to
invent, an existing property of the existing layout. **Restore-test
timestamp**: not currently recorded anywhere — a small, real,
worthwhile addition: have a scheduled (monthly, matching the doc's own
recommended cadence) restore-test run write a small
`restore-test-<timestamp>.json` result (pass/fail, table count, a
short summary) into the `metadata/` prefix (§5), and report failure
through the exact same `OPS_EVENT_INGEST_URL` mechanism the daily job
already uses — reusing infrastructure, not building a new monitoring
system, matching the brief's own explicit "do not build a huge
monitoring system" instruction.

## 14. Provider exit gate — three distinct states, not one

**Update, `CF-BACKUP-02` (2026-09-24)**: this phase's brief explicitly
asked these to be tracked as three separate, real states, not
collapsed into one — they answer different questions and shouldn't be
conflated:

```
ARCHITECTURE_READY = YES   -- the design is complete and verified against
                              current architecture (CF-BACKUP-01)
MECHANISM_PROVEN   = YES   -- the full chain (backup -> encrypt -> upload
                              -> remote-verify -> download -> decrypt ->
                              restore -> Prisma checks) has run for real,
                              twice (local-only CF-BACKUP-01, full
                              off-host round-trip CF-BACKUP-02)
PRODUCTION_WIRED    = NO   -- production cron and production backup
                              configuration remain completely untouched;
                              no real production backup has ever used
                              this mechanism
BACKUP_EXIT_READY   = NO   -- requires PRODUCTION_WIRED = YES, which
                              requires a real, separate, explicit
                              decision this phase does not make
```

Per the brief's own original criteria, current status against each:

| Criterion | Status |
|---|---|
| Off-host destination selected | **DONE, real** — `bloodmoon-backups-private`, created and validated this phase (§5). Still non-production/test-scoped; a real production bucket (or reuse of this one for production) is a separate, later decision |
| Automation designed | **DONE** (§4-§7, §12) — the underlying mechanism (`RCLONE_REMOTE`) already existed before `CF-BACKUP-01`, just unconfigured; a real, isolated, disabled-by-default script (`deploy/scripts/age-encrypt-backup.sh`) now exists implementing the proven pipeline |
| Restore verified | **DONE, real, twice** (§9) — local-only (`CF-BACKUP-01`) and now the full encrypted off-host round-trip (`CF-BACKUP-02`) |
| Retention defined | **DONE** (§7) — design confirmed technically feasible via a real, read-only check of the bucket's lifecycle API this phase; no rule enabled |
| Encryption defined | **DONE, real** (§6) — not just defined, actually implemented and proven end-to-end this phase |
| Provider-local backup no longer sole copy | **NOT DONE** — this remains true today exactly as `RISKS.md` CF-R26 originally found it; the *mechanism* to change this now exists and is proven, but production still has no off-host copy of anything, since none of this was wired into the real cron job |

## Status

`ARCHITECTURE_READY = YES`. `MECHANISM_PROVEN = YES`. `PRODUCTION_WIRED
= NO`. `BACKUP_EXIT_READY = NO` — the remaining gap is now genuinely
**operational, not architectural**: wiring the proven mechanism into
the real production cron job, a real, separate, explicit decision this
phase deliberately does not make or schedule. Real, concrete next
steps, none scheduled or executed here: verify `deploy/scripts/age-encrypt-backup.sh`'s
exact `age` CLI syntax against a real installed binary (the mechanism
is proven, this specific script's syntax is not); decide whether
`bloodmoon-backups-private` becomes the real production backup
destination or a new bucket is created for that purpose; configure
`RCLONE_REMOTE`/`OPS_EVENT_INGEST_URL` for real in production, only
once Bryan explicitly authorizes that specific step.
