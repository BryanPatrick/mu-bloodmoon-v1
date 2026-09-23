---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-23
---

# Email dependency audit and provider-exit plan

Phase `CF-MAIL-01` (2026-09-23): **read-only / planning only**. No MX,
SPF, DKIM, or DMARC record was changed. No DNS record was modified. No
production mailbox was created or deleted. No production SMTP
credential was changed. No email was sent as part of this phase. No
provider was contacted.

This document exists because `DNS_AND_DOMAIN.md` (`CF-DNS-01`,
2026-09-23) found that mail is currently **coupled to the same
current-provider host** as web/API (MX points at the bare domain, not
a distinct mail host) — so `CURRENT_PROVIDER = ZERO` cannot be reached
without a real, separate plan for email specifically. This document is
that plan. It does not change `README.md`'s program scope: this
program has never proposed migrating email *until Bryan explicitly
authorizes a specific target*, and nothing here is that authorization
— this is the audit and shortlist that would inform one.

## Two separate problems, not one

The brief for this phase is explicit that these are not the same
thing and must not be assumed to migrate together:

- **A. Transactional application email** — password reset, account
  deletion confirmation, operational/admin alerts. Sent *by the API*,
  to a *player's or admin's* inbox. High delivery-reliability and
  authentication requirements, low volume, no human ever reads these
  from a `@mubloodmoon.com.br` mailbox.
- **B. Human/domain mailbox email** — `contato@`, `suporte@`, `admin@`
  or similar addresses that a person actually logs into and reads/
  sends from. Different requirements entirely (a real mail client,
  spam filtering, storage, possibly a shared inbox) — and, per this
  phase's own finding below, **whether any such mailbox even currently
  exists cannot be confirmed from any available evidence.**

## 1. Application email inventory

Exactly **three** real, code-level consumers of `MailTransportService`
exist in `apps/api` (confirmed by an exhaustive grep for
`MailTransportService`/`mailTransport\.send`/`nodemailer`/
`createTransport` across all of `apps/api/src` — no other email
transport, SDK, or ad-hoc SMTP client exists anywhere in the codebase).
There is no registration/welcome email, no email-based 2FA (2FA is
TOTP-only — `two-factor.service.ts` has zero mail/email/SMTP
references), and no payment-notification email (Asaas/Mercado Pago
events feed `SystemAlert`/`SystemError` rows only, surfaced in
`/painel/admin`, not emailed to a player).

