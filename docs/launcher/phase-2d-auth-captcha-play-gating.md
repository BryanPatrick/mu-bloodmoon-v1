# Launcher Phase 2D — authentication, CAPTCHA and 2FA

Base commit for this phase: `f43c7c9945d9926efb02b8ca879a116bd61b555d`
(`launcher/desktop-phase-1`, the last commit confirmed published to
production by Phase 2B's own handoff). This document describes the scope
actually built on top of that base, in the isolated release branch
`launcher/phase-2d-release` — not a larger, earlier draft of this work
that also touched Play-gating (see "Explicitly out of scope" below for why
that part was dropped before release).

## Why this phase exists

Phase 2C found a real contract mismatch: the production Portal/API
requires `captchaToken` on `POST /auth/login`
(`apps/api/src/modules/auth/auth.contract.ts`'s `LoginRequest`), but the
Launcher's login payload never sent one. No CAPTCHA bypass is an
acceptable fix for that — this phase closes the gap with the same real
Cloudflare Turnstile challenge and the same real server-side verification
(`captcha.service.ts`) every other client already goes through.

## What changed

**Real embedded CAPTCHA.** `Services/CaptchaChallengeService.cs` hosts a
`Microsoft.Web.WebView2` control (`MainWindow.xaml`'s new `CaptchaWebView`,
inside the login overlay) pointed at `apps/web/pages/launcher/captcha.vue`
— the exact same `TurnstileWidget.vue` component and site key the web
login page uses, served from the real website origin so Turnstile's own
hostname allowlist (`TURNSTILE_EXPECTED_HOSTNAMES`) accepts it. The
resulting token comes back over WebView2's own documented bridge
(`window.chrome.webview.postMessage` → `CoreWebView2.WebMessageReceived`)
and is attached as `LoginPayload.CaptchaToken`
(`Models/ApiModels.cs`). A fresh token is requested on every submit,
including a 2FA retry, matching how the web login page's own
`TurnstileWidget.reset()` behaves — Cloudflare tokens are single-use.

**Real backend error signals, not string-matching.** `POST /auth/login`
sometimes returns a JSON `code` field (`TWO_FACTOR_REQUIRED`,
`TWO_FACTOR_RATE_LIMITED` — `auth.service.ts`); `LauncherApiClient`'s
`EnsureSuccessAsync` now parses it and throws the new
`Services/AuthApiException` (status + code + message) instead of a bare
exception carrying the raw response body. `Services/AuthErrorMapper` is
the one place that turns that into a login-state transition and a
player-facing Portuguese message — every other failure (no distinct
backend code exists yet for captcha rejection or invalid credentials)
falls back to the same HTTP-status heuristic
`apps/web/composables/useAuth.ts` already uses.

**2FA.** `LoginTotpPanel` (new, in `MainWindow.xaml`'s login overlay)
starts `Collapsed` and is only shown when `AuthErrorMapper` maps a
response to `LoginState.TwoFactorRequired`. `SessionUser.TwoFactorEnabled`
(already sent by the API on every login/refresh response, previously
never read) is now captured on `LauncherAppContext.TwoFactorEnabled` and
shown on the Account page.

**Account page.** The clean base's existing `AccountStatusPanel`
(`AccountIdentityText`/`AccountRoleText`/`ProvisioningStateText`, already
wired to `LauncherAppContext.UnifiedAccount`) is untouched. The one new
piece is `AccountSecurityText`, extended in
`Views/AccountPage.xaml.cs`'s `RefreshAsync` to show the real 2FA status
instead of a static label.

**Local HTTP loopback exception.** `LauncherApiClient.IsSecureOrLoopback`
and `CaptchaChallengeService`'s URL check both allow plain
`http://localhost`/`127.0.0.1` alongside HTTPS — the same narrow exception
RFC 8252 uses for OAuth's own `http://localhost` redirect URIs, needed
because this project's local dev API/web servers have no local TLS setup.
Any non-loopback host still requires HTTPS exactly as before.

## Explicitly out of scope (and why)

An earlier draft of this phase also touched Play-gating, on the belief
that production had a bug where the JOGAR button didn't check whether the
game account was actually ready. Comparing directly against this base
commit showed that belief was wrong: `Services/LauncherRuntimePolicy.cs`
(already real, already tested via `LauncherRuntimePolicyTests.cs`)
already resolves the Play button correctly from
`gameAccountReady`/update-state, and `LauncherAppContext.UnifiedAccount` +
`MainWindow.xaml.cs`'s `RefreshAccountAsync` already call
`GET /launcher/me`. The apparent bug only existed in a separate,
unrelated integration branch's own later drift, not in this base. This
release makes zero changes to `LauncherRuntimePolicy.cs`,
`Models/PageState.cs`, `Services/PageStateMappers.cs`,
`Views/HomePage.xaml`, or `Views/HomePage.xaml.cs` — Play-gating stays
exactly as it already was in production.

`PaymentRiskAction.ACCOUNT_RESTRICTION`-driven login blocking
(`LoginState.AccountRestricted`) is modeled in `Models/LoginState.cs` for
completeness but has no real backend trigger today — there is no
production signal that produces it yet, and nothing in this release
fabricates one.

## Local QA

Verified live against this exact release build: local API session
restore → `LoginState.Authenticated`; JOGAR shows "PREPARANDO CONTA..."
via the unmodified `LauncherRuntimePolicy` for a not-yet-ready game
account; Account page's `AccountSecurityText` renders the real 2FA state;
SAIR → `LoginState.LoggedOut` and `TwoFactorEnabled` reset; the login
overlay opens with `LoginTotpPanel` correctly collapsed; the empty
username/password guard still blocks submission; `CaptchaChallengeService`
initializes the real WebView2 control and navigates without throwing. A
full token-to-login round trip through a real hosted `captcha.vue` was not
exercised in this pass (would need the local web dev server running) —
the CAPTCHA UI/transport wiring was verified up to the point of a real
Cloudflare navigation; the server-side contract itself
(`captchaToken` required, `GET /launcher/me`) was independently confirmed
already present in this base commit.
