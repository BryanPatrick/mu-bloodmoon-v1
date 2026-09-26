---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-26
evidenceCutoff: 2026-09-24 (newest Cloudflare evidence on any pushed branch)
---

# Cloudflare / provider transition — current state (reconciled)

**Reconciled in `BLOODMOON-AI-07` (2026-09-26)** from the two lineages of
the Cloudflare program (see [`SOURCE_INVENTORY.md`](SOURCE_INVENTORY.md)):

- **Lineage T (transition)**: `infra/cloudflare-migration-candidate`
  (`4b0e8e6`) → `docs/cf-web-provider-api-transition-01` (`903e2e1`) →
  `infra/cloudflare-web-shadow-rc-02` (`f2584a4`, 2026-09-24 19:48 BRT).
  Carries the Container candidate, the 2026-09-24 approved transition and
  the Web runbook.
- **Lineage E (exit)**: `infra/cloudflare-dns-planning` (`f38323d`) →
  `infra/cloudflare-mail-exit` (`43fc0c4`) → `infra/provider-exit-audit`
  (`ff9fc30`) → `infra/cloudflare-backup-exit` (`3cab675`, 2026-09-24
  13:12 BRT). Carries the DNS/RDAP inventory, e-mail audit, full provider
  exit audit and the off-host backup proof.

Both forked from `456963d` (storage/DB consolidation). Neither contains the
other, so neither branch alone is current. Nothing newer than 2026-09-24
exists on any pushed branch; this file therefore states the state **as of
the latest evidence, 2026-09-24**. Anything that may have happened on
Bryan's workstation afterwards and was not pushed is `UNKNOWN` here.

## Status labels used below

| Label | Meaning |
|---|---|
| `CURRENT` | True today per the latest evidence |
| `PRODUCTION_VERIFIED` | Observed on the live production path |
| `PROVEN_NON_PRODUCTION` | Real evidence, but on shadow/disposable/test resources only |
| `PLANNED` | Decided or designed, not executed |
| `HISTORICAL` / `SUPERSEDED` | Was true or was the plan; replaced by a later fact or decision |
| `UNKNOWN` | No persisted evidence either way |

## One-paragraph answer

As of 2026-09-24, **production is still entirely on the current provider**:
Web (Nuxt), API (NestJS) and the database run on the same cPanel host, DNS
is served by the provider's nameservers, and no production hostname routes
through Cloudflare. Cloudflare holds **non-production** resources only: a
shadow Web Worker, a shadow API Container, R2 buckets used for shadow
assets and a backup proof, plus two unrelated older workloads (Game Data
Platform, Knowledge Hub). On 2026-09-24 Bryan **approved** a transitional
architecture — Web moves to Cloudflare while API, MySQL, `update` and
e-mail stay at the provider — but the Web cutover itself is **not
authorized** and its readiness gate is `NO`. Domain ownership (registrant)
is Bryan's; operational control of `registro.br`, the DNS zone and
nameservers is unconfirmed, and that blocks any DNS cutover.

## Domain

