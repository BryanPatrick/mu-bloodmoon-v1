namespace BloodMoon.Launcher.Services;

// Phase 2D Part 19 -- carries the REAL backend signal (HTTP status +
// the `code` field the API sometimes includes, e.g. TWO_FACTOR_REQUIRED/
// TWO_FACTOR_RATE_LIMITED from auth.service.ts) separately from any
// human-facing text, so AuthErrorMapper can make a clean decision
// instead of pattern-matching a concatenated string. Replaces
// LauncherApiClient's prior behavior of throwing a bare
// InvalidOperationException with the raw response body appended to the
// message (a real, found issue -- that path could put raw backend JSON
// in front of a player via ShowToast(exception.Message)).
public sealed class AuthApiException(int statusCode, string? code, string technicalDetail) : Exception(technicalDetail)
{
    public int StatusCode { get; } = statusCode;
    // Only set when the API response body actually included a JSON
    // `code` field (TWO_FACTOR_REQUIRED, TWO_FACTOR_RATE_LIMITED, TOKEN_*,
    // PASSWORD_INVALID, ...). Null for the many real failure paths
    // (captcha rejection, invalid credentials, generic 5xx) that the
    // current API only distinguishes by HTTP status -- AuthErrorMapper
    // falls back to StatusCode-based heuristics for those, honestly, not
    // pretending a code exists where the backend doesn't emit one yet.
    public string? Code { get; } = code;
}
