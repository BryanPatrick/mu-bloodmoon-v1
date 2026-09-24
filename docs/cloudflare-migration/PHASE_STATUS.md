---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# Phase status

## Phase CF-00/CF-01 — canonical docs + Nuxt shadow deployment: **COMPLETE**

- Canonical documentation set created (this folder, 15 files).
- Agent bootstrap rule added (`AGENTS.md`).
- Service inventory, three-state architecture, DNS/domain control
  facts recorded.
- Nuxt/Nitro Workers-compatibility audit: **COMPATIBLE overall**, no
  architecture-level blockers found.
- Cloudflare-target build: **PASS** (`npm run web:build:cloudflare`,
  dedicated branch `infra/cloudflare-web-shadow`, dedicated worktree).
- Local Workers runtime test (`wrangler dev`/Miniflare): **PASS** —
  home/login/register/recovery/reset/recharge/marketplace-disabled all
  render correctly; a real auth shadow test (register → login →
  protected nav → token refresh → logout) passed against a real local
  API and a disposable test account.
- Security headers/CSP (Phase 17R): **verified surviving** the
  Cloudflare runtime, both locally and on the live edge — identical
  header set, correct per-response CSP script hashes.
- Shadow Worker **deployed**: `bloodmoon-web-shadow`, no routes, no
  custom domain, live at
  `https://bloodmoon-web-shadow.bryanelrick22.workers.dev`.
- Production: **untouched** — no DNS, no deploy, no CORS change, no
  database change.

## Phase CF-01B — reconcile web + API Cloudflare findings: **COMPLETE**

- Read and spot-checked `docs/cloudflare-api-feasibility.md` (branch
  `infra/cloudflare-api-feasibility`, commit `f47f0b6d`) — a concurrent,
  independent investigation. Its code was **not** merged or adopted;
  only its documented, spot-checked findings were folded into the
  canonical docs.
