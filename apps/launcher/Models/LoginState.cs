namespace BloodMoon.Launcher.Models;

// Phase 2D Part 5 -- the real login states, driven by the actual API
// contract (auth.contract.ts's LoginRequest requires captchaToken;
// TWO_FACTOR_REQUIRED/TWO_FACTOR_RATE_LIMITED are real backend error
// codes; ACCOUNT_RESTRICTED has no real backend trigger today -- see
// docs/launcher/phase-2d-auth-contract-audit.md's own honest note on
// this -- modeled here because Part 5 asks for it, not because a real
// signal produces it yet). Governs ONLY the login overlay -- the Play
// button remains governed entirely by the existing, unmodified
// Services/LauncherRuntimePolicy.cs (isLoggedIn + gameReady/update
// state), a separate and narrower concept this phase does not touch.
public enum LoginState
{
    LoggedOut,
    CaptchaRequired,
    Authenticating,
    TwoFactorRequired,
    Authenticated,
    AuthFailed,
    AccountRestricted,
    SessionExpired
}
