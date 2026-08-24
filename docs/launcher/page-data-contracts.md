# Page data contracts — Launcher Foundation phase

`Models/PageState.cs`. **State/data contracts only** — no XAML, no layout,
no final visual implementation (Part AJ). The approved visual design for
HOME/CONTA/NOTÍCIAS/EVENTOS/RANKING/LOJA/CONFIGURAÇÕES is still being
finalized externally; this phase prepares exactly what a future view will
bind to, nothing more.

## Structure vs. content, restated per page

The fixed page shell (which widgets exist, where they sit) is never remote
— only the values inside these state objects come from the backend. See
`docs/launcher/remote-content.md` for the client-side remote-content model
these states are partly built from.

## HOME (Part N)

`HomeState` — the **only** page with `Campaign`, `CharacterSummary`,
`ActiveEvent`/`NextEvent`, `LatestNews`, `PlayState`, `ServerState`. These
widgets are not automatically reused on the internal pages (Part N is
explicit about this). `HomeStateMapper.Map(bootstrap, account, isLoggedIn)`
is a real mapper from the already-populated `/launcher/bootstrap` +
`/launcher/account` responses.

Auth-expiry / logout behavior (Part Y, Part AG's "auth-expiry behavior" and
"public content retained after logout" tests): calling `Map` with
`isLoggedIn: false` clears `CharacterSummary` and sets
`PlayState.NotLoggedIn`, while `Campaign`/`ServerState`/`LatestNews` (all
public bootstrap content) are untouched — proven directly by
`HomeStateMapperTests.Map_AfterLogout_ClearsAccountStateButRetainsPublicBootstrapContent`
and its auth-expiry counterpart. This reuses the existing
`SessionStore`/session-refresh signal ("do I have a valid session right
now") rather than inventing a second auth concept (Part Y: don't redesign
authentication).

## CONTA (Part O)

`AccountPageState` — `Characters` (list) + `SelectedCharacter` +
`PersonalRankings` + `GuildSummary`. `AccountStateMapper.Map(account)` is a
real mapper from `/launcher/account`'s existing `characters[]`
(Portal-local `AccountCharacter`: name/className/level/reset/masterReset/
guild). Fields no current contract provides —
strength/agility/vitality/energy, masterLevel, pkStatus, vip,
personalRankings, guildSummary detail beyond the guild name — stay
null/empty, an honest, documented gap for a future Game Data integration,
never a fabricated value (this project's SOURCE/RAW/NORMALIZED/DERIVED
discipline forbids guessing at un-evidenced game data).

`SelectedCharacterState.Command` is populated only when
`CharacterClassRules.SupportsCommand(className)` is true (today: Dark
Lord, case-insensitive match) — every other class leaves it `null` (Part
O: "command somente quando aplicável").

Missing `ClassIconAssetId`/`EmblemAssetId` resolve through
`PlaceholderResolver.NeedsPlaceholder` to a local, neutral placeholder
(`Assets/Placeholders.xaml`) — placeholders are local-only, never treated
as remote content that needs fetching (Part W).

## NOTÍCIAS (Part P)

`NewsListState` (filter: Todas/Atualizações/Eventos, ~4 items/page,
`TotalPages` computed) and `NewsSummaryState` (category/title/date/hero/
launcher summary/full-article URL). `NewsStateMapper.Paginate`/`ToSummary`
are real mappers over `/launcher/bootstrap`'s existing `news[]`. The full
article always lives on the website — the Launcher never renders long-form
article bodies.

## EVENTOS (Part Q)

`EventsPageState` (`ActiveEvent`, `UpcomingEvents`, `MonthlyCalendar`).
**No backend contract exposes event schedules yet** — `KnowledgeEntry`
(kind `EVENT`) only carries title/summary/image/url today, none of
startsAt/endsAt/recommendedLevel/entryInfo. `EventsStateMapper.Build` is
therefore a pure shaping function (ordering upcoming events by start time,
the monthly calendar by date) over already-typed rows a future data source
will supply — not an end-to-end mapper from a real DTO, since fabricating
that DTO mapping today would mean inventing game/event data that was never
evidenced. Wiring a real source is explicitly future work.

## RANKING (Part R)

`RankingPageState` with `RankingTopFiveState` (named slots — `First`
through `Fifth` — for the fixed podium layout: 1st center, 2nd left, 3rd
right, 4th left of 2nd, 5th right of 3rd) and a paginated `Table`, plus a
separately pinned `OwnPosition`. **No ranking endpoint exists yet** — same
reasoning as Events: `RankingStateMapper.BuildTopFive`/`Paginate` are pure,
real, tested layout/pagination logic over rows a future source supplies.

## LOJA (Part S)

`StorePageState` — `WC`/`GP`/`HP` only, never real-money currency, never a
checkout flow. `ProductCardState` mirrors the header/image/description/
footer(currency+price) hierarchy described in Part S. **No store endpoint
exists yet**; `StoreStateMapper.FilterByCurrency` is the one real, tested
piece of logic (currency-scoped product filtering).

## CONFIGURAÇÕES (Part T)

`SettingsPageState` wraps the existing `LauncherSettings` model (extended
additively this phase with `Quality`, `CloseLauncherAfterGameStarts`,
`MinimizeToTray`, `StartWithWindows`, `UiAnimationsEnabled`,
`PerformanceMode`, `UiEffectsVolume`) rather than duplicating its fields,
plus three runtime-only fields (`InstalledVersion`, `LatestVersion`,
`FileVerificationState`) sourced conceptually from the existing
`PatchService`/`LauncherUpdateService` — this phase only defines the state
shape, it does not change how verification/update actually runs. Settings
data stays entirely local — never remote business content (Part T).

## Navigation (Parts U/V)

`Services/Navigation/NavigationService.cs` — `PageKey` (the 7 pages),
`INavigablePage.OnPageLeaving`/`OnPageEntering` hooks, selected-page state,
a `Navigated` event. Deliberately not wired to any WPF `Frame`/`Page` —
`apps/launcher` has no page views today (Part A's audit), so there is
nothing real to route to yet. This is a tested, standalone contract
(`NavigationServiceTests.cs`, 5 tests) ready for a future page host to
register against, with no animation orchestration built in (Part V defers
that explicitly).
