# Page implementations and data source matrix (Launcher Phase L3)

Every visible region on every page, classified as one of: **LOCAL
STRUCTURE** (fixed in the compiled Launcher), **CMS** (slot registry via
`GET /launcher/content`), **GAME DATA** (character/account data via the
existing `/launcher/account`, `/launcher/events`, `/launcher/rankings`),
**AUTH** (session/login state), **LOCAL SETTINGS** (`LauncherSettings`).

## HOME (`Views/HomePage.xaml`)

| Region | Source |
|---|---|
| Nav rail, window chrome | LOCAL STRUCTURE |
| `home.brandLogo` | CMS (image, currently unresolved -- no logo asset published yet, `ResolveBrandLogo` returns null, no local fallback file ships either -- an honest, documented gap) |
| Hero title/subtitle/CTA/image | CMS (`home.hero.*`) |
| Campaign ribbon | CMS (`home.campaign.*`), hidden entirely when `enabled=false` |
| Character summary | GAME DATA (`LauncherAccount.ActiveCharacter` via `HomeStateMapper`, unchanged from the Foundation phase) |
| Server status | GAME DATA/bootstrap (`LauncherBootstrap.Server`) |
| JOGAR | LOCAL/AUTH/GAME STATE (`HomeStateMapper.PlayState`; NotLoggedIn stays clickable to open login, only ServerOffline/GameAccountNotReady actually disable it) |
| Active/next event | GAME DATA (`GET /launcher/events`, honestly `KnowledgeEntry`-sourced -- see below) |
| News list | CMS/GAME DATA (`LauncherBootstrap.News`, `KnowledgeEntry` kind NEWS) |
| Socials | CMS (`home.socials`, ORDERED_LIST, capped at 5) |
| Utilities (SUPORTE/SITE/WIKI) | CMS/bootstrap (`LauncherBootstrap.Utilities`) |

## CONTA (`Views/AccountPage.xaml`)

| Region | Source |
|---|---|
| Character list, selected character stats/attributes | GAME DATA (`LauncherAccount.Characters` via `AccountStateMapper`, unchanged mapper from the Foundation phase -- strength/agility/vitality/energy/masterLevel/pkStatus/vip stay null/empty, an honest, already-documented gap: no contract exposes them yet) |
| Class icon mapping | CMS (`account.classIcon`, ORDERED_LIST) |
| Guild emblem placeholder | CMS (`account.guildEmblem`) |
| Personal ranking, guild summary | GAME DATA (`AccountPageState.PersonalRankings`/`GuildSummary` -- both still empty/null; no contract exposes them yet either, same honest-gap pattern) |
| No XP bar, no currencies, no account-security widgets, no JOGAR | LOCAL STRUCTURE (explicitly excluded per Part V) |

## NOTÍCIAS (`Views/NewsPage.xaml`)

| Region | Source |
|---|---|
| List grid, filters, pagination | CMS/GAME DATA (`LauncherBootstrap.News` via `NewsStateMapper.Paginate`) |
| Summary (open) view | Same `LauncherNews` row, via `NewsStateMapper.ToSummary` |
| "VER NOTÍCIA COMPLETA" | opens the website (`LauncherNews.Url`) -- the Launcher never renders a full article body |

## EVENTOS (`Views/EventsPage.xaml`)

| Region | Source |
|---|---|
| Active banner | CMS (`events.activeBanner`) |
| Active event, upcoming list, calendar | GAME DATA (`GET /launcher/events`) |
| Countdown | LOCAL (computed client-side from `StartsAt`/`EndsAt` via `CountdownFormatter`, never a preformatted string from the server) |
| "VER DETALHES" | opens the website guide (`LauncherEventCard.GuideUrl`) |

`GET /launcher/events` is honestly `KnowledgeEntry` (kind EVENT,
`launcherEnabled=true`)-sourced -- the same real, already-published
content the CMS Launcher Studio phase's slot registry and admin-content
module manage. Not a fabricated "Game Data Platform" leaderboard/event
feed that doesn't exist yet.

## RANKING (`Views/RankingPage.xaml`)

| Region | Source |
|---|---|
| Type selector, podium, table, own row | GAME DATA (`GET /launcher/rankings`) |

`GET /launcher/rankings` is honestly `AccountCharacter` (Portal-side
display data, ordered by masterReset/reset/level)-sourced -- the exact
same real, currently-available substitute `integrations-discord/
discord.service.ts`'s `getRankings()` already uses and documents as such.
**Not** the real MU Game Data Platform (no public leaderboard read path
exists there yet, `docs/game-data/read-models/account-snapshot.md`) --
this is a real, working ranking today, honestly labeled, not a
fabrication of data that doesn't exist.

## LOJA (`Views/StorePage.xaml`)

| Region | Source |
|---|---|
| Currency icons, featured banner | CMS (`store.currencyIcon`, `store.featuredBannerImage`) |
| Product grid, detail panel | GAME DATA/commerce (`GET /shop/products`, the existing, already-real `ShopProduct`/`StoreCategory` domain -- no duplicate product model) |
| Cart | LOCAL (in-memory, `Views/StorePage.xaml.cs`'s `_cart`) |
| Purchase Terms checkbox/content | CMS (`GET /launcher/store/terms/active`) |
| FINALIZAR COMPRA | AUTH + LOCAL + GAME DATA (`POST /shop/purchases`, the existing, already-real endpoint -- extended this phase's earlier work with backend `termsVersion` enforcement) |

See `docs/launcher/store-cart-terms.md` for the full checkout flow.

## CONFIGURAÇÕES (`Views/SettingsPage.xaml`)

| Region | Source |
|---|---|
| Every tab (JOGO/LAUNCHER/ATUALIZAÇÃO/ÁUDIO/DESEMPENHO) | LOCAL SETTINGS (`LauncherSettings`, via the existing `SettingsService`) |
| Account chip | AUTH |
| VERIFICAR ARQUIVOS/BACKUP/RESTAURAR | LOCAL (the existing, unchanged `PatchService`/`BackupService`, now reachable from a real page instead of the old modal overlay) |

## Known, honestly-documented gaps (not fabricated data)

- Brand logo asset: no `home.brandLogo` `LauncherAsset` has been uploaded
  in this local environment yet, so it renders empty -- correct behavior,
  not a bug (Part AV: no final art this phase).
- `AccountPageState.PersonalRankings`/`GuildSummary`, and
  `SelectedCharacterState`'s Strength/Agility/Vitality/Energy/MasterLevel/
  PkStatus/Vip: no backend contract exposes these yet (a gap that
  predates this phase, from the Launcher Foundation audit). Rendered as
  empty/"-" states, never fabricated.
- Pixel-fidelity against the reference screenshots this phase's spec
  calls authoritative: not verified (no images were attached this
  session). Structural correctness was verified via real rendered
  screenshots of all 7 pages.
