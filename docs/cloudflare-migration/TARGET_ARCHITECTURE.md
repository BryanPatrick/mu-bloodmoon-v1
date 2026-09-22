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
  -> ns1/ns2.srv41.hinetworks.com.br (authoritative DNS, current host)
  -> 190.102.41.133
  -> LiteSpeed / cPanel virtual host
       -> Nuxt SSR web   (/home/mubloodxz/bmweb,  Node/LSAPI)
       -> NestJS API     (/home/mubloodxz/bmapi,  Node/LSAPI)
            -> MySQL (127.0.0.1, same host, not publicly reachable)
            -> SMTP, Asaas, Mercado Pago, Turnstile siteverify (outbound)
            -> Cloudflare D1/Queue (Game Data client, read-scope + command transport)

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
  -> Nuxt web Worker (shadow, then eventually promoted)
  -> R2 (static assets, then user uploads)
  -> existing Game Data Worker/D1/Queue (unchanged, unrelated)
  -> existing Knowledge Hub Worker/D1/R2 (unchanged, unrelated)

Current provider (temporarily retained during transition):
  -> NestJS API (until Phase 4/6 decide and execute its own move)
  -> MySQL (until Phase 5 provides a real external, Bryan-controlled target)

Windows VPS: unchanged throughout the entire program
  -> GameServer + GameBridge Agent
```

The defining property of the transition state: **production traffic
never touches Cloudflare until Phase 7's DNS cutover**, no matter how
much shadow work exists on `workers.dev` in the meantime. The API and
MySQL can stay on the current provider for as long as Phases 4/5 take —
there is no forced coupling between "the web app runs on Cloudflare"
and "the API/DB must move at the same time."

## C. Final (the actual goal, `CURRENT_PROVIDER = ZERO`)

```
Player browser
  -> Cloudflare DNS (authoritative)
  -> Cloudflare edge (CDN, WAF, TLS)
       -> Nuxt web Worker
       -> R2 (all static/user-upload assets)
       -> NestJS API — Cloudflare Workers or Cloudflare Containers (Phase 4 decision)
            -> external MySQL-compatible database, Bryan-controlled or managed,
               reached via Hyperdrive from Workers (never a public MySQL bind)
            -> SMTP, Asaas, Mercado Pago, Turnstile (unchanged, external)
            -> D1/Queue Game Data + Command Transport (unchanged, already Cloudflare)

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
