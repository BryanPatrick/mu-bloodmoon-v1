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

## Phase CF-DNS-01 — DNS/domain inventory + cutover plan: **COMPLETE**

**Read-only throughout — no DNS record, nameserver, or provider was
touched or contacted.** Full findings in `DNS_AND_DOMAIN.md`.

- **Domain control matrix established**, four questions answered
  separately: ownership (Bryan Patrick dos Santos, confirmed via live
  public RDAP), registrar/DNS-zone/nameserver-level *access* (all
  three remain `UNKNOWN`, unconfirmed by any public or repo source).
- **Real discrepancy found**: the zone's own `NS` records
  (`ns1/ns2.srv41.hinetworks.com.br`) disagree with the registry's
  actual delegation (RDAP: `ns1/ns2.srv02.projectgamers.com.br`) —
  both resolve to the same IP. Recorded as `RISKS.md` CF-R20, not
  investigated further (would require contacting the provider).
- **Real domain-control gap found**: public RDAP lists a second
  entity (administrative + technical contact, registered since 2017)
  alongside Bryan's own registrant record — recorded as `RISKS.md`
  CF-R21, needs Bryan's direct knowledge to resolve, no contact made.
- **A third, real production web property found**:
  `update.mubloodmoon.com.br`, the launcher's self-update
  manifest/binary host — previously absent from every architecture
  diagram in this program despite being real, active, player-facing
  infrastructure. Now represented in `DNS_AND_DOMAIN.md` and
  `TARGET_ARCHITECTURE.md`'s all three states.
- **Full current DNS inventory**: A/AAAA/CNAME/NS/MX/TXT(SPF)/TXT(DKIM)/
  TXT(DMARC)/CAA, plus a swept check of 15 likely subdomains (mail,
  ftp, and update exist; webmail/autoconfig/cpanel/downloads/launcher/
  store/forum/discord etc. do not).
- **Email safety documented**: exact MX/SPF/DKIM/DMARC values that
  must be preserved byte-for-byte in any future Cloudflare zone before
  a nameserver cutover, plus a real coupling this phase identified —
  MX points at the bare domain (not a distinct mail host), so mail
  continuity depends on the same `A` record correctness as web/API.
- **Target Cloudflare DNS design, proxy policy (per-record
  PROXIED/DNS_ONLY/UNDECIDED), 10-step cutover strategy, 4 pre-transfer
  options, and a rollback plan** — all design-only, nothing created or
  activated.
- `MIGRATION_ROADMAP.md` Phase 7's entry criteria refined with this
  phase's specific findings (mail re-verification now an explicit exit
  criterion, not assumed).
- Production: **untouched** — no DNS record changed, no nameserver
  changed, no provider or registry contacted, no Cloudflare zone
  created or modified.

## Phase CF-MAIL-01 — email dependency audit + provider-exit plan: **COMPLETE**

**Read-only / planning only throughout — no MX, SPF, DKIM, or DMARC
record was changed; no DNS record was modified; no production
mailbox created/deleted; no production SMTP credential changed; no
email sent; no provider contacted.** Full findings in
`EMAIL_MIGRATION.md`.

- **Application email inventory, exhaustive**: exactly 3 real
  consumers of a single centralized `MailTransportService`
  (`nodemailer`-backed SMTP) — password reset
  (`auth.service.ts`), account-deletion confirmation
  (`account-deletion-request.service.ts`, Phase 15), and admin alerts
  (`email-alert-channel.ts`, Phase AA, opt-in via `ALERT_EMAIL_ENABLED`,
  default `false`). Confirmed via exhaustive grep: no registration/
  welcome email, no email-based 2FA (TOTP-only), no payment-
  notification email anywhere in `apps/api`. Both player-facing flows
  share an identical fail-open-to-the-caller design (a send failure is
  caught, audited, and never surfaces to the client — an anti-
  enumeration/security choice, not a robustness gap).
- **SMTP config inventory**: 9 `SMTP_*`/`ALERT_EMAIL_*` variable
  names mapped (no values read or exposed). Real gap found: the
  general `apps/api/.env.example` documents zero `SMTP_*` vars (only
  `deploy/.env.production.example` does) — recorded `RISKS.md` CF-R25,
  low priority, not fixed this phase (read-only audit).
- **`MAILBOX_INVENTORY = UNKNOWN`** — no document, config, or code
  anywhere in the repo lists a specific `@mubloodmoon.com.br` human
  mailbox address; not guessed. Recorded `RISKS.md` CF-R23.
- **Two problems explicitly separated**, per the brief's own
  instruction: application transactional email (fully inventoried,
  independent) vs. human/domain mailbox email (existence itself
  unconfirmed) — may migrate on separate timelines, to separate
  providers.