- Canonical architecture decided and recorded (`DECISIONS.md`):
  Nuxt web → Workers, NestJS API → **Cloudflare Containers** (initial
  target; not yet proven — the container proof itself hasn't run),
  native Workers → `FUTURE_OPTIMIZATION` (not rejected), storage → R2
  (direction only), financial/core DB → external MySQL-compatible
  (vendor undecided, D1 excluded).
- Updated: `TARGET_ARCHITECTURE.md`, `API_MIGRATION.md`,
  `DATABASE_MIGRATION.md`, `R2_ASSETS.md`, `MIGRATION_ROADMAP.md`,
  `CURRENT_STATE.md`, `DECISIONS.md`, `RISKS.md`,
  `SERVICE_INVENTORY.md` (also fixed a pre-existing malformed table row
  in the MySQL service line, missing its "Production criticality"
  cell).
- `bloodmoon-web-shadow` **kept alive**, unchanged, per Bryan's
  instruction. Production CORS **not** changed
  (`SHADOW_PRODUCTION_API_CORS = BLOCKED_PENDING_BRYAN_AUTHORIZATION`).
- Canonical near-term sequence recorded: `CF-API-02R` (Container POC) →
  `CF-R2-01` (R2 inventory + shadow migration) → `CF-DB-01` (external
  MySQL options + disposable restore proof) → Container shadow
  deployment → database migration rehearsal → API shadow integration →
  DNS/cutover planning.
- Production: **untouched** — no DNS, no deploy, no CORS change, no
  database change, no container deployed.

## Phase CF-DB-01 — disposable MySQL restore proof + future database options: **COMPLETE**

- **`BACKUP_RESTORE_P1 = CLOSED`.** Full chain proven for real: the
  exact Phase 17R dump (checksum re-verified) restored into a wholly
  separate, disposable MySQL 8.0.46 instance (own data directory, own
  port, own throwaway credentials — the shared `MySQL80` service and
  `bloodmoon_local*` databases were never touched). 142 tables, 147
  foreign keys, 55 migrations, all matching the source exactly; one
  explained (not defective) row-count difference on `Account` from
  ongoing local dev activity since the dump was taken.
- `npx prisma migrate status`: **"Database schema is up to date!"**
  against the restored copy — zero migration drift.
- New script `apps/api/scripts/verify-disposable-restore-prisma.mjs`
  (refuses to run against anything non-loopback/production-looking):
  real Prisma client connect/read/write/unique-constraint/cleanup, 6/6
  checks passed.
- Financial semantics proven with real concurrency, not simulated:
  unique-key idempotency, Serializable transaction + rollback, a real
  6-way concurrent race for one unique key (exactly 1 winner), and real
  two-session `GET_LOCK`/`RELEASE_LOCK` mutual exclusion.
- Disposable instance fully torn down afterward — process stopped, data
  directory deleted, credentials deleted, zero residue anywhere.
- Vendor shortlist researched (5 candidates, current 2026 evidence, no
  selection made): Google Cloud SQL (`southamerica-east1`), Azure
  Database for MySQL Flexible Server (Brazil South), AWS RDS
  (`sa-east-1`), PlanetScale (São Paulo — **`GET_LOCK` not supported
  through Vitess, a real disqualifying gap unless locks are redesigned
  first**), and a self-hosted MySQL on a Bryan-controlled Vultr São
  Paulo VPS.
- `HYPERDRIVE_REQUIRED_NOW = NO` (unchanged — Containers doesn't need
  it).
- Full detail: `CF-DB-01-REPORT.md`. Updated:
  `DATABASE_MIGRATION.md`, `RISKS.md`, `SERVICE_INVENTORY.md`, this
  file.
- Production: **untouched** — no production DB access, no DNS, no
  payments, no CORS change.

## Phase CF-R2-01 — R2 inventory + shadow asset migration: **COMPLETE**

- Full storage inventory (16 rows) covering `apps/web/public/images`,
  `dev-references/{visual,game-assets,generated}`, all six
  `apps/api/storage/*` directories, marketplace exports, and
  bug-hunters attachments — classified against the canonical
  `PUBLIC_IMMUTABLE`/`PUBLIC_MUTABLE`/`USER_UPLOAD_PUBLIC`/
  `USER_UPLOAD_PRIVATE`/`LAUNCHER_DOWNLOAD`/`INTERNAL_PRIVATE`/
  `BACKUP_NEVER_PUBLIC`/`TEMPORARY_EPHEMERAL` classes. Two storage
  categories not previously catalogued (`launcher-assets`, admin-content
  `uploads`) were found and added; guild media was **corrected** — it
  has no `StorageProvider`/R2 code path at all, unlike the prior
  wording here implied. Full detail: `R2_ASSETS.md`.
- Existing R2 confirmed read-only first: exactly one bucket exists
  (`ai-knowledge-hub-storage`, Knowledge Hub's own, untouched).
- New non-production shadow bucket created:
  `bloodmoon-shadow-public-assets`, `r2.dev` public access enabled
  (test-only, no custom domain, no production DNS).
- **Shadow upload: 3162/3162 files, 113,050,475 bytes (~107.8 MB), 0
  permanently failed**, from `public/images/` +
  `dev-references/{visual,game-assets}` — deliberately excluding
  `dev-references/generated/`'s 7 literal draft files. Two real bugs
  found and fixed mid-phase (an invalid `--remote` flag for this
  workspace's pinned wrangler 3.114.17; a local memory-contention crash
  from running the upload concurrently with a Nuxt build) — full
  post-mortem in `R2_ASSETS.md`.
- Integrity verified: hash-sample matches (7 files total across the
  phase, all categories), correct content-types, real HTTP 404
  behavior, and a genuine **cache-staleness finding**: `r2.dev`'s edge
  cache can keep serving a stale response (including a missing
  `Cache-Control` header) for an overwritten key until purged or
  expired — a real operational consideration for any future production
  design, not a data-integrity problem (the underlying R2 object itself
  is correct, confirmed via direct API + hash).
- **Nuxt shadow integration test actually run** (not just analyzed):
  built the real Cloudflare Workers preset, ran it under local
  `wrangler dev`/Miniflare twice — once with today's real CSP
  (confirmed R2 images **blocked**, exact console errors captured),
  once with one origin added to `img-src` (confirmed R2 images **load**,
  zero console errors in a fresh tab, hydration unaffected, 404 handled
  gracefully). The CSP edit was reverted immediately after — **not
  applied to any deployed Worker**, matching the
  `SHADOW_PRODUCTION_API_CORS` prepared-diff pattern (`DECISIONS.md`).
- User media architecture classified: community media
  `ALREADY_R2_CAPABLE` (code exists, deploy mode still unconfirmed —
  `RISKS.md` CF-R1, unchanged); guild media, launcher-studio assets, and
  admin-content uploads all `REQUIRES_CHANGE` (no `StorageProvider`
  abstraction today).
- Private media model and launcher model: **design only**, no bucket
  created, no code written, no artifact uploaded.
- **Corrected stale documentation**: every canonical doc still claiming
  the Container POC needs local Docker/Podman/nerdctl as its only path
  has been corrected (`CURRENT_STATE.md`, `RISKS.md` CF-R4,
  `API_MIGRATION.md`) — the approved direction is **`CF-API-02R`**
  (Cloudflare remote build/Workers Builds), a naming change applied
  consistently across all canonical docs. No API implementation code
  was touched.
- Production: **untouched** — no DNS, no production asset URL change,
  no production DB access, no payments, no deployed Worker changed.

## Phase CF-R2-02 — R2 storage provider hardening + filesystem exit preparation: **COMPLETE**

- `R2StorageProvider` went from **zero test coverage** to 38 unit
  tests (mocked `S3Client`) — found and fixed a real, previously-latent
  bug: `publicUrl()` omitted the `available/` prefix `writeAvailable()`
  actually stores objects under, so the URL it returned never matched
  where the object really was. Added an optional `namespace` option so
  more than one media domain can safely share one bucket/credential set.
- Community media's provider-selection logic
  (`MediaStorageService.buildProvider()`) got its own first unit
  coverage (9 tests). Real end-to-end R2-mode validation (real upload/
  retrieve/replace/delete against a disposable DB) could not be run —
  no Docker in this environment and no R2 S3-compatible API
  credentials exist anywhere in it (a different credential type than
  the `wrangler` OAuth session used elsewhere in this program).
- **Guild media refactored onto the `StorageProvider` abstraction** —
  previously direct `node:fs` calls with zero abstraction (`R2_ASSETS.md`,
  `CF-R2-01`'s correction). New `GuildMediaStorageService`, its own
  independent `GUILD_MEDIA_STORAGE_PROVIDER` switch (default `local`,
  zero behavior change), R2 capable via the new namespace feature. 7
  new unit tests. Real e2e re-validation (`guilds.e2e-spec.ts`, 78
  tests) blocked by the same Docker-unavailable environment — confirmed
  this is pre-existing/environmental, not caused by this phase, by
  observing the *same, untouched* `community-media.e2e-spec.ts` fail
  identically. Type-check clean; all 111 unit tests across 12 suites
  pass.
- **Launcher-studio assets got a real R2 implementation** —
  `R2LauncherAssetStorageProvider` was a documented stub
  (`docs/assets/central-asset-library.md`) that unconditionally threw;
  now real, reusing `R2StorageProvider` under a `launcher-assets/`
  namespace. Activated via `LAUNCHER_MEDIA_STORAGE_PROVIDER` (default
  `local`, unchanged). 6 new unit tests.
- **Admin-content uploads audited, migration explicitly deferred** —
  `ReferenceAsset` is a much broader model than the one narrow
  `uploadImage()` write path (unique `localPath`, provenance fields for
  bulk imports/scrapers, dedup tracking); forcing just that one path
  onto `StorageProvider` would leave mixed, undiscriminated semantics
  across the model. Documented, not migrated — matches the brief's own
  "materially larger/coupled → defer" guidance.
- **Object key policy and cache policy recorded** (`R2_ASSETS.md`):
  immutable/versioned keys as the default going forward (direct
  response to `CF-R2-01`'s cache-staleness finding), mutable pointers
  as a documented, narrow exception with short/no-cache headers,
  private objects never publicly cacheable at all.
- **CSP applied and redeployed for real** — the `CF-R2-01`-tested
  single-origin `img-src` addition
  (`https://pub-a4bacc79c5864ae9bec74ece3b3b2a30.r2.dev`) was applied
  on the dedicated `infra/cloudflare-web-shadow` branch and the
  existing `bloodmoon-web-shadow` Worker **redeployed live** — verified
  against the real edge: correct CSP header, zero console errors,
  homepage renders fully, all Phase 17R security headers intact.
  Production untouched (separate branch, never merged).
- Private storage design: unchanged from `CF-R2-01`, still design-only
  — confirmed `R2StorageProvider` has no presigned-URL capability yet
  (new dependency needed when actually built).
- `PERSISTENT_FILESYSTEM_BLOCKERS = ["admin-content uploads"]` —
  everything else now has a real `StorageProvider`/R2 path, even though
  none is activated. `CONTAINER_STORAGE_READY = NO` until admin-content
  is resolved and at least community/guild/launcher are actually
  switched to `r2` somewhere real.
- `PRODUCTION_MEDIA_MODE = UNKNOWN` — read-only check only, no
  committed doc/config states the real value; matches every prior
  phase's finding (`RISKS.md` CF-R1, still open). A live check was
  judged disproportionate to set up this phase for one non-secret flag.
- Migration model documented (9 steps, copy-first, never delete
  originals without separate later authorization) — **not executed**.
- Production: **untouched** — no production media provider changed, no
  production file moved/deleted, no production DNS/DB/payments change.
  The one real deployment this phase touched
  (`bloodmoon-web-shadow`) remains non-production: no custom domain, no
  production hostname, no production traffic.

## Phase CF-R2-03 — admin-content storage audit + final persistent filesystem exit: **COMPLETE**

- **Full `ReferenceAsset` write-path audit** (every code path, not just
  `uploadImage()`): manual admin upload (`uploadImage()` — the only
  file-writing path), manual metadata registration/edit/archive
  (`createAsset`/`updateAsset`/`archiveAsset` — all metadata-only, no
  file I/O, confirmed by exhaustive grep for `unlink`/`rm`), the bulk
  import/scrape script (`scripts/import-prepared-data.mjs` — upserts
  metadata for 1220 already-committed static repo files under
  `references/game-assets/source-harvest/`, never writes a file
  itself), and 3 read-only consumers (`wiki.service.ts`,
  `launcher.service.ts`, `media.controller.ts`). Full table in
  `R2_ASSETS.md`.
- **Key architectural finding**: bulk-imported/scraped `ReferenceAsset`
  rows are not "user storage" — `publicPath` is `null` for effectively
  all of them (sampled the full 1220-asset plan), so their live display
  today falls back to the original third-party `sourceUrl`, not
  Blood Moon storage at all. They're a git-committed, read-only
  editorial archive, not a Container ephemeral-disk risk (same category
  as `apps/web/public/dev-references/`, `CF-R2-01`) — correctly out of
  scope for a `StorageProvider`/R2 migration.
- **`uploadImage()` refactored onto the `StorageProvider` abstraction** —
  new `AdminContentStorageService`, its own independent
  `ADMIN_CONTENT_STORAGE_PROVIDER` switch (default `local`, unchanged
  behavior), R2-capable under an `admin-content/` namespace, **R2 not
  the default anywhere**.
- **Two new, purely additive `ReferenceAsset` columns**
  (`storageProvider`, `storageKey`) — `NULL` on every pre-existing row
  (1537 in production as of 2026-07-16, `prisma/README.md`), no
  backfill, no destructive change. `localPath` keeps its
  `@@unique`/required role the bulk importer depends on; for new rows
  it's set to the real `StorageProvider` key, never a fabricated path
  — the "safe transition representation" the brief asked for.
  **Migration hand-authored** (`20260923090000_admin_content_storage_provider`,
  no live database available to auto-diff), validated via `prisma
  validate`/`format` only — **not applied or tested against any real
  database this phase.**
- 18 new unit tests, all pass (`admin-content-storage.service.spec.ts`
  ×7, `admin-content.service.spec.ts` ×11) — provider selection,
  storage-write-before-DB-write ordering, zero phantom records on
  storage failure, correct field population, no automatic dedup
  (matches the pre-existing model). `R2_LIVE_E2E = BLOCKED` — no
  S3-compatible R2 credentials exist in this environment (mocked
  `S3Client` only); did not block completion.
- **Filesystem re-audit, whole `apps/api/src`**: exactly two files
  write anything (`local-storage.provider.ts`,
  `launcher-asset-storage.ts`'s local implementation) — both are the
  designated local-mode `StorageProvider` implementations, not
  blockers. Every other `node:fs` usage found is read-only, loading
  git-committed static catalogs/snapshots. **`PERSISTENT_FILESYSTEM_BLOCKERS
  = []`.**
- **`CONTAINER_STORAGE_READY = YES`** (`CODE_READY = YES`,
  `PRODUCTION_ACTIVATED = NO` — no domain's `*_STORAGE_PROVIDER` is
  actually `r2` anywhere real, per the brief's explicit
  architecture-vs-activation distinction).
- 127 unit tests total across 14 suites pass; API build and type-check
  clean. `guilds.e2e-spec.ts`/`community-media.e2e-spec.ts`
  (`RISKS.md` CF-R16, pre-existing) and
  `launcher-remote-content-contract.e2e-spec.ts` plus the
  (pre-existing, zero-coverage) `uploadImage()` HTTP endpoint
  (new `RISKS.md` CF-R18) were **not run** — same Docker/
  `E2E_LOCAL_MYSQL_URL`-unavailable environment, not re-verified this
  phase since nothing about the environment changed.
- Production: **untouched** — no production media provider changed, no
  production file moved/deleted, no production DB touched (migration
  not applied anywhere), no production/live R2 credentials used.

## Phase CF-R2-04 — real storage E2E validation + Prisma migration proof: **COMPLETE**

- **Disposable MySQL 8.0.46** (same no-Docker methodology as `CF-DB-01`
  — a wholly separate local `mysqld` process, own data dir/port/
  credentials, shared `MySQL80` service never touched): `prisma migrate
  deploy` applied all 56 migrations cleanly including
  `20260923090000_admin_content_storage_provider`; `prisma migrate
  status` clean, zero drift; `DESCRIBE ReferenceAsset` confirmed both
  new columns exist exactly as designed; a simulated pre-existing row
  (no `storageProvider`/`storageKey`) inserted cleanly, proving
  backward compatibility for real. Instance fully torn down after.
- **Real disposable-DB E2E**: `community-media.e2e-spec.ts` 13/13
  (local), `guilds.e2e-spec.ts` 78/78 (local),
  `launcher-remote-content-contract.e2e-spec.ts` 9/9 (local). No
  dedicated admin-content e2e spec exists — added the smallest focused
  real-DB + real-R2 integration script instead (11/11, including a
  real forced-`P2002` DB-failure-after-storage-success proof and a
  real duplicate-upload proof).
- **Real, non-production R2 credentials**: Bryan created and provided
  a least-privilege, test-scoped API token (Object Read & Write,
  `bloodmoon-shadow-public-assets` only) in-conversation — never
  logged, never committed, never written to any file. Raw
  `R2StorageProvider` proof: 12/12 (upload, real HTTP retrieval,
  moderation move/restore, delete, real `AccessDenied`/auth-error
  paths). A reusable, credential-free version is now committed:
  `apps/api/scripts/verify-real-r2-storage-provider.mjs`.
- **All four domains proven against real R2**: launcher assets 9/9
  (synthetic artifact, real sha256 checksum, real UUID versioned key);
  community media 8/13 under `MEDIA_STORAGE_PROVIDER=r2` (5 failures
  are a test-harness gap, `RISKS.md` CF-R19, not a storage defect —
  independently re-proven working via direct `fetch()`); guild media
  77/78 under `GUILD_MEDIA_STORAGE_PROVIDER=r2` (same CF-R19 gap, 1
  assertion — a real emblem upload completed the full sharp
  resize/re-encode/R2-write/DB-update pipeline correctly).
- **Failure paths proven for real**: DB failure after a successful
  storage write leaves a recoverable orphan object and zero corrupt DB
  rows (the accepted "persist object → DB commit" tradeoff); duplicate
  uploads of identical content get independent keys/rows, no
  accidental collision, matching the documented no-dedup model.
- **Cleanup**: every test object across every prefix used this phase
  deleted, verified via an independent zero-count re-listing;
  CF-R2-01's `images/`/`dev-references/` shadow content independently
  re-confirmed present and unchanged. Disposable MySQL instance fully
  torn down.
- **`RISKS.md` CF-R16/CF-R17/CF-R18 closed** with real evidence (not
  just re-asserted); new `RISKS.md` CF-R19 opened for the genuinely
  new, low-severity test-portability finding (not fixed this phase,
  out of scope for a validation pass).
- **`CONTAINER_STORAGE_READY = YES`**, now real-evidence-backed rather
  than architecture-only.
- Production: **untouched** — no production database, media, DNS, or
  R2 credential used anywhere this phase. `PRODUCTION_ACTIVATED = NO`,
  unchanged.

## Phase CF-R2-05 — test portability cleanup (CF-R19): **COMPLETE**

- **Test-harness only, as scoped** — `RUNTIME_CODE_CHANGED = NO`,
  confirmed: every change is under `apps/api/test/`, nothing in
  `apps/api/src/` was touched.
- New shared helper `test/support/media-url-assertions.ts`:
  `expectMediaUrlShape()` asserts the *correct* URL shape for whichever
  provider is active (local-relative or a well-formed absolute R2 URL,
  never hardcoding one specific test bucket hostname) instead of
  assuming one shape always applies; `fetchMediaUrl()` dispatches a
  real `fetch()` for absolute URLs and the existing `supertest`
  app-request for relative ones (supertest cannot reach a different
  origin than the app it wraps — attempting to was exactly the
  `TypeError: Invalid URL` `CF-R19` diagnosed).
- Fixed all 5 previously-failing assertions: 1 hardcoded URL-shape
  regex in `community-media.e2e-spec.ts`, 4 `request().get(<dynamic
  URL>)` calls in the same file, and the 1 hardcoded URL-shape regex
  in `guilds.e2e-spec.ts`.
- The one local-directory-blocking failure-injection test
  (`community-media.e2e-spec.ts`) now branches by provider: local mode
  unchanged; R2 mode injects a real failure via a temporarily-invalid
  `R2_BUCKET` (the same genuine S3 error path `CF-R2-04` already
  proved) and asserts the safety property that actually holds for R2's
  real failure point (no row ever promoted to `READY`) rather than an
  implementation detail (`TEMPORARY` row must exist) that doesn't
  transfer, since R2's failure point is earlier in the pipeline than
  local mode's. A bug in this new assertion itself (an unscoped "any
  READY row for this user" query matching an *earlier* test's
  successful upload) was found and fixed during this phase's own local
  re-run, before ever claiming success.
- Re-used the still-valid test R2 API token from `CF-R2-04` (confirmed
  live via a `HeadBucketCommand` before use) rather than asking Bryan
  for a new one.
- **Full pass, both suites, both providers**: `community-media.e2e-spec.ts`
  13/13 local + 13/13 real R2; `guilds.e2e-spec.ts` 78/78 local + 78/78
  real R2. Disposable MySQL 8.0.46 (same no-Docker methodology, fully
  torn down after). All R2 test objects created this phase deleted,
  independently re-verified as zero-residue; `CF-R2-01`'s
  `images/`/`dev-references/` content re-confirmed unchanged.
- `RISKS.md` CF-R19 closed with full re-verification evidence.
- Production: **untouched** — no production database, media, DNS, or
  credential used anywhere this phase.

## Phase 1 (Nuxt web → Workers, production cutover) — NOT STARTED

Shadow deployment exists (see above); a real production cutover
(custom domain, then Phase 7's DNS work) is separate, unscheduled work.

## Phase 2 (static assets → R2) — SHADOW PROVEN (`CF-R2-01`), production cutover NOT STARTED

Full inventory plus a real, verified shadow copy of the
`PUBLIC_IMMUTABLE` subset (3162 files, ~107.8 MB, non-production
bucket) — see the `CF-R2-01` entry above and `R2_ASSETS.md`. No
production asset URL has been changed; Nuxt/the API still serve every
asset from their current source, unchanged. A real production cutover
(switching served URLs to R2, migrating real user uploads, closing the
CSP/cache-purge open items) is separate, unscheduled work.

## Phase 3 (Cloudflare edge in front of the legacy API) — NOT STARTED

No concrete need identified yet, per the phase's own entry criteria.

## Phase 4 (API runtime) — **DECISION MADE (CF-01B)**, proof **RUN AND RECONCILED (CF-INTEGRATION-02)**

`API_INITIAL_MIGRATION_TARGET = CLOUDFLARE_CONTAINERS`,
`API_WORKERS_NATIVE = FUTURE_OPTIMIZATION` (`DECISIONS.md`,
`API_MIGRATION.md`). **Update, `CF-INTEGRATION-02` (2026-09-23)**: the
container proof (`CF-API-02R`) has run for real, on a concurrent Codex
branch, and this program has now independently code-reviewed and
reconciled it with the completed storage/DB work — see the phase entry
below and `CLOUDFLARE_MIGRATION_CANDIDATE.md`. `CONTAINER_RUNTIME_PROVEN
= YES`. The Prisma-on-Workers question (`RISKS.md` CF-R3) remains
deprioritized, unaffected, since it only matters for the
future-optimization native-Workers path, not the chosen Containers path.

## Phase 5 (MySQL exit) — NOT STARTED, one entry-criteria item now closed

Requirements documented (`DATABASE_MIGRATION.md`) and now
**empirically proven**, not just asserted: Serializable isolation,
unique-key idempotency under real concurrency, and
`GET_LOCK`/`RELEASE_LOCK` mutual exclusion all confirmed working
against a real MySQL 8.0.46 instance restored from the project's own
dump (`CF-DB-01-REPORT.md`). The backup-restore P1
(`RISKS.md` CF-R5) is **CLOSED**. Vendor selection is still open — a
5-candidate shortlist exists (`CF-DB-01-REPORT.md`), none chosen.

## Phase 6 (API cutover) — NOT STARTED

Depends on Phases 4 and 5.

## Phase 7 (DNS/domain cutover) — NOT STARTED, blocked on control

`DNS_AND_DOMAIN.md`: registrar/DNS control is `PENDING_TRANSFER`,
currently non-Cloudflare, confirmed via a 2026-08-09 live audit
(unchanged since).

## Phase 8 (remove current provider) — NOT STARTED

Depends on all preceding phases.

## Phase CF-INTEGRATION-02 — Container + Storage/DB candidate reconciliation: **COMPLETE**

**`CLOUDFLARE_MIGRATION_CANDIDATE_READY = YES`. Does not authorize a
`main` merge or production deployment.** Full detail:
`CLOUDFLARE_MIGRATION_CANDIDATE.md`.

- Verified exact ancestry: `main`, this branch's own
  `infra/cloudflare-storage-db-integration` base (`456963d7`), and a
  concurrent Codex branch `infra/cloudflare-api-container-poc`
  (`faee869e`) all confirmed via `git merge-base` — a clean two-way
  fork from the same `main` commit, no shared history between the two
  source branches.
- **Reviewed the Codex branch's full diff against `main`** (25 files,
  2515 insertions) and classified every change — only 2 real
  `apps/api/src`/`prisma` changes exist (`app.enableShutdownHooks()`
  + explicit `'0.0.0.0'` bind; one additive Prisma `binaryTargets`
  entry), plus the Container image definition
  (`Dockerfile.cloudflare-poc`). Everything else is either POC-only
  scaffolding (deliberately not integrated) or documentation (cited,
  not merged).
- **Independently verified the Codex report's own cleanup claims**,
  not merely trusted: `git diff --name-status` confirmed the entire
  final `apps/api/src` tree has exactly one modified file and zero
  added/deleted files — no leftover validation harness, temporary
  endpoint, or secret anywhere.
- Created `infra/cloudflare-migration-candidate` from the storage/DB
  integration branch's tip, applied the 5 production-worthy files by
  hand (byte-verified against the source branch, not a `git merge`),
  committed as `6a1fb571`.
- **Prisma migration reconciliation**: confirmed 56 migrations exactly
  once (including `20260923090000_admin_content_storage_provider`,
  which postdates the Codex branch's own "55 canonical migrations"
  figure). Re-ran the full replay against a **third**, independent
  disposable MySQL 8.0.46 instance (own fresh data dir/port/
  credentials, fully torn down after): 56/56 applied, zero drift, 142
  tables, `ReferenceAsset`'s two new columns present exactly as
  designed, 6/6 real-Prisma-client checks
  (`verify-disposable-restore-prisma.mjs`).
- **Storage/Container reconciliation confirmed**: all four
  `*_STORAGE_PROVIDER` switches present and correctly named, still
  defaulting to `local`; the Container image builds the same
  `apps/api` source carrying all four `StorageProvider`/R2 code paths
  — the two tracks compose cleanly with zero code conflict.
- **Shutdown hooks retained and documented**: `app.enableShutdownHooks()`
  is not Container-specific — it's what makes `MailTransportService`'s
  and Prisma's existing shutdown hooks actually fire on `SIGTERM`,
  benefiting the *current* cPanel/LSAPI runtime's own graceful-reload
  procedure exactly as much as a future Container.
- **Billing PII boundary respected**: `payments/asaas-production-readiness`
  was not merged, referenced as code, or touched — its isolated crypto
  validation stays exactly where it was, a separate future decision.
- **Full candidate validation, all against this exact commit**: API
  build PASS, typecheck + 11 structure checks PASS, 127/127 unit
  tests, `prisma validate`/`format` clean, 56/56 migration replay,
  30/30 beta-critical e2e, 125/125 community e2e (including
  `community-media`), 87/87 guilds + launcher-content e2e — **375 real
  tests total**, plus a clean secret scan. Live Cloudflare redeployment
  of this exact candidate was **deliberately not attempted** (would
  consequentially replace Codex's own already-proven shadow deployment
  without fresh authorization) — reported as a real next-step decision
  for Bryan, not performed.
- Canonical docs updated with the combined evidence:
  `CURRENT_STATE.md`, `TARGET_ARCHITECTURE.md`, `API_MIGRATION.md`,
  `DATABASE_MIGRATION.md`, `R2_ASSETS.md`, `RISKS.md`, this file.
  **`PROVIDER_EXIT_CHECKLIST.md`, `DNS_AND_DOMAIN.md`, and
  `EMAIL_MIGRATION.md` do not exist on this branch's base** (they live
  on a separate, later doc-only branch chain —
  `infra/provider-exit-audit`/`infra/cloudflare-mail-exit`/
  `infra/cloudflare-dns-planning` — never asked to be reconciled with
  the Container/storage code tracks this phase; not fabricated here).
- Backup gap (`BACKUP_EXIT_READY = NO`) explicitly carried forward,
  not solved — recorded in `CLOUDFLARE_MIGRATION_CANDIDATE.md`'s own
  next-phase list.
- Production: **untouched** — no DNS, database, payments, or
  marketplace change; no push; no `main` merge; both source branches
  (`infra/cloudflare-storage-db-integration`, `infra/cloudflare-api-container-poc`)
  confirmed unchanged at their known tips throughout.

## Next recommended step

**Update, `CF-INTEGRATION-02` (2026-09-23)**: `CF-API-02R` no longer
has "zero empirical proof behind it" — see the Phase 4 and
`CF-INTEGRATION-02` entries above. The single highest-leverage next
step is now a real decision from Bryan on two independent axes: (1)
whether/how to validate `infra/cloudflare-migration-candidate` against
a *live* Cloudflare Container redeploy (this phase deliberately did
not attempt one), and (2) whether/when to plan a `main` merge — neither
performed or recommended by this read-only-in-spirit reconciliation
phase itself. In parallel, external MySQL vendor selection remains
fully actionable today, independent of either decision above, since
the restore/migration method is now proven three times, in three
independent environments (`DATABASE_MIGRATION.md`). The CORS addition
(`RISKS.md` CF-R9) stays explicitly blocked pending Bryan's
authorization, unchanged.
