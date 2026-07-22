# Auth and authorization

Authentication uses JWT access and refresh tokens. Each successful login
increments `Account.sessionVersion`, invalidating the previous browser session.

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
