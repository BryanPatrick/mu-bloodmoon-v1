# Auth and authorization

Authentication uses JWT access and refresh tokens. Each successful login
increments `Account.sessionVersion`, invalidating the previous browser session.

## Abuse protection

`POST /auth/login` and `POST /auth/register` require a Cloudflare Turnstile
token in `captchaToken`. The API validates it against Siteverify. The browser
is never the authority and the secret key is never exposed through Nuxt.

Authentication routes also use independent fixed windows for IP and, where
applicable, a SHA-256 hash of the normalized account identifier:

- login: 20/IP/5 minutes and 10/identifier/15 minutes;
- register: 10/IP/hour and 3/email/hour;
- refresh: 60/IP/minute;
- sensitive authenticated actions: 10/IP/15 minutes;
- future recovery: 10/IP/15 minutes and 3/identifier/15 minutes.

These limits never create permanent IP bans. The store is process-local for
the current single API instance; use a shared atomic store before horizontal
scaling. Only set `TRUST_PROXY_HOPS` for a known reverse-proxy chain.

Failed checks generate `auth.captcha_failed`, throttling generates
`auth.rate_limited`, and bad credentials generate `auth.login_failed` without
passwords, JWTs, CAPTCHA tokens or raw attempted identifiers.

Password recovery/reset and email verification endpoints do not currently
exist. When added, they must use the `recovery` policy and generic responses
that do not reveal whether an account exists.

## Roles

- `PLAYER`: self-service account, characters, shop, marketplace and recharge.
- `ADMIN`: operational moderation of players, content, shop and marketplace.
- `SUPER_ADMIN`: strategic access, role management, finance, server settings and
  raw game data.

Routes must combine `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, `@Roles`
and `@RequirePermissions` for administrative actions. Hiding a menu is not an
authorization control.

Per-account exceptions are stored in `AccountPermission`. A denied override
removes an inherited permission; a granted override adds it. `SUPER_ADMIN`
always receives `*`.

## Development test accounts

Test accounts are never created by login and the seed refuses production.
Configure local-only values, then run:

```bash
TEST_ACCOUNT_PASSWORD="local-password" \
TEST_ACCOUNT_PERSONAL_ID="local-personal-id" \
npm --workspace @blood-moon/api run db:seed:test
```

The seed creates or refreshes `player@teste.local`, `adm@teste.local` and
`superadm@teste.local`. Do not configure these variables in production.

With the local API running, validate the complete hierarchy with:

```bash
TEST_ACCOUNT_PASSWORD="local-password" \
npm --workspace @blood-moon/api run check:security:integration
```
