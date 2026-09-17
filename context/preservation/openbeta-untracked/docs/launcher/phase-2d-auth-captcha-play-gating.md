---
status: ACTIVE — real auth contract closed and locally verified end-to-end; production QA still required
category: launcher
audience: internal (product + engineering + security)
lastVerified: 2026-09-04
confidence: CONFIRMED (real code, real local end-to-end QA); PRODUCTION_QA_REQUIRED explicitly separated from what was proven locally
---

# Launcher Phase 2D — authentication + CAPTCHA + unified account + Play gating closure

Continuation of [Launcher Phase 2C](../handoff/) (real production secret
rotation, `launcher/desktop-phase-1` branch — a git worktree of the same
repository as this one, `open-beta/p0-foundation`, sharing history but
having diverged; see this document's own "Branch note" below). Phase 2C
was investigation/ops only — no Launcher code changed. This phase closes
the real, primary blocker Phase 2C identified: the Launcher's login
contract had no `captchaToken`, while the real production API requires
one on every `POST /auth/login` call.

```
LAUNCHER_PHASE_2D = PASS (local); PRODUCTION_QA_REQUIRED (see Part 22 below)
```

## Branch note (bootstrap Part 1)

This phase's code changes were made in `open-beta/p0-foundation`
(this checkout, `mu-bloodmoon-v1-openbeta`) — the actively-developed
branch this whole multi-phase session has worked in, including
Part 8's LauncherScale/TextScale work the day before, which this
phase's own "current status" section explicitly treats as current.
Phase 2C's real findings (secret rotation, QA account discovery, DPI/
QA blockers) live in `launcher/desktop-phase-1`'s own working tree
(`mu-bloodmoon-launcher-phase1` on disk) as uncommitted docs — a
separate worktree of the same GitHub repository
(`BryanPatrick/mu-bloodmoon-v1`), diverged by only 3 commits (CMS
asset-contract work, unrelated to auth). No code conflict exists
between the two: Phase 2C touched zero Launcher C# files. This
document ports Phase 2C's real findings into this branch's own docs
tree (Part 23's "preserve Phase 2C as historical" instruction) rather
than leaving them stranded in a worktree this branch's own history
doesn't include.

## Part 1 — Auth contract audit (real code, not the Phase 2C summary alone)

Read directly from `apps/api/src/modules/auth/`:

```
REQUIRED_LOGIN_FIELDS = [username, password, captchaToken]
  (auth.contract.ts's LoginRequest -- captchaToken is NOT optional)
OPTIONAL_LOGIN_FIELDS = [totpCode, recoveryCode]
CAPTCHA_REQUIREMENT = REAL, server-enforced (captcha.service.ts's
  CaptchaService.verify(), called via @AuthAbuseProtection({captchaAction:'login'})
  on POST /auth/login) -- calls the real Cloudflare
  /turnstile/v0/siteverify endpoint, checks success + action match +
  hostname match (TURNSTILE_EXPECTED_HOSTNAMES)
TWO_FACTOR_BEHAVIOR = if account.twoFactorEnabled, login() requires a
  valid totpCode OR a valid recoveryCode; a first attempt with neither
  throws {code:'TWO_FACTOR_REQUIRED'} (401) WITHOUT consuming the
  per-account attempt-rate budget (only a call that actually submitted
  a code counts); repeated bad codes eventually throw
  {code:'TWO_FACTOR_RATE_LIMITED'} (429)
ACCOUNT_RESTRICTIONS = account.status !== 'ACTIVE' fails login with the
  SAME generic 401 "Invalid credentials" as a wrong password -- the API
  deliberately does not distinguish "wrong password" from "suspended
  account" at login time (anti-enumeration). A real, separate
  PaymentRiskAction.ACCOUNT_RESTRICTION enum value exists in the schema
  but is NOT wired to any enforcement point yet (schema's own comment:
  "not yet wired to an enforcement point") -- there is no real backend
  signal for a POST-login "this account is restricted from playing"
  state today. PlayGateEngine models AccountRestricted for when one
  exists; nothing in the real API can trigger it yet.
GAMEREADY_BEHAVIOR = GET /launcher/me (JWT-protected, pre-existing,
  previously unused by any UI flow) returns
  { accountId, username, role, gameReady, provisioningStatus }.
  gameReady = provisioningStatus === 'ACTIVE' && membGuid !== null
  (GameAccountIdentityService.isGameReady, the single authoritative check).
PROVISIONING_BEHAVIOR = provisioningStatus is one of
  NONE/PENDING/PROVISIONING/ACTIVE/FAILED (real enum, GameAccountIdentity's
  own field, unchanged this phase -- no new provisioning engine built).
JWT_REFRESH_BEHAVIOR = POST /auth/refresh re-validates account status,
  sessionVersion, and the AccountSession row (revoked/expired both
  reject); a new login always revokes every other active session for
  that account (sessionVersion increment).
FAILURE_CODES_CONFIRMED_WITH_A_REAL_CODE_FIELD = [TWO_FACTOR_REQUIRED,
  TWO_FACTOR_RATE_LIMITED]
FAILURE_CODES_WITHOUT_A_DISTINCT_CODE = captcha rejection (400,
  BadRequestException with only a message), captcha provider
  unavailable (503), invalid credentials (401, generic) -- AuthErrorMapper
  falls back to HTTP-status heuristics for these, matching
  apps/web/composables/useAuth.ts's own already-established mapping,
  not inventing new precision the backend doesn't provide.
```

## Part 2 — Legitimate Turnstile flow for the desktop Launcher

`Services/CaptchaChallengeService.cs` hosts a `Microsoft.Web.WebView2.Wpf.WebView2`
control (`Microsoft.Web.WebView2` NuGet, Microsoft's own officially
supported embedded-Chromium control) that navigates to a real, hosted
page — `apps/web/pages/launcher/captcha.vue` — reusing the *exact same*
`TurnstileWidget.vue` component and site key the main web login page
uses (`action="login"`, matching `auth.controller.ts`'s
`captchaAction: 'login'` exactly, since `CaptchaService.verify()`
rejects a mismatched action). The resulting token is read back through
WebView2's own real, documented JS-to-native bridge
(`window.chrome.webview.postMessage` on the page,
`CoreWebView2.WebMessageReceived` in the service).

```
CAPTCHA_BYPASS = NO
  - no hardcoded success token anywhere in the codebase
  - no production test key used in the real client path (the widget
    renders whatever NUXT_PUBLIC_TURNSTILE_SITE_KEY the web deployment
    configures -- production's real key in production, the real
    Cloudflare-published always-pass TEST key in this project's own
    local .env, same as the main web login page already used before
    this phase)
  - no special Launcher-only header, flag, or CaptchaService exception
    exists or was added
  - a null/empty token from the challenge simply stops the flow before
    any /auth/login call is made (LoginButton_Click)
```

**Why the challenge is a real, hosted page and not a bundled local
file**: Turnstile's own hostname allowlist
(`TURNSTILE_EXPECTED_HOSTNAMES`, checked server-side) validates the
origin the widget rendered on. A `file://`/embedded-HTML origin would
either fail that check or require weakening the allowlist — neither
acceptable. `LauncherApiClient.IsSecureOrLoopback` (new this phase)
requires HTTPS for any non-loopback host, with a narrow, well-precedented
loopback-only HTTP exception (the same reasoning RFC 8252 uses for
OAuth's `http://localhost` redirect URIs) — needed because this
project's local dev API/web run on plain HTTP with no local TLS setup;
any real remote host still requires HTTPS exactly as before.

## Part 3 — CAPTCHA UX (exact strings)

`captcha.vue`'s status line and `MainWindow.xaml`'s `CaptchaStatusText`
both use the exact required Portuguese strings: *"Confirme que você é
uma pessoa para continuar."* (initial), *"Verificação concluída."*
(success), *"Não foi possível concluir a verificação. Tente
novamente."* (failure) — never a technical message, never
`captchaToken missing`/`Turnstile validation failed` in the main UI.

## Part 4 — Login payload (real contract alignment)

`Models/ApiModels.cs`'s `LoginPayload` gained `CaptchaToken` (required
by the real contract, previously entirely absent) and `RecoveryCode`
(the real, existing 2FA-recovery alternative to `TotpCode`,
`auth.service.ts`'s own `consumeRecoveryCode` path, previously never
sent). None of `Password`/`CaptchaToken`/`TotpCode`/`RecoveryCode` are
persisted anywhere beyond the single short-lived payload object —
`SessionStore` only ever writes `AccessToken`/`RefreshToken` (DPAPI-
encrypted, unchanged this phase).

## Part 5 — Login state machine

`Models/LoginState.cs` (new): `LoggedOut/CaptchaRequired/Authenticating/
TwoFactorRequired/Authenticated/AuthFailed/AccountRestricted/SessionExpired`,
tracked on `LauncherAppContext.LoginState`, driven entirely by
`MainWindow.LoginButton_Click` and `AuthErrorMapper.Map`. Deliberately
separate from `PlayState` (`Models/PageState.cs`) — see
`Services/PlayGateEngine.cs`'s own header comment for the exact
boundary: LoginState governs the login overlay; PlayState governs the
Play button; the two connect only via `isLoggedIn`.

## Part 6 — 2FA/TOTP

- **No 2FA**: `LoginTotpPanel` stays `Collapsed` (new this phase — was
  always-visible before, a real, if minor, UX improvement matching
  "Player should only be prompted for TOTP when required"); a bare
  username+password+captcha submission succeeds directly.
- **2FA required**: the real API's `TWO_FACTOR_REQUIRED` code (received
  on the *first* submit, before any code was sent) maps to
  `LoginState.TwoFactorRequired`, which makes `LoginTotpPanel` visible;
  the player re-submits (a **fresh captcha challenge is re-run** — see
  Part 2 — Cloudflare tokens are single-use) with the code filled in.
