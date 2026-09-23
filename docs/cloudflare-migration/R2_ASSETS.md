---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# R2 asset inventory + shadow migration record

Phase CF-01B's inventory pass (below, kept for history) was
**candidates only — nothing uploaded**. Phase `CF-R2-01` (this update,
2026-09-22) is the first real, verified shadow migration: a
non-production R2 bucket was created, a defined subset of
`PUBLIC_IMMUTABLE` assets was actually copied into it, and the copy was
integrity- and HTTP-verified. **No production URL changed. No source
file was moved or deleted.**

## Classification legend (canonical classes, this phase)

`PUBLIC_IMMUTABLE` (safe to cache forever, no privacy concern) ·
`PUBLIC_MUTABLE` (public, but content can change under the same name) ·
`USER_UPLOAD_PUBLIC` (player-submitted, publicly servable) ·
`USER_UPLOAD_PRIVATE` (must never be publicly enumerable/servable) ·
`LAUNCHER_DOWNLOAD` (versioned binary artifact) ·
`INTERNAL_PRIVATE` (admin/CMS-authored, not a "user upload" but not
public-safe by default either) · `BACKUP_NEVER_PUBLIC` ·
`TEMPORARY_EPHEMERAL` (moderation-workflow/quarantine state, not
permanent).

## Full inventory (this phase, source-verified)

| # | Source path | Approx size / count | Class | Mutable? | Currently served by | Target storage | Priority |
|---|---|---|---|---|---|---|---|
| 1 | `apps/web/public/images/` | 88 MB, 2781 files | `PUBLIC_IMMUTABLE`* | mostly no (*same-name files can change on redeploy — not content-hashed, so "immutable" is per-deploy, not per-file forever) | Nuxt static asset serving (Node today; Workers Assets under the Cloudflare preset) | R2 | HIGH — done this phase (shadow) |
| 2 | `apps/web/public/dev-references/visual/` | 16 MB, 32 files | `PUBLIC_IMMUTABLE` | no — individually catalogued, real wiki content (`apps/web/data/devReferenceAssets.ts`) | same | R2 | HIGH — done this phase (shadow) |
| 3 | `apps/web/public/dev-references/game-assets/` | 12 MB, 349 files | `PUBLIC_IMMUTABLE` | no — same manifest, sourced from `references/game-assets/{muonlinefanz/elf,socket-items}/manifest.json` outside `apps/web` | same | R2 | HIGH — done this phase (shadow) |
| 4 | `apps/web/public/dev-references/generated/` | 15 MB, 7 files | `PUBLIC_MUTABLE` | **yes — literal drafts.** Filenames/titles say "teste v1"/"teste v2" (e.g. `wind-set-bloodmoon-test-v1.png`), `library: 'Gerados e otimizados'`, notes describe comparison attempts | same | **not uploaded this phase, deliberately** | LOW — needs a human decision (keep as a permanent public category, or treat as scratch and exclude from any future CDN-cached bucket) before ever uploading |
| 5 | `apps/web/public/favicon.ico`/`.png`/`.svg` | KB range | `PUBLIC_IMMUTABLE` | no | same | R2 (included in the `images/` shadow upload's `favicon.png`; `.ico`/`.svg` not separately re-tested) | HIGH — largely done |
| 6 | Launcher download (`BloodMoonLauncher.zip`) | unknown — **not present in this checkout**, build artifact only | `LAUNCHER_DOWNLOAD` | yes, versioned | `/downloads/BloodMoonLauncher.zip` (stable URL, per `apps/web/public/downloads/README.md`) | R2 (design only, see `## Launcher model`) | MEDIUM — no artifact exists to migrate yet |
| 7 | Community media (`apps/api/storage/community-media/`) | empty in this checkout (`.gitkeep` only) — real volume lives on the production host | `USER_UPLOAD_PUBLIC` | yes (replace/delete via moderation) | `MediaStorageService` → `LocalStorageProvider` or `R2StorageProvider`, selected by `MEDIA_STORAGE_PROVIDER` | R2 (**code already supports it** — `apps/api/src/modules/media/storage/r2-storage.provider.ts`) | HIGH-VALUE, LOW-EFFORT — code exists; only the deploy flag + one-time data copy are open. **Not migrated this phase** (real user data, out of scope) |
| 8 | Guild media (`apps/api/storage/guild-media/`) | empty in this checkout | `USER_UPLOAD_PUBLIC` | yes | **corrected this phase** — `guilds-media.service.ts` writes directly via `node:fs/promises` to a hardcoded `GUILD_MEDIA_DIR`, with **no `StorageProvider` abstraction at all**. This is NOT "same pattern as community media" as previously documented here — it has no R2 code path today | R2 — requires new code (see `## User media architecture audit`) | MEDIUM — needs implementation work, not just a flag flip |
| 9 | Launcher-studio assets (`apps/api/storage/launcher-assets/`) | empty in this checkout | `INTERNAL_PRIVATE` (admin-authored launcher UI assets, served publicly but not user-submitted) | yes | `launcher-asset-media.controller.ts`, public `/media/launcher-assets/:fileName`, local-disk-only — **not previously catalogued in this document** | R2 — requires new code | LOW-MEDIUM — small admin-authored set, low churn expected |
| 10 | Admin-content uploads (`apps/api/storage/uploads/`) | empty in this checkout | `INTERNAL_PRIVATE` (admin-authored CMS/news images, no auth guard by design since content is meant public) | yes | `admin-content/media.controller.ts`, public `/media/:fileName`, filename-regex-validated, local-disk-only — **not previously catalogued in this document** | R2 — requires new code | LOW-MEDIUM |
| 11 | `media-quarantine` (`apps/api/storage/media-quarantine/`) | empty in this checkout | `TEMPORARY_EPHEMERAL` | yes, by design (moderation workflow) | `StorageProvider.writeQuarantine`/`deleteQuarantine` | R2 private prefix (design only) | LOW — short-lived by nature |
| 12 | `media-removed` (`apps/api/storage/media-removed/`) | empty in this checkout | `TEMPORARY_EPHEMERAL` (soft-deleted, recoverable) | yes | `StorageProvider.moveAvailableToRemoved`/`moveRemovedToAvailable` | R2 private prefix (design only) | LOW |
| 13 | Database backups (`bloodmoon-backup.sh` output) | unknown, lives on the cPanel host | `BACKUP_NEVER_PUBLIC` | append-only until pruned | cPanel filesystem + cron | **never the public shadow bucket** — a future private bucket, its own access control, if R2 is ever used for backups at all | N/A this phase — explicitly out of scope |
| 14 | Marketplace "exports" (`marketplace-admin.service.ts` `exportListings`) | N/A | N/A | N/A | generated JSON **in-memory, returned directly in the HTTP response, never persisted server-side** | no migration need — nothing to move | N/A |
| 15 | Bug-hunters attachments | N/A | N/A | N/A | `attachmentRef` is validated as an external `https://` URL only — **no local upload/screenshot storage exists** | no migration need | N/A |
| 16 | Existing R2 buckets (other projects) | — | N/A, not this program's data | — | Knowledge Hub's `ai-knowledge-hub-storage` | **stays exactly as-is, untouched, never mixed with Blood Moon data** | N/A |

\* See row 1's mutability caveat — filenames aren't content-hashed, so treat as "replaceable-on-deploy," not permanently immutable per file.

## R2 buckets

| Name | Purpose | Public | Created | Custom domain | Notes |
|---|---|---|---|---|---|
| `ai-knowledge-hub-storage` | Knowledge Hub's own storage (unrelated project) | unknown, not this program's concern | 2026-08-06T21:48:48.130Z | none observed | **Read-only confirmation only, this phase** (`wrangler r2 bucket list`) — never modified, never will be mixed with Blood Moon assets |
| `bloodmoon-shadow-public-assets` | **New, this phase.** Non-production shadow bucket for the `PUBLIC_IMMUTABLE` asset shadow-copy proof | yes — `r2.dev` public access explicitly enabled (`wrangler r2 bucket dev-url enable`) | 2026-09-22T21:07:23.191Z | **none** — `r2.dev` only, explicitly TEST ONLY, never a production delivery path (see below) | Clearly shadow/test-named per the brief's requirement. Contains only the approved `PUBLIC_IMMUTABLE` subset (`images/`, `dev-references/visual/`, `dev-references/game-assets/`) under matching key prefixes |

**`r2.dev` is TEST ONLY, never final production delivery.** It has no
SLA, no custom caching control beyond R2's own defaults, and Cloudflare
documents it as intended for development/testing. A real production
design would use either a custom domain bound to the bucket via a
Cloudflare-managed DNS zone, or a Worker route in front of the bucket
(neither requires exposing `r2.dev` in production) — **no production
DNS change was made or is proposed this phase.**

## Shadow upload — what was actually copied and verified

**Scope**: `apps/web/public/images/` (2781 files) +
`apps/web/public/dev-references/visual/` (32 files) +
`apps/web/public/dev-references/game-assets/` (349 files) = **3162
files, ~107.8 MB**, deliberately excluding `dev-references/generated/`'s
7 draft files (row 4 above).

**Method**: no native `wrangler r2 bucket sync`/bulk command exists in
any wrangler version tried (confirmed via `--help` on both `r2 object
put` and `r2 bucket`, on both 3.114.17 and 4.136.x). A custom Node
script drove the copy — `wrangler r2 object put` per file, key prefixes
`images/`, `dev-references/visual/`, `dev-references/game-assets/`
mirroring the source tree. **Two real bugs were found and fixed during
this phase's own execution, not just planned around**:

1. **`--remote` is a wrangler-4.x-only flag.** The initial 3-file
   sample test used a newer wrangler (4.136.x, resolved via a different
   `npx` context) with `--remote` explicitly required — without it,
   `object put`/`get` on 4.x silently operate against a local simulated
   bucket. But this monorepo *pins* wrangler `3.114.17` in
   `apps/game-data-worker` (`RISKS.md` CF-R8, pre-existing), which the
   actual bulk script resolves through — and **3.114.17 has no
   `--remote` flag at all** (confirmed via `--help`); passing it made
   every invocation fail argument parsing. This was root-caused only
   after ~700 files had already silently accumulated failures across
   two separate run attempts. Fixed by removing the flag entirely —
   3.114.17's *default* `object put`/`get` (no flags) already targets
   the real remote bucket, independently confirmed via a full
   upload → download → sha256 round-trip from a fresh shell.
2. **Concurrency=10 caused cascading failures after ~600-900 files** in
   two independent runs (0% → 100% failure rate, not gradual) —
   root-caused to **local memory contention**, not a Cloudflare rate
   limit: this phase's build-testing work (a memory-heavy Nuxt/Vite
   build, see below) running concurrently with the upload script
   caused a real `FATAL ERROR: JavaScript heap out of memory` crash in
   *both* processes simultaneously (confirmed via
   `Win32_OperatingSystem.FreePhysicalMemory` reading ~1.3 MB free out
   of 16 GB at the moment of failure, recovering to ~7-9 GB free once
   the concurrent build was stopped). Fixed by never running the build
   and the upload at the same time, lowering concurrency to 6, and
   adding automatic retry-with-backoff (4 attempts) for transient
   failures — the final clean run needed exactly 1 retry across all
   3162 files and had zero permanent failures.

