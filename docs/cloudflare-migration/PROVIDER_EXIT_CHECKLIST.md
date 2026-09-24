---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-23
---

# Provider exit checklist — every remaining dependency on the current host

Phase `CF-EXIT-01` (2026-09-23): **read-only**. No production touched,
no DNS/email/database changed, no file deleted, no service restarted,
no provider contacted, no payments enabled. This document is the
authoritative answer to one question: **what still prevents
`CURRENT_PROVIDER = ZERO`?**

It synthesizes every prior Cloudflare-migration phase
(`CURRENT_STATE.md`, `SERVICE_INVENTORY.md`, `TARGET_ARCHITECTURE.md`,
`MIGRATION_ROADMAP.md`, `DNS_AND_DOMAIN.md`, `EMAIL_MIGRATION.md`,
`R2_ASSETS.md`, `DATABASE_MIGRATION.md`, `API_MIGRATION.md`,
`RISKS.md`, `PHASE_STATUS.md`) into one exit-focused view, plus new
findings from this phase's own hidden-dependency sweep and a read-only
consumption of a concurrent, unmerged Codex investigation (see §12).

## A major finding this phase: the Container proof has actually run (Codex, unmerged)

Every canonical doc up to and including `CF-DNS-01`/`CF-MAIL-01`
states `CF-API-02R` "has not been run" and is "the single
highest-leverage next step." **This is now stale.** A concurrent,
independent worktree — `infra/cloudflare-api-container-poc`
(`D:/MU/mu-bloodmoon-cloudflare-api-container-poc`, tip `faee869e`,
**not merged to `main`, confirmed via `git merge-base`: `main` does
not contain this commit**) — contains `docs/cloudflare-api-container-poc.md`,
dated 2026-09-23, documenting a real, evidenced remote Container proof:

- Deployed via Cloudflare Workers Builds (GitHub-linked remote build,
  no local Docker) to an isolated `bloodmoon-api-container-shadow`
  Worker — no custom domain, no production route, no production
  database, no production secret.
- `/api/health`/`/api/ready` returned 200; synthetic register/login/
  refresh/protected-route/logout passed; synthetic TOTP setup/verify
  passed; crypto checks (AES-256-GCM, JWT, bcrypt, TOTP, QR) passed;
  container-disk ephemerality proven directly (`/tmp` marker absent
  after a restart); SIGTERM reached the Nest process, Prisma
  disconnected cleanly, exit code 0, health returned after replacement.
- **Database gate closed for real, not just attempted**: an initial
  pass used a disposable TiDB Serverless target
  (`TIDB_RUNTIME_POC = PASS`, but explicitly `MYSQL_8_MIGRATION_REPLAY
  = NOT_PROVEN` at that point) — then a follow-up pass
  (**"CF-API-02R3"** in that document) replayed all 55 canonical Prisma
  migrations from zero against a real disposable MySQL 8.0.46 *and*
  temporarily rebuilt the shadow around a real MySQL 8.4.11 process in
  the same disposable Container, proving Serializable commit/rollback,
  unique-key idempotency, real concurrent row-lock serialization, and
  `GET_LOCK`/`RELEASE_LOCK` mutual exclusion — the exact financial-
  semantics bar this program has required throughout.
- Billing PII crypto (Asaas) is **explicitly not included** — isolated
  on a separate, unmerged branch
  (`payments/asaas-production-readiness`), a future integration item,
  not part of this candidate.
- **Real, flagged risk, not glossed over**: the shadow Worker is
  currently **publicly addressable** — Cloudflare Access (Zero Trust)
  was evaluated but deliberately not enabled yet (needs an org/auth
  domain setup step first).
- The document itself states plainly: **"This POC is not production
  authorization and does not change `main`."**

