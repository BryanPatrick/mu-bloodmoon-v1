---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
confidence: verified from repo/docs + one live, read-only Cloudflare account check (wrangler whoami)
---

# Current state (verified reality only)

Every line here is either a fact read directly from tracked repo/docs
content, or a live, read-only check this phase (`wrangler whoami`,
explicitly noted). Nothing in this file is a plan, a recommendation, or
an inference — see `TARGET_ARCHITECTURE.md` for the future state and
`RISKS.md` for what's genuinely unknown.

## Hosting today (unchanged by this program so far)

| Component | Fact | Source |
|---|---|---|
| Web (`mubloodmoon.com.br`, `www`) | Nuxt SSR, `/home/mubloodxz/bmweb`, cPanel Node.js Selector (LSAPI/LiteSpeed) | `docs/deployment-architecture.md`, `deploy/CPANEL_NODE_DEPLOY.md` |
| API (`api.mubloodmoon.com.br`) | NestJS, `/home/mubloodxz/bmapi`, same host | same |
| Database | MySQL, bound to `127.0.0.1` on the cPanel host, not publicly reachable | `deploy/CPANEL_NODE_DEPLOY.md`, `apps/api/.env.example` |
| TLS | Let's Encrypt, terminates at the LiteSpeed layer, TLS 1.2/1.3 only | `docs/handoff/production-tls-validation.md` (2026-08-09 audit) |
| Authoritative DNS | `ns1.srv41.hinetworks.com.br` / `ns2.srv41.hinetworks.com.br` — **the hosting provider's own nameservers, not Cloudflare** | same doc, "Observed production path" |
| Cloudflare in the current path | **None** — same doc states explicitly: "No Cloudflare proxy was found in the current path" | same |
| Backups | Cron `17 3 * * *` running `bloodmoon-backup.sh` on the cPanel host | `deploy/CPANEL_BACKUP_AUTOMATION.md` |
| User media (community/guild uploads) | Local disk by default (`COMMUNITY_MEDIA_DIR`, `GUILD_MEDIA_DIR`), optionally Cloudflare R2 via `MEDIA_STORAGE_PROVIDER=r2` — **not confirmed which mode production currently runs** | `apps/api/.env.example`, `apps/api/src/modules/media/storage/media-storage.service.ts` |
| Marketplace delivery worker (`worker:game-bridge`) | An npm script exists (`worker:game-bridge`); no cron entry for it found in any tracked doc — consistent with the marketplace being disabled (Phase 17R) | `docs/management-flows.md`, `apps/api/package.json` |

## Cloudflare account — already in use, for unrelated workloads

Confirmed live this phase via `wrangler whoami` (read-only): a single
Cloudflare account, `Bryanelrick22@gmail.com's Account`
(`a4da50ece653768ed53fab5c6c2be6d7`), OAuth-authenticated in this
environment.

Token scopes present: `account:read`, `user:read`, `workers:write`,
`workers_kv:write`, `workers_routes:write`, `workers_scripts:write`,
`workers_tail:read`, `d1:write`, `pages:write`, `zone:read`,
`ssl_certs:write`, `ai:write`, `queues:write`, `pipelines:write`,
`offline_access`. **No `zone:write`/DNS-edit scope is present** — this
credential is structurally incapable of changing DNS even if asked to.

Two existing, unrelated projects already live in this account
(`docs/game-data/cloudflare-resources.md`, Phase 2D, 2026-08-20):

| | Knowledge Hub (untouched by this program) | Game Data Platform (untouched by this program) |
|---|---|---|
| Worker | `ai-knowledge-hub` | `bloodmoon-game-data-worker` |
| D1 | `ai-knowledge-hub-db` | `bloodmoon-game-data` (`cf84e6fe-7ea6-4f0b-a2f2-313ec3c0dab6`) |
| R2 | `ai-knowledge-hub-storage` | none provisioned |
| Purpose | internal knowledge tooling | `GAME_COMMAND_TRANSPORT` (Portal→Agent command channel) + telemetry read models |

Neither is the public web or the financial API. **No Worker, D1, R2,
KV, Queue, or DNS record for the public site has been created as of
this phase.**

## apps/web — current implementation facts (Cloudflare-migration relevant)

| Fact | Detail |
|---|---|
| Framework | Nuxt `^4.4.8` (package.json), Nitro bundled with it |
| Current deploy target | `node-server` preset, via `npm run web:build` → `nuxt build apps/web && node scripts/patch-nitro-output.mjs` |
| Why the patch script exists | a known Nitro/Node ESM resolution quirk (`tailwindcss/colors` → `.js`) — see `project_web_build_needs_nitro_patch` in project memory; unrelated to Cloudflare, but the patch step's necessity under the Cloudflare preset is unverified — see `RISKS.md` |
| Runtime config | `apiBase`, `turnstileSiteKey`, `realMoneyPaymentsEnabled`, `marketplaceEnabled` — all `NUXT_PUBLIC_*` env-driven, no server-only secrets in `apps/web` |
| Server-side code (`apps/web/server/`) | three files, added Phase 17R: `middleware/00.security-headers.ts`, `plugins/csp-inline-script-hashes.ts`, `utils/security-headers.ts` — checked this phase, none use `node:fs`, `node:net`, `node:tls`, or `node:child_process`; one uses `node:crypto`'s `createHash` |
| Dependencies (root workspace, what `apps/web` actually uses at runtime) | `@nuxt/ui`, `@pinia/nuxt`, `lucide-vue-next`, `nuxt`, `pinia`, `vue`, `vue-router` — no `@nuxt/image`, no native/binary deps found |
| Auth model | Bearer access/refresh tokens in `localStorage` (`apps/web/composables/useAuth.ts`), one non-authoritative cookie for SSR display state — unchanged by this phase, see `docs/cloudflare-migration/SECURITY_MODEL.md` |
| Security headers | CSP + 5 other headers, added Phase 17R, verified against the current Node build — not yet re-verified under a Cloudflare Workers runtime, see `WEB_MIGRATION.md` |

## Existing D1 remote state (Game Data Platform, informational only)

Migrations `0001`–`0003` applied, `0004` **not** applied (verified
read-only 2026-09-21, Phase 20B/20C — `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md`
Part 8). Unrelated to this program's own database work, listed here
only because it is the same Cloudflare account.

## What this phase (CF-01) changed

Nothing in production. This phase created documentation, a Nuxt/Nitro
Cloudflare Workers build configuration in a dedicated branch/worktree,
and (if `PHASE_STATUS.md` says so) one non-production shadow Worker
deployment at a `workers.dev` subdomain with no custom domain and no
DNS record anywhere.