- **5-candidate transactional-provider shortlist** researched with
  current (2026-09-23) web-verified pricing/features: Amazon SES,
  Resend, Postmark, Brevo, Mailgun. **3-category mailbox-provider
  shortlist**: managed business email (Google/Microsoft), budget
  workspace (Zoho), forwarding-only (Cloudflare Email Routing). **No
  selection made for either**, per the brief's explicit instruction.
- **Cloudflare's email role clarified and verified** (not assumed):
  Cloudflare DNS can host MX/SPF/DKIM/DMARC; Cloudflare Email Routing
  is inbound-forward-only with **no outbound SMTP capability at all**
  — architecturally irrelevant to application transactional email in
  either direction. Recorded:
  `CLOUDFLARE_EMAIL_ROLE = DNS_HOSTING_PLUS_OPTIONAL_INBOUND_FORWARDING_ONLY`.
- **Target architecture + 12-step migration plan** designed
  (`EMAIL_MIGRATION.md` §8-9) — mail explicitly separated from web/API
  hosting in the target state; design only, not executed or scheduled.
- **Tied to the pre-existing Phase 17/19.3 blocker**
  (`docs/handoff/auth-recovery-provider-blocker.md`, still `BLOCKED`
  per `site-beta-checklist.md`): real end-to-end password-recovery
  delivery to an external mailbox has never been proven in production.
  This phase did not close that blocker (out of scope, read-only) but
  recorded exactly how a future transactional-provider migration's own
  shadow-proof step would close it. Recorded `RISKS.md` CF-R24.
  `PASSWORD_RECOVERY_EXTERNAL_MAIL_PROOF = NOT_YET_PROVEN` (pre-existing,
  unchanged).
- **`update.mubloodmoon.com.br` direction recorded** (unchanged,
  no DNS action): eventual migration toward Cloudflare/R2-based
  launcher update delivery remains direction only.
- `MIGRATION_ROADMAP.md` Phase 7's entry criteria updated: mail
  migration is confirmed **not** a Phase 7 prerequisite — it can
  proceed independently, on its own timeline, since a new
  transactional provider's SPF/DKIM can be added at the current DNS
  host before any nameserver cutover.
- Production: **untouched** — no DNS record changed, no mailbox
  created/deleted, no SMTP credential changed, no email sent, no
  provider contacted.

## Phase CF-EXIT-01 — provider dependency audit + exit checklist: **COMPLETE**

**Read-only throughout — no production touched, no DNS/email/database
changed, no file deleted, no service restarted, no provider contacted,
no payments enabled.** Full findings in `PROVIDER_EXIT_CHECKLIST.md`.

- **Major finding**: a concurrent, unmerged Codex worktree
  (`infra/cloudflare-api-container-poc`, `faee869e`, confirmed via
  `git merge-base` NOT an ancestor of `main`) contains real evidence
  that the Cloudflare Containers proof (`CF-API-02R`) has actually run
  — health/readiness, synthetic auth/TOTP, graceful shutdown,
  container-disk ephemerality, and a real disposable-MySQL 8
  financial-semantics proof (Serializable, `GET_LOCK`, unique-key
  idempotency, 55 migrations replayed) all passed. Consumed
  **read-only**, per the brief's explicit instruction — that worktree
  was not touched, not merged, not independently re-verified. This
  corrects a stale "proof not run" claim that had persisted across
  every prior phase's status reporting since `CF-01B`. Recorded:
  `API_CONTAINER_PROOF = SHADOW_PROVEN_ON_UNMERGED_BRANCH` (`RISKS.md`
  CF-R4, updated).
- A second candidate worktree (`infra/cloudflare-db-exit`, `2be35ade`)
  was checked and found to be **fully already contained** in this
  program's own chain (the exact `CF-DB-01` commit, `git merge-base`
  confirmed) — nothing new there, correctly not treated as a separate
  finding.
- **Full provider service inventory** (18 categories per the brief's
  checklist) classified current-provider-hosted vs. already-portable.
- **Hidden-dependency sweep**: zero hardcoded current-provider IPs or
  nameserver hostnames in any application code (`apps/`, `scripts/`);
  zero functional cPanel/Passenger/LSAPI branching in code (comments
  only); FTP alias provisioned but genuinely zero real usage anywhere.
  One real, new finding: the BloodMoon Launcher's compiled client
  hardcodes `api.mubloodmoon.com.br`/`update.mubloodmoon.com.br` as
  literal default strings — a domain-permanence consideration, not a
  provider dependency, not a blocker (`RISKS.md` CF-R27).