| # | Module/service | Trigger | Transactional/operational | SMTP dependency | Criticality | Production relevance |
|---|---|---|---|---|---|---|
| 1 | `auth.service.ts` (`AuthService.requestPasswordRecovery`), `POST /auth/password-recovery/request` | Player requests a password reset | Transactional (player-facing, security) | Direct — `mailTransport.send()` inside the request handler. **Fails open to the caller by design**: the endpoint always returns `{ ok: true }` regardless of mail-transport success (anti-enumeration — the response must not reveal whether the account exists or whether delivery succeeded); a real send failure is caught, never thrown to the client, and recorded as an `auth.password_recovery.email_failed` audit event for support follow-up | HIGH — this is the account-recovery path; a real, historically-tracked release blocker (`docs/handoff/auth-recovery-provider-blocker.md`, see §13 below) | REAL, in production code today. Provider approved (cPanel SMTP), backend built and unit/e2e tested — but real end-to-end delivery to an external mailbox in production has **not yet been proven** (open since Etapa 17/19.3, still `BLOCKED` per `docs/handoff/site-beta-checklist.md` line 147) |
| 2 | `account-deletion-request.service.ts` (`AccountDeletionRequestService.requestDeletion`), self-service account deletion (Phase 15) | Player requests self-service account deletion | Transactional (player-facing, security/privacy — GDPR/LGPD-style "right to erasure" confirmation step) | Direct — same fail-open pattern as #1, explicitly modeled on it (see the file's own comment): the deletion *request* record always exists, but the confirmation token is useless without the email reaching the player, so nothing destructive can happen from a failed send. Failure is caught and recorded as `account.deletion.request.email_failed` | HIGH — gates an irreversible action (account deletion after a 14-day grace period); a missed email means the player can't easily confirm or realize a deletion is pending | REAL, in production code (Phase 15). Same unverified-real-mailbox-delivery caveat as #1 applies — no evidence this specific flow's delivery has been proven against a real external mailbox either |
| 3 | `alerting/channels/email-alert-channel.ts` (`EmailAlertChannel`), part of Phase AA's `AlertDispatchService` | A polled `SystemAlert` (severity ≥ `ALERT_MIN_SEVERITY`) needs to notify a human | Operational (admin-facing, not player-facing) | Indirect — one of several fan-out channels (`Promise.allSettled`, one channel's failure never blocks another); reuses the same `MailTransportService`, no separate transport | MEDIUM — this is itself the *notification* layer for other real incidents (critical `SystemError`s, payment-webhook anomalies, marketplace job failures, GameBridge heartbeat loss); if this channel is silently broken, an operator only finds out by being logged into `/painel/admin/alertas` | **`ALERT_EMAIL_ENABLED` defaults to `false`** (opt-in, per `alerting/README.md`'s own configuration table) — code is merged into `main` (confirmed via `git ls-tree main`, commit `51b4c6f0`, "Phase AA: proactive alerting foundation") but whether it is actually turned on in the live production environment is **`UNKNOWN`** from this repo alone (an env-var value, not visible from source) |

**Centralized transport, confirmed**: all three consumers import the
same `apps/api/src/modules/auth/mail-transport.service.ts`
(`MailTransportService`, wrapping `nodemailer`) — there is exactly one
SMTP client construction site in the entire codebase
(`getTransporter()`), one `smtpConfig()` reader, one set of `SMTP_*`
environment variables. A future provider migration touches exactly
one file's configuration, not three call sites independently.

## 2. SMTP config inventory (variable names only — no values read or exposed)

From `mail-transport.service.ts`'s `smtpConfig()` and
`deploy/.env.production.example` (values redacted in that file; not
read from any live environment this phase):

| Variable | Purpose | Required | Notes |
|---|---|---|---|
| `SMTP_HOST` | SMTP server hostname | yes | |
| `SMTP_PORT` | SMTP port | yes | production example uses `465` |
| `SMTP_SECURE` | implicit TLS (`true`/`false`) | yes | production example: `true` (paired with port 465) |
| `SMTP_REQUIRE_TLS` | require STARTTLS when `SMTP_SECURE=false` | no, computed default | production example: `false` (redundant with `SMTP_SECURE=true`, port 465) |
| `SMTP_USER` | SMTP auth username | yes | |
| `SMTP_PASSWORD` | SMTP auth password | yes | a documented past secret-incident subject, `docs/security/secret-incident-history.md` — not re-examined this phase, out of scope |
| `SMTP_FROM_EMAIL` | envelope/header From address | yes | validated by regex at startup |
| `SMTP_FROM_NAME` | header From display name | yes | production example: `BloodMoon` |
| `SMTP_TIMEOUT_MS` | connect/greeting/socket timeout | no, defaults `10000` | |
| `ALERT_EMAIL_ENABLED` | master switch for the alerting email channel only | no, defaults `false` | does not affect #1/#2 above, which have no on/off switch — they always attempt to send |
| `ALERT_EMAIL_TO` | comma-separated alert recipient list | no | consumed by `EmailAlertChannel` only |

**Gap found this phase**: `apps/api/.env.example` (the repo's general
example env file, as opposed to `deploy/.env.production.example`)
contains **zero** `SMTP_*` entries — a real, if minor, documentation
gap (a developer following only `.env.example` would not discover
these variables exist). Not fixed this phase (out of scope — a
read-only audit does not edit unrelated config files); recorded as a
new low-priority risk in `RISKS.md`.

**Centralized transport confirmed** — see §1. One provider migration
= one file's config values changed, not a multi-file hunt.

## 3. Domain mailbox inventory

`MAILBOX_INVENTORY = UNKNOWN`.

No document, config file, or code path anywhere in this repository
lists specific mailbox addresses (`contato@`, `suporte@`, `admin@`, or
any other `@mubloodmoon.com.br` address) — an exhaustive search of
`docs/`, `apps/`, and `context/` found zero matches for any such
address. What **is** confirmed, from `DNS_AND_DOMAIN.md`'s
already-committed DNS inventory:

- `mail.mubloodmoon.com.br` (CNAME → root) exists — cPanel's default
  mail-panel alias, confirming *some* mail-hosting infrastructure is
  provisioned on the current account, but not which mailboxes exist
  within it.
- `MX` for the bare domain points at the same host, confirming inbound
  mail delivery capability exists for `@mubloodmoon.com.br` addresses
  generally.
- SPF/DKIM/DMARC records exist (see `DNS_AND_DOMAIN.md`), confirming
  outbound mail authentication is configured for the domain generally
  — but this is the exact same SPF/DKIM the *transactional* SMTP path
  above also uses (they share the same domain-level authentication,
  not necessarily the same mailbox).

Confirming an exact mailbox list would require either the current
provider's cPanel Email Accounts panel (an admin action this phase's
read-only/no-contact scope does not authorize) or asking Bryan
directly. **Not guessed.**

