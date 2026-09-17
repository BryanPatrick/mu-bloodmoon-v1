---
status: ACTIVE
category: decisions
audience: internal (engineering)
lastVerified: 2026-08-31
---

# ADR-0014: Launcher CMS/content asset fallback — client-side degradation chain, no server-side fallback

**DATE**: 2026-08-31 (backfilled — implemented across `docs/launcher/cache-and-fallback.md` (Foundation phase) and `docs/launcher/content-cache.md` (Phase L3))
**STATUS**: ACTIVE, implemented, wired into production `MainWindow` (see correction below)

## CONTEXT

The Launcher's home-screen content and CMS-editable slots (text, images,
event listings) are served from the Portal API, which the Launcher
cannot assume is always reachable — a player launching the game while
the API/network is briefly down should not see a broken or blank
launcher.

## DECISION

**Server side is a plain file server with no fallback of its own**:
`launcher-asset-media.controller.ts` streams a file from local disk if it
exists, or 404s — no retry, no caching layer server-side. All resilience
lives client-side, in the WPF Launcher itself.

**Client-side degradation chain** (both `LauncherContentService` for
bootstrap content and `SlotContentService` for CMS slot content
implement the identical shape):

1. Try a fresh API call.
2. Compare `contentVersion`/`schemaVersion`; an unsupported schema is
   treated identically to "unreachable."
3. On success, atomically promote the response into a local cache file
   (temp-file-then-`File.Move`, NTFS-atomic) and render it.
4. On any failure (offline, timeout, parse failure, unsupported schema),
   fall back to the last valid local cache — but only if *its* schema is
   still supported; a hash/content mismatch on load is treated exactly
   like "no cache," never trusted blindly.
5. If no valid cache exists either, fall back to a **packaged fallback
   file** (`fallback-content.json`, shipped next to the exe) — a fully
   disk-independent last resort with its own `HardcodedDefault()` if even
   that file can't be read.

**CMS slot content has no packaged-JSON equivalent** — its last resort is
an empty payload (zero slots), because each individual slot access
already degrades gracefully at the field level (missing text → `null`,
missing bool → caller-supplied default, missing list → empty list) —
this is a deliberate design choice (per `content-cache.md`), not a gap.

**Asset (image) caching runs as a separate mechanism** from JSON content
caching: `AssetCacheService` checks a local file by id+hash first, only
downloads (HTTPS-only) on a cache miss, and atomically promotes the
result the same way. Bootstrap images use SHA-1 hashing in
`cache/assets/`; CMS slot images use SHA-256 in `cache/cms-assets/` —
kept in separate directories/id-namespaces *specifically* to make a UUID
collision between the two systems structurally impossible.

## WHY

A launcher that goes blank or crashes on a transient network blip is
worse than one that briefly shows stale-but-valid content. Layering
fresh → last-known-good cache → packaged-default gives three
independent degradation levels, each strictly more conservative than the
last, so the Launcher always has *something* correct to show. Splitting
bootstrap vs. CMS-slot asset caching by hash algorithm and directory is
a deliberate defense against a cross-system collision, not an
accidental duplication.

## ALTERNATIVES CONSIDERED

- **Server-side caching/CDN fallback**: not chosen for this phase — the
  server-side asset endpoint remains a plain local-disk file server
  (explicitly noted as "LOCAL today... swap to an R2 provider here once
  real Cloudflare R2 credentials exist; nothing else in this module
  changes" — a deliberately deferred, not rejected, future step).
- **Fail loudly on any content-fetch failure**: rejected — a launcher
  that can't render its home screen because of a transient network issue
  is a materially worse player experience than one showing slightly
  stale content with a toast notification.
- **A single shared hash namespace for both bootstrap and CMS assets**:
  rejected — the split (SHA-1/`cache/assets/` vs.
  SHA-256/`cache/cms-assets/`) exists specifically to make a UUID
  collision between the two systems impossible, not to save
  implementation effort.

## CONSEQUENCES

- A stale claim in the Foundation-phase doc
  (`docs/launcher/cache-and-fallback.md`) — "`LauncherContentService` is
  not yet called from `MainWindow`" — was found to be **out of date**
  during this Phase M research and corrected in place (visibly, not
  silently) on 2026-08-31: the service is in fact wired into
  `MainWindow.xaml.cs` and actively invoked on every content-timer tick.
  Any future doc reference to this integration status should cite the
  newer `docs/launcher/content-cache.md`, which was already current and
  correct.
- Any future content type added to the Launcher (a new CMS slot type, a
  new bootstrap field) should follow this same three-level degradation
  pattern rather than inventing a new one, for consistency and because
  the atomic-write/hash-validation discipline here is what makes the
  cache trustworthy.

## RELATED SYSTEMS

`apps/launcher/Services/ContentCache/` (`LauncherContentService.cs`,
`SlotContentService.cs`, `AssetCacheService.cs`,
`PackagedFallbackContent.cs`), `apps/launcher/fallback-content.json`,
`apps/api/src/modules/launcher-studio/launcher-asset-media.controller.ts`,
`docs/launcher/cache-and-fallback.md`, `docs/launcher/content-cache.md`.
