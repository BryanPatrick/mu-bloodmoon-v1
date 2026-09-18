---
status: EVIDENCE_ONLY — no GO/NO-GO decision made here
category: handoff
audience: internal (Bryan + engineering)
lastVerified: 2026-09-17
---

# Open Beta readiness — fresh current-state audit (2026-09-17)

**Purpose**: the Knowledge Hub's `SITE_BETA_BLOCKED`/`NO-GO` decision
(`cf5f14c2`/`53034c0c`, 2026-08-08) cannot be treated as current truth —
the Context Pack's own independent review already proved that (code
existing is not the same as a deployed, proven flow). This document
re-tests every historical blocker against the **current** system, with
reproducible evidence, and separately reports anything newly found. It
does **not** declare GO or NO-GO — that stays Bryan's decision, informed
by this evidence. The Hub's old decision is **not** edited, mutated, or
superseded by this document — see [Proposed new decision](#proposed-new-decision-content-not-written-to-the-hub)
at the end for exact text a human/agent could later use to record a
real, dated decision, if and when Bryan wants one.

**Method**: five parallel read-only code-audit passes (one per cluster)
+ direct inspection of `docs/handoff/site-beta-checklist.md` (the
existing, already-current internal checklist — itself last touched
2026-08-09 with real "Etapa 19.x" fixes) + `docs/handoff/beta-commerce-strategy.md`
(2026-08-09, the existing marketplace/GameBridge risk analysis) +
live, read-only checks against the real production domains
(`mubloodmoon.com.br`, `api.mubloodmoon.com.br`). No production data
was modified. No payment branch was touched. No GameBridge flag was
changed.

## 1. Historical blocker map

| # | Old blocker (2026-08-08) | Old evidence | Current status | Current evidence | Beta-blocking? |
|---|---|---|---|---|---|
| 1 | Password recovery inexistente | None existed | **PARTIAL** | Real, well-tested code exists (token model, rate limiting, CAPTCHA, session revocation — `apps/api/src/modules/auth/auth.service.ts`, `auth-rate-limit.service.ts`, `captcha.service.ts`; e2e in `password-recovery.e2e-spec.ts`). Real SMTP provider (cPanel, TLS 1.2+) approved 2026-08-11. **Still open**: no evidence of a deployed, real-mailbox end-to-end test — `docs/handoff/auth-recovery-provider-blocker.md` and `site-beta-checklist.md` both still list this unchecked, and the 2026-09-14 production deploy manifest explicitly states post-deploy Beta validation "has not been started." | **YES — narrowed to one missing test, not missing code** |
| 2 | CAPTCHA decorativo/sem rate limit real | Login/register | **PASS** | Real server-side Cloudflare Turnstile verification (`captcha.service.ts`, POSTs to real `siteverify`, fails closed) enforced via `AuthAbuseGuard` on login/register/recovery; real, configurable rate limiting (`AuthRateLimitService`) on the same endpoints plus refresh/sensitive actions. E2e-tested (`auth-abuse.e2e-spec.ts`: missing-CAPTCHA 400, burst → 429 + `Retry-After`). Fixed per `site-beta-checklist.md` "Etapa 19.2." | NO |
| 3 | Loja sem gateway de pagamento/entrega automatizada | — | **CONFIRMED UNCHANGED** | Real, current: `commerce.service.ts` purchase is a pure internal-currency debit — **zero payment-gateway dependency in the codebase**. Delivery is 100% manual (admin action). Real-money payments are explicitly gated off (`assertRealMoneyPaymentsEnabled`, both frontend and backend — see §4). This is an accurate, honest, unchanged state, not a regression. | **YES, if real-money Loja is in scope for this Beta — NO if Loja stays WC-only/disabled per the existing Plan A/B analysis** |
| 4 | Marketplace/escrow/GameBridge sem homologação real | — | **CONFIRMED UNCHANGED, well-documented** | Real, transactional escrow ledger exists (`MarketplaceEscrow`) but GameBridge cannot ever complete a job — the worker is a deliberate hard-fail scaffold (`GameBridgeEventExecutor.execute()` always returns `success:false`, `MU_BRIDGE_ENABLED=false` everywhere). Any player can today debit real currency into an order that can never auto-complete; the only recovery is via four dev-only bypass endpoints the project's own docs already say must be removed before production. Full risk analysis and a real Plan A/Plan B already exist: `docs/handoff/beta-commerce-strategy.md`. | **YES, unless Marketplace is explicitly out of scope for this Beta (Plan B)** |
| 5 | Páginas 404 quebrando em erro cru ("500 undefined") | Live-confirmed in production | **PASS** | Real custom error page (`apps/web/error.vue`) renders correct 403/404/500 copy, sets real HTTP status, exposes only a whitelisted `requestId`. Backend `SafeExceptionFilter` never leaks stack/internal messages. E2e-tested (`route-error-handling.test.mjs`, `error-handling.e2e-spec.ts`). Fixed per `site-beta-checklist.md` "Etapa 19.4." One minor, separately-tracked SSR gap remains in `loja/[slug].vue` (invalid product slug renders an empty 200 shell before client-side 404) — not a raw-error crash, low severity. | NO |
| 6 | Zero teste automatizado fora de Community | — | **PASS, materially improved** | `npm run test:beta` now runs 146/146 (27 API-critical + 111 Community E2E + 8 SSR/error-contract tests) per `site-beta-checklist.md` "Etapa 19.6"/`docs/testing/beta-test-baseline.md`. This audit independently confirms substantial e2e coverage for auth, payments/commerce, and VIP (6+ dedicated spec files each). Real gap found: **Marketplace e2e coverage is thin** — only one dedicated e2e spec, and it tests dev-bypass-route safety, not the buy/sell/settle contract (that logic is covered at the service level, in `wc-economy-tax.e2e-spec.ts`/`wallet-ledger.e2e-spec.ts`, not full HTTP e2e). `apps/web` does have real tests (7 `.test.mjs` files — a first pass by one audit agent under-counted this by searching the wrong file extension, corrected here). | Marketplace test depth still thin — see #4 |

## 2. HTTPS/TLS — live-verified this session, not just documented

Confirmed directly against the real production domains (read-only, safe):
- `https://mubloodmoon.com.br` → real 200, valid Let's Encrypt certificate (`*.mubloodmoon.com.br` + `mubloodmoon.com.br` SAN), valid 2026-07-21 to 2026-10-19.
- `http://mubloodmoon.com.br` → real 301 redirect to HTTPS.
- `https://api.mubloodmoon.com.br` → real 200/404 (route-dependent), TLS works.

**PASS.** Matches `site-beta-checklist.md`'s own "Etapa 19.5" claim, now independently re-verified live rather than only trusted from the doc.

## 3. Security headers — a real, current, previously-undocumented gap found this audit

Live-checked (`curl`) and code-confirmed:

- **API** (`api.mubloodmoon.com.br`): real, strong headers present — `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, etc. Source: `helmet()` applied with **stock defaults** in `apps/api/src/main.ts` — not a tuned policy, but real and present.
- **Web** (`mubloodmoon.com.br`, the actual player-facing origin including the login page): **none of the above headers are sent.** Confirmed live via `curl -D -` against both `/` and `/login`, and confirmed in code — `apps/web/nuxt.config.ts` has no security-headers module, no CSP, no HSTS config at all.

**This is a real, material, currently-live gap** — the surface players actually browse has no clickjacking protection (no `X-Frame-Options`/CSP `frame-ancestors`) and no HSTS. Not found in any prior audit this session read. Recommended fix is small (a Nuxt security-headers module or manual `nitro` route rules) but has not been scoped or estimated here — that's implementation work, out of this audit's scope.

## 4. Payment frontend safety — PASS, real defense-in-depth

A real player cannot accidentally trigger a real payment today. Confirmed at both layers:
- Frontend: `apps/web/pages/recarga.vue` reads `config.public.realMoneyPaymentsEnabled` (from `NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED`, unset/false by default) and disables the pay button with an explicit "indisponível" state.
- Backend: `commerce.service.ts`'s `assertRealMoneyPaymentsEnabled` independently enforces the same gate server-side (`REAL_MONEY_PAYMENTS_ENABLED !== 'true'` → `503 PAYMENTS_DISABLED`), so a client bypassing the UI still can't pay. E2e-tested (`recharge-payments.e2e-spec.ts`).

## 5. Auth/session security — real, mostly strong, one real self-documented gap

- Logout, password-change, and password-reset all genuinely revoke server-side sessions (`sessionVersion` increment + `AccountSession.revokedAt`), enforced by `JwtAuthGuard` on every subsequent request. **PASS.**
- Role hierarchy (`PLAYER < GM < ADMIN < SUPER_ADMIN`) is really enforced via `RolesGuard`/`PermissionsGuard` stacked on ~30 controllers. **PASS.**
- Staff 2FA is really mandatory, enforced in `RolesGuard` (`TWO_FACTOR_SETUP_REQUIRED` for any role-gated request from a non-2FA staff account), matching the project's own code-comment policy. **PASS**, with one architectural nuance: enforcement triggers at the first role-gated endpoint a staff account calls, not at login itself — by design, not a bug.
- **Real, self-documented gap**: JWT access/refresh tokens are held in browser `localStorage` (not `httpOnly` cookies) — `apps/web/composables/useAuth.ts`. The project's own roadmap already lists "Migrar tokens do navegador para cookies HttpOnly antes da publicação" as a pending pre-launch item (`apps/web/data/implementationRoadmap.ts:296`). This is a real XSS-exposed-token-theft risk class, not yet closed.

## 6. GameBridge — required for Beta?

**No** — GameBridge (`MU_BRIDGE_ENABLED=false` everywhere, the executor is a deliberate hard-fail scaffold) is not required for a Beta that doesn't include Marketplace item delivery or real in-game VIP/currency sync. VIP entitlement's *current live* purchase path (per ADR-0022/Phase Q, already verified working) is a WC-only debit, not dependent on GameBridge. GameBridge only becomes a real blocker if Marketplace (Plan A) or live GameBridge-mediated VIP delivery is in scope for this specific Beta — matching `beta-commerce-strategy.md`'s own conclusion.

## 7. Deployment / rollback / backup / observability

- **Deployment**: real, documented, manual (cPanel File Manager, no SSH). Deployed commit is identifiable (`GET /api` returns `version`/`commit`). **PASS.**
- **Rollback**: web has a real rename-not-delete backup (`docs/deployments/.../deploy-manifest.md`); **API has no artifact retention** — rollback is `git checkout <commit>` + rebuild + re-upload. Real gap, but a known, documented, executable procedure — not a blocker, but slower than ideal.
- **Backup**: real cron-based MySQL backup, confirmed actually installed on the live host (2026-09-14 manifest). **Restore has never been empirically proven against real MySQL/production** — only against a different DB engine in a local lab. Real, open gap.
- **Observability**: no APM/Sentry, but a real custom error-capture path (`SystemError` rows, correlation IDs, burst detection) plus real, merged `GET /api/health`/`GET /api/ready` endpoints. No external uptime monitor wired yet. Adequate for a small, supervised first Beta; not adequate for silent, unattended operation at scale.

## 8. New findings not in the old NO-GO decision

| Finding | Severity | Beta impact |
|---|---|---|
| **A real production MySQL credential was committed to a tracked file in a repository confirmed publicly accessible on GitHub** (`docs/handoff/site-beta-checklist.md`, "Etapa 19.1"). Redacted from the tracked file and sanitized in 14 other local files — but **the password itself has never been rotated in cPanel**, confirmed still-pending in `docs/operations/phase-aa-ops-hardening-report.md` ("cPanel primary password rotation — pending owner action"). The GitHub repo is still confirmed publicly reachable (live-checked this session, HTTP 200, no auth). Tooling for rotation exists and is merged to `main` (`feature/credential-key-rotation-cpanel-support`), but has never been run against production. | **CRITICAL** | A credential that must be assumed compromised, still active, guarding the real production database, ahead of any public Beta. |
| Web frontend sends zero security headers (§3) | HIGH | Player-facing origin has no clickjacking/HSTS protection |
| JWT tokens in `localStorage`, not `httpOnly` cookies (§5) | MEDIUM-HIGH | Real token-theft-via-XSS exposure, self-documented as a pre-launch item, not yet done |
| API has no rollback artifact retention (§7) | MEDIUM | Slower, more error-prone recovery from a bad API deploy |
| Backup restore never proven against real MySQL/production (§7) | MEDIUM | Backup exists but its actual recoverability is unproven |
| Marketplace e2e test depth is thin relative to auth/payments/VIP (§1 item 6) | LOW-MEDIUM | Lower confidence in Marketplace correctness if it's in Beta scope at all |
| Loja's `[slug].vue` SSR gap (empty 200 shell for an invalid slug, not a real 404) (§1 item 5) | LOW | Cosmetic/SEO, not a security or data issue |

## 9. Six older Hub decisions marked `NEEDS_REVIEW` — reassessed with current evidence

Re-read directly from production (read-only `SELECT`, zero mutation):

| Decision | Topic | Reassessment |
|---|---|---|
| `fa3fd2f1` | First E2E uses Jest+Supertest | **STILL_VALID** — this audit's own evidence (every e2e spec cited above) confirms the same stack is still in use today. |
| `8200f60a` | Community media stays local; cPanel deploy doesn't preserve the dir | **UNKNOWN** — not independently re-checked this audit; no evidence found either way. |
| `3acb56e0` | Feed "Load more" over offset pagination, no cursor migration | **STILL_VALID** — narrow, low-stakes technical fact; no evidence of a pagination-model change found. |
| `d1637a85` | Only profileVisibility/guildVisibility enforced; characters/equipment/statistics/activity visibility stored-not-applied | **STILL_VALID, directly re-confirmed in current code this audit** — `git grep` for these four fields in `apps/api/src/modules/community/` shows them only written/validated, never read for enforcement anywhere. |
| `183be585` | Community BETA_READY (initial, narrower gate) | **STILL_VALID as historical record** — explicitly scoped to Community only, consistent with everything else this audit found (auth/payments/marketplace remain separately blocked). |
| `86fc102b` | Community COMMUNITY_BETA_READY (final, complete gate) | **STILL_VALID as historical record** — same reasoning; independently corroborated by `site-beta-checklist.md`'s own detailed 111/111 E2E breakdown, which this audit read in full. |

## 10. Readiness evidence completeness

```
READINESS_EVIDENCE_COMPLETE = YES for the 10 areas this audit's brief named.
CRITICAL_BLOCKERS_FOUND = [
  "Unrotated, publicly-exposed production database credential (§8)",
  "Marketplace/GameBridge: real currency can be permanently stranded with no automated recovery, only via dev-only bypass endpoints the project's own docs say must be removed (§1 item 4)",
]
```
Not critical, but real and Beta-relevant: password-recovery deployed E2E proof missing (§1 item 1); web security headers absent (§3); JWT localStorage exposure (§5); backup restore unproven against MySQL (§7); API rollback has no artifact retention (§7); marketplace e2e depth is thin (§1 item 6).

## Proposed new decision content (NOT written to the Hub)

If Bryan wants a fresh, dated decision recorded (in the Knowledge Hub or
as a new Blood Moon ADR — this document does not decide which), here is
neutral, evidence-based proposed text — not a recommendation to GO or
NO-GO, and not written anywhere by this audit:

> **Proposed decision, dated 2026-09-17**: The 2026-08-08
> `SITE_BETA_BLOCKED`/`NO-GO` decision is superseded by this fresh
> evidence. Of its original blockers: CAPTCHA, rate limiting, 404
> handling, and baseline test coverage are now `RESOLVED`. Password
> recovery is `PARTIAL` (real code and provider exist; deployed
> end-to-end proof with a real mailbox is still missing). Loja and
> Marketplace/Escrow/GameBridge readiness is `UNCHANGED` from the
> original finding, with a concrete, already-written Plan A/Plan B
> available for each. HTTPS is `RESOLVED`. Two items not in the
> original decision are now known: an unrotated, publicly-exposed
> production database credential (`CRITICAL`), and a web-frontend
> security-headers gap (`HIGH`). A final GO/NO-GO still requires: (1) a
> decision on Loja/Marketplace scope for this specific Beta (homologate
> vs. explicitly disable per the existing Plan A/B analysis), (2) the
> credential rotation, (3) a deployed, real-mailbox password-recovery
> test, and (4) the web security-headers gap closed.

## What this audit did not do

No production data was modified. No payment branch (`payments/asaas-*`)
was touched or duplicated. `MU_BRIDGE_ENABLED` was not changed. No
credential was rotated, viewed, or reproduced anywhere in this document
or this session. No GO/NO-GO decision was made. No Knowledge Hub
decision was written, edited, or superseded.
