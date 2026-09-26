---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-26
---

# Target architecture — current, approved transition, final goal

Reconciled in `BLOODMOON-AI-07` from `TARGET_ARCHITECTURE.md` on
`infra/cloudflare-web-shadow-rc-02` @ `f2584a4` (lineage T, which carries
the 2026-09-24 decision) and `infra/cloudflare-backup-exit` @ `3cab675`
(lineage E, which added `update.mubloodmoon.com.br` to all states).
Nothing in the "transition" or "final" sections is deployed. What is
true today is in [`CURRENT_STATE.md`](CURRENT_STATE.md).

## A. Current (production, latest evidence 2026-09-24)

```
Player browser / launcher
  -> DNS: provider nameservers (not Cloudflare)
  -> provider host (single IP)
       -> Nuxt SSR Web        mubloodmoon.com.br, www
       -> NestJS API          api.mubloodmoon.com.br
            -> MySQL/MariaDB  127.0.0.1, same host, not publicly reachable
            -> SMTP, Asaas, Mercado Pago, Turnstile siteverify (outbound)
            -> Cloudflare D1/Queue (Game Data Platform, command transport)
       -> launcher updates    update.mubloodmoon.com.br
       -> mail                MX -> bare domain

Windows VPS (separate, Bryan-controlled, out of scope for this program):
  GameServer + SQL Server + GameBridge Agent (outbound-only)
    <-> Game Command Transport (Cloudflare)

Cloudflare, non-production only:
  bloodmoon-web-shadow (Worker, workers.dev), bloodmoon-api-container-shadow,
  R2 shadow asset bucket, R2 bloodmoon-backups-private (test objects),
  plus the unrelated Game Data Platform and Knowledge Hub
```

## B. Approved transition — decided 2026-09-24, **not authorized to execute**

Bryan's decision (verbatim in [`DECISIONS.md`](DECISIONS.md)):

```
Browser
  -> Cloudflare Web on mubloodmoon.com.br / www.mubloodmoon.com.br
       -> HTTPS https://api.mubloodmoon.com.br/api
            -> NestJS API on current provider
                 -> MySQL on the same current-provider host

update.mubloodmoon.com.br -> current provider (unchanged)
e-mail                    -> current provider (unchanged)
```

- Web is the **only** thing this transition moves.
- API and MySQL stay together at the provider; MySQL is never exposed
  remotely to make this work.
- CORS needs no change (same public hostnames); Turnstile needs no
  change (widget already allows root and `www`).
- Gate, smoke tests and Web-only rollback:
  [`WEB_PROVIDER_API_TRANSITION_RUNBOOK.md`](WEB_PROVIDER_API_TRANSITION_RUNBOOK.md).
  `WEB_CF_PROVIDER_API_TRANSITION_READY = NO` (2026-09-24): the active
  shadow has the localhost API drift, auth flows are not revalidated on a
  new candidate, domain/rollback control is `UNKNOWN`, and the root/www
  routing mechanism is not chosen.

**Supersession**: the 2026-09-22 transition state ("production traffic
never touches Cloudflare until the Phase 7 DNS cutover"; API cutover
after an external database exists) is `SUPERSEDED` as the **near-term
order**. The 2026-09-22 end goal below is **not** cancelled.

## C. Final goal — `CURRENT_PROVIDER = ZERO` (direction, not scheduled)

```
Player browser
  -> Cloudflare DNS (authoritative) -> Cloudflare edge (CDN, WAF, TLS)
       -> Nuxt Web Worker
       -> R2 (static and user-upload assets; launcher update delivery is
          a recorded direction only)
       -> NestJS API on Cloudflare Containers (initial target, 2026-09-22;
          native Workers remains a FUTURE_OPTIMIZATION)
            -> external MySQL-compatible database, Bryan-controlled or
               managed (vendor UNDECIDED) -- never D1, never a public bind
            -> SMTP/transactional provider (UNDECIDED), Asaas, Mercado
               Pago, Turnstile
            -> Game Data D1/Queue + command transport (already Cloudflare)
  off-host backups: vendor PITR (future) + encrypted dump to private R2

Windows VPS: unchanged
```

## Fixed across every state

- The Windows VPS (GameServer, SQL Server, GameBridge Agent) never moves
  in this program.
- Asaas and Mercado Pago stay external payment providers.
- The financial database is MySQL-compatible in every state; D1 is never
  its target; Hyperdrive, if ever used, only connects to an external
  MySQL-compatible database.
- The public hostnames (`mubloodmoon.com.br`, `www`, `api`, `update`) are
  permanent: shipped launcher builds hard-code `api.` and `update.`.