## 4. Future transactional email requirements

For **problem A only** (application transactional email — see §1),
independent of any human-mailbox decision:

- SMTP and/or a REST API (the current `MailTransportService`
  abstraction already supports SMTP; a future provider offering only
  an API would need a small adapter, not a redesign)
- TLS 1.2+ on the SMTP path (matches the current
  `minVersion: 'TLSv1.2'` already enforced)
- Custom-domain SPF inclusion (`include:` mechanism, matching the
  current pattern) — never a bare provider domain as the visible
  sender
- DKIM signing under the `mubloodmoon.com.br` domain (provider-managed
  key, published via DNS)
- DMARC compatibility — the domain's existing `p=none` policy should
  keep working unchanged (a future provider migration is not the
  moment to also tighten DMARC enforcement — two risks, never bundled,
  same principle `DNS_AND_DOMAIN.md` already established for the DNS
  cutover itself)
- Bounce/complaint handling — a real gap in the *current* setup (raw
  cPanel SMTP via `nodemailer` has no bounce-webhook or suppression-
  list concept at all today); any future provider should improve on
  this, not just match it
- Delivery logs / visibility into individual send outcomes — another
  real gap today (a failed send is only visible as an audit-log row
  with no delivery detail); most dedicated transactional providers
  offer this natively
- Reasonable rate limits for this project's actual volume (password
  resets + account-deletion confirmations + opt-in admin alerts — a
  low-volume, spiky-but-small workload, not bulk/marketing email)
- Reliable delivery to Brazilian recipient mail providers (Gmail,
  Outlook, and Brazilian ISPs/webmail) — general sender reputation
  matters far more here than the *sending* region (SES's `sa-east-1`
  reduces API-call latency from a Brazil-hosted app, not delivery
  speed to the recipient's mail server, which is governed by the
  recipient's own infrastructure regardless of where the message was
  sent from)