| Fact | Status | Evidence |
|---|---|---|
| Legal registrant of `mubloodmoon.com.br` is Bryan Patrick dos Santos (public RDAP) | `CURRENT` (public registry, 2026-09-23) | E: `DNS_AND_DOMAIN.md` @ `f38323d` |
| Operational control — `registro.br` login, DNS-zone editing, nameserver change and **rollback** | `UNKNOWN` — only Bryan can confirm | E: `DNS_AND_DOMAIN.md` control matrix; T: runbook gate items 1–3 |
| Public RDAP also lists a second entity as administrative + technical contact, registered 2017 (before Bryan's 2026 registrant record) | `CURRENT` finding, unresolved | E: risk CF-R21(E). Name and e-mail deliberately **not** copied to `main` (third-party personal data) |
| Zone `NS` answer (`ns1/ns2.srv41.hinetworks.com.br`) differs from the registry delegation (`ns1/ns2.srv02.projectgamers.com.br`); both resolve to the same IP | `CURRENT` finding, unresolved | E: risk CF-R20(E) |
| Authoritative DNS is the provider's, not Cloudflare | `PRODUCTION_VERIFIED` (2026-08-09 audit, re-checked 2026-09-23/24) | `docs/handoff/production-tls-validation.md` (on `main`); T/E `DNS_AND_DOMAIN.md` |
| Future cutover constraint: any root/www move needs verified change **and** revert capability at `registro.br` and the zone, a full dated zone export, and preservation of `api`, `update`, MX, SPF, DKIM, DMARC | `CURRENT` rule | T: runbook "Portão obrigatório" |
| The launcher build hard-codes `api.` and `update.mubloodmoon.com.br`, so the domain name itself is permanent infrastructure | `CURRENT` constraint | E: risk CF-R27 |
| rc-02's `DNS_AND_DOMAIN.md` still says "registrar/account holder UNKNOWN" | `SUPERSEDED` for registrant identity by E's RDAP finding; still correct for operational access | conflict recorded in `SOURCE_INVENTORY.md` |

## Web (Nuxt portal)

| Fact | Status | Evidence |
|---|---|---|
| Production Web is Nuxt SSR on the provider (`bmweb`, cPanel Node.js/LSAPI), root and `www` → provider IP | `PRODUCTION_VERIFIED` (DNS preflight 2026-09-24) | T: `CURRENT_STATE.md` "Live Web-transition preflight" |
| The production root response observed on 2026-09-24 did **not** expose the six Web security headers that the shadow sends | `PRODUCTION_VERIFIED` observation | same |
| Shadow Worker `bloodmoon-web-shadow` on a `workers.dev` host, no custom domain, no DNS record | `PROVEN_NON_PRODUCTION` | T: runbook "Estado comprovado" |
| Active shadow version `44e50317` embeds the `http://localhost:3333` API fallback in CSP — **not** a release candidate | `CURRENT` defect, open | T: risk CF-R20(T) |
| A fail-closed release-candidate config check was added to the Web build script (`f2584a4`) | `CURRENT` on rc-02 only; no new candidate deploy is evidenced | commit `f2584a4` |
| Approved target: root + `www` → Cloudflare Web, still calling `https://api.mubloodmoon.com.br/api` | `PLANNED` (decided 2026-09-24) | `DECISIONS.md` |
| Web cutover | **Not authorized**; `WEB_CF_PROVIDER_API_TRANSITION_READY = NO` | runbook "Estado do portão" |
| Earlier plan (2026-09-22): "production traffic never touches Cloudflare until the Phase 7 DNS cutover", API cutover coupled to prior DB exit | `SUPERSEDED` as the near-term order by the 2026-09-24 decision (the eventual provider-exit goal is unchanged) | `DECISIONS.md` 2026-09-24 |

## API (NestJS)

| Fact | Status | Evidence |
|---|---|---|
| Production API on the provider (`bmapi`, `api.mubloodmoon.com.br` → provider IP) | `PRODUCTION_VERIFIED` (2026-09-24) | T: runbook |
| API stays at the provider in the approved transition, co-located with MySQL | `CURRENT` decision | `DECISIONS.md` 2026-09-24 |
| Initial Cloudflare target is **Containers**; native Workers is a `FUTURE_OPTIMIZATION` | `CURRENT` decision (2026-09-22) | `DECISIONS.md` CF-01B |
| Container runtime proof (health, synthetic auth/TOTP, graceful shutdown, disk ephemerality, MySQL 8 financial semantics) ran for real via Workers Builds; shadow `bloodmoon-api-container-shadow` exists | `PROVEN_NON_PRODUCTION` | `infra/cloudflare-api-container-poc` @ `faee869`; reconciled on T `CLOUDFLARE_MIGRATION_CANDIDATE.md` @ `4b0e8e6` |
| Candidate branch `infra/cloudflare-migration-candidate` validated (375 real tests, 56/56 migrations); **not merged, not live-redeployed, not production-authorized** | `PROVEN_NON_PRODUCTION` | T `PHASE_STATUS.md` CF-INTEGRATION-02 |
| `/api/health` and `/api/ready` exist in the candidate source but returned **404** in production on 2026-09-24 | `PRODUCTION_VERIFIED` observation | T: risk CF-R24(T) |

## Database

| Fact | Status | Evidence |
|---|---|---|
| Production database runs on the provider host, bound to `127.0.0.1`, not publicly reachable | `CURRENT` | `DECISIONS.md` constraint; T `CURRENT_STATE.md` |
| Engine naming: the Cloudflare docs say "MySQL"; `context/INFRASTRUCTURE.md` (2026-09-17) records CloudLinux-patched **MariaDB 10.6.19** | `CONFLICTING` wording — not re-verified; treat the engine version as the context doc's until checked | [`context/INFRASTRUCTURE.md`](../../context/INFRASTRUCTURE.md) |
| MySQL 8 compatibility proven: dump → checksum → restore → integrity → Prisma, Serializable isolation, unique-key idempotency, `GET_LOCK`/`RELEASE_LOCK`, 56/56 migrations with zero drift — **four independent times** (CF-DB-01, Codex Container POC on 8.0.46/8.4.11, CF-INTEGRATION-02, CF-BACKUP-01/02) | `PROVEN_NON_PRODUCTION` — all on disposable instances with a **local dev dump or synthetic rows, never production data** | T/E `CF-DB-01-REPORT.md` @ `456963d`; T `CLOUDFLARE_MIGRATION_CANDIDATE.md`; E `BACKUP_STRATEGY.md` |
| Production database migration | **None.** `DATABASE_EXIT` not started; vendor `UNDECIDED` (5-candidate shortlist; PlanetScale conflicts with `GET_LOCK`) | `DECISIONS.md` "Not yet decided"; risk CF-R14 |
| In the approved transition MySQL stays with the API and must not be exposed remotely | `CURRENT` decision | `DECISIONS.md` 2026-09-24 |

## R2 (object storage)

| Fact | Status | Evidence |
|---|---|---|
| Direction: R2 for public images, Wiki assets, user/community media, launcher/download assets | `CURRENT` decision (direction only) | `DECISIONS.md` CF-01B |
| Readiness: all four media domains (community, guild, launcher-studio, admin-content) have a `StorageProvider` R2 path behind an env switch that defaults to `local`; proven end to end against a real R2 bucket with a test-scoped token; `CONTAINER_STORAGE_READY = YES` | `PROVEN_NON_PRODUCTION` | T/E `R2_ASSETS.md` CF-R2-02..05 @ `456963d` |
| Production activation: no `*_STORAGE_PROVIDER = r2` anywhere real; `PRODUCTION_ACTIVATED = NO` | `CURRENT` (per the latest docs) | risk CF-R1 |
| Which storage mode production actually runs (`PRODUCTION_MEDIA_MODE`) | `UNKNOWN` | risk CF-R1 |
| Shadow copy of the public-immutable subset (3,162 files, ~107.8 MB) in a non-production bucket, verified | `PROVEN_NON_PRODUCTION` | `R2_ASSETS.md` CF-R2-01 |
| Upload hardening (`R2StorageProvider` hardened, object-key immutability, cache policy) | `PROVEN_NON_PRODUCTION` (code on the Cloudflare branches, not on `main`) | `R2_ASSETS.md` CF-R2-02 |
| Private-media model / signed URLs | `PLANNED` design only; blocked by missing presigned-URL capability | risk CF-R15 |
| **Production inventory, pre-copy design, pre-copy implementation, copy rehearsal** | `UNKNOWN` — no branch or commit for this work exists on `origin` (`infra/cloudflare-r2-parallel-readiness-01`, `infra/cloudflare-r2-production-inventory-readonly-01` and any other newer R2 branch are **not pushed**) | `git ls-remote` 2026-09-26; `SOURCE_INVENTORY.md` |

## Backup

| Fact | Status | Evidence |
|---|---|---|
| Production backup = daily cron (`17 3 * * *`, `bloodmoon-backup.sh`) on the provider host; output lives **only** on the provider filesystem | `CURRENT` (per docs; not re-read live) | T/E `CURRENT_STATE.md`; E risk CF-R26 |
| The backup script already supports an off-host copy (`RCLONE_REMOTE`) and failure alerting, but both are **unconfigured** in production | `CURRENT` finding | E `BACKUP_STRATEGY.md` CF-BACKUP-01 |
| Full encrypted off-host chain proven for real: private R2 bucket `bloodmoon-backups-private`, `age` encryption, upload/verify/download/decrypt, restore into disposable MySQL 8 with live FK/unique enforcement | `PROVEN_NON_PRODUCTION` (synthetic data; 4 encrypted test objects remain in the bucket) | E `BACKUP_STRATEGY.md` CF-BACKUP-02 @ `3cab675` |
| `deploy/scripts/age-encrypt-backup.sh` prepared, disabled by default, not wired | `PLANNED` (on E only) | same |
| `ARCHITECTURE_READY = YES`, `MECHANISM_PROVEN = YES`, `PRODUCTION_WIRED = NO`, `BACKUP_EXIT_READY = NO` | `CURRENT` | same |

## CORS and Turnstile (intentional limitations)

| Fact | Status | Evidence |
|---|---|---|
| Production API CORS allows exactly `https://mubloodmoon.com.br` and `https://www.mubloodmoon.com.br`; the `workers.dev` shadow origin gets no `Access-Control-Allow-Origin` | `PRODUCTION_VERIFIED` (preflight 2026-09-24) — **intentional** | T: runbook |
| Adding the shadow origin to CORS is blocked pending Bryan (`SHADOW_PRODUCTION_API_CORS = BLOCKED_PENDING_BRYAN_AUTHORIZATION`) | `CURRENT` decision | `DECISIONS.md` CF-01B; risk CF-R9 |
| A same-hostname Web cutover (root/www) needs **no** CORS change | `CURRENT` finding | T: runbook |
| Turnstile production widget allows exactly root and `www`; `workers.dev` is not allowed — the shadow cannot pass production Turnstile | `PRODUCTION_VERIFIED` (inspected read-only 2026-09-24) — **intentional** | T: runbook |

## E-mail and `update`

| Fact | Status | Evidence |
|---|---|---|
| Application e-mail: one SMTP transport with three consumers (password reset, account-deletion confirmation, opt-in admin alerts); stays at the provider in the transition | `CURRENT` | E `EMAIL_MIGRATION.md`; `DECISIONS.md` 2026-09-24 |
| Real password-recovery delivery to an external mailbox never proven in production | `CURRENT` open blocker (pre-existing) | [`docs/handoff/auth-recovery-provider-blocker.md`](../handoff/auth-recovery-provider-blocker.md); risk CF-R24(E) |
| Human mailboxes on the domain | `UNKNOWN` (`MAILBOX_INVENTORY = UNKNOWN`) | risk CF-R23(E) |
| MX points at the bare domain, so a root move must keep a mail-reachable unproxied target | `CURRENT` constraint | T/E `DNS_AND_DOMAIN.md` |
| `update.mubloodmoon.com.br` (launcher self-update) stays at the provider | `CURRENT` | `DECISIONS.md` 2026-09-24 |

## Provider exit

| Fact | Status | Evidence |
|---|---|---|
| Complete: full provider dependency audit (18 categories), hidden-dependency sweep (no hard-coded provider IPs in code), DNS inventory, e-mail audit, backup mechanism proof, Container proof, R2 code readiness | `CURRENT` (audits/proofs done) | E `PROVIDER_EXIT_CHECKLIST.md` @ `3cab675` |
| Deferred by decision: API, MySQL, e-mail, `update` stay at the provider through the Web-first transition | `CURRENT` | `DECISIONS.md` 2026-09-24; T addendum |
| Depends on domain control: every DNS/nameserver step, therefore the Web cutover and `DNS_EXIT_READY` | `CURRENT` | risks CF-R2, CF-R21(T) |
| `CURRENT_PROVIDER_ZERO_READY = NO` | `CURRENT` | both lineages |

Gate table: [`PROVIDER_EXIT_CHECKLIST.md`](PROVIDER_EXIT_CHECKLIST.md).

## Not true, even though it can look that way

- "Cloudflare is in production" — **false** as of 2026-09-24. Workers,
  a Container and R2 buckets exist, all non-production.
- "The API has moved to Containers" — false; proof only, not merged to
  `main`, not live-redeployed from the candidate, not authorized.
- "The database was migrated" — false; only disposable restores.
- "R2 serves production media" — not evidenced; production mode is
  `UNKNOWN` and every switch defaults to `local`.
- "Backups are off-host" — false in production; the mechanism is proven,
  not wired.
