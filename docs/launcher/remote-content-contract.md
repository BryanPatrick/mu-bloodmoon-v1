# Launcher remote content contract — Phase 3B

Part L asked for a fixed-structure/remote-content contract (Campaign,
News, Events, Social, Utilities) with the Launcher owning structure and
the backend owning content. **This already exists** —
`LauncherService.bootstrap()` (pre-dating this phase) is backed by
`SiteSetting` + `KnowledgeEntry`, not a new content system. This document
records that existing shape rather than proposing a second, parallel one
(Part W: "reusing what exists beats a parallel CMS").

## Why no new Prisma models were added this phase

An early draft of this phase mistakenly added five new models
(`LauncherCampaign`, `LauncherNewsItem`, `LauncherEvent`,
`LauncherSocialLink`, `LauncherUtilityLink`) and, worse, overwrote the
already-working `launcher.service.ts`/`launcher.controller.ts`/
`launcher.module.ts` with a parallel implementation before checking what
already existed. This was caught, reverted (`git checkout`), and the new
models were dropped from the schema/migration before anything was
committed — see `docs/accounts/unified-account-implementation.md`. The
lesson embedded in this document: `SiteSetting` (generic key/value CMS
rows, category-scoped) + `KnowledgeEntry` (kind-typed content, `NEWS`/
`EVENT` among others) already cover everything Part L asked for.

## The real content contract

### Server / Campaign-equivalent (`SiteSetting`, category `launcher`/`server`)

| Key | Shape | Notes |
|---|---|---|
| `launcher-server-name` | string | |
| `launcher-realm-name` | string | |
| `launcher-server-status` | string | e.g. `ONLINE` — presence of this row is what flips `statusSource` to `MANUAL` |
| `launcher-online-players` | number | admin-set, **not** live telemetry — see the honesty note below |
| `launcher-maintenance` | `{ active: boolean, message: string }` | |
| `launcher-client-version` | string | |
| `launcher-last-patch` | string \| null | |
| `launcher-manifest-url` | string (URL) | |
| `launcher-patch-notes` | string[] | |

**Honesty rule, unchanged since the Global Portal Audit's P1.2 fix**:
`statusSource` is `MANUAL` (an admin explicitly set the value) or
`UNKNOWN` (nobody has) — never `LIVE` today. `LIVE` is reserved for a
future phase with a real GameBridge-derived basis for the claim; setting
it today would misrepresent admin-entered data as confirmed live
telemetry. This is why the Discord integration (Part P/Q) deliberately
omits online-player count entirely rather than exposing the same
non-authoritative admin-set number publicly.

### Social / Utilities (`SiteSetting`, category `social`/`launcher`)

| Key | Notes |
|---|---|
| `launcher-website-url`, `launcher-news-url` | Utility links |
| `launcher-discord-url`, `launcher-whatsapp-url`, `launcher-instagram-url`, `launcher-youtube-url`, `launcher-x-url` | Social links |

No `enabled`/`order` fields exist on these today (they are flat
key/value settings, not a typed, orderable list) — if a future phase
needs per-link ordering/visibility toggles, that is a real, scoped
addition to make at that time, not something this phase invents
speculatively.

### News / Events (`KnowledgeEntry`, `kind: NEWS | EVENT`, `scope: SEASON_6`, `status: PUBLISHED`)

| Field | Notes |
|---|---|
| `id`, `slug`, `title`, `summary` | |
| `kind` | `NEWS` or `EVENT` |
| `imageUrl` | resolved from the entry's linked `ReferenceAsset` (first `IMAGE`-kind asset) |
| `publishedAt` | `updatedAt` |
| `url` | derived: `https://mubloodmoon.com.br/noticias/{slug}` |

`KnowledgeEntryKind` has more values than `NEWS`/`EVENT` (`PAGE`,
`BANNER`, `DOWNLOAD`, `NAVIGATION`, `CHARACTER`, `EQUIPMENT`, `ITEM`,
`MAP`, `MONSTER`, `DROP`, `SKILL`, `QUEST`, `NPC`, `GUIDE`, `LORE`,
`SYSTEM`) — the Launcher bootstrap only ever reads `NEWS`/`EVENT`; the
others belong to the separate wiki/reference-data system
(`docs/game-data/legacy-web-intelligence/` is unrelated to this — that's
MU SQL discovery, this `KnowledgeEntry` model is a Portal-side content
system with its own, different ingestion pipeline).

## Structure vs. content

Unchanged principle: the Launcher's fixed UI structure never changes
remotely — no arbitrary layout coordinates are ever sent from the
backend (Part L). Only text/URLs/dates flow through the contract above.
