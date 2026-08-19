# Test Personas

Removes human login/CAPTCHA/2FA from local development, E2E and browser
automation. **Development, test and explicitly allow-listed staging only —
never production.**

## Enabling

Set all three, in your local/test env:

```
TEST_PERSONA_MODE=true
NODE_ENV=development   # or "test"
DATABASE_URL=...bloodmoon_local...   # or ...bloodmoon_e2e...
```

All three must hold at once (see `test-personas.env.ts`). Anywhere they
don't -- most importantly production -- `/api/test-personas/*` does not
exist: 404, not 403.

SUPER_ADMIN needs one more explicit flag on top of the above:

```
TEST_PERSONA_ALLOW_SUPER_ADMIN=true
```

## Personas

Account-role: `PLAYER`, `GM`, `ADMIN`, `SUPER_ADMIN`
Guild-role (all `AccountRole: PLAYER`, differ by `GuildMember.roleKey` in a
shared fixture "Test Persona Guild"): `GUILD_LEADER`, `GUILD_OFFICER`,
`GUILD_TREASURER`, `GUILD_MEMBER`, `GUILD_RECRUIT`

## Usage

**HTTP** (what everything below calls):
`POST /api/test-personas/activate {"persona": "ADMIN"}` -> real
`{accessToken, refreshToken, user}`, same shape as `/api/auth/login`.

**Browser automation / composable**:
```ts
const { activatePersona } = useTestPersonas()
await activatePersona('GUILD_LEADER') // hydrates real app auth state too
```

**Dev switcher UI**: `/dev/test-personas` (only renders anything once
`/api/test-personas/available` responds -- 404s the same as everywhere else
when disabled).

**Reset**: `npm run test:personas:reset` (same env guard) or
`POST /api/test-personas/reset`. Removes only `tp_*`-prefixed accounts and
the `TSTP`-tagged fixture guild -- never anything else.

## Security model

- Persona ids are a fixed server-side allowlist -- the client can never send
  a role or accountId directly.
- Sessions are real: `AuthService.register()`/`login()` called directly
  (server-side, so the public Turnstile-gated HTTP endpoints are untouched --
  this is provisioning, not a bypass of them), same JWTs, same guards, same
  RBAC as a real user.
- GM/ADMIN/SUPER_ADMIN personas get a real, freshly-generated TOTP secret
  and a live-computed valid code -- 2FA is genuinely satisfied, not skipped.
