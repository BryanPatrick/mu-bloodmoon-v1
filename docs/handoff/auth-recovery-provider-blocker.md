# Password recovery provider blocker

## Status

Etapa 19.3 implemented the complete backend and frontend recovery flow. The
feature remains blocked end-to-end because the BloodMoon runtime still has no
outbound email provider or transport configured. The flow cannot be
production-ready until a provider is selected and its sender identity is
verified.

## Audit result (pre-implementation, Etapa 19.3 baseline)

- `Account.email` exists and is unique.
- Passwords use bcrypt with the existing 8-72 character policy.
- JWT access/refresh tokens and persisted account sessions already exist.
- A password change increments `sessionVersion` and revokes active sessions.
- The auth abuse layer already defines a `recovery` policy and supports the
  `recovery` Turnstile action.
- The web recovery page is an honest unavailable state; it does not simulate a
  request.
- There is no reset-token model, recovery endpoint, mail service, SMTP client,
  transactional email SDK, sender configuration or email delivery test.

## What Etapa 19.3 implemented

- `PasswordResetToken` Prisma model (migration
  `20260809120000_password_reset_tokens`): stores only a SHA-256 hash of the
  token, an account relation, `expiresAt`, `consumedAt`, and request
  IP/user-agent metadata.
- `POST /auth/password-recovery/request` and `POST /auth/password-recovery/reset`
  in `auth.controller.ts`, both behind the existing `AuthAbuseGuard` with the
  `recovery` policy (Turnstile action `recovery` on the request endpoint).
- `AuthService.requestPasswordRecovery` / `resetPassword`
  (`apps/api/src/modules/auth/auth.service.ts`): generic anti-enumeration
  response on request, cryptographically random 32-byte token, single-use
  consumption, 8-72 char password policy reuse, and session invalidation via
  the same `sessionVersion` + `AccountSession.updateMany` transaction used by
  `changePassword`.
- `MailTransportService` (`apps/api/src/modules/auth/mail-transport.service.ts`):
  a minimal transport interface with **no simulated delivery**. Outside a
  strict test-only bypass (`NODE_ENV=test` and `AUTH_MAIL_TEST_BYPASS=1`), it
  throws `ServiceUnavailableException` instead of pretending an email was
  sent. This is the reason the feature stays blocked without a real provider.
- `/recuperar-conta` (request) and `/redefinir-senha` (reset) pages with real
  IDLE/LOADING/SUCCESS/ERROR states, reusing `TurnstileWidget` and the
  `login.vue` UX conventions.
- `apps/api/test/password-recovery.e2e-spec.ts`: 10 scenarios covering
  generic responses (existing/non-existing account), invalid email, missing
  CAPTCHA, rate limiting, mail-transport failure still returning a generic
  success, invalid/expired/reused/weak-password reset attempts, and the full
  request-to-login-with-new-password flow with session revocation.
- `SafeExceptionFilter.PUBLIC_ERROR_CODES` extended with `TOKEN_INVALID`,
  `TOKEN_EXPIRED`, `TOKEN_USED`, `PASSWORD_INVALID` so the frontend can show a
  specific state without the filter silently stripping the `code` field.

## Required operator decision

Choose one outbound transactional-email option before implementation:

1. Existing cPanel SMTP mailbox, if the hosting account can provide a verified
   sender and reliable outbound SMTP credentials.
2. A transactional-email provider using HTTPS API or SMTP, such as Resend,
   Postmark or Amazon SES.

The decision must provide:

- provider name and transport type;
- verified sender domain and sender address;
- production secret stored only in the deployment environment;
- SPF, DKIM and DMARC configuration or an explicit rollout plan;
- public web base URL used to build the reset link;
- expected delivery environment for development and automated tests.

Do not commit credentials, provider tokens or SMTP passwords.

## Remaining implementation after approval

Everything provider-independent is already implemented (see "What Etapa 19.3
implemented" above). The only remaining step is provider-specific:

1. Implement a concrete `MailTransport` for the approved provider (SMTP client
   or HTTPS API call) and wire it in `AuthModule` in place of
   `MailTransportService`'s current fail-closed behavior, using only secrets
   from the deployment environment (never committed).
2. Set `WEB_PUBLIC_URL` and the provider's environment variables in the real
   deployment environment (cPanel Node app env panel), not in a tracked file.
3. Run one real, manual end-to-end delivery test against the approved sender
   before declaring the task complete.

## Completion rule

The blocker must remain blocked until a real provider is configured and a
recovery email can be requested, delivered, consumed once and used to revoke
the previous sessions in an end-to-end environment.
