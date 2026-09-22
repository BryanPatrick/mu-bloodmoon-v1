---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# Web migration (apps/web → Cloudflare Workers)

## Compatibility audit

Audited this phase against the real `apps/web` source (not assumed).
Classification: `COMPATIBLE` / `REQUIRES_SMALL_CHANGE` /
`REQUIRES_ARCHITECTURE_CHANGE` / `UNKNOWN`.

| Area | Finding | Classification |
|---|---|---|
| Nuxt/Nitro version | `nuxt ^4.4.8`, bundled Nitro `2.13.4` — both ship the official `cloudflare-module` (a.k.a. `cloudflare_workers`) Nitro preset out of the box | COMPATIBLE |
| Server routes | Three files under `apps/web/server/` (all added Phase 17R): a global header middleware and a `render:response` plugin, plus a shared util. No API routes, no filesystem access | COMPATIBLE — built and runtime-tested this phase, see below |
| Runtime config | `NUXT_PUBLIC_*` only, no server-only secrets in this app today | COMPATIBLE |
| Node APIs | Only `node:crypto`'s `createHash` (in the CSP hash plugin) — needs `compatibility_flags: ["nodejs_compat"]`, which is a one-line config, not a code change | REQUIRES_SMALL_CHANGE (done — `apps/web/wrangler.jsonc`) |
| Filesystem usage | None found in `apps/web` source (`node:fs`/`readFileSync`/`writeFileSync` grep returned nothing) | COMPATIBLE |
| Dependencies | `@nuxt/ui`, `@pinia/nuxt`, `lucide-vue-next`, `nuxt`, `pinia`, `vue`, `vue-router` — no `@nuxt/image`, no native/binary modules | COMPATIBLE |
| SSR behavior | Full page renders verified this phase under both Miniflare (`wrangler dev`) and the real Cloudflare edge (shadow deploy) — hydration, color-mode script, and the CSP-hashed Nuxt payload script all execute correctly | COMPATIBLE — verified, not assumed |
| Image handling | Plain `<img>` tags, static files under `public/`, no server-side image processing/resizing pipeline | COMPATIBLE |
| Auth behavior | Bearer tokens in `localStorage`, calls the API directly by absolute URL (`NUXT_PUBLIC_API_BASE`) — no cookie-based session the Worker itself needs to manage | COMPATIBLE |
| API base | Works unchanged — it's just a fetch target URL, verified against both a local API and the real production API's CORS preflight (see below) | COMPATIBLE |
| Turnstile | Third-party script/widget, loaded client-side by URL — unaffected by where the web app's own server code runs; verified rendering correctly (test sitekey) in the shadow deploy | COMPATIBLE |
| Security headers (Phase 17R) | `server/middleware/00.security-headers.ts` — runs identically under `cloudflare-module`; verified via `curl` against both Miniflare and the live shadow Worker: all 6 headers present, same values | COMPATIBLE — verified, not assumed |
| CSP script hashing (Phase 17R) | `server/plugins/csp-inline-script-hashes.ts` hooks Nitro's `render:response` — **this was the one real open risk from `SECURITY_MODEL.md`, now closed**: verified firing correctly under both Miniflare and the live edge deploy, producing correct, request-appropriate SHA-256 hashes each time | COMPATIBLE — verified, RISKS.md updated |
| `patch-nitro-output.mjs` (the `tailwindcss/colors` ESM-resolution patch) | **Not needed under `cloudflare-module`** — that preset bundles everything into one `index.mjs` via Rollup (`format: 'esm'`), so the Node-specific unresolved-specifier issue the patch works around does not reproduce; confirmed by a clean build with zero `tailwindcss/colors` errors, patch script never invoked (`scripts/build-cloudflare-web.mjs` deliberately skips it) | COMPATIBLE (different code path, same non-issue) |
| Duplicate-import build warnings (`GmEventScheduleEntry` etc.) | Pre-existing, appear identically under both presets — cosmetic naming collision between two composables, unrelated to Cloudflare | COMPATIBLE (no regression) |

**Overall: COMPATIBLE.** No item required an architecture change. The
only actual change needed was one config file
(`apps/web/wrangler.jsonc`, `compatibility_flags: ["nodejs_compat"]`)
and one new build script that neither touches nor risks the existing
Node build path.

## Build evidence

`node scripts/build-cloudflare-web.mjs` (root workspace) — sets
`NITRO_PRESET=cloudflare_module`, builds via the local `nuxt` binary
directly (not `npx`, to avoid resolution/prompt hangs seen once this
phase), does **not** run `patch-nitro-output.mjs`. Result: single
bundled `apps/web/.output/server/index.mjs` (965 kB / 159 kB gzip) +
`apps/web/.output/public/` (2858 static files, 9.06 MB / 1.37 MB gzip)
+ a Cloudflare `_headers` file Nitro generates automatically for asset
caching. **Zero unresolved imports, zero missing-Node-API errors, zero
silent fallback** — confirmed by reading the full build log, not just
its exit code.

## Local runtime evidence (`wrangler dev`, Miniflare)

