using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace BloodMoon.Launcher.Services;

// Phase 2D Part 2 -- the legitimate desktop CAPTCHA architecture: embed a
// real WebView2 (Microsoft's own, officially supported Chromium control)
// pointed at a real, hosted Cloudflare Turnstile challenge
// (apps/web/pages/launcher/captcha.vue -- the exact same TurnstileWidget
// component and site key the web login page uses), and read the
// resulting token back through WebView2's own real, documented
// JS<->native message bridge (window.chrome.webview.postMessage on the
// page side, CoreWebView2.WebMessageReceived here). This is not a
// bypass, a hardcoded token, or a Launcher-only security downgrade --
// it is the same real Cloudflare challenge and the same real
// POST /auth/login server-side verification every other client uses.
//
// Why the challenge must be hosted on a real domain, not a bundled local
// file: Turnstile's own hostname allowlist (TURNSTILE_EXPECTED_HOSTNAMES,
// checked server-side in captcha.service.ts) validates the origin the
// widget rendered on. A file:// or embedded-HTML origin would either
// fail that check outright or require weakening the allowlist -- neither
// is acceptable. Navigating to the real website's own domain keeps the
// token's origin identical to what the web login page already produces.
public sealed class CaptchaChallengeService
{
    private readonly WebView2 _webView;
    private bool _initialized;
    private TaskCompletionSource<string?>? _pending;

    public CaptchaChallengeService(WebView2 webView)
    {
        _webView = webView;
    }

    // Returns the real Turnstile token, or null if the challenge failed,
    // was cancelled, or timed out. Never fabricates a token on any path.
    public async Task<string?> RequestTokenAsync(string challengeUrl, CancellationToken cancellationToken)
    {
        // Loopback-only HTTP exception, same reasoning as
        // LauncherApiClient.IsSecureOrLoopback -- real local QA (Part 13)
        // needs to reach the local web dev server, which has no local
        // TLS setup. Any non-loopback URL still requires HTTPS.
        if (!Uri.TryCreate(challengeUrl, UriKind.Absolute, out var uri) || !LauncherApiClient.IsSecureOrLoopback(uri))
        {
            throw new InvalidOperationException("A verificação de segurança exige HTTPS.");
        }

        if (!_initialized)
        {
            await _webView.EnsureCoreWebView2Async();
            _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            _initialized = true;
        }

        _pending = new TaskCompletionSource<string?>();
        await using var registration = cancellationToken.Register(() => _pending?.TrySetResult(null));

        _webView.CoreWebView2.Navigate(challengeUrl);

        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(3));
        await using var timeoutRegistration = timeout.Token.Register(() => _pending?.TrySetResult(null));

        return await _pending.Task;
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        // Never log or persist the message content -- it is either the
        // real Turnstile token (short-lived, single-use) or an empty
        // string (failure signal from captcha.vue's own onToken()).
        var message = e.TryGetWebMessageAsString();
        _pending?.TrySetResult(string.IsNullOrWhiteSpace(message) ? null : message);
    }
}