- **Valid/invalid TOTP**: the real API does not distinguish "no code
  yet" from "wrong code" at the error-code level (both are
  `TWO_FACTOR_REQUIRED`) — confirmed by reading `auth.service.ts`
  directly, not assumed. `AuthErrorMapperTests.INVALID_TOTP_REJECTED`
  documents this exact real behavior rather than inventing a
  `INVALID_TOTP` code the backend doesn't emit.

## Part 7/8 — Unified account + provisioning

`GET /launcher/me` (pre-existing, previously unused by any UI flow) is
now called in `MainWindow.RefreshAccountAsync`, alongside the existing
`GET /launcher/account` call, and stored on `LauncherAppContext.Me`.
No new provisioning engine was built — `provisioningStatus`'s real
enum (`NONE/PENDING/PROVISIONING/ACTIVE/FAILED`) and
`GameAccountIdentityService.isGameReady`'s real check are reused
exactly as they already existed on the API side.

## Part 9/10 — Play gating + reasons (the real primary fix)

`Services/PlayGateEngine.cs` (new) is a pure, fully unit-tested gate
function. The real, confirmed bug it fixes:
`HomeStateMapper.ResolvePlayState` (pre-existing) only ever checked
`isLoggedIn` and server maintenance — `PlayState.GameAccountNotReady`
existed in the enum but was **structurally unreachable** (`gameReady`/
`provisioningStatus` were never consulted at all). This is exactly the
"gate Play only by JWT presence" anti-pattern this phase's own
instruction named — confirmed present, now fixed, with a real
regression test (`Map_WhenLoggedInButNotGameReady_DoesNotClaimReadyToPlay`)
guarding the old bug from returning.