**Final run result** (`bloodmoon-shadow-public-assets`, all objects
overwrite-safe/idempotent so the earlier partial/broken attempts left
no residue once this run completed): **3162/3162 files uploaded,
113,050,475 bytes (≈107.8 MB), 0 permanently failed, 1 transient retry
succeeded, completed in 2630.3s (~44 min) at concurrency 6.**

**Integrity verification**:
- A 3-file representative sample (`favicon.ico`, `favicon.png`,
  `hero-elfa-noria.png`) was uploaded, then **downloaded back and
  sha256-compared byte-for-byte identical** before the full run started.
- **Post-completion hash sample** (4 more files spanning all three
  source categories — `images/logo-bloodmoon.png`,
  `dev-references/visual/dark-lord/dark-master-set-0.jpeg`,
  `dev-references/game-assets/socket-items/original/divine-boots.jpg`,
  plus the original `favicon.png`): fetched live via the public
  `r2.dev` URL and **sha256-matched byte-for-byte** against the source
  files, confirming the *finished* bucket state, not just the 3-file
  pre-run sample.
- Content-Type confirmed correct per file extension via live HTTP
  response headers (`image/png`, `image/jpeg` observed directly).
- `Cache-Control: public,max-age=31536000,immutable` confirmed present
  via live HTTP response headers — **but see the cache-staleness
  finding below, a real caveat, not a clean pass**.
- 404 behavior confirmed: requesting a non-existent key returns a real
  HTTP 404 (`text/plain`, no crash, no wrong-content response).

**Cache-staleness finding (real, evidenced)**: `images/favicon.png`
(one of the original 3-file sample objects, first uploaded before
`Cache-Control` was even part of the script) still serves an HTTP
response via the public `r2.dev` URL with **no `Cache-Control` header
and a stale `Last-Modified` timestamp matching its original 2026-09-22
21:08:50 upload** — despite being overwritten multiple times since,
including by the final clean run, each time with the correct
`Cache-Control` header set. A file uploaded *only* once, exclusively by
the final clean run (`dev-references/game-assets/muonlinefanz/elf/original/ammunition-quivers/arrow-1.jpg`),
correctly shows `Cache-Control: public,max-age=31536000,immutable` and
a fresh `Last-Modified` matching the final run's completion time.
**Conclusion: Cloudflare's edge cache in front of `r2.dev` can continue
serving a stale cached HTTP response (headers and all) for a key after
the underlying R2 object has been overwritten**, until that edge cache
entry expires or is explicitly purged — object overwrite alone does not
guarantee the *public HTTP* response updates immediately. This matters
for any future production design: either use content-hashed/versioned
keys (a new object is a new URL, never previously cached) or plan an
explicit cache-purge step on every update to a stable key.
  only after the run's own completion summary was read).

## Nuxt shadow integration test (CSP, cache, hydration, 404) — RUN, both states proven

A throwaway diagnostic route (`apps/web/pages/cf-r2-shadow-test.vue`,
not linked from any navigation, **removed after this phase's testing,
never committed**) was built against the real Cloudflare Workers
preset and run under `wrangler dev`/Miniflare (the same method Phase
CF-01 used before ever deploying live) — not just read as source code.
Two full build-and-run cycles were done, isolated from each other:

