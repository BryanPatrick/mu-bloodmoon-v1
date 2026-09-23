---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# Target architecture (future intended state — nothing here is deployed)

Everything in this file is a plan. See `CURRENT_STATE.md` for what is
actually true today and `PHASE_STATUS.md` for progress.

Three states, per this phase's brief:

## A. Current

```
Player browser
  -> authoritative DNS (zone's own NS records say ns1/ns2.srv41.hinetworks.com.br;
     the registry's actual delegation says ns1/ns2.srv02.projectgamers.com.br --
     real discrepancy found Phase CF-DNS-01, see DNS_AND_DOMAIN.md)
  -> 190.102.41.133
  -> LiteSpeed / cPanel virtual host
       -> Nuxt SSR web        (/home/mubloodxz/bmweb,  Node/LSAPI)
       -> NestJS API          (/home/mubloodxz/bmapi,  Node/LSAPI)
            -> MySQL (127.0.0.1, same host, not publicly reachable)
            -> SMTP, Asaas, Mercado Pago, Turnstile siteverify (outbound)
            -> Cloudflare D1/Queue (Game Data client, read-scope + command transport)
       -> Launcher self-update (update.mubloodmoon.com.br, same cPanel
          account, static manifest + binaries -- found Phase CF-DNS-01,
          previously undocumented in this diagram)
  -> mail (MX -> same host; SPF/DKIM/DMARC configured, see DNS_AND_DOMAIN.md)

Windows VPS (separate, Bryan-controlled):
  GameServer + SQL Server + GameBridge Agent (outbound-only) <-> Game Command Transport (Cloudflare)
```

## B. Transition (this program's working state for most of its life)

```
Player browser
  -> DNS: UNCHANGED (still the current host — Phase 7 not reached)
  -> current provider (unchanged production path, exactly as in "A")

                              [in parallel, non-production]
Cloudflare account (workers.dev subdomains only, no DNS record):
  -> Nuxt web Worker (shadow "bloodmoon-web-shadow", kept alive for
     continued testing; then eventually promoted to a production domain
     -- not yet)
  -> NestJS API Container shadow (Phase CF-API-02R onward -- not built yet)
  -> R2 (static assets, then user uploads; launcher self-update assets
     are a candidate for this same R2 path -- not yet decided, see
     DNS_AND_DOMAIN.md's target DNS design)
  -> existing Game Data Worker/D1/Queue (unchanged, unrelated)
  -> existing Knowledge Hub Worker/D1/R2 (unchanged, unrelated)

Current provider (temporarily retained during transition):
  -> NestJS API (until the Container migration is proven and cut over)
  -> MySQL (until Phase 5 provides a real external, Bryan-controlled target)
  -> Launcher self-update (update.mubloodmoon.com.br) -- unchanged until
     its own explicit migration decision is made
  -> Mail (MX/SPF/DKIM/DMARC) -- unchanged throughout this entire
     program unless a separate, explicit mail-migration decision is
     ever made; this program has never proposed migrating email

Windows VPS: unchanged throughout the entire program
  -> GameServer + GameBridge Agent
```

The defining property of the transition state: **production traffic
never touches Cloudflare until Phase 7's DNS cutover**, no matter how
much shadow work exists on `workers.dev` in the meantime. The API and
MySQL can stay on the current provider for as long as the Container
migration and Phase 5 take — there is no forced coupling between "the
web app runs on Cloudflare" and "the API/DB must move at the same
time."

## C. Final (the actual goal, `CURRENT_PROVIDER = ZERO`)

```
Player browser
  -> Cloudflare DNS (authoritative)
  -> Cloudflare edge (CDN, WAF, TLS)
       -> Nuxt web Worker
       -> R2 (all static/user-upload assets, launcher self-update
          assets if that decision is made -- see DNS_AND_DOMAIN.md)
       -> NestJS API -- Cloudflare Containers (chosen initial target,
          2026-09-22; native Workers stays a possible FUTURE_OPTIMIZATION
          after Containers is proven -- see API_MIGRATION.md/DECISIONS.md)
            -> external MySQL-compatible database, Bryan-controlled or managed,
               reached directly (Containers) or via Hyperdrive (if a future
               Workers-native move happens) -- never a public MySQL bind
            -> SMTP, Asaas, Mercado Pago, Turnstile (unchanged, external)
            -> D1/Queue Game Data + Command Transport (unchanged, already
               Cloudflare) -- D1 stays scoped to Cloudflare-native services
               like this one, never the financial core

Windows VPS (unchanged, out of scope for this program):
  GameServer + SQL Server + GameBridge Agent <-> Game Command Transport
```

Current hosting provider: **no service, DNS record, or credential
still depends on it.**

## What stays fixed across all three states

- The Windows VPS (GameServer, SQL Server, GameBridge Agent) is out of
  scope for this entire program — it never moves.
- Asaas and Mercado Pago remain external providers in every state —
  this program does not touch payment provider integration.
- The financial portal's database is MySQL-compatible in every state —
  D1 is never proposed as its target, in any phase, per the program's
  own constraint.
- Cloudflare Hyperdrive, wherever it appears, connects to an *external*
  MySQL-compatible database — it is never itself the database.
- Email (MX/SPF/DKIM/DMARC) stays on its current path in every state
  unless a separate, explicit mail-migration decision is made — this
  program's own scope (`README.md`) has never included email, and
  `DNS_AND_DOMAIN.md`'s cutover design treats mail preservation as a
  hard requirement of any future DNS cutover, not an optional detail.
