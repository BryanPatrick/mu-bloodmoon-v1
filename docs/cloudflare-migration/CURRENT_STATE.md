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
| Authoritative DNS | The zone's own `NS` records say `ns1.srv41.hinetworks.com.br` / `ns2.srv41.hinetworks.com.br` — **the hosting provider's own nameservers, not Cloudflare**. **Update, Phase CF-DNS-01 (2026-09-23)**: the *registry's* actual delegation (RDAP, the source of truth) shows `ns1.srv02.projectgamers.com.br` / `ns2.srv02.projectgamers.com.br` instead — a real, unexplained discrepancy between the zone's self-reported NS records and the registry delegation, both resolving to the same IP. See `DNS_AND_DOMAIN.md` for full detail | same doc, "Observed production path"; discrepancy via live RDAP query, `rdap.registro.br` |
| Domain registrant | **Update, Phase CF-DNS-01**: confirmed via public RDAP — `Bryan Patrick dos Santos` (this project's own Bryan). A second entity, `Maikon Jonathan Moreira Crivelli`, holds the administrative/technical contact roles, registered since 2017 — see `DNS_AND_DOMAIN.md`'s domain control matrix for the full ownership-vs-access distinction | live RDAP query, 2026-09-23 |
| Cloudflare in the current path | **None** — same doc states explicitly: "No Cloudflare proxy was found in the current path" | same |
| Third production web property | **Found, Phase CF-DNS-01**: `update.mubloodmoon.com.br` — the BloodMoon Launcher's self-update manifest/binary host, same cPanel account, previously not represented in any architecture diagram in this program | `apps/api/src/modules/launcher/launcher.service.ts`, `apps/launcher/README.md`, `docs/deployments/predeploy-2026-09-10-open-beta-consolidation/deploy-manifest.md` |
| Backups | Cron `17 3 * * *` running `bloodmoon-backup.sh` on the cPanel host — full audit `CF-BACKUP-01` (2026-09-24): mysqldump + mutable-asset tar, SHA256SUMS, manifest, failure alerting already wired to the Phase AA `/internal/ops-events` pipeline, and a real (already-built, currently unconfigured) `RCLONE_REMOTE` off-host copy mechanism supporting R2/S3/B2. No encryption in production today. **Update, `CF-BACKUP-02` (2026-09-24)**: a real, private, non-production R2 bucket (`bloodmoon-backups-private`) and a real `age`-encrypted upload/download/restore round-trip now exist and are fully proven — `ARCHITECTURE_READY = YES`, `MECHANISM_PROVEN = YES`, `PRODUCTION_WIRED = NO`. Production cron/config remain exactly as described above, untouched | `deploy/CPANEL_BACKUP_AUTOMATION.md`, `BACKUP_STRATEGY.md` |
| User media (community/guild uploads) | Local disk by default (`COMMUNITY_MEDIA_DIR`, `GUILD_MEDIA_DIR`), optionally Cloudflare R2 via `MEDIA_STORAGE_PROVIDER=r2` (community) / `GUILD_MEDIA_STORAGE_PROVIDER=r2` (guild, own independent switch, Phase CF-R2-02) — **`PRODUCTION_MEDIA_MODE = UNKNOWN`, not confirmed which mode production currently runs for either** | `apps/api/.env.example`, `apps/api/src/modules/media/storage/media-storage.service.ts`, `apps/api/src/modules/guilds/guild-media-storage.service.ts` |
| Launcher-studio assets | Local disk by default (`storage/launcher-assets/`), optionally Cloudflare R2 via `LAUNCHER_MEDIA_STORAGE_PROVIDER=r2` (Phase CF-R2-02 — previously R2 was an unconditional-throw stub) | `apps/api/src/modules/launcher-studio/launcher-asset-storage.ts` |
| Admin-content uploads (`uploadImage()`, the only file-writing `ReferenceAsset` path) | Local disk by default (`storage/uploads/`), optionally Cloudflare R2 via `ADMIN_CONTENT_STORAGE_PROVIDER=r2` (Phase CF-R2-03 — full write-path audit found every other `ReferenceAsset`-touching path is metadata-only or a read) | `apps/api/src/modules/admin-content/admin-content-storage.service.ts` |
| `CONTAINER_STORAGE_READY` | `= YES`, **real-evidence-backed as of Phase CF-R2-04** (was architecture-only "YES" after CF-R2-03): the CF-R2-03 migration applied cleanly to a real disposable MySQL 8.0.46 instance (zero drift), all four domains' `StorageProvider`/R2 paths proven end-to-end against a real R2 bucket with a real test-scoped API token, `guilds.e2e-spec.ts`/`community-media.e2e-spec.ts`/`launcher-remote-content-contract.e2e-spec.ts` all re-run against a real database. `PRODUCTION_ACTIVATED = NO` still (no `*_STORAGE_PROVIDER` is `r2` anywhere real, `RISKS.md` CF-R1) | `docs/cloudflare-migration/R2_ASSETS.md`'s CF-R2-04 section |
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
| Why the patch script exists | a known Nitro/Node ESM resolution quirk (`tailwindcss/colors` → `.js`) — see `project_web_build_needs_nitro_patch` in project memory; unrelated to Cloudflare. **Confirmed this phase: not needed under the `cloudflare-module` preset** — that preset bundles everything into one Rollup `index.mjs`, so the Node-specific unresolved-specifier issue doesn't reproduce; a clean Cloudflare build with zero `tailwindcss/colors` errors confirmed it |
| Runtime config | `apiBase`, `turnstileSiteKey`, `realMoneyPaymentsEnabled`, `marketplaceEnabled` — all `NUXT_PUBLIC_*` env-driven, no server-only secrets in `apps/web` |
| Server-side code (`apps/web/server/`) | three files, added Phase 17R: `middleware/00.security-headers.ts`, `plugins/csp-inline-script-hashes.ts`, `utils/security-headers.ts` — checked this phase, none use `node:fs`, `node:net`, `node:tls`, or `node:child_process`; one uses `node:crypto`'s `createHash` |
| Dependencies (root workspace, what `apps/web` actually uses at runtime) | `@nuxt/ui`, `@pinia/nuxt`, `lucide-vue-next`, `nuxt`, `pinia`, `vue`, `vue-router` — no `@nuxt/image`, no native/binary deps found |
| Auth model | Bearer access/refresh tokens in `localStorage` (`apps/web/composables/useAuth.ts`), one non-authoritative cookie for SSR display state — unchanged by this phase, see `docs/cloudflare-migration/SECURITY_MODEL.md` |
| Security headers | CSP + 5 other headers, added Phase 17R. **Re-verified this phase under the Cloudflare Workers runtime** — identical header set and CSP hashes on both local Miniflare and the live Cloudflare edge, see `WEB_MIGRATION.md` |

## apps/api — current implementation facts (Cloudflare-migration relevant, from the concurrent feasibility investigation)

The findings below come from `docs/cloudflare-api-feasibility.md`
(branch `infra/cloudflare-api-feasibility`, commit `f47f0b6d`,
2026-09-22) — a concurrent, independent investigation, not this
program's own web-shadow work. Its code was never merged; its
documented findings were spot-checked against the real `apps/api`
source this phase (package versions, `setInterval`/`GET_LOCK`/`sharp`/
`node:fs` usage counts) before being folded in here as current-state
fact.

| Fact | Detail |
|---|---|
| Size | 298 source files (273 TypeScript), 51 controllers |
| Prisma | `@prisma/client ^5.0.0` (confirmed in `apps/api/package.json`), Rust native binary query engine — not Workers-compatible as-is |
| Financial-semantics surface | 24 files use `$transaction` (1 explicit Serializable path); 5 services use connection-scoped `GET_LOCK`/`RELEASE_LOCK` (both counts confirmed this phase by direct grep) |
| Background jobs | 10 files use `setInterval` (confirmed this phase by grep) — not a durable scheduler under an evictable Workers isolate |
| Filesystem | community/guild media, launcher assets, config/export reads use `node:fs`/`node:path` (~11 `node:fs` files confirmed this phase; the feasibility report counts 14 including `node:path`-only files) |
| Images | native `sharp 0.34.5` (2 files use it directly, confirmed this phase) — no Workers equivalent as-is |
| SMTP | Nodemailer 9.0.5, real TLS SMTP transport (Phase 17R) — Workers blocks port 25 by default; the exact host/port/TLS combination has not been proven under Workers |
| Crypto/JWT/2FA | `node:crypto` (AES-256-GCM, HMAC), `bcryptjs`, Nest JWT, `otplib` — all `SUPPORTED_WITH_NODE_COMPAT` per that report, still needing empirical round-trip vectors before trusting in production |
| Cloudflare account scope gap | this account's OAuth token lacks `containers:write` (confirmed via `wrangler whoami`, `CURRENT_STATE.md` above) — Containers usage needs a fresh `wrangler login` with updated scopes |
| Container proof | prepared (Dockerfile + minimal Worker router) on the feasibility branch. **Update, Phase CF-EXIT-01 (2026-09-23), read-only consumption of a concurrent, unmerged Codex branch**: `infra/cloudflare-api-container-poc` (`faee869e`, confirmed not an ancestor of `main`) documents a real remote proof via Cloudflare Workers Builds — health/readiness/auth/TOTP/graceful-shutdown/disk-ephemerality passed, plus a real disposable MySQL 8.0.46/8.4.11 financial-semantics proof. Not this program's own independently-verified result; not merged; the document itself says it is not production authorization. Full detail: `PROVIDER_EXIT_CHECKLIST.md`, `RISKS.md` CF-R4 |

See `API_MIGRATION.md` for the full analysis and the resulting decision
(`API_INITIAL_MIGRATION_TARGET = CLOUDFLARE_CONTAINERS`).

## Existing D1 remote state (Game Data Platform, informational only)

Migrations `0001`–`0003` applied, `0004` **not** applied (verified
read-only 2026-09-21, Phase 20B/20C — `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md`
Part 8). Unrelated to this program's own database work, listed here
only because it is the same Cloudflare account.

## What Phase CF-01 changed

Nothing in production. Created documentation, a Nuxt/Nitro Cloudflare
Workers build configuration in a dedicated branch/worktree, and one
non-production shadow Worker deployment (`bloodmoon-web-shadow`, no
custom domain, no DNS record) — see `WEB_MIGRATION.md` and
`PHASE_STATUS.md`.

## What Phase CF-01B changed

Nothing in production. Reconciled this program's own web-shadow
findings with the concurrent `infra/cloudflare-api-feasibility`
investigation into one canonical set of documents; recorded Bryan's
resulting architecture decision (`DECISIONS.md`). No code from the
feasibility branch was merged. The shadow Worker from CF-01 stays live,
unchanged, per Bryan's explicit instruction to keep it for continued
testing.
