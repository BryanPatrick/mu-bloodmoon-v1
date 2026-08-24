# Data classification — Phase 3B

Four tiers, used consistently across the Launcher and Discord read
surfaces added this phase (and a useful reference for anything built on
top of them later).

```
PUBLIC              -- no auth of any kind
AUTHENTICATED_PLAYER -- the existing modern Portal session (JwtAuthGuard)
ADMIN                -- RolesGuard + PermissionsGuard, a real delegated permission
INTERNAL_SERVICE     -- a dedicated, revocable, non-human service credential
```

## Examples, as actually classified in this codebase today

| Data | Tier | Where |
|---|---|---|
| News, event schedule, server status (non-authoritative), social/utility links | `PUBLIC` | `GET /launcher/bootstrap`, `GET /integrations/discord/*` |
| Own Blood Moon Account status / game-readiness | `AUTHENTICATED_PLAYER` | `GET /launcher/me` |
| Own Portal-display characters, currencies | `AUTHENTICATED_PLAYER` | `GET /launcher/account` (existing) |
| Own real Game Data characters (once wired) | `AUTHENTICATED_PLAYER` | `GET /launcher/me/characters` |
| Own guild summary | `AUTHENTICATED_PLAYER` | *(existing guild module, unchanged this phase)* |
| GameBridge/Cloudflare status diagnostics | `ADMIN` / `INTERNAL_SERVICE` | `GET /admin/game-data/status` (`admin.game-data.view` permission, Phase 1) |
| SQL schema, connection strings, HMAC secrets | `INTERNAL_SERVICE` (never HTTP-exposed at all) | GameBridge Agent config only |
| Public rankings/news/events/server-status for a bot | `PUBLIC`, but rate-limited and credential-gated (Part T/R) | `GET /integrations/discord/*` — `PUBLIC` in *content* sensitivity, `INTERNAL_SERVICE` in *access* control, because unrestricted public access invites bot-polling abuse even for non-sensitive data |

The last row is the one genuinely subtle case in this phase's design:
Discord's data is classification-`PUBLIC` (nothing behind it is
private), but the *route* still requires a service credential — access
control and data sensitivity are separate axes. A route can be
credential-gated purely for rate-limiting/abuse-prevention reasons
without the underlying data being sensitive.

## Fields that never cross a tier boundary downward

Regardless of endpoint or tier, these never appear in any HTTP response
this phase produces, at any tier:

`memb___id`, `memb_guid` (both stay internal to
`GameAccountIdentityService`/the future GameBridge command path — Phase 2B
Part K's rule, unchanged and extended here), password/password hash,
2FA secret, session token internals, SQL connection strings, HMAC/API
key raw values (only a hash is ever stored — `PasswordResetToken` and
`DiscordServiceCredential` both follow this), GameBridge command
credentials.

## Enforcement, not just documentation

Every claim in this document is backed by a real test asserting the
absence of the disallowed fields, not just a comment:
`apps/api/test/launcher-unified-account.e2e-spec.ts` (`/launcher/me`),
`apps/api/test/discord-read-api.e2e-spec.ts` (`/integrations/discord/*`).