- **Environment variable audit**: the application's own config surface
  is already almost entirely provider-agnostic — every genuinely
  provider-coupled dependency lives in operational tooling (cron, File
  Manager, LSAPI, temporary Remote MySQL Access grants), not in `.env`
  values.
- **A real, previously under-scoped gap found**: no off-host backup
  destination is decided anywhere in this program — the backup
  *method* was proven (`CF-DB-01`) but not where backups live once the
  current provider is gone (`RISKS.md` CF-R26).
- **Genuinely new, out-of-scope discovery**: an already-committed,
  generic, provider-agnostic self-hosted VPS/Docker deploy path
  (`deploy/docker-compose.production.yml`, `deploy/nginx.bloodmoon.conf`,
  `deploy/HOSTINGER_CHECKLIST.md`) exists in the repo, unrelated to the
  Cloudflare target architecture — noted for completeness, not adopted
  or recommended.
- **8 final exit gates defined**: `WEB_EXIT_READY`/`API_EXIT_READY`/
  `STORAGE_EXIT_READY` = `PARTIAL`; `MAIL_EXIT_READY`/`DNS_EXIT_READY`/
  `UPDATE_EXIT_READY`/`BACKUP_EXIT_READY` = `NO`; `DB_EXIT_READY` =
  `PARTIAL` (method proven twice independently, vendor undecided).
  `CURRENT_PROVIDER_ZERO_READY = NO`.
- Production: **untouched** — no DNS, email, database, file, service,
  or provider contact of any kind this phase.

## Phase CF-BACKUP-01 — off-host backup architecture + recovery plan: **COMPLETE**

**Design and validation phase — no production migration.** No
production system touched, no existing backup deleted, no production
cron modified, no DNS/DB change, no secret exposed. Full detail:
`BACKUP_STRATEGY.md`.

- **Full audit of the existing backup implementation** (`bloodmoon-backup.sh`,
  `verify-backup-integrity.sh`, `restore-test.sh`,
  `CPANEL_BACKUP_AUTOMATION.md`) — a real correction to `CF-EXIT-01`'s
  own earlier claim: the backup script **already has** a working,
  provider-agnostic off-host copy mechanism (`RCLONE_REMOTE`, supports
  R2/S3/B2/other via `rclone`) and already-wired failure alerting into
  the Phase AA `/internal/ops-events` pipeline — both simply
  unconfigured in production, not absent from the code as previously
  stated.
- **Data classified** across 8 categories (`MUST_BACKUP`/`REBUILDABLE`/
  `EXTERNAL_PROVIDER_MANAGED`/`OUT_OF_SCOPE`) — mail and game data
  explicitly out of scope, matching `EMAIL_MIGRATION.md`'s and
  `README.md`'s own program boundaries.
- **4 off-host targets compared** (private R2, external MySQL vendor
  native PITR, Bryan-controlled VPS, dual-copy) across durability,
  restore speed, cost, automation, encryption, vendor independence,
  ransomware/operator-risk, and retention control — no target assumed
  blindly.
- **Layered architecture recommended, verified against the actual
  current architecture rather than assumed**: future DB-vendor
  PITR as primary, an encrypted logical dump to a private R2 bucket
  as an independent secondary copy, R2's own object-key immutability
  (already established `CF-R2-02`) as the media story rather than a
  costly full duplicate copy.
- **Real, end-to-end restore proof this phase** — not simulated: a
  fresh disposable MySQL 8.0.46 source database (56/56 migrations,
  2 synthetic accounts, never production data), a backup produced in
  the exact shape `cpanel-production-backup.sh` emits, then the
  project's own **real, unmodified** `verify-backup-integrity.sh`
  (5/5 checks passed) and `restore-test.sh` (142 tables restored) run
  against it, restoring into a second independent disposable instance.
  Independently re-confirmed with real `COUNT(*)` queries (56/56
  migrations, 2/2 accounts, correct field values) — catching that
  `restore-test.sh`'s own summary uses an InnoDB row-count *estimate*,
  not an exact count, a small future polish item noted, not fixed this
  phase. Both disposable instances and all scratch files fully torn
  down after, zero residue.
- **Encryption evaluated and designed**: `age` recommended over GPG
  for this exact shell-pipeline shape (faster on large archives,
  Unix-pipe-native, simpler key model) — not implemented this phase.
- **R2 backup bucket designed** (`bloodmoon-backups-private`, prefix
  layout, never reusing the public asset bucket) — **not created**,
  no explicit authorization existed for a new bucket this phase.
- **Retention, validation proof chain, media backup strategy, secrets
  recovery strategy, scheduler replacement, and failure-alerting
  design** all covered — each verified against what already exists
  rather than assumed from scratch; several pieces (failure alerting,
  the off-host copy mechanism itself) turned out to already be built,
  just unconfigured.