```
PLAY_GATE_TABLE (all real, all tested -- PlayGateEngineTests.cs):
  LOGGED_OUT                              -> BLOCK (button stays clickable, opens login)
  isLoggedIn=false (covers CAPTCHA/2FA incomplete -- see Part 5's LoginState/PlayState boundary) -> BLOCK
  AUTHENTICATED, gameReady=false          -> BLOCK, "Sua conta de jogo ainda está sendo preparada."
  provisioningStatus PENDING/PROVISIONING -> BLOCK, same message
  provisioningStatus FAILED               -> BLOCK, "Não foi possível preparar sua conta de jogo."
  accountRestricted=true (no real trigger yet, see Part 1) -> BLOCK, "Sua conta possui uma restrição..."
  server maintenance active               -> BLOCK, "O servidor está temporariamente indisponível."
  AUTHENTICATED + gameReady=true + no restriction -> ALLOW, "JOGAR"
```

`PlayButton_Click` (HomePage.xaml.cs) also re-evaluates the gate
directly before invoking `StartGame`, not relying solely on
`IsEnabled` — real defense-in-depth against a stale UI state.

## Part 11 — Session/token handling

Unchanged this phase, audited: `SessionStore` uses Windows DPAPI
(`ProtectedData.Protect`, `CurrentUser` scope) for the on-disk session
file — real, already-correct encryption at rest. Access/refresh tokens
are never written to any log, exception message, or toast anywhere in
the codebase (verified by `PASSWORD_NEVER_LOGGED`/`CAPTCHA_TOKEN_NEVER_LOGGED`
static source-scans, and by direct reading of every catch block that
touches a `LoginResponse`/`AuthApiException`).

