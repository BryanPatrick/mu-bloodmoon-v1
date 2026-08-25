# Launcher API contract — Phase 3B

`apps/api/src/modules/launcher/`. Dedicated Launcher namespace
(`/launcher/*`) — the Launcher never scrapes website endpoints and never
touches Admin endpoints. This document covers the **existing** routes
(pre-dating this phase, unchanged) and the **new** routes this phase
added — extending the module, not replacing it (see
`docs/accounts/unified-account-implementation.md`'s note on the
correction made mid-phase after an early draft mistakenly clobbered the
existing file).

## Public content — no auth

### `GET /launcher/bootstrap` *(existing, unchanged)*

One lightweight request on Launcher open. Backed by `SiteSetting`
(category `launcher`/`server`/`social`) and `KnowledgeEntry` (kind
`NEWS`/`EVENT`, scope `SEASON_6`) — the Launcher content CMS already
built before this phase (Part L/W note below explains why this phase did
not add a second, parallel content system). Returns server name/realm/
status (with honest `statusSource: MANUAL | LIVE | UNKNOWN` — never
fabricated as live telemetry, a rule from the original Global Portal
Audit P1.2 fix, unchanged and still enforced), links, patch notes, and
recent news.

**Launcher Foundation phase**: also returns `schemaVersion`,
`contentVersion`, `campaign`, `socials`, `utilities`, and `assets` — all
additive; see `docs/launcher/remote-content.md` for the client-side
consumption model and `docs/launcher/remote-content-contract.md` for the
full field-by-field shape.

### `GET /launcher/content` *(new, Launcher Phase L3)*

Resolved, published-only CMS slot content (`apps/api/.../launcher-studio/
launcher-studio.types.ts`'s `LauncherContentResponse`) — additive to, not
a replacement for, `GET /launcher/bootstrap` above. See
`docs/launcher/cms-launcher-studio.md` (the CMS phase) and
`docs/launcher/wpf-cms-binding.md` (this phase's WPF consumption) for the
full contract and the asset-manifest addition this phase made to it.

### `GET /launcher/events` *(new, Launcher Phase L3)*

Active/upcoming/calendar events, `KnowledgeEntry` (kind `EVENT`,
`launcherEnabled=true`)-sourced — the same real content the CMS Launcher
Studio phase's admin-content module manages. See `docs/launcher/
page-data-sources.md`.

### `GET /launcher/rankings?type=masterReset|resets|level` *(new, Launcher Phase L3)*

`AccountCharacter`-sourced ranking rows — the same honest, real,
currently-available substitute `integrations-discord/discord.service.ts`'s
`getRankings()` already uses (not the real MU Game Data Platform, which
has no public leaderboard read path yet). See `docs/launcher/
page-data-sources.md`.

### `GET /launcher/store/terms/active` *(new, Launcher Phase L3)*

The currently active `StorePurchaseTerms` version, or an empty body if
none has been configured yet. See `docs/launcher/store-cart-terms.md`.

## Authenticated — the existing modern Portal session (JwtAuthGuard)

### `GET /launcher/account` *(existing, unchanged)*

Portal-local profile (`id`/`username`/`name`/`email`/`role`), currencies,
and the Portal's own `AccountCharacter[]` display records (level/reset/
masterReset/map/guild/status) — **not** real MU game data. This is a
different concept from the routes below; see
`apps/api/src/modules/launcher/launcher.service.ts`'s doc comments for
the explicit disambiguation.

### `GET /launcher/me` *(new, Phase 3B)*

Unified Blood Moon Account status:

```json
{
  "accountId": "uuid",
  "username": "string",
  "role": "PLAYER",
  "gameReady": false,
  "provisioningStatus": "NONE"
}
```

`provisioningStatus` is `NONE` when no `GameAccountIdentity` row exists
yet (true for every account today — no registration flow creates one in
production yet, see the provisioning-activation-plan doc), otherwise one
of `PENDING`/`PROVISIONING`/`ACTIVE`/`FAILED`. `gameReady` is the single
authoritative signal (`GameAccountIdentityService.isGameReady()`) — never
re-derive it from `provisioningStatus` client-side.

### `GET /launcher/me/characters` *(new, Phase 3B)*

```json
{ "gameReady": false, "characters": [] }
```

Resolves `Account.id → GameAccountIdentity.membGuid → Game Data`
internally. Honestly returns an empty list today for every account — no
`CREATE_GAME_ACCOUNT` command exists yet (Phase 3C), so no real identity
can reach `ACTIVE`, and even once one does, the Game Data Worker's
per-account read route
(`apps/game-data-worker/src/read.ts`, today only exposes bridge
heartbeat status) still needs to be added. This is documented, correct,
current behavior, not a stub silently standing in for a broken feature.

## Never exposed by any Launcher route

`memb___id`, `memb_guid` (only `GameAccountIdentity`'s internal
resolution ever touches it — it never serializes into a response),
password/password hash, 2FA secrets, session internals, SQL connection
details, GameBridge command credentials.

## Rate limiting

The existing `/launcher/bootstrap`/`/launcher/account` routes are
unthrottled today (pre-dating this phase; not retrofitted here to avoid
an unrelated behavior change). The new `/me`/`/me/characters` routes are
likewise left unthrottled, matching that same existing convention —
authenticated, per-session reads are a materially different abuse
profile than the public, service-credential-gated Discord integration
(see `docs/integrations/discord-read-api.md`'s Part T rate limits, which
*are* enforced, since bot polling is the realistic abuse vector there).