**How this phase used that finding**: read-only, via `git log`/`git
merge-base`/`Read` against that worktree's own files, exactly as
instructed ("consume... read-only if available... do not touch Codex
worktree"). Nothing in that worktree was modified. Nothing from it was
merged, cherry-picked, or copied into this program's own branch. This
document treats it as **evidence, not as this program's own
verification** — the distinction matters: this program has not
independently reproduced these results, and the finding is currently
sitting on a branch main does not contain. **Recorded classification**:
`API_CONTAINER_PROOF = SHADOW_PROVEN_ON_UNMERGED_BRANCH` — a
meaningfully different, much stronger state than `PHASE_STATUS.md`'s
current "not yet run," but **not** the same as this program's own
`CODE_READY`/`SHADOW_PROVEN` bar being independently met, and
absolutely not production authorization. See §12 for the full
exit-readiness classification and §16 for how the canonical docs were
updated to reflect this without overclaiming it as this program's own
work.

## 1. Provider service inventory (per the brief's checklist)

| Area | Currently on current provider? | Detail |
|---|---|---|
| Web/Nuxt | YES | `/home/mubloodxz/bmweb`, cPanel Node.js Selector (LSAPI) |
| API/NestJS | YES | `/home/mubloodxz/bmapi`, same host/mechanism |
| MySQL | YES | bound to `127.0.0.1`, cPanel-managed, never public |
| Email/SMTP | YES | cPanel SMTP, `SMTP_*` vars — full audit `EMAIL_MIGRATION.md` |
| Mailboxes | UNKNOWN whether any exist | `MAILBOX_INVENTORY = UNKNOWN`, `EMAIL_MIGRATION.md` |
| DNS | YES | current provider's nameservers (with the `CF-DNS-01` hostname discrepancy — zone says `hinetworks`, registry delegation says `projectgamers`, same IP) |
| SSL certificates | YES | Let's Encrypt, cPanel/LiteSpeed-managed, auto-renewed by the host |
| FTP | Alias exists, **zero real usage found** | `ftp.mubloodmoon.com.br` A record exists (cPanel default); no FTP client/library/script anywhere in this repo — deploy is File Manager upload, not FTP |
| `update.mubloodmoon.com.br` | YES | launcher self-update host, same cPanel account (`CF-DNS-01`) |
| Launcher downloads | YES (design only — no artifact in any checkout) | same subdomain |
| Cron jobs | YES, one confirmed | `17 3 * * * /home/USUARIO/bin/bloodmoon-backup.sh` (`deploy/CPANEL_BACKUP_AUTOMATION.md`) |
| Background jobs | Runs inside the same long-lived Node process | `worker:game-bridge`/`worker:marketplace-expirations` npm scripts, no separate cron entry found (marketplace disabled) |
| Backups | YES, output lives only on the host | `bloodmoon-backup.sh`, `verify-backup-integrity.sh` — see §6 |
| Logs | YES | `<approot>/stderr.log`-style paths, cPanel-managed rotation (per `bloodmoon-deploy` skill's own Phase 10 caveat: verify the real log path before trusting a "zero errors" read) |
| File storage/uploads | YES, local disk by default | all 6 `apps/api/storage/*` dirs — R2-capable for 4 of them (§13) |
| cPanel-specific tooling | YES | Node.js Selector (LSAPI), File Manager, cron UI, Remote MySQL Access grant mechanism |
| Node Selector/Passenger | Node.js Selector (LSAPI) — **not Passenger** | confirmed in `bloodmoon-deploy` skill's own fixed facts; `tmp/restart.txt` is a no-op on this host |
| Redirects | YES | cPanel's "Force HTTPS Redirect" (`docs/handoff/production-tls-validation.md`) |
| Subdomains | `www`, `api`, `mail`, `ftp`, `update` all on this host | full inventory `DNS_AND_DOMAIN.md` |
| Scheduled tasks | same as cron above | no separate mechanism found |
| Database backups | YES | same `bloodmoon-backup.sh` output |
| Email backups | UNKNOWN | no evidence found either way — mailbox existence itself is unconfirmed (`MAILBOX_INVENTORY = UNKNOWN`) |
| DNS-only services | none beyond the record types already inventoried | `DNS_AND_DOMAIN.md`'s full table |

## 2-3. Classified dependencies

| CURRENT_PROVIDER_SERVICE | CURRENT_USAGE | TARGET_DESTINATION | MIGRATION_STATUS | Notes |
|---|---|---|---|---|
| Web (Nuxt SSR) | production traffic | Cloudflare Workers | SHADOW_PROVEN | `bloodmoon-web-shadow` live, no custom domain; CSP/security headers re-verified identical on the real edge |
| API (NestJS) | production traffic | Cloudflare Containers | **SHADOW_PROVEN_ON_UNMERGED_BRANCH** (see finding above) — this program's own canonical docs still say `PLANNED`/proof-not-run; that status is now stale, corrected this phase, real merge/independent-verification still outstanding | see §12 |
| MySQL | production data | external MySQL-compatible (vendor undecided) | CODE_READY (method proven: `CF-DB-01`, and independently re-proven on the Codex branch against a *different* disposable instance, §12) | vendor selection is the real remaining gap, not the method |
| Community media | production uploads (mode unconfirmed) | Cloudflare R2 | CODE_READY, SHADOW_PROVEN (real R2 e2e, `CF-R2-04`/`05`) | `PRODUCTION_ACTIVATED = NO` (`RISKS.md` CF-R1, `PRODUCTION_MEDIA_MODE = UNKNOWN`) |
| Guild media | production uploads | Cloudflare R2 | CODE_READY, SHADOW_PROVEN | same activation gap |
| Launcher-studio assets | admin-authored assets | Cloudflare R2 | CODE_READY, SHADOW_PROVEN | same activation gap |
| Admin-content uploads | admin CMS images | Cloudflare R2 | CODE_READY, SHADOW_PROVEN | same activation gap |
| Static web assets (`public/images`, `dev-references/{visual,game-assets}`) | production static serving | Cloudflare R2 | SHADOW_PROVEN | 3162 files shadow-copied and integrity-verified, `CF-R2-01`; production URLs unchanged |
| Launcher download binary | no artifact exists in any checkout | Cloudflare R2 (design only) | PLANNED | nothing to migrate yet |
| `update.mubloodmoon.com.br` (manifest/binary host) | production launcher self-update | Cloudflare/R2 (Bryan's recorded direction) | PLANNED — direction only, no artifact, no DNS action | `EMAIL_MIGRATION.md`/`DNS_AND_DOMAIN.md` both carry this forward unchanged |
| Transactional email (password reset, account deletion, admin alerts) | production (delivery proof still open, pre-existing) | future external SMTP/API provider | CODE_READY (centralized transport, 5-candidate shortlist researched) — vendor undecided | `EMAIL_MIGRATION.md` |
| Human mailboxes | existence unconfirmed | TBD (managed mailbox or Cloudflare Email Routing forward-only) | UNKNOWN | `MAILBOX_INVENTORY = UNKNOWN`, blocks this row specifically, not transactional email |
| DNS (authoritative) | current provider's nameservers | Cloudflare DNS | PLANNED — full target design exists, zero DNS changed | blocked on registrar/DNS-zone/nameserver access (`DNS_AND_DOMAIN.md`), see §7 |
| SSL/TLS (origin) | Let's Encrypt via cPanel/LiteSpeed | Cloudflare-managed edge cert + (if Containers is the API target) an origin cert for Cloudflare→Container traffic | PLANNED | see §9 |
| Backups (DB + app snapshot) | `bloodmoon-backup.sh`, output on the cPanel host only | needs a Bryan-controlled or Cloudflare-adjacent destination before exit | **BLOCKED** — no target destination decided anywhere in this program | genuinely new gap, see §6 |
| Cron (daily backup) | cPanel cron | Cloudflare Cron Triggers (for whichever job survives the API migration) or a VPS-based cron if Containers doesn't natively replace it | PLANNED | not designed in detail anywhere yet |
| Logs | cPanel filesystem, host-managed rotation | Cloudflare's own Container/Worker logging (Logpush/Tail), or an external log sink | UNKNOWN | never previously scoped by this program at all — new gap, see §10 |
| FTP alias | provisioned, unused | none needed | NOT_NEEDED_AFTER_EXIT | zero real usage found this phase |
| cPanel Node.js Selector/LSAPI itself | current API/web runtime host | Cloudflare Workers (web) / Containers (API) | tracked above under Web/API rows | not a separate dependency once those two are resolved |
| Health/readiness routes (`/api/health`, `/api/ready`) | built in response to an LSAPI-specific incident (2026-09-15) | **already portable** — these are the exact routes Cloudflare Containers needs for its own health checks, and the Codex proof (`§12`) already exercised them successfully | ALREADY_REPLACED (in the sense that the code is provider-agnostic; no further work needed here) | genuinely good news, not a blocker |
| Remote MySQL Access grant mechanism | used temporarily for cPanel-side Prisma migrations (`bloodmoon-deploy` skill Phase 3/7) | not needed once the database itself exits to an external, directly-reachable vendor | NOT_NEEDED_AFTER_EXIT | a cPanel-specific workaround for a cPanel-specific WASM-OOM constraint; irrelevant once MySQL itself moves |
| `deploy:cpanel:package` build/packaging script | current deploy pipeline | a Container image build (Dockerfile + CI), already prototyped on the Codex branch (`Dockerfile.cloudflare-poc`) | PLANNED, prototype exists on an unmerged branch | not yet this program's own artifact |
| Alternate generic VPS/Docker deploy path (`deploy/docker-compose.production.yml`, `deploy/nginx.bloodmoon.conf`, `deploy/HOSTINGER_CHECKLIST.md`) | **not currently used** — a pre-existing, already-committed, generic self-hosted alternative, unrelated to this program's Cloudflare-specific architecture | N/A — not part of the Cloudflare target architecture at all | NOT_NEEDED_AFTER_EXIT (for the Cloudflare path specifically) | genuinely new discovery this phase, informational only — see §4 |

## 4. Hidden dependencies found (repo/docs/config sweep)

Searched `apps/`, `deploy/`, `scripts/` for every literal named in the
brief. Results:

| Search term | Found in code (`apps/`, `scripts/`)? | Found in docs/deploy? | Assessment |
|---|---|---|---|
| `hinetworks`, `srv41`, `190.102.41.133` | NO | YES (`deploy/CPANEL_NODE_DEPLOY.md`, expected) | No runtime code hardcodes the provider's IP or nameserver hostname anywhere — clean |
| `cPanel`, `Passenger`, `Node Selector`, `LSAPI` | Only in **comments** (12 files) — no functional dependency, all explanatory context (e.g. why a health route exists, why a burst-detector assumes one process) | extensive, expected | No functional code branches on "am I running on cPanel" — the comments are documentation, not logic |
| `FTP` | NO functional usage anywhere | DNS-only alias, cPanel default | `NOT_NEEDED_AFTER_EXIT` |
| `mail.mubloodmoon.com.br` | NO | DNS-only (cPanel mail-panel alias) | no code references this hostname at all |
| `update.mubloodmoon.com.br` | **YES — a genuinely real finding.** Hardcoded as a literal string in 8 places: `apps/api/src/modules/launcher/launcher.service.ts:153` (a DB-configurable *default value* only — an admin can override via the `launcher-manifest-url` AppSetting without a code deploy), plus 7 places in the **compiled/distributed launcher client itself** (`apps/launcher/Models/LauncherSettings.cs`, `apps/launcher/Services/LauncherApiClient.cs`, `launcher.settings.json`, `manifest.production.json`, `fallback-content.json`) | extensive | See detailed finding below — this is a *domain*-hardcoding, not an *IP*-hardcoding, which matters for exit readiness |
| `api.mubloodmoon.com.br` | Same pattern — hardcoded as the launcher client's default `ApiBaseUrl` in `LauncherSettings.cs`/`LauncherApiClient.cs`/`launcher.settings.json` | expected | Same finding as above |
| absolute host paths (`/home/mubloodxz`) | NO in `apps/`, NO in `scripts/` | YES, `deploy/CPANEL_NODE_DEPLOY.md` only (expected — a deploy runbook, not runtime code) | Clean — the application itself never hardcodes this path |
| `localhost`/`127.0.0.1` DB assumptions | 3 files, all **as documented dev-default fallback values or comments**, never a forced/unconditional connection target: `auth.service.ts`, `account-deletion-request.service.ts` (both unrelated — matched on an `SMTP_REQUIRE_TLS` port-number coincidence, not DB), `main.ts` (dev-only bootstrap default) | `DATABASE_URL` in every env-example already correctly points at a real hostname (`mysql`/an external host), never forced to loopback in code | Clean — `DATABASE_URL` is fully env-driven, no code-level loopback assumption |
| provider-specific SMTP | NO — `SMTP_HOST` etc. are all env-var driven, zero hardcoded provider hostname anywhere in `apps/api/src` | expected (`deploy/.env.production.example` has real-looking placeholder values, not secrets) | Clean, matches `EMAIL_MIGRATION.md`'s own finding |
| provider-specific SPF/DKIM | NO code references — these are DNS-only records, never read/validated by application code | n/a | Clean by construction |
| provider-specific backup paths | NO — `bloodmoon-backup.sh`/`verify-backup-integrity.sh` operate on cPanel filesystem conventions but contain no hardcoded IP/nameserver; genuinely provider-*coupled* (see §6), not provider-*hardcoded* in a way that would silently break elsewhere | expected | Real dependency, but an operational one (§6), not a hidden code bug |

**Detailed finding — the launcher client's hardcoded hostnames**: the
already-distributed BloodMoon Launcher `.exe` (and every future build
using the current default config) bakes `https://api.mubloodmoon.com.br`
and `https://update.mubloodmoon.com.br` into the compiled binary as
literal default strings. This is **not** an IP dependency and **not**
a current-provider-specific dependency in the usual sense — it is a
dependency on the **domain itself never changing**, which is exactly
what Phase 7's Cloudflare DNS cutover preserves by design (same
hostnames, new authoritative nameservers). The real, distinct
implication for provider exit: once real players have installed a
launcher build, **the domain `mubloodmoon.com.br` becomes permanent
infrastructure** for as long as those installs are in use — changing
the domain itself (not just its DNS target) would require shipping a
new launcher build to every player. This was already implicitly true
before this phase (nothing here changes the domain), but had not been
explicitly documented as a provider-exit consideration until now.
**Not a blocker for `CURRENT_PROVIDER = ZERO`** — no action needed,
recorded for completeness.

**Genuinely new, out-of-scope discovery**: `deploy/docker-compose.production.yml`,
`deploy/nginx.bloodmoon.conf`, and `deploy/HOSTINGER_CHECKLIST.md` are
an already-committed, generic, provider-agnostic self-hosted VPS/Docker
deploy path (MySQL/MariaDB + Redis + API + Web containers behind
Nginx/Certbot) — placeholder domains (`seu-dominio.com`), no
current-provider coupling at all. **This is not part of the Cloudflare
target architecture** (`TARGET_ARCHITECTURE.md` never mentions it) and
this phase does not recommend adopting it — recorded here only because
the brief asks for "every remaining... dependency," and this is
evidence that a fully generic alternative already exists in the repo,
untouched by this finding either way.

## 5. Environment variables — name-only classification (no values read or exposed)

| Classification | Variables |
|---|---|
| `PROVIDER_SPECIFIC` (current cPanel host only, meaningless after exit) | none found as *required* application config — the current provider's coupling is operational (cron, File Manager, Node Selector UI), not expressed as an app-level env var. `STORAGE_LOCAL_PATH`/`COMMUNITY_MEDIA_DIR`/`GUILD_MEDIA_DIR`/`ADMIN_CONTENT_UPLOADS_DIR` point at host-local paths today but are equally meaningful on any host running the `local` `StorageProvider` mode — not cPanel-specific, just local-disk-specific |
| `CLOUDFLARE_TARGET` | none yet defined as application env vars — Cloudflare Workers/Containers configuration (secrets, bindings) lives in `wrangler.toml`/Cloudflare's own secret store, not in this app's `.env` convention. `*_STORAGE_PROVIDER` (`MEDIA_STORAGE_PROVIDER`, `GUILD_MEDIA_STORAGE_PROVIDER`, `LAUNCHER_MEDIA_STORAGE_PROVIDER`, `ADMIN_CONTENT_STORAGE_PROVIDER`) and their paired `R2_*`/`*_R2_BUCKET` vars are the Cloudflare-target switches, already present, currently defaulting to `local` everywhere |
| `EXTERNAL_MYSQL_TARGET` | `DATABASE_URL` — already fully external-vendor-agnostic (a connection string, no current-provider assumption baked in); no vendor-specific var exists yet since none is chosen |
| `EMAIL_PROVIDER_TARGET` | `SMTP_*` (9 vars, `EMAIL_MIGRATION.md` §2) — already provider-agnostic by construction (generic SMTP client config, not a named-provider SDK); a future provider swap changes only these values, not the variable names, unless an API-only provider is chosen instead of SMTP |
| `VPS_TARGET` | `MU_DATABASE_URL`/`MU_DATABASE_PROVIDER`/`MU_BRIDGE_*` — these target the **Windows VPS's** SQL Server (GameBridge), already correctly external and out of this program's scope; `GAME_DATA_WORKER_URL`/`GAME_COMMAND_*`/`GAME_CREDENTIAL_*` — already Cloudflare (Game Data Platform), unrelated to this exit |
| `GENERIC` | everything else: `NODE_ENV`, `API_PORT`/`PORT`, `WEB_PUBLIC_URL`/`API_PUBLIC_URL`/`NUXT_PUBLIC_API_BASE`, `JWT_*`, `TWO_FACTOR_ENCRYPTION_KEY`, `SESSION_TTL_HOURS`, `TURNSTILE_*`, `TRUST_PROXY_HOPS`, `AUTH_RATE_*`, `AUTH_PASSWORD_RESET_TTL_MINUTES`, `REAL_MONEY_PAYMENTS_ENABLED`/`MARKETPLACE_ENABLED` (+ `NUXT_PUBLIC_*` mirrors), `MERCADO_PAGO_*`, `REDIS_URL` — none of these reference the current provider in name or required value |

**Finding**: the application's own configuration surface is already
almost entirely provider-agnostic — every var that *could* be
provider-specific is either a generic connection string/credential
(already portable) or an explicit `*_STORAGE_PROVIDER`/`*_TARGET`
switch built precisely for this migration. The current provider's real
coupling lives in **operational tooling** (cron, File Manager, LSAPI
process model, Remote MySQL Access grants) — not in the application's
own environment variables. This is a genuinely reassuring finding, not
one that was obvious before this sweep.

## 6. Backups — a real, previously under-scoped gap

| Backup type | Currently exists? | Currently lives | Must live where before exit |
|---|---|---|---|
| DB backups | YES (`bloodmoon-backup.sh`, daily 03:17) | cPanel filesystem by default; **correction, `CF-BACKUP-01` (2026-09-24)** — the script does have a real, already-built off-host copy step (`RCLONE_REMOTE`, supports R2/S3/B2/other via `rclone`), it is simply **unconfigured** in production, not absent from the code. This phase's earlier `CF-EXIT-01` claim of "no off-host copy step in the script" was inaccurate — corrected here after actually reading the full script | **A destination independent of the current provider** — mechanism exists, destination still undecided. Full architecture now designed: `BACKUP_STRATEGY.md` (private R2 secondary copy + future DB-vendor PITR primary + `age` encryption + layered retention) |
| Application snapshot | Implicit only — `.output-pre-<phase>-backup-<epoch>` (bmweb) is a **deploy-time rollback copy**, not a real backup regime, and it lives on the same host | same host | Covered by `BACKUP_STRATEGY.md`'s APPLICATION_CONFIG category (non-secret config shape, versioned, same off-host destination) |
| Mail backups | UNKNOWN | `MAILBOX_INVENTORY = UNKNOWN` (`EMAIL_MIGRATION.md`) — cannot classify a backup for a mailbox whose existence itself is unconfirmed | depends entirely on resolving `MAILBOX_INVENTORY` first — explicitly out of `BACKUP_STRATEGY.md`'s scope too |
| Uploaded-media backups | NOT SEPARATELY BACKED UP today, as far as this phase found — `bloodmoon-backup.sh`'s scope was not re-verified this phase (out of scope to re-audit a script already documented elsewhere); community/guild/launcher/admin-content media R2 migration (§13) would make R2's own durability the backup story for *new* uploads, but does not retroactively back up whatever currently exists only on the host's local disk | `BACKUP_STRATEGY.md` §10: R2's own object-key immutability + a periodic checksum-manifest cross-check, not a full second copy by default (cost/benefit, evaluated not assumed) |

**`BACKUP_DEPENDENCIES = provider-exclusive today, no off-host destination decided for any category`.** This is a real, previously
under-scoped gap this program had not explicitly named before —
prior phases proved the backup **method** (mysqldump → disposable
restore → integrity, `CF-DB-01`) but never asked "where does the
backup *live* once the current provider is gone." Recorded as a new
risk (§16). **Update, `CF-BACKUP-01` (2026-09-24)**: the architecture
is now fully designed and the restore chain independently re-proven
for real (a fresh disposable backup, the real unmodified
`verify-backup-integrity.sh`/`restore-test.sh`, 56/56 migrations
restored correctly) — see `BACKUP_STRATEGY.md`. No off-host bucket
created, no encryption implemented, `BACKUP_EXIT_READY` still `NO`.

## 7. DNS/domain (carried forward, not re-audited)

`registro.br` control = **UNKNOWN** (unchanged since `CF-DNS-01`).
This blocks Phase 7 (DNS cutover) specifically, and by extension
blocks `DNS_EXIT_READY` (§15) — it does **not** block the API,
database, or storage exit tracks, which can all proceed independently
per `MIGRATION_ROADMAP.md`'s existing phase ordering. See
`DNS_AND_DOMAIN.md` for the full matrix; not repeated here.

## 8. Email (carried forward, not re-chosen)

Transactional email remains provider-dependent (cPanel SMTP); human
mailbox inventory remains `UNKNOWN`. Neither is re-decided this phase
— see `EMAIL_MIGRATION.md` for the full audit and shortlist. Recorded
here only as an exit gate input (§15).

## 9. SSL/certificates — separated by boundary

| Certificate | Current state | Matters after Cloudflare cutover? |
|---|---|---|
| Cloudflare edge certificates | not yet provisioned (no Cloudflare zone exists for this domain yet) | YES, eventually — Cloudflare automatically provisions/manages edge TLS once the zone is active (Phase 7); not a manual cert-management task the way the current Let's Encrypt setup is |
| Origin certificates (Cloudflare → Container/origin) | not applicable today (no Cloudflare proxy in the current path) | YES, if the API target ends up behind Cloudflare's proxy — a Cloudflare Origin CA cert or "Full (strict)" mode would replace the current Let's Encrypt cert's *role*, though Containers may not need this the same way a traditional origin server does (not yet designed in any canonical doc) |
| Mail TLS certificates | current provider's mail server presents its own cert for SMTP TLS (implicit in `SMTP_SECURE=true`/port 465) | Only if the mail provider itself changes (`EMAIL_MIGRATION.md`) — unrelated to the DNS/web/API cutover; a future transactional-email provider brings its own TLS cert, this project never manages one directly |
| Current cPanel certificates (root/www wildcard, dedicated `api.` cert) | Let's Encrypt, auto-renewed by the host, confirmed valid as of the 2026-08-09 audit (`docs/handoff/production-tls-validation.md`) | Only relevant **until** Phase 7's cutover; irrelevant afterward. `update.mubloodmoon.com.br`'s own certificate status was never covered by that audit — **still unverified**, a small pre-existing gap `DNS_AND_DOMAIN.md` already flagged, not re-checked this phase |

No certificate work is proposed or needed this phase — this section
exists only to separate the four boundaries cleanly, since a future
Phase 7 runbook will need exactly this separation.

## 10. Cron/background tasks

**One cron job is documented and confirmed**: the daily 03:17 backup
(`deploy/CPANEL_BACKUP_AUTOMATION.md`). Searched
`deploy/CPANEL_BACKUP_AUTOMATION.md` and `package.json` for any other
scheduled-task pattern (additional `* * * * *` entries, other
`worker:*` npm scripts) — none found beyond what `SERVICE_INVENTORY.md`
already documented (`worker:game-bridge`/`worker:marketplace-expirations`
run as long-lived in-process loops via `setInterval`, not separate cron
entries, and the marketplace one is currently dormant since marketplace
is disabled).

**Per the brief's own instruction**: since no *additional* cron beyond
the one already-documented backup job was found, but this phase also
cannot claim to have inspected the live cPanel cron table directly
(read-only, no shell access, matches this project's standing
production-read-classifier restriction — see project memory on SSH
reads being blocked even under phase-level authorization) —
`OTHER_SCHEDULED_TASKS = UNKNOWN`, **not** `NONE`, exactly as the brief
requires when nothing beyond the one documented entry could be
confirmed.

## 11. Database exit

- `BACKUP_RESTORE_P1 = CLOSED` (`CF-DB-01`, unchanged).
- `MYSQL_MIGRATION_METHOD = PROVEN` (mysqldump → disposable restore →
  integrity → Prisma → financial semantics, `CF-DB-01-REPORT.md`) —
  **independently re-demonstrated** on the unmerged Codex container
  branch against a *different* disposable MySQL 8.0.46/8.4.11 instance
  inside a Cloudflare Container (§12), which is a genuinely useful
  second data point (a different environment, same method, same
  result) even though it wasn't run by this program itself.
- `FINAL_EXTERNAL_VENDOR = UNDECIDED` — 5-candidate shortlist exists
  (`DATABASE_MIGRATION.md`), PlanetScale has a known disqualifying
  `GET_LOCK` gap unless locks are redesigned, no selection made by
  anyone (this program or the Codex branch).
- **What still blocks actual DB exit**: exactly one thing — **vendor
  selection**, then a repeat of the already-proven restore method
  against that specific vendor's real network path. The *method* risk
  is now doubly retired (proven twice, in two different environments);
  the *vendor* decision is the only real remaining gap.

## 12. API exit — incorporating the Codex Container findings (read-only)

See the finding at the top of this document for full detail. Summary
classification:

- `API_CONTAINER_PROOF = SHADOW_PROVEN_ON_UNMERGED_BRANCH` (Codex,
  `infra/cloudflare-api-container-poc`, `faee869e`, not in `main`).
- This program's **own** canonical docs (`PHASE_STATUS.md`,
  `API_MIGRATION.md`, `RISKS.md` CF-R4) said "not yet run" as of
  `CF-MAIL-01` — **stale**, corrected this phase (§16) to point at this
  finding without claiming this program ran or independently verified
  it.
- **Real gaps the Codex proof itself names, not glossed over**: the
  shadow Container is currently public (Cloudflare Access not yet
  configured); billing/payments crypto is deliberately excluded and
  lives on a separate, also-unmerged branch; this was a `basic`
  (1 GiB), single-instance, 10-minute-sleep configuration — not
  benchmarked at anything resembling real production load; and per
  that document's own words, **it is not production authorization**.
- `API_EXIT_READY` (§15) is therefore `PARTIAL`, not `YES`: strong,
  real evidence now exists that the chosen architecture (Containers)
  works end-to-end including the hardest part (financial-semantics
  database proof), but it exists on an unmerged branch this program
  has not integrated, reviewed as a whole diff, or re-run itself — and
  no one has proposed merging it, which is correctly outside this
  read-only phase's own scope.

## 13. File/storage exit

- `CONTAINER_STORAGE_READY = YES`, real-evidence-backed (`CF-R2-04`) —
  unchanged, already the strongest-evidenced area of this whole
  program.
- **Real production files that still need copying before exit**: this
  phase did not re-inventory production's actual on-disk content (out
  of scope, no production access) — `R2_ASSETS.md`'s own inventory
  already establishes every empty-in-this-checkout `apps/api/storage/*`
  directory has "real volume [that] lives on the production host,"
  meaning a real, one-time data copy (not yet performed, not yet
  scheduled) is required for community/guild/launcher/admin-content
  media regardless of code readiness. Static web assets
  (`public/images`, `dev-references/`) are already git-tracked source,
  not host-only data, and were already shadow-copied to R2 (`CF-R2-01`)
  — no outstanding copy needed there.
