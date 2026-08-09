# Password recovery provider blocker

## Status

Etapa 19.3 is blocked before implementation because the BloodMoon runtime has
no outbound email provider or transport configured. A reset flow cannot be
called end-to-end or production-ready until a provider is selected and its
sender identity is verified.

## Audit result

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

## Planned implementation after approval

1. Add a `PasswordResetToken` model storing only a SHA-256 token hash, account
   relation, short expiration, consumed timestamp, request metadata and audit
   timestamps.
2. Add generic `POST /auth/password-recovery/request`, protected by Turnstile
   and the existing recovery rate-limit policy.
3. Generate a cryptographically random 32-byte token and send the plaintext
   token only in the one-time email link.
4. Add `POST /auth/password-recovery/reset` with token validation, password
   policy validation and atomic single-use consumption.
5. Increment `sessionVersion` and revoke every active account session after a
   successful reset.
6. Add provider delivery through a small mail transport interface with no
   development fallback that logs reset links or tokens.
7. Replace the unavailable web state with request and reset views covering
   loading, generic success, invalid/expired token, error and password updated.
8. Add E2E tests for existing/non-existing accounts, valid/invalid/expired/
   reused tokens, rate limits, password policy and the complete flow through a
   deterministic test transport.

## Completion rule

The blocker must remain blocked until a real provider is configured and a
recovery email can be requested, delivered, consumed once and used to revoke
the previous sessions in an end-to-end environment.