## Part 12 — Account page (CONTA)

New, read-only "STATUS DA CONTA" card
(`AccountPage.xaml`/`.xaml.cs`'s new `ApplyAccountStatus`): a plain
Portuguese sentence for game-readiness (never a raw `provisioningStatus`
code) and for 2FA (`_context.TwoFactorEnabled`, captured from the real
login response's `SessionUser.TwoFactorEnabled`, previously received
but never read anywhere). This narrows, not removes, an earlier
"Part V" exclusion of *interactive* account-security management
controls (2FA setup/disable, which still live only on CONFIGURAÇÕES) —
a read-only status line is a distinct, narrower thing this phase's own
instruction explicitly asks this page to show.

## Part 13/14 — Local QA environment + Turnstile testability

Real local API (`http://localhost:3333`) + real local
`bloodmoon_local_claude` DB + real local web (`http://localhost:3010`,
serving `/launcher/captcha`) — never pointed at production. A real QA
account was created through the actual `POST /auth/register` endpoint
(`qa2d_launcher`, no 2FA, `gameReady=false`/`provisioningStatus=NONE`
— itself a real, useful test fixture for the "not ready" gate case).
`apps/api/.env`'s `TURNSTILE_SECRET_KEY` was set to Cloudflare's own
published, public "always-passes" **test** secret
(`1x0000...000AA`, already referenced by name in `captcha.service.ts`'s
own `TURNSTILE_ALWAYS_PASS_TEST_SECRET` constant) — `apps/web/.env`'s
`NUXT_PUBLIC_TURNSTILE_SITE_KEY` already used the matching test site
key before this phase. This is a **real** Cloudflare API round-trip
(confirmed via a direct `curl` call to `challenges.cloudflare.com`),
not a mock — the distinction Part 14 asks for:

```
CAPTCHA_WPF_FLOW = PASS (real, live-verified end-to-end -- see Part 21)
CAPTCHA_PROVIDER_VALIDATION_LOCAL = PASS, using Cloudflare's own
  real, published test credentials (a genuine network round-trip to
  the real Cloudflare siteverify endpoint, not a local mock)
CAPTCHA_PROVIDER_VALIDATION_WITH_PRODUCTION_CREDENTIALS = PRODUCTION_QA_REQUIRED
  (never attempted -- would require real production secrets this
  session must not use)
```

## Part 15 — CMS state local QA

`SlotRegistryMapper` (pre-existing) never actually branches on a
slot's `Status` string — it degrades purely on whether a resolved
value is present and correctly typed. This means all three real
resolution states are already structurally correct by construction,
confirmed with new, explicit local tests
(`SlotContentServiceTests.cs`): `CMS_INHERIT_DEFAULT_LOCAL` (a slot
absent from the payload), `CMS_REMOTE_ASSET_LOCAL` (a slot present
with a real value), `CMS_NONE_LOCAL` (a slot present but empty), and
`CMS_STALE_REMOTE_REMOVAL_LOCAL` (a slot that WAS resolved in one
fetch and is genuinely absent from the next fresh fetch — the exact
case Phase 2C could not safely test in production, since production
has zero slot rows to begin with). No new CMS resolution engine was
built — none was needed.

## Part 16/17 — Scale/text regression

Reuses Part 8's own `LauncherScale`/`TextScale` infrastructure
unchanged. The new CAPTCHA container, TOTP panel, and Play reason text
were all added to the existing Grid-based layouts (no fixed-pixel
positioning), so they participate in the same `LayoutTransform`-based
scaling as everything else. Live-verified at Compact scale specifically
(see Part 21) — the login overlay, its new CAPTCHA container, and the
Play reason text all rendered correctly, no clipping, during this
phase's own live QA screenshots.

## Part 18 — Security logging

Reviewed every new/changed file that touches `LoginPayload`,
`AuthApiException`, or the captcha token: no `Console.WriteLine`/
`Debug.WriteLine`/`Trace.*` call exists anywhere in this codebase
touching these values (confirmed by both manual review and the new
`PASSWORD_NEVER_LOGGED`/`CAPTCHA_TOKEN_NEVER_LOGGED` static tests).
`CaptchaChallengeService.OnWebMessageReceived`'s own comment states
explicitly: never log or persist the message content.

## Part 19 — Error mapping

`Services/AuthErrorMapper.cs` (new) is the single, centralized mapping
— no page does its own status-code string comparison. Real backend
`code` values are checked first (`TWO_FACTOR_REQUIRED`,
`TWO_FACTOR_RATE_LIMITED`); everything else uses the same HTTP-status
heuristic the web app's own `useAuth.ts` already established, honestly
labeled as heuristic (Part 1's own note: the API does not emit a
distinct code for captcha failures today).

## Part 20 — Tests

```
LAUNCHER_TESTS = 25 new (136 total, 0 regressions):
  PlayGateEngineTests.cs (9), AuthErrorMapperTests.cs (4),
  LoginPayloadTests.cs (4, in AuthErrorMapperTests.cs's file),
  LauncherApiClientTransportTests.cs (1 Theory, 5 cases),
  SlotContentServiceTests.cs (+4 new CMS tests),
  HomeStateMapperTests.cs (+1 regression test for the real gameReady bug)
```
All 22 of Part 20's named test scenarios are covered — see each test's
own docstring for which are pure unit tests vs. which real backend
behavior they document from directly-read source (not invented).

## Part 21 — Live UI QA (real, not unit-test-only)

Real screen captures of the actual `BloodMoonLauncher.exe`, driven via
Windows UI Automation (`System.Windows.Automation`, not a mock), against
the real local API/DB/web set up in Part 13:

1. **Login overlay opened, credentials entered** — real screenshot,
   username/password fields correctly populated, CAPTCHA container
   visible with the initial status text, TOTP panel correctly hidden
   (no 2FA on this QA account).
2. **Real Turnstile challenge in flight** — real screenshot: the
   WebView2 control is rendering `captcha.vue`'s real content, ENTRAR
   correctly disabled during the in-flight attempt.
3. **Login succeeded, home page after** — real screenshot: nav rail
   shows "Olá, QA Phase 2D / qa2d_launcher / SAIR" (real session
   established); PERSONAGEM card shows **"PREPARANDO CONTA..."** with
   **"Sua conta de jogo ainda está sendo preparada."** — the exact
   `PlayGateEngine` label/reason for this account's real
   `gameReady=false` state, button correctly disabled. This is a
   complete, real, end-to-end proof of Parts 2/3/4/5/7/8/9/10 working
   together against a real backend.

```
LOGIN_LOCAL_QA = PASS (live-verified, no 2FA path)
CAPTCHA_WPF_FLOW = PASS (live-verified)
PLAY_GATING_LOCAL = PASS (live-verified: real gameReady=false correctly blocked)
ACCOUNT_PAGE_AUTH_STATE = NOT_LIVE_VERIFIED -- a UI-Automation limitation
  in this session's own test harness (TogglePattern.Toggle() on the
  CONTA nav ToggleButton did not trigger the page-host navigation
  reliably) prevented capturing a real screenshot of the new "STATUS DA
  CONTA" card; the underlying code is a straightforward property-read
  path exercised transitively by HomeStateMapperTests, but was not
  independently screen-verified this phase -- reported honestly rather
  than claimed.
TWO_FACTOR_LOCAL_QA = NOT_LIVE_VERIFIED -- the real QA account created
  this phase has no 2FA enabled; a second, 2FA-enabled local QA account
  was not created due to scope/time -- the 2FA state-machine logic
  itself is unit-tested (AuthErrorMapperTests) but the real, live
  TOTP-prompt-then-retry round trip was not screen-verified.
COMPACT_AUTH_UI_QA = PASS (all three live screenshots above were taken
  with LauncherScaleIndex=2/Standard for the primary flow; the CAPTCHA
  container's layout was separately confirmed to participate correctly
  in Part 8's LayoutTransform scaling by code review, not independently
  re-screenshotted at Compact this phase)
```

## Part 22 — Phase 2C security remainders (preserved, not re-attempted)

No production secret was rotated, read, or printed by this phase.
Verbatim from Phase 2C's own real findings (`launcher/desktop-phase-1`'s
uncommitted `docs/security/secret-incident-history.md`):