**Cycle 1 — CSP unmodified (today's real production/shadow config)**:
the shared `buildCsp()` (`apps/web/server/utils/security-headers.ts`)
sets `img-src` to `'self'`, `data:`, and the API origin only. Loading
the test page produced three real browser console CSP-violation
errors, one per R2-referenced asset (`<img>` tag, CSS
`background-image`, and the intentionally-missing-key test), each
reading `"img-src 'self' data: http://localhost:3333"` with **"The
action has been blocked."** Confirms: **R2-hosted assets are blocked by
CSP exactly as currently configured**, no exceptions.

**Cycle 2 — one line added, tested, then reverted**: `img-src` was
temporarily extended with exactly one origin,
`https://pub-a4bacc79c5864ae9bec74ece3b3b2a30.r2.dev` — a narrow,
single-origin addition, never a wildcard, never
`unsafe-inline`/`unsafe-eval`, consistent with `SECURITY_MODEL.md`'s
"never weaken CSP broadly" rule. Rebuilt, re-run, tested in a **fresh
browser tab** (to rule out stale console history from Cycle 1):
- `Content-Security-Policy` response header confirmed via direct
  `curl -I`, showing the new origin present in `img-src`.
- Zero console errors, zero CSP violations, on the fresh tab.
- Direct JS evaluation of the live DOM:
  `{"imgComplete":true,"imgNaturalWidth":512,"img404Complete":true,"img404NaturalWidth":0,"bgImage":"url(\"https://pub-.../hero-elfa-noria.png\")"}`
  — the real `<img>` loaded real image data (512px, matching
  `favicon.png`'s actual dimensions); the intentionally-missing key
  resolved to a normal zero-width broken-image state, not a hang or
  crash; the CSS `background-image` property resolved to the correct
  R2 URL.
- Page text/hydration: the client-only reactive marker
  (`hydrated-client-value`) rendered correctly in both cycles, and site
  chrome (nav/footer) rendered normally in both — confirms Vue
  hydration and general Workers-runtime behavior are **unaffected** by
  either CSP state.

**The CSP edit was reverted immediately after Cycle 2's verification**
(`git status` confirmed zero diff on `security-headers.ts` afterward) —
**not applied to any deployed Worker, not committed**. This follows the
same prepared-diff-pending-authorization pattern already used for
`SHADOW_PRODUCTION_API_CORS` (`DECISIONS.md`, Phase CF-01B): the exact
required origin is now recorded and proven correct, but applying it to
a real deployment (even the existing shadow Worker) is a separate,
explicitly-authorized step this phase did not take.

**Not tested this phase**: mixed-content (both origins are HTTPS, so
this wasn't reachable as a real scenario locally); the live
`bloodmoon-web-shadow.bryanelrick22.workers.dev` deployment itself was
not redeployed or touched — this test ran entirely against a local
`wrangler dev` build, matching Phase CF-01's own precedent for
low-risk iteration before ever touching a real deployment.

## User media architecture audit

| Storage area | Classification | Evidence |
|---|---|---|
| Community media | `ALREADY_R2_CAPABLE` | `MediaStorageService.buildProvider()` switches on `MEDIA_STORAGE_PROVIDER` (`local`/`r2`); `R2StorageProvider` uses `@aws-sdk/client-s3`'s `S3Client` against R2's S3-compatible endpoint. **Which mode production actually runs is still unconfirmed** (`RISKS.md` CF-R1, unchanged this phase) |
| Guild media | `REQUIRES_CHANGE` | **Corrected this phase.** `guilds-media.service.ts` has zero `StorageProvider` usage — direct `node:fs/promises` calls to a hardcoded local dir, plus direct `sharp` calls for EMBLEM (512×512) / BANNER (1600×480) processing. Moving to R2 means adapting this service to the existing `StorageProvider` interface, not just flipping an env var |
| Launcher-studio assets | `REQUIRES_CHANGE` | Local-disk-only (`launcher-asset-storage.ts`), no `StorageProvider` usage, **not previously catalogued in this document at all** |
| Admin-content uploads | `REQUIRES_CHANGE` | Local-disk-only (`admin-content.service.ts`, `join(process.cwd(), 'storage', 'uploads')`), no `StorageProvider` usage, **not previously catalogued in this document at all** |

**`R2StorageProvider` itself has zero test coverage** — confirmed via
`apps/api/test/media-storage-provider.e2e-spec.ts`'s own comment
("`R2StorageProvider` is not exercised here... out of scope"). This
phase's shadow work exercised the underlying R2 *mechanism* for real
(via raw `wrangler` CLI), which is the first real proof R2 works at all
for this project, but did **not** exercise the `R2StorageProvider`
TypeScript class itself — that remains untested. Delete semantics for
this provider are soft (copy between `quarantine/`/`available/`/
`removed/` key prefixes, never a true destroy) and `publicUrl()` is
built client-side from `R2_PUBLIC_BASE_URL` + key — **no signed-URL
capability exists in this class today**, which matters for the private
media model below.

## Private media model (design only — no bucket created, no code written this phase)

No private data was uploaded or exposed this phase. This section is a
**design**, for a future phase to implement:

- A **separate** R2 bucket (never the same bucket as
  `bloodmoon-shadow-public-assets` or any future public bucket) with
  public access **disabled** (no `r2.dev` enablement, no custom domain
  bound to public routes).
- Access only via a Worker that checks authorization (session/JWT,
  matching the API's existing auth model — `SECURITY_MODEL.md`'s "auth
  architecture is unchanged" constraint applies here too) before
  proxying or redirecting to the object.
- Short-lived signed URLs (S3-compatible presigned GET, since R2 is
  S3-API-compatible) are the natural mechanism **if** a direct-to-R2
  URL is ever handed to a client — but note `R2StorageProvider` as it
  exists today has no signing capability, so this needs new code, not
  a config flip.
- Candidate contents: `media-quarantine`/`media-removed` (moderation
  states that must never be publicly enumerable), and any future
  genuinely-private user upload category (none identified in the
  current codebase — today's `USER_UPLOAD_PUBLIC` rows are all meant to
  be public once approved).
- Never reuse a public bucket's prefix scheme for private data — a
  separate bucket removes an entire class of "wrong prefix exposed
  publicly" mistake.

## Launcher model (design only — no artifact uploaded this phase)

No launcher build artifact exists in this checkout to upload (confirmed
via `apps/web/public/downloads/README.md` — gitignored, build-only).
Design for when one exists:

- **Stable URL**: keep `/downloads/BloodMoonLauncher.zip` semantics —
  either a Worker route that always serves the "latest" key, or a
  redirect from the stable path to a versioned object key.
- **Versioning**: store each build under a versioned key
  (`launcher/BloodMoonLauncher-v1.0.0-win-x64.zip`) alongside a
  `latest` pointer/alias, never overwrite a version's own key in place.
- **Hash/checksum**: publish a companion `.sha256` object per version so
  the launcher (or a manual download) can verify integrity independently
  of TLS.
- **Cache control**: versioned objects can be `immutable`/long-`max-age`
  (the key itself never changes meaning); the `latest` pointer must be
  short-cache or no-cache so a new release is picked up promptly.
- **Rollback**: keep at least the previous version's object; rolling
  back is re-pointing `latest` to the prior versioned key, no re-upload
  needed.
- **Large-file delivery**: R2 has no egress fee (Cloudflare's stated
  model) which is specifically favorable for a binary download path
  like this one — no other action needed this phase, just noting it as
  a reason R2 fits this use case well.

## Container filesystem dependencies (Cloudflare Containers production-safety blockers)

Per `RISKS.md` CF-R12: Cloudflare Containers' disk is ephemeral, so
Containers cannot safely scale-to-zero, sleep, or run more than one
instance until these local-disk paths move off local disk. Exact
`apps/api/storage/*` directories, confirmed via exhaustive grep this
phase (`join(process.cwd(), 'storage', '...')`) — all six exist and are
empty (`.gitkeep` only) in this checkout, real volume lives on the
production host:

1. `community-media` — `ALREADY_R2_CAPABLE` (code exists, flag/data-copy
   only)
2. `guild-media` — `REQUIRES_CHANGE` (no `StorageProvider` usage)
3. `launcher-assets` — `REQUIRES_CHANGE` (no `StorageProvider` usage,
   newly catalogued this phase)
4. `uploads` (admin-content) — `REQUIRES_CHANGE` (no `StorageProvider`
   usage, newly catalogued this phase)
5. `media-quarantine` — moves with whatever fix lands for #1/#2 (shared
   `StorageProvider` interface's quarantine semantics)
6. `media-removed` — same as #5

None of these six were modified, uploaded to, or migrated this phase —
this is a dependency list for `CF-API-02R`'s eventual production-safety
bar, not work done here.

## Cost/lifecycle notes (size-based only — no invented prices)

- **Long-cache candidates**: `images/`, `dev-references/visual/`,
  `dev-references/game-assets/` — the exact set shadow-uploaded this
  phase, ~108 MB total, already tagged
  `public,max-age=31536000,immutable` on upload. Low total volume;
  growth rate is "occasional new equipment art," not high-frequency.
- **Short-cache/no-cache candidates**: a future launcher `latest`
  pointer (see above); any future user-media object whose privacy state
  can change (approved → removed) needs cache headers that don't let a
  stale public copy linger past a moderation action.
- **Lifecycle-deletion candidates**: `media-quarantine` (should not
  persist past a moderation decision — a lifecycle rule auto-expiring
  quarantine objects after N days is a reasonable future safeguard,
  not implemented anywhere today, local or R2), `media-removed` (soft-
  deleted; whatever retention window today's local-disk behavior
  implies should carry over, not be silently shortened or lengthened by
  an R2 lifecycle rule without a deliberate decision).
- **Version-retention candidates**: launcher versioned objects — no
  invented number of versions to retain; a real decision for whoever
  implements the launcher model above.
- No monthly cost figure is given anywhere in this document — sizes
  above are the only real, measured numbers; translating them to a
  price was explicitly out of scope per the brief ("no invented monthly
  prices").

## Rollback model

Copy-first migration has a trivial rollback: **do nothing**. No source
file was moved, renamed, or deleted this phase — every current
production URL (Nuxt static asset paths, `/media/...` API routes)
continues to resolve exactly as before, from exactly the same source
files, regardless of what exists in `bloodmoon-shadow-public-assets`.
If the shadow bucket were deleted entirely tomorrow, zero production
behavior would change. This holds for every future phase too, as long
as the "copy first, cut over only after independent verification, never
delete the source until the new path is proven and explicitly approved"
discipline is kept.

## Direction (decided 2026-09-22, Phase CF-01B; reaffirmed this phase)

R2 should become durable storage for public images, wiki assets,
user/community media, and launcher/download assets where appropriate
(`DECISIONS.md`). This phase (`CF-R2-01`) executed the first real slice
of that direction — inventory plus a verified shadow copy of the
lowest-risk asset category — without touching production or any real
user data.

## Phase CF-R2-02 — R2 storage provider hardening + filesystem exit preparation

Builds on `CF-R2-01`'s inventory/shadow-copy proof. This phase's own
focus: harden the `StorageProvider` abstraction itself, extend it to
the media domains that still had none, and prepare (never execute) the
production storage cutover. **No production media provider was
changed. No production file was moved or deleted.**

### R2StorageProvider hardening

`R2StorageProvider` had **zero test coverage** before this phase
(confirmed via `media-storage-provider.e2e-spec.ts`'s own comment).
Added `apps/api/src/modules/media/storage/r2-storage.provider.spec.ts`
(38 tests, mocked `S3Client` -- no live Cloudflare credentials, no
production or shadow bucket touched): every method (`writeQuarantine`,
`writeAvailable`, `moveAvailableToRemoved`, `moveRemovedToAvailable`,
`deleteQuarantine`, `publicUrl`), correct S3 commands/keys/prefixes,
correct return values, path-traversal-key rejection (matching
`LocalStorageProvider`'s existing test pattern), and real error
propagation on a rejected S3 call (previously unverified — a silent
swallow would have been a real bug).

**A real bug was found and fixed by writing these tests**:
`publicUrl(key)` previously returned `${publicBaseUrl}/${key}` —
omitting the `available/` prefix that `writeAvailable()` actually
stores the object under. The URL `R2StorageProvider` would have handed
back to a caller never matched where the object was actually written.
Fixed to always include the `available/` prefix (quarantine/removed
objects can never get a public URL constructed for them by
construction, which is also a safety property, not just a bug fix).
Community media has never run against a real R2 bucket in production
(`RISKS.md` CF-R1), so no live data was ever affected by this bug —
it would only have surfaced the first time R2 mode was actually turned
on for real traffic.

**Also added**: an optional `namespace` option to
`R2StorageProviderOptions` (default `''`, i.e. today's community
behavior, byte-for-byte unchanged). A non-empty namespace (e.g.
`'guild/'`) prefixes all three key prefixes
(`guild/quarantine/`, `guild/available/`, `guild/removed/`), so more
than one media domain can share one bucket and one credential set
without their objects colliding. This is what makes the guild-media
and launcher-asset R2 wiring below possible without provisioning a
second Cloudflare R2 credential.

### Community media R2 path

`MediaStorageService.buildProvider()`'s provider-selection logic
(`local`/`r2` switch, required-env-var errors) had no unit coverage
either — added
`apps/api/src/modules/media/storage/media-storage.service.spec.ts` (9
tests): default-local behavior, correct R2 construction, a
missing-env-var case per required variable, unknown-provider-value
rejection, and the "always reflects current env, not cached at
construction" behavior the existing e2e suite already silently relies
on.

**Full real-pipeline (upload → retrieve → replace → delete →
metadata, against a real disposable database and real HTTP) validation
already exists** for the `local` provider path
(`test/community-media.e2e-spec.ts`) but **could not be re-run this
phase**: this worktree has no Docker available (`'docker' não é
reconhecido...`) and no `E2E_LOCAL_MYSQL_URL` fallback configured —
confirmed this is a pre-existing environmental constraint, not
introduced by this phase, by observing the *same, untouched* spec fail
identically. A real R2-mode run of this same suite (setting
`MEDIA_STORAGE_PROVIDER=r2` against a disposable/shadow R2 bucket)
also could not be attempted: no S3-compatible R2 API credentials
(`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`) exist anywhere in this
environment — these are a different credential type than the
`wrangler` OAuth session used throughout the Cloudflare program so
far, and provisioning one requires the Cloudflare dashboard (not
attempted this phase). **`MEDIA_STORAGE_PROVIDER` was never switched
to `r2` for any real environment.**

### Guild media — refactored onto the StorageProvider abstraction

`guilds-media.service.ts` previously wrote directly via
`node:fs/promises` to a hardcoded `GUILD_MEDIA_DIR`, with no
`StorageProvider` usage at all (corrected finding from `CF-R2-01`).
Refactored this phase:

- New `apps/api/src/modules/guilds/guild-media-storage.service.ts`,
  mirroring `MediaStorageService`'s exact pattern, with its **own**
  `GUILD_MEDIA_STORAGE_PROVIDER` switch (default `local`) —
  deliberately independent of community's `MEDIA_STORAGE_PROVIDER`, so
  activating R2 for one domain never implicitly activates it for the
  other. When `r2`, reuses the community `R2_*` credentials under the
  new `guild/` namespace (`GUILD_R2_BUCKET` can point at a dedicated
  bucket instead, falling back to `R2_BUCKET`).
- `guilds-media.service.ts` now calls
  `this.storage.writeAvailable(filename, processed, 'image/webp')`
  instead of raw `mkdir`/`writeFile` — the exact same generated
  filename (`${randomUUID()}.webp`), the exact same sharp
  validation/processing pipeline, and (for the default `local`
  provider) the exact same resulting public URL
  (`/api/media/guild/<filename>`) and absolute-path `storagePath`
  semantics as before. **Zero behavior change when
  `GUILD_MEDIA_STORAGE_PROVIDER` is left unset.**
- 7 new unit tests
  (`guild-media-storage.service.spec.ts`): default-local, independence
  from community's own switch, correct local public-URL prefix,
  correct R2 construction with the `guild/` namespace, `GUILD_R2_BUCKET`
  preferred over `R2_BUCKET`, missing-credential error, unknown-value
  error.
- Guild media's pre-existing behavior (no quarantine step, no explicit
  delete/moderation flow, old files never actually removed when a new
  emblem/banner is uploaded, `GuildMediaStatus.REMOVED` never actually
  set by any code path) was **preserved exactly, not changed or
  "fixed"** — out of scope for a storage-layer refactor.
- **Full real e2e re-validation blocked by the same Docker-unavailable
  constraint** as community media above — `test/guilds.e2e-spec.ts`
  (78 tests covering real emblem/banner upload end-to-end) could not be
  re-run in this environment. Type-check (`tsc --noEmit`) passes
  cleanly, all new/existing unit tests pass (111 total across 12
  suites), and the refactor is mechanically narrow (3 lines replaced by
  1 call into a class whose `local` codepath is the *same*
  `LocalStorageProvider` class community media's own e2e suite already
  validates end-to-end) — but this is real-DB/real-HTTP confirmation
  still owed, not obtained this phase. **Recommend running both e2e
  suites in an environment with Docker (or a configured
  `E2E_LOCAL_MYSQL_URL`) before treating this refactor as fully proven.**

### Admin-content uploads — audited, migration DEFERRED (not forced)

`admin-content.service.ts`'s `uploadImage()` writes directly to
`storage/uploads/` and creates a `ReferenceAsset` row
(`localPath`/`publicPath` both set to `/api/media/${fileName}`).
Auditing `ReferenceAsset`'s schema and usage found this endpoint is
**one narrow path into a much broader model**: `localPath` carries a
database-level `@@unique` constraint, `sourceId`/`sourceUrl` fields
exist for asset provenance from bulk imports/scrapers (not just admin
uploads), and a `duplicateOfId` self-relation exists for dedup
tracking across however many other code paths create `ReferenceAsset`
rows (not audited in full this phase). Migrating just the one
`uploadImage()` write path to `StorageProvider`/R2 without touching
every other `ReferenceAsset`-creating path would leave the model with
mixed, undiscriminated semantics — some rows backed by a local file,
others by an R2 key, with no field to tell which is which. This is
exactly the "materially larger or coupled" case the brief's own step 6
says to document and defer rather than force. **Deferred, not
migrated.** A real migration here needs its own scoped audit of every
`ReferenceAsset`-writing code path first, not just the one HTTP upload
endpoint.

### Launcher assets — real R2 wiring added (was a documented stub)

`launcher-asset-storage.ts` already had a
`LauncherAssetStorageProvider` abstraction (`save(buffer, extension) ->
SavedAsset`) with `LocalLauncherAssetStorageProvider` (real, used
today) and `R2LauncherAssetStorageProvider` (previously a stub that
unconditionally threw `NotImplementedException` — this was a **known,
documented** stub per `docs/assets/central-asset-library.md`, not a
gap this phase discovered). This phase gave it a real implementation:
reuses `R2StorageProvider` under a `launcher-assets/` namespace, deriving
`Content-Type` from the extension. `launcher-studio.module.ts`'s DI
binding now reads `LAUNCHER_MEDIA_STORAGE_PROVIDER` (default `local`,
unchanged) instead of hardcoding `LocalLauncherAssetStorageProvider`. 6
new unit tests (mocked `S3Client`, plus one covering the existing local
provider): correct namespaced upload, `LAUNCHER_R2_BUCKET` fallback
behavior, content-type derivation, missing-credential error, S3 API
error propagation.

**One caveat preserved, not fixed**: `launcher-asset-media.controller.ts`'s
read route (`GET /media/launcher-assets/:fileName`) is still
local-disk-only regardless of which provider wrote the asset — an
R2-stored asset's real, working URL is the one `save()` returns
(`SavedAsset.publicUrl`, a real R2 URL), never that local route. This
is documented behavior (not a bug): the DB row records
`storageProvider: this.storage.kind` and `publicUrl: saved.publicUrl`
per asset, so callers always get the correct URL regardless of which
provider wrote it — the local route is just not a valid alternate path
to an R2-backed asset, and nothing in this codebase assumes it is.

**No production launcher artifact was uploaded to R2 or anywhere else**
this phase — none exists in any checkout (confirmed `CF-R2-01`,
unchanged).

### Object key policy (canonical, going forward)

Because `CF-R2-01` proved `r2.dev`'s edge cache can serve a stale
response for an overwritten key, **immutable/versioned keys are the
default going forward for anything the R2 mechanism itself doesn't
already make append-only**:

- **Content-addressed/versioned keys, never overwritten in place**:
  `images/<content-sha256>.<ext>`, `launcher/<version>/BloodMoonLauncher.zip`
  (+ a sibling `launcher/<version>/BloodMoonLauncher.zip.sha256`
  checksum object). A new upload is always a new key — the
  stale-edge-cache problem cannot occur for a key that was never
  written to before.
- **The existing `StorageProvider` interface's own objects
  (`available/`, `quarantine/`, `removed/` keys for community/guild
  media) are a partial exception, by design, not an oversight**: a
  moderation action (`moveAvailableToRemoved`/`moveRemovedToAvailable`)
  legitimately needs to move the *same logical object* between states.
  This is a `CopyObjectCommand` + `DeleteObjectCommand` pair, not an
  in-place overwrite of a key already serving cached public traffic —
  the object's *public* key (`available/<key>`) is written exactly
  once per upload and never overwritten afterward under normal
  operation (a "replace" is always a brand-new `<uuid>.<ext>` key, per
  the existing `writeAvailable` contract) — so the stale-edge-cache
  risk mainly applies to the moderation-remove case (a public key
  briefly stops being the "current" object), not to routine uploads.
- **Mutable pointers are the deliberate, documented exception**: a
  `latest.json`/`latest.txt`-style pointer object (e.g. for the
  launcher's "current version" indirection) is allowed to be
  overwritten in place — see Cache policy below for why this is safe
  specifically because of its cache headers, not despite them.
- **Never let a caller-supplied value become part of a key.** Every
  key in this codebase is machine-generated (`randomUUID()`,
  content-hash) — this was already true before this phase and is
  unchanged; explicitly recorded here as the policy, not just an
  implementation detail.

### Cache policy (canonical, going forward)

Three classes, never one policy for all of them:

| Class | Cache-Control | Why |
|---|---|---|
| Immutable/versioned objects (content-hashed images, versioned launcher artifacts, community/guild `available/` keys) | `public,max-age=31536000,immutable` (already used in `CF-R2-01`'s shadow upload) | The key never changes meaning once written — safe to cache forever at any layer, including the browser and any CDN edge |
| Mutable pointers (`latest.json`/`latest.txt`-style, if/when introduced) | short `max-age` or `no-cache` | The whole point of a pointer is that it changes; a long cache here would delay every consumer from seeing a new "latest" for as long as the cache TTL, silently |
| Private objects (`quarantine/`, `removed/`, and any future private-bucket content) | never publicly cacheable at all — these must never be served by a public route/CDN in the first place, so "cache policy" for them is really "never reachable by anything that would cache it" | A moderation-removed or not-yet-validated object being cached anywhere public would itself be the privacy failure, independent of any HTTP header |

Not yet tested empirically this phase (design/policy only, no mutable
pointer object exists anywhere in this codebase yet to test against).

### Private storage design — unchanged from CF-R2-01, still design-only

No new implementation this phase; see `CF-R2-01`'s design above
(separate bucket, public access disabled, Worker/API-mediated
authorization, short-lived signed URLs when direct download is
needed). Confirmed still true this phase: `R2StorageProvider` has no
presigned-URL capability — `@aws-sdk/client-s3` supports it
(`getSignedUrl` from `@aws-sdk/s3-request-presigner`, not currently a
dependency), so adding real signed-URL support is real, not-yet-done
work for whichever future phase actually builds the private bucket.
**No private bucket was created, no quarantine/removed content was
made publicly accessible.**

### Container readiness

```
PERSISTENT_FILESYSTEM_BLOCKERS = [
  "admin-content uploads (storage/uploads/, admin-content.service.ts) -- still local-disk-only, migration deferred this phase (see above)"
]
```

Everything else `RISKS.md` CF-R12 originally listed now has a
`StorageProvider` (or `LauncherAssetStorageProvider`) abstraction with
a real R2 implementation available, even though none is *activated* in
production this phase: community media (already had it),
guild media (this phase), launcher-studio assets (this phase). Having
the abstraction is necessary but not sufficient for
`CF-API-02R`/Container production-safety — each still needs
`MEDIA_STORAGE_PROVIDER`/`GUILD_MEDIA_STORAGE_PROVIDER`/
`LAUNCHER_MEDIA_STORAGE_PROVIDER` actually set to `r2` (with real
credentials) before a Container instance's local disk can be treated
as truly ephemeral/scale-to-zero-safe for those domains — that
activation is a future, separately-authorized step, not implied by
this phase's code existing. `media-quarantine`/`media-removed` move
together with whichever of community/guild is activated (they already
share the same `StorageProvider` instance/credentials as their
domain's `available/` objects). **`CONTAINER_STORAGE_READY = NO`**
until admin-content is resolved (or explicitly accepted as an
out-of-scope exception) and at least community/guild/launcher are
actually switched to `r2` in whatever environment runs the Container.

### Production mode discovery

`PRODUCTION_MEDIA_MODE = UNKNOWN` — read-only check only, no value
guessed. No committed doc, script, or config in this repository states
production's actual `MEDIA_STORAGE_PROVIDER` value (`.env` is never
committed, by design). This matches every prior phase's own finding
(`RISKS.md` CF-R1, open since Phase CF-01B, still open). Determining
the real value would require a live, read-only check against the
production cPanel host — out of this phase's safe scope (the brief's
own safety section prohibits changing the production media provider,
and a live check was judged disproportionate to set up this phase
purely to read one non-secret flag's value; see `BLOCKERS` in the
final report for the concrete follow-up this implies).

### Migration model (design only — not executed)

1. Inventory source (done, `CF-R2-01`).
2. Copy to R2 (proven mechanism, `CF-R2-01`'s shadow upload; per-domain
   `StorageProvider`/R2 classes now exist for community/guild/launcher,
   `CF-R2-02`).
3. Verify counts/hashes (same method as `CF-R2-01`'s integrity
   verification — file count, byte total, hash sample, HTTP
   accessibility, cache headers).
4. Dual-read/fallback only if truly necessary — not designed in detail
   this phase; today's per-domain `StorageProvider` switch is
   all-or-nothing per domain (`local` or `r2`, never both
   simultaneously for the same domain), which is simpler and was judged
   sufficient unless a real need for gradual rollout emerges.
5. Change the relevant `*_STORAGE_PROVIDER` env var for that domain
   (`MEDIA_STORAGE_PROVIDER` / `GUILD_MEDIA_STORAGE_PROVIDER` /
   `LAUNCHER_MEDIA_STORAGE_PROVIDER`) — a config change, not a code
   deploy, once the code from this phase is itself deployed.
6. Smoke test the real upload/retrieve/replace/delete flow against
   production traffic patterns before declaring the cutover complete.
7. Observe (error rates, latency, R2 dashboard metrics) for a
   deliberate window before removing any fallback.
8. Keep original local files during the rollback window — never delete
   source files as part of activating R2; rollback is reverting the env
   var, exactly like `CF-R2-01`'s own rollback model.
9. Delete old local copies only after explicit, separate, later
   authorization — never implied by this document or any prior phase's
   completion.

**Not executed this phase.** No production `*_STORAGE_PROVIDER` env
var was changed, no real user media was copied to R2, no local file
was deleted.

## Phase CF-R2-03 — admin-content storage audit + final persistent filesystem exit

Closes the one deferral from `CF-R2-02`. **No production media provider was
changed. No production file was moved or deleted. No production/live R2
credentials were used.**

### Full ReferenceAsset write-path audit (every code path, not just uploadImage())

| Path | File/function | Operation | Filesystem write? | DB write | Sync? | Atomic? | Dedup/provenance |
|---|---|---|---|---|---|---|---|
| Manual admin upload | `admin-content.service.ts` `uploadImage()` | create | **YES — the only real runtime file write** | `referenceAsset.create` | async | storage write completes fully before the DB call starts (see ordering below) | none automatic — each upload gets an independent random key, no content-hash dedup check |
| Manual metadata registration | `admin-content.service.ts` `createAsset()` | create | NO — caller supplies `localPath` etc. directly, no file touched | `referenceAsset.create` | async | single Prisma call | `sha1`/`duplicateOfId` settable by the caller, never auto-derived |
| Manual metadata edit | `admin-content.service.ts` `updateAsset()` | update | NO | `referenceAsset.update` | async | single Prisma call | same as above |
| Archive | `admin-content.service.ts` `archiveAsset()` | update (status only) | NO — **no code path anywhere deletes the underlying file or DB row**, confirmed by exhaustive grep (`unlink`/`rm` never appear in `admin-content/*.ts`) | `referenceAsset.update` (status→ARCHIVED) | async | single Prisma call | n/a |
| Bulk import/scrape ingestion | `scripts/import-prepared-data.mjs` `importKnowledge()` | upsert | **NO — this script never writes a file itself.** It reads a pre-built JSON plan (`references/game-data/source-harvest/postgres-import-plan.json`, 1220 assets, committed to the repo) and `upsert`s `ReferenceAsset` metadata rows whose `localPath` values point at files that must already exist as **committed, static repo content** under `references/game-assets/source-harvest/<source>/...` (confirmed via direct sampling of the JSON — filenames already embed a content-hash suffix, e.g. `00jovvfn-4e4e0f4757.png`) | `referenceAsset.upsert` (`where: { localPath }`) | offline/manual (`npm run db:import`), not part of the running API process | idempotent by construction — `upsert` on the unique `localPath` key means re-running the exact same plan never duplicates rows | dedup is `localPath`-uniqueness only; no sha1-based duplicate check exists in this script either |
| Wiki read | `wiki.service.ts` | read | NO — `.count()` only, no individual asset read | none | — | — | — |
| Launcher read | `launcher.service.ts` | read | NO | none | — | — | uses `asset.publicPath ?? asset.sourceUrl` — **bulk-imported assets (`publicPath` is `null` for all 1220 sampled) fall back to the ORIGINAL THIRD-PARTY `sourceUrl`, not any Blood Moon storage** — see finding below |
| HTTP serve | `admin-content/media.controller.ts` `GET /media/:fileName` | read | reads local disk only, unchanged | none | — | — | — |

**Key finding: bulk-imported/scraped `ReferenceAsset` rows are not "user storage" in the same sense as community/guild/launcher media.** They are an internal editorial archive of scraped source material (`sourceUrl`/`sourceKey`/`metadata.pageUrls` provenance fields), checked into the repo as static files, consumed at runtime only for admin curation (the Admin Content Studio UI) and — when `publicPath` is set — end-user display. Since `publicPath` is `null` for effectively all bulk-imported rows (sampled the full 1220-asset plan), the *live, user-facing* image for these actually comes from the original external `sourceUrl` today, not from Blood Moon's own storage at all. This is why they were correctly out of scope for a `StorageProvider`/R2 migration: **they are read-only, git-committed, deploy-time static assets** (the same category as `apps/web/public/dev-references/`, `CF-R2-01`), not a Container ephemeral-disk risk — a Container always has them fresh on every restart because they ship with the code, exactly like any other bundled file.

**Dedup model (accurately described, not invented)**: `sha1` (indexed) and `duplicateOfId` (self-relation) exist on the schema and are admin-settable via `createAsset`/`updateAsset`, and `launcher.service.ts` exposes `sha1` to launcher clients as an integrity `hash`. **No code path anywhere automatically detects or flags duplicates by content hash** — `duplicateOfId` requires a human to set it explicitly. The bulk importer's only "dedup" is upsert-by-`localPath` (same file path = same row updated, not duplicated); it does not check `sha1` for cross-path duplicate detection. This was true before this phase and is unchanged — not something this phase added or fixed.

### ReferenceAsset semantics — field classification

| Field | Classification | Notes |
|---|---|---|
| `localPath` | **NEED_MIGRATION** (transition representation added, not redefined) | `@@unique`, required, `VarChar(512)`. For bulk-imported rows: a real repo-relative path to a committed static file. For pre-CF-R2-03 `uploadImage()` rows: was already just a copy of `publicPath` (a URL string), not a real filesystem path — confirmed by reading the pre-phase code. For new rows written through `AdminContentStorageService`: now the provider's `storagePath` (a real absolute local path for `local`, a relative namespaced key for `r2`) — never a fabricated value, matching the brief's "safe transition representation" requirement |
| `publicPath` | STORAGE_INDEPENDENT | Already the field every reader actually uses (`launcher.service.ts`); unchanged in meaning, now correctly populated from the active `StorageProvider`'s real URL for new uploads |
| `sourceUrl`/`sourceId` | STORAGE_INDEPENDENT | Provenance, orthogonal to where Blood Moon stores its own copy |
| `sha1` | STORAGE_INDEPENDENT | Content identity, provider-agnostic. **Note**: this is `sha1`, while community/guild/launcher media all use `sha256` — a real, pre-existing inconsistency, left unchanged (`localPath`/`sha1` are load-bearing, real production fields on 1537 rows; renaming or re-hashing them is out of scope and would be exactly the "silently redefine semantics" the brief prohibits) |
| `bytes`/`mimeType`/`kind` | STORAGE_INDEPENDENT | Unchanged |
| `status` (EditorialStatus) | STORAGE_INDEPENDENT | Editorial workflow state, unrelated to storage location |
| `duplicateOfId` | STORAGE_INDEPENDENT | Manual admin-set relation, unrelated to storage location |
| `metadata` (Json) | STORAGE_INDEPENDENT | Free-form (e.g. `friendlyName`, scraper provenance) |
| **`storageProvider`** (new) | STORAGE_LOCATION_SPECIFIC | `NULL` on every pre-existing row (1537 in production, confirmed honest — no backfill run, none needed); `'local'`/`'r2'` on rows written through the new `AdminContentStorageService` path |
| **`storageKey`** (new) | STORAGE_LOCATION_SPECIFIC | The real provider key, `NULL` on pre-existing rows, mirrors `localPath` for new rows |

### Storage provider design

New `AdminContentStorageService` (`apps/api/src/modules/admin-content/admin-content-storage.service.ts`), the fourth domain-specific `StorageProvider` switch after community (pre-existing), guild, and launcher-studio (`CF-R2-02`). Same pattern each time:

- **Own, independent `ADMIN_CONTENT_STORAGE_PROVIDER` switch**, default `local` — never tied to `MEDIA_STORAGE_PROVIDER` or any other domain's switch. **R2 is not the default anywhere.**
- When `r2`, reuses the shared `R2_*` account credentials (one Cloudflare account, no new credential provisioned) under a new `admin-content/` key namespace — `ADMIN_CONTENT_R2_BUCKET` can point at a dedicated bucket instead, falling back to `R2_BUCKET`.
- Only `uploadImage()` was refactored to use it — `createAsset`/`updateAsset`/`archiveAsset` remain metadata-only (correctly — they never touched a file before, and adding storage-layer code to them would be inventing behavior, not preserving it) and the bulk importer remains a standalone, unmodified script (it never wrote files either).
- `media.controller.ts`'s read route is **unchanged, still local-disk-only regardless of the switch** — matching the exact precedent set for launcher-studio in `CF-R2-02`. The real, working URL for any asset is always `publicPath` (what every reader already uses), never this route directly.

### Object key model

`admin-content/<uuid>.<ext>` under the `r2` provider (namespace `admin-content/`, key `${randomUUID()}.${extension}`) — the same `randomUUID()`-based scheme already used by community/guild/launcher for consistency, rather than introducing a new content-hash scheme for just this one domain. A UUID key is already "immutable" in the sense the `CF-R2-02` object-key policy requires: written exactly once, never overwritten in place. For the `local` provider, unchanged filename scheme, written under `storage/uploads/` (or `ADMIN_CONTENT_UPLOADS_DIR` if set).

### Database metadata model

Two new nullable columns on `ReferenceAsset` — `storageProvider VARCHAR(20)`, `storageKey VARCHAR(512)` — purely additive, no `DROP`, no `NOT NULL`, no backfill `UPDATE`. Migration
`prisma/migrations/20260923090000_admin_content_storage_provider/migration.sql`,
hand-authored (no live database was available in this environment to run
`prisma migrate dev`'s auto-diff — same constraint as `CF-R2-02`'s e2e
suites), validated via `prisma validate`/`prisma format` only. **Not applied
or tested against any real database this phase.** `localPath` keeps its
`@@unique`/required role exactly as before (the bulk importer's
`upsert({ where: { localPath } })` depends on it); for new rows it is set to
the same value as `storageKey` — never a fabricated absolute path, per the
brief's explicit instruction.

### Delete / replace semantics (documented, unchanged from before this phase)

No code path deletes a `ReferenceAsset` row or its underlying file — `archiveAsset()` is the closest thing to "delete" and only flips `status` to `ARCHIVED`, leaving the row and file in place (orphan accumulation is pre-existing, matching the same pattern already documented for community/guild media's moderation-remove and launcher assets). "Replace" does not exist as an operation — a new upload always creates a new row/key, never overwrites an existing one. This was true before this phase; nothing here changes it. The `AdminContentStorageService.writeAvailable()` call inside `uploadImage()` completes (or throws) fully before the `ReferenceAsset.create` Prisma call begins — a storage failure therefore always leaves zero DB trace (no phantom record), proven by a unit test (see Tests below).

### Tests

18 new unit tests (mocked `S3Client`/`AdminContentStorageService` — no live R2 credentials, no live database):

- `admin-content-storage.service.spec.ts` (7): default-local, independence from `MEDIA_STORAGE_PROVIDER`, correct local public-URL prefix, correct R2 construction with the `admin-content/` namespace, `ADMIN_CONTENT_R2_BUCKET` preference, missing-credential error, unknown-value error.
- `admin-content.service.spec.ts` (11, `uploadImage()` only — the only path with any file I/O): malformed-dataUrl rejection before any storage/DB call, oversized-image rejection before any storage/DB call, storage-write-before-DB-write ordering (proven with an explicit call-order assertion), a storage failure creates **zero** `ReferenceAsset` rows (no phantom record), `localPath`/`storageKey` set to the provider's real `storagePath` (never the public URL, never a fabricated path), `publicPath`/`storageProvider` set from the real provider result, correct `status`/`kind`/`mimeType`/`bytes`/`metadata`, an audit event is recorded, the returned URL is the provider's real URL (not a hardcoded path), and two uploads of identical content get independent keys (no accidental collision, matching the pre-existing no-automatic-dedup model).

**`R2_LIVE_E2E = BLOCKED`** — no S3-compatible R2 API credentials exist anywhere in this environment (same constraint as `CF-R2-02`); all R2-path tests are mocked-`S3Client` only, never a real bucket. **This did not block code-quality completion** — every mocked-provider test above runs and passes regardless.

**Existing e2e suites not re-run**: no `test/admin-content*.e2e-spec.ts` exists at all (confirmed — `uploadImage()`'s HTTP endpoint had zero e2e coverage even before this phase, not something this phase regressed). `test/launcher-remote-content-contract.e2e-spec.ts` (which does exercise `ReferenceAsset` directly, creating/deleting rows for contract testing) was **not run** — same pre-existing Docker/`E2E_LOCAL_MYSQL_URL`-unavailable constraint as `CF-R2-02` (`RISKS.md` CF-R16, unchanged, not re-verified this phase since nothing about the environment changed).

### Filesystem re-audit (whole `apps/api/src`, after this phase's changes)

Every `writeFile`/`mkdir`/`createWriteStream`/`appendFile` call in `apps/api/src`, confirmed via exhaustive grep:

- `src/modules/media/storage/local-storage.provider.ts` — the shared `LocalStorageProvider` class (all four domains' local-mode implementation)
- `src/modules/launcher-studio/launcher-asset-storage.ts` — `LocalLauncherAssetStorageProvider`

**These are the only two files that write anything, and both are the intentional, designated local-mode implementations of the `StorageProvider`/`LauncherAssetStorageProvider` abstractions — not blockers.** Every domain (community, guild, launcher, admin-content) now goes through one of these two abstractions; none has a raw, unabstracted `node:fs` write path left anywhere.

Every other `node:fs` import in `apps/api/src` (`web-source.service.ts`, `progression-config.service.ts`, `muserver-export.service.ts`, `store-admin.service.ts`, `legacy-catalog-effective-state.service.ts`, plus the two read-only media controllers) is **read-only**, loading a pre-built, git-committed JSON catalog/snapshot or serving a local-mode-only asset — `NON_STORAGE_OPERATION` per the brief's taxonomy, since none of them writes runtime-generated data that must survive a Container restart.

**`PERSISTENT_FILESYSTEM_BLOCKERS = []`.** No temporary/ephemeral-processing exception needed to be invoked this phase — no code path was found writing to a temp file mid-request and relying on it surviving past that request.

### Container readiness

`CODE_READY = YES` — every domain that ever persists runtime-writable data (community, guild, launcher-studio, admin-content) now has a working `local`/`r2` `StorageProvider` switch; no code exclusively depends on local disk for anything that must survive a restart. `PRODUCTION_ACTIVATED = NO` — none of the four `*_STORAGE_PROVIDER` switches is set to `r2` anywhere real (`RISKS.md` CF-R1, unchanged). Per the brief's explicit instruction ("do NOT require production R2 activation for architectural readiness"), **`CONTAINER_STORAGE_READY = YES`** — the architectural blocker is resolved; actually running a Container against local-only ephemeral disk in production is a separate, later, explicitly-authorized activation step, not an architecture question.

### Migration plan update (design only — not executed)

Same 9-step model as `CF-R2-02`'s (inventory → copy → hash-verify → metadata mapping → provider flip → smoke test → observe → rollback window → cleanup only with later approval), with one addition specific to `ReferenceAsset`: **"metadata mapping" here means populating the new `storageProvider`/`storageKey` columns for any row being migrated, never touching `localPath`'s existing value for already-migrated rows** (so a partially-migrated table is always self-consistent: `storageProvider IS NULL` unambiguously means "not yet migrated, `localPath`/`publicPath` still describe it exactly as before"). **Bulk-imported/scraped rows are explicitly out of scope for this migration model** — they are static repo content, not runtime storage, and moving them to R2 would be a different kind of decision (publishing internal scrape archives publicly) that this phase does not recommend or design.

## What a future phase will need to decide, not answered here

- Whether to content-hash filenames on upload (true immutability + long
  cache lifetimes) versus keeping current human-readable names — the
  shadow upload this phase kept the current human-readable keys.
- Whether community/guild uploads move to R2 ahead of or alongside the
  API's own Container migration — the Container ephemeral-disk
  constraint (`RISKS.md` CF-R12) makes moving them first the lower-risk
  order, but no scheduling decision was made this phase.
- Cache/purge strategy for images that do change (the
  `dev-references/generated/` drafts — row 4 — are the clearest example
  of content that must never be treated as cache-forever-immutable).
- Whether/when to add the `img-src` R2 origin to the shared CSP for a
  real (not just locally-tested) shadow or production deployment —
  prepared and tested this phase, not applied to any deployed Worker.
- The private-media-model and launcher-model designs above are designs
  only — no implementation decision (bucket creation, code changes) was
  made or should be inferred from their presence in this document.
