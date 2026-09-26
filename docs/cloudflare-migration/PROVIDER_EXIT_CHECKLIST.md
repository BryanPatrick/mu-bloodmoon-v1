---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-26
---

# Provider exit checklist — consolidated gates

Reconciled in `BLOODMOON-AI-07`. Two different documents carry this name:

- the **full provider-exit audit** (CF-EXIT-01, updated by CF-BACKUP-01/02):
  `infra/cloudflare-backup-exit` @ `3cab675`, 36 KB — 18 dependency
  categories, hidden-dependency sweep, environment-variable audit,
  per-service exit table, 8 gates. Deep reference, not copied.
- the **transition addendum** (2026-09-24): `infra/cloudflare-web-shadow-rc-02`
  @ `f2584a4`, 2 KB — what the approved Web-first transition keeps at the
  provider. Its own text says it "must not silently replace that larger
  historical audit during future reconciliation", so neither replaces the
  other here.

## The goal and its rule

`CURRENT_PROVIDER = ZERO` is the long-term goal (`DECISIONS.md`
2026-09-22). It is **not** an objective or valid result of the Web-only
cutover. No provider service may be deleted because root/www moved; the
cPanel Web deployment stays available for rollback until a separate,
explicit retirement decision.

## Gates

The two sources measure different things. E grades **migration evidence**
(is the replacement proven?). T grades **exit readiness under the approved
transition** (can the provider stop serving it?). Both are shown; the
"Current reading" column is the one to quote.

| Gate | E (evidence), `3cab675` | T (transition), `f2584a4` | Current reading |
|---|---|---|---|
| `WEB_EXIT_READY` | PARTIAL — shadow-proven, blocked by DNS | NO until the runbook gate passes | **NO** — shadow proven; gate `NO` (localhost drift, auth not revalidated, domain rollback `UNKNOWN`) |
| `API_EXIT_READY` | PARTIAL — Container proof on an unmerged branch | NO — API stays at the provider by decision | **NO** — deferred by the 2026-09-24 decision; proof exists (non-production) |
| `DB_EXIT_READY` | PARTIAL — method proven, vendor undecided | NO — MySQL stays with the API | **NO** — deferred; method proven on disposable instances only |
| `STORAGE_EXIT_READY` | PARTIAL — code-ready, R2-proven, not activated | local mutable media may stay at the provider | **NO** for production — `PRODUCTION_ACTIVATED = NO`, mode `UNKNOWN` |
| `MAIL_EXIT_READY` / `EMAIL_EXIT_READY` | NO | NO | **NO** — provider undecided, mailboxes `UNKNOWN`, recovery-mail proof open |
| `DNS_EXIT_READY` | NO | (implied by the runbook gate) | **NO** — operational domain control `UNKNOWN` |
| `UPDATE_EXIT_READY` | NO | NO | **NO** — `update.` stays at the provider |
| `BACKUP_EXIT_READY` | NO — mechanism proven | backups stay at the provider unless separately migrated | **NO** — `MECHANISM_PROVEN = YES`, `PRODUCTION_WIRED = NO` |
| `CURRENT_PROVIDER_ZERO_READY` | NO | NO | **NO** |

## Dependencies deliberately retained during the transition (T)

| Dependency | Transition state |
|---|---|
| NestJS API | stays at the provider |
| MySQL | stays co-located with the API; never exposed remotely |
| SMTP / e-mail | stays at the provider; MX/SPF/DKIM/DMARC preserved |
| `update.mubloodmoon.com.br` | stays at the provider |
| Local mutable media | may stay at the provider; R2 is an independent track |
| Backup cron and logs | stay at the provider unless separately migrated |
| Root / `www` Web | the only dependency this transition prepares to move |

## What is complete, deferred, or blocked

- **Complete** (audits and non-production proofs): dependency audit,
  hidden-dependency sweep (no provider IPs hard-coded in application
  code), DNS inventory, e-mail audit, Container proof, R2 code readiness,
  encrypted off-host backup round-trip.
- **Deferred by decision** (2026-09-24): API, database, e-mail, `update`.
- **Blocked on domain control**: every DNS and nameserver step, therefore
  the Web cutover and `DNS_EXIT_READY`.
- **Blocked on Bryan's operational decisions**: wiring off-host backups
  into production; choosing a database vendor; choosing an e-mail
  provider; confirming mailbox inventory.
