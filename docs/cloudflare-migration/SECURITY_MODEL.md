---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# Security model implications of the Cloudflare migration

This is about what the migration changes or must preserve in the
security posture — not a general security audit (see
[`docs/cloudflare-migration`](README.md) siblings for the rest of the
program, and Phase 17R's own final report for the current web
security-header/JWT/XSS state, which this document assumes as the
baseline).

## What must not regress, at any phase

- **CORS on the production API stays exactly as strict as it is today.**
  No phase weakens it globally. `SHADOW_PRODUCTION_API_CORS =
  BLOCKED_PENDING_BRYAN_AUTHORIZATION` (decided Phase CF-01B,
  `DECISIONS.md`) — a temporary shadow-origin allowance for
  `bloodmoon-web-shadow` is prepared as a reviewable diff (one
  `WEB_PUBLIC_URLS` value + a controlled restart, no code change) and
  only deployed with explicit, in-the-moment authorization — never
  assumed from an earlier approval.
- **CSP stays free of `unsafe-inline`/`unsafe-eval` in `script-src`.**
  Phase 17R implemented this on the Node runtime via two mechanisms:
  a per-response baseline (`server/middleware/00.security-headers.ts`)
  and a hash-based tightening of Nuxt's own two inline scripts
  (`server/plugins/csp-inline-script-hashes.ts`, which hooks Nitro's
  `render:response`). Whether Nitro's Cloudflare preset fires the same
  `render:response` hook the same way is **unverified until built and
  tested under `wrangler dev`** — see `WEB_MIGRATION.md` and `RISKS.md`.
  If it does not fire, the fallback is `'unsafe-inline'` for `script-src`
  only as a documented, explicit exception — never silently.
- **Auth architecture is unchanged by this program.** Bearer
  access/refresh tokens in `localStorage` remain the current, accepted
  model (Phase 17R classified this `ACCEPTABLE_TEMPORARY_RISK` for the
  supervised initial Beta). This migration does not attempt an
  httpOnly-cookie redesign as a side effect of an infrastructure move —
  that stays its own, separately-authorized future phase.
- **Secrets never move through this repo.** Cloudflare Worker secrets
  are set with `wrangler secret put` (matching the existing Game Data
  Worker convention, `docs/game-data/cloudflare-resources.md`), never
  committed, never logged. `apps/web` currently has no server-only
  secrets at all (only `NUXT_PUBLIC_*` values, which are public by
  definition) — see `ENVIRONMENT_CLASSIFICATION` in `WEB_MIGRATION.md`.
- **MySQL stays private.** No phase in this program proposes a public
  bind for the current or a future MySQL-compatible database. External
  access from Cloudflare Workers happens only through Hyperdrive (or an
  equivalent private/TLS-authenticated path) to a database that is
  itself designed for external connections — never by opening the
  current `127.0.0.1`-bound instance.

## R2 storage credential blast radius (Phase CF-R2-02)

Guild media and launcher-studio assets now reuse the **same** `R2_*`
account credentials as community media (a deliberate choice —
`R2_ASSETS.md`'s object-key namespacing, `guild/`/`launcher-assets/`,
keeps their objects from colliding, but the credential itself is
shared). This means a leaked `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`
now has write access to three media domains' public objects instead of
one — a real, if modest, blast-radius increase over community media
alone. `GUILD_R2_BUCKET`/`LAUNCHER_R2_BUCKET` exist specifically so a
future phase can split any of these onto a dedicated bucket/credential
if that blast radius is ever judged too broad; not done this phase
(no credential exists to split yet — `MEDIA_STORAGE_PROVIDER` has
never been set to `r2` anywhere real, `RISKS.md` CF-R1).

## CSP: R2 shadow origin (Phase CF-R2-02)

The `bloodmoon-web-shadow` Worker's CSP `img-src` now additionally
allows exactly one origin,
`https://pub-a4bacc79c5864ae9bec74ece3b3b2a30.r2.dev` (the `CF-R2-01`
shadow bucket's public URL) — a single explicit origin, never a
wildcard, never `unsafe-inline`/`unsafe-eval`. Applied **only** on the `infra/cloudflare-web-shadow` branch (the same
file, `server/utils/security-headers.ts`, is shared by both presets —
isolation here comes from this edit living on its own dedicated
branch, never merged to `main`, not from any preset-specific code
path). Production deploys from a different branch entirely and is
unaffected. See `R2_ASSETS.md` for the empirical before/after test
that established this was both necessary (blocked without it) and
sufficient (loads cleanly with it, zero other console errors).

## Edge-added surface (Phase 3+, only if a real need is identified)

Putting Cloudflare in front of the legacy API (WAF, rate limiting,
caching of safe GET responses) is additive defense, not a replacement
for the API's own `AuthAbuseGuard`/rate limiting/Turnstile checks,
which stay in force. Any caching rule must exclude every
authenticated/mutating route by default (allow-list safe GETs, not
deny-list unsafe ones) to avoid ever serving one player's cached
response to another.

## Open questions (tracked in RISKS.md, not decided here)

- Whether Cloudflare's own bot-management/WAF products are worth
  adopting, and at what phase.
- Whether Turnstile's existing integration needs any change once the
  web app itself runs on Cloudflare (expected: no, since Turnstile is
  already a third-party call from both browser and API, unrelated to
  where the web app's own server code executes) — to be confirmed
  empirically in the shadow deploy, see `SHADOW_TESTS` in the final
  report for this phase.
