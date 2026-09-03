using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

// Phase 2D Part 19 -- ONE clean, centralized mapping from real backend
// auth signals to player-facing Portuguese messages, so no page ever
// does its own status-code string comparison (Part 19's own explicit
// instruction). Real backend `code` values (TWO_FACTOR_REQUIRED,
// TWO_FACTOR_RATE_LIMITED -- from apps/api/src/modules/auth/auth.service.ts)
// are checked first; everything else falls back to the same HTTP-status
// heuristic apps/web/composables/useAuth.ts already uses, because the
// API does not emit a distinct `code` for captcha failures today (see
// docs/launcher/phase-2d-auth-contract-audit.md Part 1) -- this mapper
// does not pretend otherwise.
public static class AuthErrorMapper
{
    public readonly record struct MappedAuthError(string PlayerMessage, LoginState ResultingState);

    public static MappedAuthError Map(AuthApiException exception)
    {
        switch (exception.Code)
        {
            case "TWO_FACTOR_REQUIRED":
                return new MappedAuthError("Informe o código de autenticação de 6 dígitos.", LoginState.TwoFactorRequired);
            case "TWO_FACTOR_RATE_LIMITED":
                return new MappedAuthError("Muitas tentativas de código inválidas. Aguarde antes de tentar novamente.", LoginState.AuthFailed);
        }

        return exception.StatusCode switch
        {
            401 => new MappedAuthError("Usuário ou senha inválidos.", LoginState.AuthFailed),
            429 => new MappedAuthError("Muitas tentativas. Aguarde alguns minutos e tente novamente.", LoginState.AuthFailed),
            // No distinct backend code for captcha failures yet -- 400 from
            // POST /auth/login is, in practice, always the captcha check
            // (CaptchaService.verify's BadRequestException) once the
            // Launcher's own client-side validation already guarantees
            // username/password are non-empty before the call is made.
            400 => new MappedAuthError("Não foi possível concluir a verificação. Tente novamente.", LoginState.CaptchaRequired),
            503 => new MappedAuthError("A verificação de segurança está temporariamente indisponível. Tente novamente em instantes.", LoginState.CaptchaRequired),
            _ => new MappedAuthError("Não foi possível acessar o servidor. Tente novamente em instantes.", LoginState.AuthFailed)
        };
    }
}