- Password-recovery and account-deletion compatibility — no change to
  either flow's own logic; only the transport configuration changes
  (see §1's centralization finding)
- Alert-channel compatibility — `EmailAlertChannel` already accepts a
  comma-separated `to` list via the same transport; no redesign needed
- Secret rotation — credentials must be rotatable without any
  application code change (already true: only `SMTP_*` env vars need
  new values, matching this project's existing credential-rotation
  discipline, `bloodmoon-deploy` skill Phase 8 — map every real
  consumer first, which §1 above now does exhaustively)

## 5. Transactional email provider shortlist (research only — no selection made)

Current (2026-09-23) pricing/feature research, web-verified this
phase, not from training-data recall alone (sources at the end of this
document). **This is a shortlist, not a recommendation ranking** — the
brief explicitly asks for no final winner.

| Provider | SMTP | API | Custom-domain verification | SPF/DKIM support | DMARC compatible | Free/small-project tier | Brazil/global delivery notes | Limitations |
|---|---|---|---|---|---|---|---|---|
| **Amazon SES** | yes | yes (REST) | yes, per-domain DNS verification (TXT + DKIM CNAMEs), plus a required MX for bounce/complaint receipt | yes | yes (works with the domain's existing `p=none`, no forced change) | Free tier changed materially in 2026 — new accounts get AWS credits rather than a flat free-email allotment; ongoing cost is $0.10/1,000 emails, among the cheapest at volume | Has an `sa-east-1` (São Paulo) region, useful for reducing *API-call* latency from a Brazil-hosted app; actual delivery speed to recipient mailboxes is governed by the recipient's own infrastructure, not the sending region | New accounts start in a sending "sandbox" (verified recipients only) until a production-access request is approved — a real extra approval step before real players can receive mail; the most "infrastructure-y," least turnkey option of this shortlist |
| **Resend** | yes (SMTP relay) | yes (REST + SDKs) | yes | yes | yes | 3,000 emails/month free, 100/day cap; paid from $20/mo | Modern, TypeScript/Node-first developer experience — a natural fit for this project's NestJS/TS stack; no Brazil-specific claims found this phase | Newer company than the others here (less track record); overage pricing is per-1,000-email buckets, not linear |
| **Postmark** | yes | yes (REST) | yes | yes | yes | 100 emails/month free (no expiry), paid from ~$15/mo for 10,000/mo (2026 restructured to plan-based, not pure volume tiers) | Purpose-built for transactional (not marketing) email, routes transactional and any other traffic through *separate* infrastructure by design — directly relevant since this project sends transactional only, never bulk | Smallest free tier of this shortlist (100/mo) — likely below even this project's low real volume once password-reset + deletion-confirmation + alert traffic is counted together; historically strict about never mixing in bulk/marketing sends on the same account |
| **Brevo** (formerly Sendinblue) | yes (SMTP relay) | yes (REST) | yes | yes | yes | 300 emails/day free forever (~9,000/mo), no credit card required — the most generous free tier of this shortlist | EU-based (French company) — relevant only for data-residency preference, not a Brazil-delivery claim found this phase | Historically stronger reputation as a marketing-email platform that also does transactional, rather than transactional-first like Postmark/Resend — worth weighing if "transactional-only sending reputation" matters to Bryan |
| **Mailgun** | yes | yes (REST) | yes, per-domain | yes | yes | 100/day free; paid from $15/mo (Basic, 10,000/mo) to $35/mo (Foundation, 50,000/mo) | EU/US data-region choice; no Brazil-specific region or claims found this phase | Mature/established (longest track record of this shortlist) but free tier is the smallest alongside Postmark's |

**Brazil-delivery caveat, stated plainly**: none of the searches this
phase found provider-published, Brazil-specific inbox-placement data
for any of these five. General sender reputation, correct SPF/DKIM/
DMARC alignment, and avoiding shared/abused sending IP ranges matter
far more for Brazilian ISP/webmail delivery than any region selector —
this is general email-deliverability knowledge, not a Blood-Moon-
specific finding, and should not be read as a claim that one of these
five is empirically better for Brazilian recipients than another.

## 6. Human/domain mailbox provider shortlist (categories only — no selection made)

Separate from §5 entirely, per §"Two separate problems" above. Only
relevant if Bryan decides a real `@mubloodmoon.com.br` mailbox is
needed for a human to read/send from (unconfirmed — see §3,
`MAILBOX_INVENTORY = UNKNOWN`).

| Category | Examples | Notes |
|---|---|---|
| Managed business email | Google Workspace (Business Starter ≈ $7/user/month), Microsoft 365 (Business Basic ≈ $6-7/user/month) | Full mailbox + calendar/drive/collaboration suite; more than this project likely needs for a handful of addresses, but the most turnkey, well-understood option |
| Budget/workspace-style provider | Zoho Mail (Lite from ≈ $1/user/month, 10 GB, IMAP/POP) | Meaningfully cheaper than Google/Microsoft for just mailbox hosting on a custom domain; a realistic fit if the only need is a small number of real mailboxes, not full office-suite collaboration |
| Forwarding-only service | Cloudflare Email Routing, or a dedicated forwarder — see §7 below | Not a mailbox at all — inbound mail is forwarded to an existing inbox (e.g. Bryan's own Gmail), no separate login, no storage. The lowest-friction option **if no one actually needs to send *as* `contato@`/`suporte@`**, only receive |
| Other | A hosting-provider-bundled mailbox (many hosts include a small mailbox allotment with hosting) | Not evaluated in detail this phase — only relevant if Bryan wants to keep *some* minimal mail hosting at whatever the eventual non-Cloudflare host ends up being, which would cut against the `CURRENT_PROVIDER = ZERO` goal and is not recommended by this phase without Bryan's explicit reasoning |

## 7. Cloudflare's role — the exact architectural boundary

Verified this phase (web research, not assumed from prior project
knowledge):

- **Cloudflare DNS** can host MX, SPF (TXT), DKIM (TXT), and DMARC
  (TXT) records for `mubloodmoon.com.br` once the zone is on
  Cloudflare (Phase 7, DNS cutover) — this is ordinary DNS hosting, no
  different from what the current provider's nameservers already do
  for these same record types today.
- **Cloudflare Email Routing is inbound-only.** It receives mail
  addressed to the domain and forwards it to an existing destination
  inbox (e.g. a personal Gmail) — it does **not** provide a mailbox a
  person logs into directly at the domain, and it does **not** provide
  outbound SMTP at all. There is no Cloudflare SMTP server/credential
  to plug into `MailTransportService` or any other outbound sender.
  This directly confirms and updates the brief's own framing in §9:
  Email Routing is real and could be evaluated for **problem B**
  (inbound-only human mailbox forwarding, e.g. `contato@` forwarding
  to Bryan's own inbox with no separate mailbox login needed) but it
  is architecturally **irrelevant to problem A** (application
  transactional email) in both directions — it neither sends the
  API's password-reset/deletion/alert email, nor could it ever, by
  design.
- **Cloudflare does not replace a full outbound transactional SMTP/API
  provider.** `MailTransportService` will always need a real
  transactional-email provider (§5's shortlist) regardless of whether
  Cloudflare ever becomes this domain's authoritative DNS. Moving DNS
  to Cloudflare and choosing a transactional email provider are two
  fully independent decisions that happen to both touch DNS records
  (the provider needs its own SPF include/DKIM CNAME published,
  wherever the zone lives at the time).

**Recorded boundary**: `CLOUDFLARE_EMAIL_ROLE = DNS_HOSTING_PLUS_OPTIONAL_INBOUND_FORWARDING_ONLY` — never outbound transactional, never a full mailbox product.

## 8. Target architecture (conceptual only — nothing here is built or activated)

```
Cloudflare DNS (authoritative, Phase 7)
    |
    +-- MX / SPF / DKIM / DMARC records (hosted, unchanged in meaning)
    |
    +-> Problem A: application transactional email
    |     apps/api (MailTransportService, unchanged abstraction)
    |       -> one provider from Sec. 5's shortlist (not yet chosen)
    |       -> password reset, account-deletion confirmation,
    |          admin alerts (EmailAlertChannel)
    |
    +-> Problem B: human/domain mailbox email (only if Bryan
          confirms a real need -- MAILBOX_INVENTORY is UNKNOWN today)
          -> EITHER a real mailbox provider from Sec. 6's shortlist
             (Zoho/Google/Microsoft -- a real login, real storage)
          -> OR Cloudflare Email Routing, inbound-forward-only, to an
             existing inbox Bryan already has -- the lower-friction
             option if no one needs to *send as* a domain address

Current provider: ZERO (the eventual goal -- not reached by this
phase; mail stays exactly where it is today until a real migration is
executed under its own future authorization)
```

Problems A and B may end on **different** providers, chosen
independently, on different timelines — nothing about this design
requires them to move together, or at the same time as the DNS
cutover itself (Phase 7). Moving problem A's provider does not require
Phase 7 to have happened first, since SPF/DKIM records for a new
transactional provider can be added at the *current* DNS host, exactly
as `DNS_AND_DOMAIN.md`'s pre-transfer option 2 already describes for
other record types.

## 9. Migration plan (design only — not executed)

1. Choose future provider(s) — problem A and problem B are independent
   choices, per §"Two separate problems."
2. Verify the chosen domain(s)/subdomain(s) at the new provider(s)
   (their own domain-ownership TXT check, separate from SPF/DKIM).
3. Configure SPF/DKIM for the new provider — additively at first
   (SPF supports multiple `include:` mechanisms during a transition;
   never remove the old include until the new provider is fully
   proven, matching `DNS_AND_DOMAIN.md`'s "never bundle two risks"
   principle).
4. Prepare the MX record change (problem B only, if a real mailbox
   provider is chosen over forwarding) — design only, not applied.
5. Configure the new provider's SMTP/API secrets in the shadow API
   environment first (never production) — matches this program's
   shadow-first discipline (`README.md`).
6. Test real external mailbox delivery against the shadow environment
   — a real send, to a real external inbox Bryan controls, not a
   simulated/bypassed test (the existing `AUTH_MAIL_TEST_BYPASS=1`
   test-only flag is explicitly *not* this proof — it exists precisely
   to avoid sending real mail in automated tests).
7. Verify password recovery end-to-end against the new provider in the
   shadow environment (request → real delivery → reset → login →
   session revocation — the same scenario `password-recovery.e2e-spec.ts`
   already covers structurally, just against a real external mailbox
   instead of the test bypass).
8. Verify account-deletion-confirmation and admin-alert delivery the
   same way.
9. Switch the *application's* `SMTP_*` (or future provider-specific)
   secrets in production during a controlled window — this step alone
   does not require Phase 7's DNS cutover to have happened, since it
   only changes which outbound provider the API calls, not which
   nameservers are authoritative.
10. Verify real inbound/outbound mail post-switch (send a real
    password-reset to a real controlled mailbox, confirm receipt;
    confirm an admin alert arrives).
11. Retain the old SMTP credentials/configuration briefly (rollback:
    revert the `SMTP_*` env values and restart, exactly the same
    reversible shape as any other credential rotation in this project,
    `bloodmoon-deploy` skill Phase 8).
12. Retire the old mail service only after this specific migration's
    own acceptance — never bundled with Phase 8's broader
    `CURRENT_PROVIDER = ZERO` retirement of everything else.

**None of the above is scheduled or authorized.** This is a design a
future phase can execute once Bryan picks a provider from §5 (and,
separately, decides whether §6/§3's mailbox question needs solving at
all).

## 10. Password-recovery external-mail proof — ties to the existing open item

`docs/handoff/auth-recovery-provider-blocker.md` already documents
this exact gap, predating this Cloudflare program entirely: the cPanel
SMTP provider was approved 2026-08-11, the backend was built and unit/
e2e tested (Etapa 19.3), but **"the blocker remains open until the
release is deployed and the complete recovery flow is exercised with a
real user mailbox."** `docs/handoff/site-beta-checklist.md` (line 147,
line 214) confirms this is still `BLOCKED`, not resolved, as of the
most recent state visible in this repo.

**How a future transactional-provider migration closes this**: step 6
and step 7 of §9's migration plan above are exactly this open item's
own "Remaining release steps" #3 (`docs/handoff/auth-recovery-provider-blocker.md`),
generalized to whichever provider is eventually chosen instead of
assuming it stays cPanel SMTP specifically. **This phase does not
close the existing blocker** — no real mailbox test was performed
(out of scope, read-only/planning-only) — but it records the precise
mechanism by which a future phase would close it, whether that future
phase keeps the current cPanel SMTP provider or migrates to one of
§5's shortlist.

`PASSWORD_RECOVERY_EXTERNAL_MAIL_PROOF = NOT_YET_PROVEN` (unchanged by
this phase; tracked pre-existing item, not a new finding).

## 11. DNS safety (recap, unchanged from `DNS_AND_DOMAIN.md`)

- This phase changed **no** DNS record. Every MX/SPF/DKIM/DMARC value
  in `DNS_AND_DOMAIN.md` remains exactly as that phase recorded it.
- This phase does **not** recommend changing the root `A` record to
  migrate mail — mail and web are currently coupled (MX points at the
  bare domain), but a future transactional-provider migration (§9)
  does not require touching the root `A` record at all, only adding a
  new SPF `include:`/DKIM `CNAME` for the new provider and eventually
  the application's own `SMTP_*` secrets.
- The future architecture explicitly **separates** mail from web/API
  hosting (§8) — today's coupling is a current-state fact, not a
  target-state requirement.

## 12. `update.mubloodmoon.com.br` — direction recap (unchanged, no DNS action)

Per Bryan's recorded architectural direction: `update.mubloodmoon.com.br`
should eventually migrate away from the current provider toward
Cloudflare/R2-based launcher update delivery (`DNS_AND_DOMAIN.md`'s
target DNS design already reflects this as `UNDECIDED` pending a
concrete migration). This is **direction only** — no DNS change this
phase, no DNS change in any phase to date. Recorded here only because
the brief asked this phase to carry the direction forward alongside
its own mail-specific findings; this subdomain has no email-related
dependency of its own (it is a static-content host, unrelated to
`MailTransportService` or any mailbox).

## Status

`APPLICATION_EMAIL_INVENTORIED = YES` (3 consumers, 1 centralized
transport, exhaustively confirmed via grep, not assumed).
`MAILBOX_INVENTORY = UNKNOWN` (no evidence found; not guessed).
`TRANSACTIONAL_PROVIDER_SHORTLIST = 5 candidates, no selection`.
`MAILBOX_PROVIDER_SHORTLIST = 3 categories, no selection`.
`CLOUDFLARE_EMAIL_ROLE = DNS_HOSTING_PLUS_OPTIONAL_INBOUND_FORWARDING_ONLY`.
`PASSWORD_RECOVERY_EXTERNAL_MAIL_PROOF = NOT_YET_PROVEN` (pre-existing,
unchanged). `CURRENT_MAIL_DEPENDENCY = FULL` — every one of problems
A and B, to the extent B exists at all, still runs entirely on the
current provider; `CURRENT_PROVIDER = ZERO` cannot be reached without a
real, separate, future-authorized mail migration.

## Sources consulted this phase (provider research, 2026-09-23)

- [Amazon SES pricing](https://aws.amazon.com/ses/pricing/)
- [Amazon SES Pricing 2026: Free Tier Catches to Know](https://www.saaspricepulse.com/tools/amazon-ses)
- [Using a custom MAIL FROM domain — AWS docs](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)
- [Resend Pricing 2026: Plans, Free Tier & Cheaper Alternatives](https://nuntly.com/resend-pricing)
- [Transactional emails · Resend](https://resend.com/products/transactional-emails)
- [Postmark Pricing and Free Trial](https://postmarkapp.com/pricing)
- [Postmark Pricing 2026 breakdown](https://www.saaspricepulse.com/tools/postmark)
- [Brevo Pricing 2026: Free, Starter, Business, Enterprise Plans](https://www.layer3labs.io/guides/brevo-pricing)
- [Brevo Transactional Email Review 2026](https://mailflowauthority.com/esp-reviews/brevo-transactional-review)
- [Mailgun Pricing — official](https://www.mailgun.com/pricing/)
- [Mailgun Pricing 2026 breakdown](https://costbench.com/software/email-api/mailgun/)
- [Postmaster · Cloudflare Email Service docs](https://developers.cloudflare.com/email-routing/postmaster/)
- [Cloudflare Email Routing + Gmail SMTP Setup (2026)](https://mhrsntrk.com/blog/how-to-use-cloudflare-email-routing-with-gmail-smtp)
- [Google Workspace Pricing 2026](https://saascrmreview.com/google-workspace-pricing/)
- [Zoho Mail Pricing | Compare Editions](https://www.zoho.com/mail/zohomail-pricing.html)
- [Business Email Pricing — Google vs Microsoft vs Zoho](https://www.resellerclub.com/blog/business-email-pricing-comparison/)