- `PRODUCTION_ACTIVATED = NO` for every domain (`RISKS.md` CF-R1,
  unchanged) — activation (flipping `*_STORAGE_PROVIDER=r2` in
  production) is a separate, later, explicitly-authorized step this
  phase does not take or recommend timing.

## 14. Exit order (adjusted from the brief's example, based on actual evidence)

1. **External MySQL** — select a vendor from the existing 5-candidate
   shortlist, then repeat the proven restore method against it. The
   single highest-value next decision in the whole program (blocks
   real DB exit; nothing downstream of it can go to production without
   it).
2. **Container API** — this program's own review/adoption decision
   for the Codex branch's findings (merge, re-verify independently, or
   treat as directional evidence only) — a decision for Bryan, not
   assumed here (§ Decisions required).
3. **R2 production media/assets** — flip `*_STORAGE_PROVIDER=r2` for
   community/guild/launcher/admin-content once a real data-copy plan
   exists; already the most evidence-backed track.
4. **Transactional email** — pick a provider from `EMAIL_MIGRATION.md`'s
   shortlist, prove real external delivery (closing the pre-existing
   Phase 17R blocker at the same time, §8).
5. **Backups** — decide and prove an off-host destination (§6, a real
   gap this phase found with no existing plan anywhere).
6. **Launcher/update** — execute Bryan's recorded R2 direction once
   the storage track (step 3) is production-proven, since it reuses
   the same mechanism.
