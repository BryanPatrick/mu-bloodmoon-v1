# Discord read-only integration — Phase 3B

`apps/api/src/modules/integrations-discord/`. A dedicated, read-only
boundary for a future Discord bot — never shares the Admin API, the
Launcher's user session, GameBridge command credentials, or SQL
credentials with it.

## Architecture

```
Discord bot → apps/api (/integrations/discord/*) → Portal-side content
                                                      (never D1/GameBridge/SQL directly)
```

Matches Part U exactly: `apps/api` is always the sole server-to-server
consumer. This phase's Discord routes read the same
`SiteSetting`/`KnowledgeEntry`/`AccountCharacter` sources
`LauncherService.bootstrap()` already reads (Part U: "apps/api remains
the server-side consumer of Game Data" — extended here to mean of Portal
content generally, never a second path into the database).

## Routes and scopes

| Route | Scope | Cache-shaped throttle |
|---|---|---|
| `GET /integrations/discord/server-status` | `discord:server:read` | 15s / 4 req |
| `GET /integrations/discord/events` | `discord:events:read` | 30s / 2 req |
| `GET /integrations/discord/rankings` | `discord:rankings:read` | 60s / 1 req |
| `GET /integrations/discord/news` | `discord:news:read` | 300s / 1 req |

Every route requires `X-Discord-Api-Key`, is guarded by
`DiscordApiKeyGuard`, and declares its scope via `@RequireDiscordScope(...)`
— a route with no declared scope fails closed (401), it does not default
to open. `discord:*` is a wildcard scope (issuable, not implied by any
individual scope) for a credential that genuinely needs everything.

**No mutation route exists anywhere in this controller** — every method
is `@Get`; proven by test (`no mutation route exists anywhere under
/integrations/discord`, asserting `POST`/`PUT`/`DELETE` all 404 even with
a wildcard-scoped credential).

## Credential (Part R)

`DiscordServiceCredential` (Prisma model, migration
`20260824123000_discord_service_credential`): only a SHA-256 hash of the
raw key is ever stored, matching the existing `PasswordResetToken`
pattern in this codebase. The raw key
(`discbot_<64 hex chars>`) is returned exactly once, at issuance
(`DiscordServiceCredentialService.issue(label, scopes)`), and is never
retrievable again. `revokedAt` makes every credential independently
revocable without deleting its audit row. `lastUsedAt` is updated
best-effort on successful verification (never blocks a real request if
that write fails).

**No HTTP endpoint issues or revokes credentials this phase** — Part W's
"no admin CRUD/UI yet" applies here too. Issuance today is an operator
action (call `DiscordServiceCredentialService.issue()` directly, e.g.
from a one-off script), matching this phase's scope.

## What Discord may consume (Part P)

- **server-status**: `status`, `statusSource` (`MANUAL`/`LIVE`/`UNKNOWN`
  — same honesty discipline as the Launcher, see
  `docs/launcher/remote-content-contract.md`), `maintenance`.
  **Deliberately no online-player count** — the only value available
  (`launcher-online-players`) is the same non-authoritative admin-set
  number the website shows internally, and Part P only allows a public
  count "if authoritative and approved," which it is not.
- **events**: active event + upcoming, name/active/startsAt/guideUrl only.
  `startsAt`/`guideUrl` are read from `KnowledgeEntry.normalizedData`,
  whose real shape for `EVENT`-kind entries is **not confirmed against
  live data** (no `EVENT` rows exist in the local dev DB to check
  against this phase) — extraction falls back to `null` safely if the
  assumed shape doesn't match, never throws.
- **rankings**: public character name, class, position, and a
  `masterReset`-based value — sourced from the Portal's own
  `AccountCharacter` display records (**not** a real MU SQL query; the
  real Game Data Platform has no public leaderboard read path yet —
  rankings there are per-character within an authenticated account
  snapshot, see `docs/game-data/read-models/account-snapshot.md`). This
  is an honest, currently-real substitute, documented as such.
- **news**: title, category, summary, publication date, website URL.

## What Discord must never receive (Part Q)

Email, `Account.id` (rankings/events/news never include it — verified by
test), `memb_guid`, `memb___id`, password, game credential, IP, 2FA,
session, private account status, WCoin balances, private inventory,
private guild admin data, Admin-only data, raw Game Data/D1 rows.
Verified by test (`rankings never leak account identity`, `news never
leaks anything beyond the public DTO shape`).

## Rate limiting (Part T)

Reuses the app's existing, already-globally-registered
`ThrottlerModule` (`media.module.ts`'s `forRoot()`) — this module
deliberately does **not** call `ThrottlerModule.forRoot()` again, since
that call is effectively global once made anywhere in the app and a
second call would silently collide rather than create an isolated bucket
(the same finding `payments.module.ts`'s own code comment already
records). Per-route `@Throttle({ default: { ttl, limit } })` overrides
the shared default without re-registering the module.
