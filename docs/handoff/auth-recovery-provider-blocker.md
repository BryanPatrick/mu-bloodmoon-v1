# Password recovery provider blocker

## Status

The cPanel SMTP service was approved as the initial provider on 2026-08-11.
`MailTransportService` now supports authenticated SMTP through deployment-only
environment variables and enforces TLS 1.2 or newer. A dedicated sender was
created outside Git and passed SMTP authentication, delivery and local mailbox
receipt checks. The blocker remains open until the release is deployed and the
complete recovery flow is exercised with a real user mailbox.

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
  authenticated SMTP using `SMTP_*` deployment variables, TLS certificate
  verification and fail-closed behavior. A strict test-only bypass
  (`NODE_ENV=test` and `AUTH_MAIL_TEST_BYPASS=1`) remains provider-independent
  and cannot activate in production.
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

## Approved provider and transport

- provider: cPanel SMTP on the BloodMoon domain;
- preferred transport: port 465 with implicit TLS;
- alternative transport: port 587 only with required STARTTLS;
- certificate: valid for the mail hostname at validation time;
- DNS: SPF, DKIM and DMARC records were present at validation time;
- sender credentials: stored outside Git and destined for the cPanel Node
  application environment only.

Do not commit credentials or SMTP passwords. The ignored operational copy must
be removed after the values have been installed and verified in production.

## Remaining release steps

1. Install the `SMTP_*` values and `WEB_PUBLIC_URL` in the cPanel Node
   application environment.
2. Deploy the API version containing the SMTP transport and the reset-token
   migration.
3. Run the real end-to-end request, delivery, reset, single-use, expiration and
   old-password rejection checks against a controlled user mailbox.
4. Remove the ignored local operational credential copy after production is
   confirmed.

## Completion rule

The blocker must remain blocked until a real provider is configured and a
recovery email can be requested, delivered, consumed once and used to revoke
the previous sessions in an end-to-end environment.