7. **Cloudflare DNS** — only after Bryan resolves the registrar/DNS-
   zone/nameserver access gaps (`DNS_AND_DOMAIN.md`); the highest-
   blast-radius single step in the program, unchanged assessment.
8. **Validate mail/web/API/update end-to-end** post-cutover — the
   existing 10-step cutover plan's own step 8 (`DNS_AND_DOMAIN.md`).
9. **Observation window** — current provider kept live, unchanged, per
   `MIGRATION_ROADMAP.md`'s existing Phase 8 sequencing.
10. **Provider shutdown** — `CURRENT_PROVIDER = ZERO`, last, only with
    explicit sign-off.

This differs from the brief's own example mainly in promoting
"backups" to its own explicit step (5) rather than leaving it implicit
— this phase's own §6 finding is that nothing in the program currently
schedules it at all.

## 15. Final provider exit gates

| Gate | Status | One-line reason |
|---|---|---|
| `WEB_EXIT_READY` | **PARTIAL** | Shadow-proven (`bloodmoon-web-shadow`, real edge, CSP/security headers verified) — not cut over, blocked only by Phase 7 DNS, not by any remaining web-side work |
| `API_EXIT_READY` | **PARTIAL** | Strong real evidence now exists on an unmerged Codex branch (§12) — not this program's own independently-verified result, not merged, not production-authorized; billing/payments crypto explicitly still excluded |
| `DB_EXIT_READY` | **PARTIAL** | Method proven twice, in two independent environments; vendor selection is the only real remaining gap |
| `STORAGE_EXIT_READY` | **PARTIAL** | Code-ready and real-R2-proven for all 4 user-media domains + static assets; production activation and the real host-data copy have not happened |
| `MAIL_EXIT_READY` | **NO** | Provider shortlisted only, no selection; `MAILBOX_INVENTORY` unresolved; pre-existing real-mailbox-delivery proof still open |
| `DNS_EXIT_READY` | **NO** | Blocked on `registro.br`/DNS-zone/nameserver access, all three still `UNKNOWN` |
| `UPDATE_EXIT_READY` | **NO** | Direction recorded only; no artifact, no code work, no DNS action taken for this subdomain specifically |
| `BACKUP_EXIT_READY` | **NO**, materially de-risked | Full off-host architecture designed and the restore chain independently re-proven for real (`CF-BACKUP-01`, `BACKUP_STRATEGY.md`) — no off-host bucket created yet, no encryption implemented yet, still the sole-copy status quo in production |

`CURRENT_PROVIDER_ZERO_READY = NO` — five of eight gates are `NO` or
depend on decisions only Bryan can make (vendor selection, DNS/
registrar access, a mail provider choice, a backup destination, and a
real review decision on the Codex Container branch). The three
`PARTIAL` gates (web/API/storage) are the program's strongest area by
far, materially strengthened by this phase's discovery of the Codex
Container proof — but "strong evidence exists on an unmerged branch"
is deliberately not scored as `YES` here, since this phase did not
independently verify it and no merge/adoption decision has been made.
