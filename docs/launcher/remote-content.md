# Remote content, client side — Launcher Foundation phase

This is the **client-side** companion to
`docs/launcher/remote-content-contract.md` (the server-side contract,
written in Phase 3B, updated this phase with the fields below). That
document says what the backend sends; this one says what the Launcher does
with it.

## STRUCTURE = LOCAL/FIXED, CONTENT = REMOTE

The approved page shell, layout, navigation, animations, and components are
fixed in the Launcher build. The backend never sends coordinates, XAML,
HTML, JavaScript, or any executable behavior — only text, URLs, dates, and
image references (Parts L). `LauncherBootstrap` (`Models/ApiModels.cs`) is
the entire remote-content surface; there is no second channel.

## What's new this phase, on top of the existing contract

`GET /launcher/bootstrap` already returned `server`/`links`/`patchNotes`/
`featured`/`news` before this phase (unchanged). This phase adds, additively
(an older cached response missing these fields just gets the C# defaults,
never a deserialization failure):

| Field | Purpose |
|---|---|
| `schemaVersion` | `LauncherContentService.IsSchemaSupported` gate (Part AB) |
| `contentVersion` | Cheap "did anything change" comparison for the cache (Part C) |
| `campaign` | The Open Beta → Temporada 1 card (Part F) |
| `socials` | Ordered, enable-able social links, capped at 5 (Part G) |
| `utilities` | SUPORTE/SITE/WIKI URLs (Part H) |
| `assets` | Hash-identified asset manifest (Part I, see `docs/launcher/asset-contract.md`) |
| `server.statusSource` / `statusUpdatedAt` | Existed on the API since the Global Portal Audit's P1.2 fix, only now captured client-side |

## Campaign (Part F): how Open Beta becomes Temporada 1

`campaign` is one `SiteSetting` row (key `launcher-campaign`, a JSON value)
on the backend — an admin edits `type`/`title`/`subtitle`/`versionLabel`/
`imageUrl`/`ctaLabel`/`ctaUrl`/`enabled` through the CMS, and the next
bootstrap fetch (or cache refresh) reflects it. No Launcher rebuild, no
redeploy. The card's fixed position/structure never changes — only these
values do.

## Socials (Part G): swapping one network for another

Preferred source: `launcher-social-links` (an ordered JSON array,
`{id,label,url,iconAssetId,order,enabled}`). If unset, the backend
synthesizes the list from the pre-existing flat URL keys (`discord`,
`whatsapp`, `instagram`, `youtube`, `x`) so nothing regresses on an install
that never sets the new key. Either way, the response — and, in
`SocialLinkPolicy.Cap`, the client too, as defense in depth — never exceeds
`MAX_SOCIAL_ITEMS = 5`. Replacing Facebook with a different network is a
CMS edit to `launcher-social-links`, not a Launcher change.

## Utilities (Part H)

Fixed set: `support` (`launcher-support-url`, new this phase),
`site` (`launcher-website-url`, existing), `wiki` (`launcher-wiki-url`, new
this phase). `ENTRAR`/`SAIR` is a local auth action, never content — it is
not part of this list.

## Why no second CMS was built (Part AC/AD)

`SiteSetting` (generic key/value, category-scoped) already covers
campaign/socials/utilities via new keys on the existing model — no new
table. `KnowledgeEntry` (kind `NEWS`/`EVENT`) already covers news/events.
The only genuinely new persistence this phase touches is four new
`SiteSetting` keys (`launcher-campaign`, `launcher-social-links`,
`launcher-wiki-url`, `launcher-support-url`) — reusing the exact mechanism
Phase 3B already established, not a parallel system. See
`docs/launcher/remote-content-contract.md`'s own note on the Phase 3B
mistake this deliberately avoids repeating.

Everything the CMS boundary needs to support later (Part AD) — Open Beta →
Temporada 1, changing an image, changing an event, changing a social icon/
link, disabling Facebook, enabling another network, changing site/wiki/
support URLs, publishing news — is already reachable by editing rows in
`SiteSetting`/`KnowledgeEntry`/`ReferenceAsset` through whatever admin
tooling already writes them; no new backend capability is required, only
(eventually) an admin UI for it, which this phase does not build (Part AD).
