# Launcher slot registry

`apps/api/src/modules/launcher-studio/slot-registry.ts`. This file -- not a
database table -- is the single source of truth for every editable region
the Launcher exposes to the CMS. Adding a slot means adding an entry here
(a reviewed code change); the CMS can never invent one.

## Scope: global/structural slots only

The registry covers **global, singleton** content regions: one hero, one
campaign banner, the fixed social/utility rail, class-icon and
currency-icon mappings, page-level banners.

It deliberately does **not** cover per-entity editorial content --
individual News articles, individual Events, individual Store products.
Each of those is already its own collection with its own CRUD/draft-publish
lifecycle:

- News/Events -- `KnowledgeEntry` (kind `NEWS`/`EVENT`), via the existing
  `admin-content` module, extended this phase with Launcher-specific fields
  (see below).
- Store products -- `ShopProduct`/`StoreCategory`/`ShopProductVariant`, via
  the existing `commerce` module. Not touched by Launcher Studio beyond a
  read-only preview.

Forcing a one-of-many News article through a singleton slot table would
both violate "one row per slot id" and duplicate a CRUD system that already
exists -- exactly what Part A's audit asked to avoid.

## Slot shape

```ts
interface SlotDefinition {
  id: string                 // "home.hero.title"
  page: LauncherPageKey       // HOME | ACCOUNT | NEWS | EVENTS | RANKING | STORE | SETTINGS
  label: string
  description: string
  type: SlotType               // IMAGE | TEXT | RICH_TEXT_LIMITED | LINK | COLOR_TOKEN |
                                // FONT_TOKEN | BOOLEAN | ORDERED_LIST | REFERENCE | DATE_TIME
  required: boolean
  constraints: SlotConstraints // maxLength, aspectRatio, allowedFormats, maxItems,
                                // itemShape, assetCategory, referenceKind, ...
  visualTokens: VisualTokenAxis[] // which token axes this slot may override
  defaultValue: unknown
}
```

A composite concept the reference images name as one slot (e.g. "hero") is
modeled as several concrete registry entries (`home.hero.image`,
`home.hero.title`, `home.hero.subtitle`, `home.hero.ctaLabel`,
`home.hero.ctaUrl`, `home.hero.enabled`) -- the same decomposition
`launcher.service.ts`'s existing `CampaignContent` interface already uses,
kept consistent rather than inventing a second convention.

## Current registry (by page)

| Page | Slots |
|---|---|
| HOME | `brandLogo`, `hero.{enabled,image,title,subtitle,ctaLabel,ctaUrl}`, `campaign.{enabled,title,subtitle,versionLabel,image,ctaLabel,ctaUrl}`, `activeEvent`, `nextEvent`, `socials` (ordered, max 5), `utilities.{support,site,wiki}.url`, `characterClassIcon` (ordered, max 12) |
| ACCOUNT | `classIcon` (ordered, max 12), `guildEmblem` (generic placeholder image) |
| EVENTS | `activeBanner` |
| RANKING | `classIcon` (ordered, max 12) |
| STORE | `currencyIcon` (ordered, exactly 3 -- WCOIN/GOBLIN_POINT/HUNT_POINT), `featuredBannerImage` |
| NEWS, SETTINGS | none today -- News is 100% per-article (KnowledgeEntry); Settings has no marketing content |

This list was built from the CMS spec's own example slot names plus the
Launcher's already-shipped bootstrap contract (campaign/socials/utilities/
news, `docs/launcher/remote-content.md`). The approved visual reference
images that would let a future pass confirm every slot pixel-for-pixel
were not available as file input this session -- treat this registry as a
faithful first pass to review against those images, not as final.

## Enforcement

Every write goes through `slot-validator.ts`'s `validateSlotValue`, which
checks the value against the slot's declared `type` and `constraints`, and
any visual-token override against the slot's declared `visualTokens` and
the global token allowlists (`FONT_TOKENS`, `COLOR_TOKENS`, ...). An
`IMAGE`/asset-`REFERENCE` value must name a real `LauncherAsset` row --
there is no way to submit a bare URL, path, or data URI directly into a
slot. There is no code path anywhere in `launcher-studio.service.ts` that
accepts CSS, XAML, HTML, JavaScript, or an x/y/width/height value.

## Additive News/Event fields on KnowledgeEntry

Rather than a second News/Event model, `KnowledgeEntry` (already the
source for the Launcher's news list) gained nullable, defaulted columns
this phase: `launcherEnabled`, `launcherSummary`, `body`, `eventStartsAt`,
`eventEndsAt`, `recommendedLevel`, `entryInfo`, `guideUrl`,
`calendarEnabled`. Every pre-existing row is unaffected (defaults:
`launcherEnabled=false`, `calendarEnabled=false`, the rest `null`). See
`schema.prisma`'s `KnowledgeEntry` comment and the migration
`20260825190000_launcher_cms_studio`.