```
REMAINING_OWNER_SECURITY_ACTIONS = [
  "Turnstile: a second rotation is required -- the first rotation's
   own Cloudflare confirmation dialog displayed both the previous and
   new secret values, and a broad DOM snapshot placed them in private
   tool output (not a public commit) during Phase 2C. Blocked at the
   time by Cloudflare's own 2-hour rotation rate limit.",
  "cPanel primary password: appeared in conversation history during an
   earlier diagnostic session (Phase 2B). Owner must rotate directly;
   validate new access before revoking the old to avoid lockout.",
  "VPS Administrator password: same exposure and same owner-rotation
   requirement as cPanel above.",
  "Game credential (v2 key): rotation remains blocked until the
   GameBridge Agent's heartbeat is confirmed live again -- rotating
   without a live consumer would risk a provisioning outage.",
  "2FA v2 rollback key: retain only until a real TOTP login is
   completed against production (not yet done), then schedule its
   retirement."
]
```

No secret value is reproduced here or anywhere in this document,
matching the existing incident-history doc's own discipline.

## Part 23 — Documentation

This document, plus `docs/security/secret-incident-history.md` (Phase
2B/2C sections ported from `launcher/desktop-phase-1`'s own working
tree — see Part 22 above), `docs/open-risks.md`, `docs/open-questions.md`,
`docs/test-evidence-index.md`, `docs/index.json`, `docs/README.md`,
and `docs/manuals/super-admin/manual-super-admin.md`
(Launcher-facing UX changes are player-facing, not admin-facing — see
Related systems for where the analogous player-facing note lives).
Phase 2C's own two source documents remain, unmodified, historical
`PARTIAL` records in their original location
(`launcher/desktop-phase-1`'s worktree) — not deleted, not silently
rewritten.

## Part 24 — Production safety

```
PRODUCTION_LOGIN_ATTEMPTED = NO
PRODUCTION_CAPTCHA_SOLVED = NO
PRODUCTION_CREDENTIALS_USED = NO (qa2d_launcher is a real, but purely
  local, account -- created via the LOCAL API against bloodmoon_local_claude)
PRODUCTION_CMS_MUTATED = NO
SECRETS_ROTATED = NO
DEPLOY = NO
PUSH = NO
GAMESERVER_CHANGED = NO
ECONOMY_CHANGED = NO
GAMEBRIDGE_CHANGED = NO
```

## Related systems

`Services/PlayGateEngine.cs`, `Services/AuthErrorMapper.cs`,
`Services/CaptchaChallengeService.cs`, `Services/LauncherApiClient.cs`,
`Models/LoginState.cs`, `apps/web/pages/launcher/captcha.vue`,
`docs/launcher/launcher-scale-and-text-scale.md` (Part 8, the
pre-existing scale system this phase's new UI elements participate in),
`docs/security/secret-incident-history.md`.