Ran the actual built output through `wrangler dev .output/server/index.mjs
--assets .output/public`, wrangler `3.114.17` (the version already
pinned in this monorepo via the existing Game Data Worker dependency).
Tested, with a real local API (`apps/api`) and a real, disposable test
account (never a production account):

- `/`, `/login`, `/registrar`, `/recuperar-conta`, `/redefinir-senha`,
  `/recarga`, `/marketplace` — all render correctly, zero console
  errors beyond the expected "no local API running" connection-refused
  ones seen before the API was started.
- **Auth shadow test**: register (201) → login (201, tokens issued) →
  protected navigation to `/painel` (renders real account data, not a
  redirect) → explicit `/auth/refresh` call (201, both tokens rotated)
  → logout via the real UI flow → `localStorage` session cleared →
  `/painel` now redirects to `/login`. All through the Workers/Miniflare
  runtime, not the Node runtime.
- **Marketplace gate**: `/marketplace` shows only the official WCoin
  store; the "Jogadores" (player market) tab is absent — same gate
  behavior as the Node build, confirmed via a DOM query, not just a
  screenshot.
- **Security headers/CSP**: all 6 headers present on every route tested,
  including 302 redirects (`/painel` unauthenticated); zero CSP
  console violations; the two inline-script hashes matched exactly
  (the page hydrated, color-mode script executed).

## Live shadow deployment evidence

Deployed via `wrangler deploy .output/server/index.mjs --assets
.output/public` to `bloodmoon-web-shadow` (no routes, no custom
domain — `workers.dev` only). Live URL:
`https://bloodmoon-web-shadow.bryanelrick22.workers.dev`, Version ID
`c055ce6d-3139-4833-9096-d2d411a49583`, build hash (`index.mjs`
SHA-256) `9969606be1864a4c639aca17ffc4cba08ed7d3517c607c10504a5f531734c5f9`.
Verified via `curl` against the **real Cloudflare edge** (not
Miniflare — response carries a genuine `CF-RAY` id and `Server:
cloudflare`): all 6 security headers present, CSP hashes present and
correct, `Worker Startup Time: 31 ms`.

## API base / CORS (brief item 11)

The shadow deploy's `NUXT_PUBLIC_API_BASE` points at the **real
production API** (`https://api.mubloodmoon.com.br/api`) — the safest
option available, since no separate staging API exists. Checked (a
read-only CORS preflight, not a real API call) whether production CORS
already allows the shadow origin: **it does not** — the `OPTIONS
/api/auth/login` preflight from `Origin:
https://bloodmoon-web-shadow.bryanelrick22.workers.dev` returns no
`Access-Control-Allow-Origin` header at all. This means any real
`fetch` from the shadow deploy to the production API will fail
client-side with a CORS error — confirmed as an *expected*, documented
limitation, not a bug.

**The fix needs no code change.** `apps/api/src/main.ts` already reads
its allowed origins from `WEB_PUBLIC_URLS`/`WEB_PUBLIC_URL`
(comma-separated). Adding
`https://bloodmoon-web-shadow.bryanelrick22.workers.dev` to that
production environment variable, then restarting the API process,
would be sufficient — a config + restart, not a deploy. **Not done
this phase** — it is a production environment change and needs its own
explicit, in-the-moment authorization (see `DECISIONS.md`), exactly as
the brief requires ("do not weaken production CORS globally... do not
deploy API change without authorization"). The change is a single
value addition to an existing allow-list, never a wildcard.

## Environment variable classification (names only, no values)

| Variable | Class |
|---|---|
| `NUXT_PUBLIC_API_BASE` | `PUBLIC_WEB_CONFIG` |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | `PUBLIC_WEB_CONFIG` (site keys are public by design) |
| `NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED` | `PUBLIC_WEB_CONFIG` |
| `NUXT_PUBLIC_MARKETPLACE_ENABLED` | `PUBLIC_WEB_CONFIG` |
| *(none found)* | `SERVER_NON_SECRET_CONFIG` — `apps/web` has no server-only, non-secret config today; everything it reads is already `NUXT_PUBLIC_*` |
| *(none found)* | `SECRET_BINDING_LATER` — `apps/web` holds no secrets today; if a future server route needs one (unlikely for this app), it becomes a `wrangler secret put` binding, never a `vars` entry |
| `API_PORT`, `WEB_PUBLIC_URL(S)`, `COMMUNITY_MEDIA_DIR`, `GUILD_MEDIA_DIR`, `SMTP_*`, `R2_*`, `JWT_*`, `TWO_FACTOR_ENCRYPTION_KEY`, `DATABASE_URL` | `CURRENT_PROVIDER_ONLY` — all belong to `apps/api`, not `apps/web`; relevant to Phase 4/5/6, not this phase |
| *(none found)* | `DEPRECATED` — none identified this phase |

## What is NOT yet proven

- Sustained/production-scale traffic behavior (this was a correctness
  check, not a load test).
- Behavior once the API base is actually reachable with a real CORS
  allowance (blocked on the decision above).
- Whether `nuxt generate`/prerendering interacts any differently — not
  attempted, the app is SSR-on-request in both presets today.
