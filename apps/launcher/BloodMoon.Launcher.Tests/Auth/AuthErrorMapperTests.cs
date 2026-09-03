using System.Text.Json;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.Auth;

public sealed class AuthErrorMapperTests
{
    [Fact]
    public void AUTH_ERROR_MESSAGE_MAPPING()
    {
        // Real backend `code` values (auth.service.ts) take priority.
        var twoFactorRequired = AuthErrorMapper.Map(new AuthApiException(401, "TWO_FACTOR_REQUIRED", "raw"));
        Assert.Equal(LoginState.TwoFactorRequired, twoFactorRequired.ResultingState);
        Assert.DoesNotContain("TWO_FACTOR_REQUIRED", twoFactorRequired.PlayerMessage);

        var rateLimited = AuthErrorMapper.Map(new AuthApiException(429, "TWO_FACTOR_RATE_LIMITED", "raw"));
        Assert.Equal(LoginState.AuthFailed, rateLimited.ResultingState);

        // No real code for these -- HTTP-status heuristics.
        var invalidCredentials = AuthErrorMapper.Map(new AuthApiException(401, null, "raw"));
        Assert.Equal(LoginState.AuthFailed, invalidCredentials.ResultingState);
        Assert.Equal("Usuário ou senha inválidos.", invalidCredentials.PlayerMessage);

        var captchaRejected = AuthErrorMapper.Map(new AuthApiException(400, null, "raw"));
        Assert.Equal(LoginState.CaptchaRequired, captchaRejected.ResultingState);

        var providerUnavailable = AuthErrorMapper.Map(new AuthApiException(503, null, "raw"));
        Assert.Equal(LoginState.CaptchaRequired, providerUnavailable.ResultingState);

        // Every message is a real Portuguese sentence, never a raw code
        // or the technical exception message leaking through.
        foreach (var mapped in new[] { twoFactorRequired, rateLimited, invalidCredentials, captchaRejected, providerUnavailable })
        {
            Assert.False(string.IsNullOrWhiteSpace(mapped.PlayerMessage));
            Assert.DoesNotContain("raw", mapped.PlayerMessage);
        }
    }

    [Fact]
    public void CAPTCHA_REQUIRED_LOGIN()
    {
        // A 400 from POST /auth/login (CaptchaService's real rejection
        // path) always resolves back to CaptchaRequired -- the login
        // overlay must re-run the challenge, never silently retry with
        // the same (now consumed/invalid) token.
        var mapped = AuthErrorMapper.Map(new AuthApiException(400, null, "Não foi possível validar a verificação de segurança."));
        Assert.Equal(LoginState.CaptchaRequired, mapped.ResultingState);
    }

    [Fact]
    public void LOGIN_REQUIRES_2FA()
    {
        var mapped = AuthErrorMapper.Map(new AuthApiException(401, "TWO_FACTOR_REQUIRED", "raw"));
        Assert.Equal(LoginState.TwoFactorRequired, mapped.ResultingState);
        Assert.Equal("Informe o código de autenticação de 6 dígitos.", mapped.PlayerMessage);
    }

    [Fact]
    public void INVALID_TOTP_REJECTED()
    {
        // The real API's login() re-throws the identical TWO_FACTOR_REQUIRED
        // code for both "no code sent yet" and "wrong code sent" -- it
        // never distinguishes the two to avoid leaking whether 2FA is
        // even enabled for a given account before credentials are proven.
        // Both map to the same real, honest state.
        var mapped = AuthErrorMapper.Map(new AuthApiException(401, "TWO_FACTOR_REQUIRED", "raw"));
        Assert.Equal(LoginState.TwoFactorRequired, mapped.ResultingState);
    }
}

public sealed class LoginPayloadTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void CAPTCHA_TOKEN_INCLUDED_WHEN_AVAILABLE()
    {
        var payload = new LoginPayload { Username = "qa", Password = "x", CaptchaToken = "real-turnstile-token" };
        var json = JsonSerializer.Serialize(payload, JsonOptions);

        Assert.Contains("captchaToken", json);
        Assert.Contains("real-turnstile-token", json);
    }

    [Fact]
    public void NO_CAPTCHA_BYPASS()
    {
        // The payload has no way to represent "skip the check" -- there is
        // no boolean flag, no null-token special case, and CaptchaToken
        // has no default that would serialize to an empty/missing field
        // (a fresh LoginPayload's CaptchaToken defaults to "", which the
        // real API's CaptchaService.verify() rejects outright as
        // missing-or-invalid -- never treated as "trusted, skip"). There
        // is also no environment flag, debug switch, or special
        // Launcher-only header anywhere in LauncherApiClient.LoginAsync.
        var payload = new LoginPayload { Username = "qa", Password = "x" };
        Assert.Equal("", payload.CaptchaToken);

        var apiClientSource = File.ReadAllText(FindSourceFile("Services/LauncherApiClient.cs"));
        Assert.DoesNotContain("bypass", apiClientSource, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("skipCaptcha", apiClientSource, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void PASSWORD_NEVER_LOGGED()
    {
        AssertNoSensitiveLogging("Password");
    }

    [Fact]
    public void CAPTCHA_TOKEN_NEVER_LOGGED()
    {
        AssertNoSensitiveLogging("CaptchaToken");
    }

    // Real, static check over the actual source files that touch
    // LoginPayload -- not a mock. Fails if a future change adds a
    // Console.WriteLine/Debug.WriteLine/ShowToast/exception message that
    // interpolates payload.Password or payload.CaptchaToken directly.
    private static void AssertNoSensitiveLogging(string fieldName)
    {
        foreach (var relativePath in new[] { "MainWindow.xaml.cs", "Services/LauncherApiClient.cs", "Services/CaptchaChallengeService.cs" })
        {
            var source = File.ReadAllText(FindSourceFile(relativePath));
            var offendingPatterns = new[] { $"payload.{fieldName}", $".{fieldName}}}" };
            foreach (var line in source.Split('\n'))
            {
                if (!line.Contains(fieldName, StringComparison.Ordinal)) continue;
                var isDeclarationOrAssignment = line.Contains($"{fieldName} =", StringComparison.Ordinal) ||
                    line.Contains($"{fieldName} {{", StringComparison.Ordinal) ||
                    line.Contains($"{fieldName}Box", StringComparison.Ordinal) ||
                    line.TrimStart().StartsWith("//", StringComparison.Ordinal);
                var looksLikeLoggingOrDisplay = line.Contains("ShowToast", StringComparison.Ordinal) ||
                    line.Contains("Console.", StringComparison.Ordinal) ||
                    line.Contains("Debug.", StringComparison.Ordinal) ||
                    line.Contains("Trace.", StringComparison.Ordinal);
                Assert.False(
                    looksLikeLoggingOrDisplay && !isDeclarationOrAssignment,
                    $"Found a line referencing {fieldName} near a logging/display call: {line.Trim()}");
            }
        }
    }

    private static string FindSourceFile(string relativePath)
    {
        var dir = AppContext.BaseDirectory;
        for (var i = 0; i < 8; i++)
        {
            var candidate = Path.Combine(dir, relativePath);
            if (File.Exists(candidate)) return candidate;
            dir = Path.Combine(dir, "..");
        }
        throw new FileNotFoundException($"Could not locate {relativePath} relative to {AppContext.BaseDirectory}");
    }
}