- **`BACKUP_EXIT_READY = NO`, unchanged** — this phase designs and
  partially validates, it does not execute a production migration.
  `RISKS.md` CF-R26 and `PROVIDER_EXIT_CHECKLIST.md` §6/§15 updated to
  reflect the new evidence.
- Production: **untouched** — no DNS, database, cron, or secret
  changed; no existing backup deleted; nothing pushed or merged.

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

## Phase 4 (API runtime) — **DECISION MADE (CF-01B)**, proof **SHADOW_PROVEN_ON_UNMERGED_BRANCH** (update `CF-EXIT-01`)

`API_INITIAL_MIGRATION_TARGET = CLOUDFLARE_CONTAINERS`,
`API_WORKERS_NATIVE = FUTURE_OPTIMIZATION` (`DECISIONS.md`,
`API_MIGRATION.md`). **Update, `CF-EXIT-01` (2026-09-23)**: this
section previously said the container proof "has not been run" —
**stale**. A concurrent, unmerged Codex branch
(`infra/cloudflare-api-container-poc`, tip `faee869e`, confirmed NOT
an ancestor of `main`) documents a real remote Container proof via
Cloudflare Workers Builds: health/readiness, synthetic auth/TOTP,
graceful shutdown, and container-disk ephemerality all passed, and the
database gate was closed for real against a disposable MySQL
8.0.46/8.4.11 instance (55 migrations, Serializable, `GET_LOCK`,
unique-key idempotency). Consumed **read-only** this phase, per the
brief's own instruction — this program did not touch that worktree,
did not merge it, and has not independently re-verified its results.
Full detail and exact classification: `PROVIDER_EXIT_CHECKLIST.md`.
Containers is **still not this program's own production-proven
result** and the Codex document itself states it is "not production
authorization" — but the prior "not yet run" framing materially
understates the real, evidenced state of the art as of 2026-09-23. The
Prisma-on-Workers question (`RISKS.md` CF-R3) remains deprioritized,
unaffected by this finding since it only matters for the
future-optimization native-Workers path.

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
(unchanged since). **Update, `CF-DNS-01` (2026-09-23)**: full DNS
inventory and cutover plan now exist (`DNS_AND_DOMAIN.md`); the
specific blocking gap is now precisely characterized — domain
ownership is confirmed as Bryan's, but registro.br/DNS-zone/
nameserver-level *access* remain unconfirmed, plus two new open
questions (a nameserver hostname discrepancy, and a second contact
entity on the public registry record) that need Bryan's direct
knowledge to resolve. **Update, `CF-MAIL-01` (2026-09-23)**: the full
mail-dependency audit (`EMAIL_MIGRATION.md`) confirms mail migration is
**not** an additional Phase 7 blocker — it is an independent,
separately-timed decision that can proceed before, during, or after
Phase 7 without changing this phase's own entry criteria.

## Phase 8 (remove current provider) — NOT STARTED

Depends on all preceding phases.

## Next recommended step

**Update, `CF-EXIT-01` (2026-09-23)**: `CF-API-02R` no longer has "zero
empirical proof behind it" — see the Phase 4 and Phase CF-EXIT-01
entries above. The single highest-leverage next step is now **a real
decision from Bryan on the unmerged Codex Container branch**
(`infra/cloudflare-api-container-poc`): review/adopt its findings,
independently re-verify them, or treat them as directional evidence
only — not assumed or recommended here, since that decision is
explicitly Bryan's to make, not this read-only phase's. In parallel,
`CF-DB-01` remains complete; the remaining database work is a real
vendor decision among the 5 shortlisted candidates (`CF-DB-01-REPORT.md`),
then a restore proof against that specific vendor (proven twice now as
a *method*, in two independent environments — the Codex branch's own
MySQL 8 proof is a second, independent data point, `RISKS.md` CF-R4).
The CORS addition (`RISKS.md` CF-R9) stays explicitly blocked pending
Bryan's authorization. Email (`CF-MAIL-01`, `EMAIL_MIGRATION.md`) is
fully audited and shortlisted but not on this critical path at all.
**Update, `CF-BACKUP-01` (2026-09-24)**: the off-host backup gap
(`RISKS.md` CF-R26) is now a fully designed, partially-real-proven
architecture (`BACKUP_STRATEGY.md`), not just a named gap — the
remaining work is concrete and scoped: create a private test R2
bucket under explicit authorization, wire `age` encryption into
`cpanel-production-backup.sh`, prove one real encrypted round-trip.
Still independent of the Container/database/DNS sequence above, and
still not on the critical path, but meaningfully closer to done.
