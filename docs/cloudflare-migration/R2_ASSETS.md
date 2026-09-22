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
