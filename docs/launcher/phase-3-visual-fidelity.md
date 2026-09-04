# Launcher Phase 3 — visual fidelity

Base: `launcher/phase-2d-release`, on top of production commit
`14277757ce1f6bf17b24833658571a502b183671` (Phase 2D). Per
`docs/launcher/phase-2d-production-validation.md`, Phase 2D is live in
production (confirmed by Bryan; Codex's own deploy record dated
2026-09-03). This phase is Launcher-visual-only — no API, GameServer,
economy, VIP, payment, or auth-logic change.

## What changed, and why

**News (`Views/NewsPage.xaml`, `.xaml.cs`)** — the previous 2x2 card grid
and the TODAS/ATUALIZAÇÕES/EVENTOS tab row were both explicitly rejected
by Bryan. Replaced with a single-column editorial list (category badge,
title, date, VER RESUMO). `NewsFilter`/`NewsStateMapper`'s filtering logic
is untouched, fixed to `Todas`, so a tabbed filter can come back later
without re-deriving the backend-facing logic.

**Home (`Views/HomePage.xaml`, `.xaml.cs`)** — Bryan resolved an explicit
conflict this phase: the attached approved Início reference wins over the
prior implementation's vertical "PERSONAGEM" card, which was not itself a
Bryan-approved override. The right column now matches the reference's
order: a compact horizontal character card, EVENTO ATIVO, PRÓXIMO EVENTO,
then a large primary JOGAR button. The hero card and the optional
CMS-driven campaign card (Part F, collapsed unless configured) stayed in
the left column, unchanged in behavior.

Two related, additive-only C# changes, both using only real, already-fetched
data — nothing fabricated:
- `ApplyServerAndCharacter` now appends Master Reset and Guild to the
  character detail line when `_context.Account?.ActiveCharacter` actually
  has them (real fields on the existing `GET /launcher/account` DTO,
  simply not read before). Omitted rather than shown as a placeholder
  when a character has no guild or a zero master reset.
- `ApplyEventsAsync` now renders the active event's name and countdown as
  separate elements and adds a real "VER EVENTO" button wired to the
  event's own `GuideUrl` (an existing field on `LauncherEventCard`,
  already used the same way by `EventsPage`) — hidden when the event has
  no guide URL, never a dead link.

## What was reviewed and left unchanged

Account, Events, Ranking, Store, and Settings' JOGO tab were each compared
against their reference image via real screenshots of the running Release
build (not just XAML reading). Each was found already structurally close
and already compliant with the relevant Bryan override (Account: no large
portrait, no email/password, already true; Store: no oversized decorative
header icon, cart preserved, already true). Two specific, checked reasons
nothing else changed:

- **Ranking's tab count**: the reference shows 8 ranking types; this
  branch's `RankingPage.xaml` has 3 (MASTER RESET/RESETS/LEVEL).
  Checked directly against `apps/api/src/modules/launcher/launcher.service.ts`
  — the backend's `rankings()` method only ever returns
  `availableRankingTypes: ['masterReset', 'resets', 'level']`. The other
  5 (Blood Castle, Devil Square, Chaos Castle, Castle Siege, Duel) have no
  backend ranking computation to back them. Not added — a visual phase
  cannot fabricate ranking data.
- **Account's logged-in pixel comparison**: not captured live this
  session. The locally saved test session's refresh token was invalidated
  by an earlier QA logout, and completing a fresh local login requires a
  real Turnstile challenge served by the local web dev server, which
  wasn't stood up this session. The structural XAML comparison (character
  list, selected-character stat grid, attributes, ranking/guild panels)
  already matches the reference's column layout and field set; this is
  recorded as not independently pixel-verified, not as a known defect.

## Explicitly out of scope this phase

`SettingsPage.xaml`'s LAUNCHER tab (the Compacta/Padrão/Ampliada interface-scale
and text-scale controls shown in the reference) — that code exists only
in the uncommitted `open-beta/p0-foundation` worktree and has never been
isolated into a release branch, the same situation Phase 2D's own auth
code was in before its isolation. Porting it is a separate, dedicated
isolation task, not a visual-styling change. `SETTINGS_SCALE_SECTION =
BLOCKED_SEPARATE_ISOLATION`.

## Verification performed

- `dotnet build`, Release: 0 warnings, 0 errors (both edits, verified
  independently after each).
- `dotnet test`, Release: 157/157 passing, both before and after each
  edit — the same baseline this branch has carried since Phase 2D's own
  isolation (no test regression, no coverage change; News/Home have no
  dedicated UI tests of their own, consistent with the rest of this
  suite's convention of testing mappers/services, not XAML).
- Real screenshots of the running built `.exe`, before and after, for
  Home and News specifically (the two pages actually changed), confirmed
  the intended structure renders. Screenshots for Account/Events/Ranking/
  Store/Settings were taken once (before this pass) and are still
  accurate since those pages were not modified.
- Scale-factor QA (Compact/Large/Compact+Large-Text) was **not**
  performed — the scale system does not exist in this branch's source at
  all (see "explicitly out of scope" above), not merely untested.
- No production call was made at any point — all QA ran against the
  already-running local API (`http://localhost:3333`) with the local
  `launcher.settings.json` temporarily repointed and restored byte-for-byte
  afterward each time.

## Production status

No deploy, no push, no production mutation occurred in this phase. This
branch (`launcher/phase-2d-release`) remains uncommitted beyond Phase 2D's
own commit plus Bryan's `docs(launcher): record phase 2d production
validation` — the Home/News visual changes described here sit as verified,
uncommitted working-tree changes pending an explicit request to commit,
consistent with this project's standing "never commit unless asked"
discipline.
