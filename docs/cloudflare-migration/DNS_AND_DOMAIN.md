---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-23
---

# DNS and domain control

Phase `CF-DNS-01` (2026-09-23): full read-only inventory of the current
DNS/domain state, plus the future Cloudflare cutover design. **No DNS
record was changed. No nameserver was changed. No provider was
contacted.** Every fact below is either a live, public DNS/registry
query (anyone can reproduce these — DNS and RDAP/WHOIS are public by
design, not privileged access) or a citation to an already-committed
repo document.

## Domain control matrix — four separate questions, not one

The brief for this phase is explicit that these are not the same
thing. Answered separately, from public registry evidence:

| Question | Answer | Evidence |
|---|---|---|
| **DOMAIN OWNERSHIP** (who is the legal registrant) | **Bryan Patrick dos Santos** — confirmed via registro.br's public RDAP record, `roles: ["registrant"]`, `legalRepresentative: "Bryan Patrick dos Santos"` | live RDAP query, `rdap.registro.br/domain/mubloodmoon.com.br`, 2026-09-23 |
| **REGISTRAR CONTROL** (who can log into the registry/registrar panel and change nameservers at the root) | **UNKNOWN** — for a `.br` domain, registro.br (Nic.br) is itself the registry *and* the only registrar interface (no third-party registrar the way `.com` has). Being the registrant does not by itself confirm Bryan holds the login credentials for the `registro.br` account this domain lives under — that is unverified from any public or repo source and can only be confirmed by Bryan | RDAP shows registrant identity only, not portal-login access |
| **DNS ZONE CONTROL** (who can edit individual records — A/MX/TXT/etc — within the currently-delegated zone) | **UNKNOWN** — this is almost certainly the same cPanel account that hosts `bmweb`/`bmapi` (the zone is served from the same infrastructure the sites are hosted on), but which human(s) hold cPanel login credentials is not recorded in any tracked doc | inferred from hosting co-location, not directly confirmed |
| **NAMESERVER CONTROL** (who can change *which* nameservers the registry delegates to) | **UNKNOWN**, same caveat as registrar control — this is a `registro.br`-panel action, separate from cPanel DNS zone editing | — |

**A real, documented gap found this phase**: RDAP lists a *second*
entity, **Maikon Jonathan Moreira Crivelli** (`jonathanwgarcia@hotmail.com`),
in the `administrative` and `technical` contact roles, with an
`events` history showing `registration: 2017-04-19` — years before
Bryan's own registrant record (`registration: 2026-05-21`, i.e. very
recent, possibly reflecting a registrant-identity update/transfer this
year). **This is exactly the kind of control gap this phase was asked
to surface**: Bryan is the confirmed legal owner, but a third party
still holds the administrative/technical contact role on the public
registry record for a domain originally registered in 2017 — before
this project's current form. Whether that third party (or anyone
else) still holds actual login credentials to registro.br and/or the
hosting cPanel account is unknown and must be confirmed by Bryan
directly — **no agent contacted this person or the registry to ask**,
per this phase's explicit instruction.

`DOMAIN_CONTROL_STATUS = PENDING_TRANSFER` (unchanged conclusion from
before this phase, now with much more specific evidence backing it).

## A real discrepancy found this phase: nameserver hostname mismatch

- **What the domain's own DNS response says** (standard `NS` query,
  `Resolve-DnsName -Type NS mubloodmoon.com.br`): `ns1.srv41.hinetworks.com.br`,
  `ns2.srv41.hinetworks.com.br` — matching what
  `docs/handoff/production-tls-validation.md`'s 2026-08-09 audit
  recorded.
- **What the registry's authoritative delegation record says** (RDAP,
  the actual source of truth for which nameservers `.br`'s root
  delegates this zone to): `ns1.srv02.projectgamers.com.br`,
  `ns2.srv02.projectgamers.com.br`.
- Both nameserver sets resolve to the **same IP**, `190.102.41.133`,
  and every live DNS answer's "answered by" metadata this phase
  identifies the responding server as `projectgamers.com.br`, never
  `hinetworks.com.br`.

**Interpretation, clearly labeled as inference, not fact**: `hinetworks.com.br`
and `projectgamers.com.br` are very likely the same hosting
operation/infrastructure (a rebrand, a reseller relationship, or a
gaming-hosting-focused sub-brand — "projectgamers" reads as exactly the
kind of name a host would use for game-server-focused hosting) — but
this is **not confirmed**, and the zone's own internal `NS` records
disagreeing with the registry's actual delegation is, at minimum, a
real DNS hygiene inconsistency worth Bryan's awareness before any
future nameserver-level action. **Not investigated further this
phase** (would require contacting the provider or a deeper technical
probe outside this phase's read-only/no-contact scope).

## Cloudflare account status (unchanged from prior phases, re-confirmed)

Prior phases' `wrangler whoami` checks already established: the
authenticated Cloudflare account's OAuth token has `zone:read` but
**no zone-write/DNS-edit scope at all**. This credential cannot change
DNS. Not re-queried this phase (no new information would result from
repeating a read-only scope check that hasn't changed).

## Current DNS record inventory (live, public queries, 2026-09-23)

| Hostname | Type | Target/Value | TTL | Service |
|---|---|---|---|---|
| `mubloodmoon.com.br` | A | `190.102.41.133` | 14400 | Web — Nuxt SSR (`bmweb`) |
| `www.mubloodmoon.com.br` | CNAME | `mubloodmoon.com.br` | 14400 | Web — Nuxt SSR (`bmweb`), alias of root |
| `api.mubloodmoon.com.br` | A | `190.102.41.133` | 14400 | API — NestJS (`bmapi`) |
| `mubloodmoon.com.br` | AAAA | *(none)* | — | IPv4-only, confirmed no AAAA anywhere checked |
| `api.mubloodmoon.com.br` | AAAA | *(none)* | — | same |
| `mubloodmoon.com.br` | NS | `ns1.srv41.hinetworks.com.br`, `ns2.srv41.hinetworks.com.br` | 86400 | Authoritative DNS — **see discrepancy above**, registry delegation actually shows `projectgamers.com.br` |
| `mubloodmoon.com.br` | MX | `mubloodmoon.com.br` (priority 0) | 14400 | Mail — delivered to the same host, co-located with web/API |
| `mail.mubloodmoon.com.br` | CNAME | `mubloodmoon.com.br` | 14399 | cPanel default mail-panel alias |
| `ftp.mubloodmoon.com.br` | A | `190.102.41.133` | 14400 | cPanel default FTP alias |
| `update.mubloodmoon.com.br` | A | `190.102.41.133` | 14400 | **Launcher self-update service** — real, active third production web property (see below), same cPanel account, separate document root |
| `mubloodmoon.com.br` | TXT (SPF) | `v=spf1 +a +mx +ip4:190.102.41.133 include:spf.srv41.hinetworks.com.br ~all` | 14400 | Email — sender authorization |
| `_dmarc.mubloodmoon.com.br` | TXT (DMARC) | `v=DMARC1; p=none;` | — | Email — **monitoring-only policy, no enforcement** (`p=none`), worth Bryan knowing though not a migration blocker |
| `default._domainkey.mubloodmoon.com.br` | TXT (DKIM) | `v=DKIM1; k=rsa; p=<2048-bit RSA public key>` | — | Email — DKIM signing, cPanel's standard `default` selector |
| `mubloodmoon.com.br` | CAA | *(none configured)* | — | No CAA restriction exists — any CA can currently issue certificates for this domain; not a problem today, but a future Cloudflare-managed-cert design should consider whether to add one |
| `webmail`, `autoconfig`, `autodiscover`, `cpanel`, `whm`, `downloads`, `launcher`, `ns1`, `ns2`, `store`, `forum`, `discord` (as subdomains) | — | **NXDOMAIN, none exist** | — | Checked and ruled out this phase — downloads are served via the main web app's own `/downloads/` route (`apps/web/public/downloads/README.md`), not a subdomain; no forum/store/Discord-bot subdomain exists |

**A third, real production web property found this phase**:
`update.mubloodmoon.com.br` — the BloodMoon Launcher's self-update
service. Serves an RSA-signed, SHA-256-verified manifest
(`/launcher/manifest.json`) plus the launcher binary and game-client
patch files (`/launcher/files/...`, `/launcher/BloodMoonLauncher-*.exe`/`.zip`)
— confirmed via `apps/api/src/modules/launcher/launcher.service.ts`,
`apps/launcher/README.md`, and a real deploy manifest
(`docs/deployments/predeploy-2026-09-10-open-beta-consolidation/deploy-manifest.md`,
which lists `update.mubloodmoon.com.br/` at 623.35 MB as "a third,
separate web property" alongside `bmweb/`/`bmapi/` in the same cPanel
account). **This was not previously represented anywhere in
`TARGET_ARCHITECTURE.md`'s three-state diagrams** — every player's
launcher depends on it for self-update, so any future DNS cutover must
account for it exactly as carefully as `www`/`api`.

## TLS/certificate context (from the prior, already-committed audit — not re-verified live this phase)

`docs/handoff/production-tls-validation.md` (2026-08-09): Let's Encrypt
wildcard cert for `mubloodmoon.com.br`/`www`, a dedicated cert for
`api.mubloodmoon.com.br`, both valid, HTTPS-enforced via cPanel's
Force HTTPS Redirect. `update.mubloodmoon.com.br`'s own certificate
status was **not covered by that audit** (it predates this phase's
discovery of that hostname as a distinct production property) — its
TLS state is unverified and should be checked before any Cloudflare
proxying decision is made for it.

## Email safety — records that must be preserved exactly during any nameserver migration

Moving authoritative DNS to Cloudflare means Cloudflare's own zone
must contain byte-for-byte equivalent versions of every record below
*before* the nameserver cutover happens, or mail breaks the instant
the cutover takes effect (there is no gradual fallback once the
registry delegates elsewhere):

- **MX**: `mubloodmoon.com.br` priority 0 → `mubloodmoon.com.br` (mail
  delivered to the same host as web/API — this is unusual but real;
  the target must resolve to the same mail-serving IP after cutover,
  meaning the root `A` record must exist and be correct in the new
  zone before or atomically with the MX record)
- **SPF** (root TXT): `v=spf1 +a +mx +ip4:190.102.41.133 include:spf.srv41.hinetworks.com.br ~all`
  — must be copied exactly, including the `include:` — removing it
  without confirming the include target still resolves would silently
  weaken sender authentication
- **DKIM**: `default._domainkey.mubloodmoon.com.br` TXT, the full RSA
  public key value — must be copied exactly, character-for-character;
  a truncated or reformatted key silently breaks DKIM signing
  verification (many DNS panels wrap/quote long TXT values
  differently — this needs a byte-level diff before trusting a copy)
- **DMARC**: `_dmarc.mubloodmoon.com.br` TXT, `v=DMARC1; p=none;` —
  copy as-is; this phase does not recommend tightening the policy
  during a DNS migration (a policy change and a nameserver change are
  two different risks and should never be bundled into one action)
- **Mail delivery depends on the `MX` target actually being reachable
  at cutover time** — since MX points at the bare domain (not a
  distinct mail host), whichever `A` record backs `mubloodmoon.com.br`
  after cutover **must** still accept mail traffic on the same ports,
  or mail delivery breaks even if every DNS record is copied
  correctly. This is a real coupling between the web-hosting cutover
  and mail continuity that a naive "just copy the A record" migration
  could miss.

## Target Cloudflare DNS design (conceptual only — nothing created or activated)

| Hostname | Current | Target | Notes |
|---|---|---|---|
| `mubloodmoon.com.br` (root) | A → `190.102.41.133` | CNAME/A → Cloudflare Workers custom domain (Nuxt web) | Root apex handling depends on which Cloudflare product fronts it — Workers custom domains support apex via Cloudflare's own CNAME-flattening, no separate design needed |
| `www.mubloodmoon.com.br` | CNAME → root | CNAME → root (unchanged shape) | |
| `api.mubloodmoon.com.br` | A → `190.102.41.133` | Cloudflare Containers' external hostname/route (exact mechanism depends on how `CF-API-02R` is eventually deployed — Container-attached custom domain, or a Worker route in front of it) | Not yet designed in detail — blocked on `CF-API-02R` actually running |
| `update.mubloodmoon.com.br` | A → `190.102.41.133` | R2 + custom domain, OR kept on the current provider until explicitly migrated | The launcher manifest/binaries are exactly the kind of static, versioned asset `R2_ASSETS.md`'s launcher model already designs for — but no artifact has been migrated yet (`CF-R2-01`..`05`, unchanged) and this hostname was not previously in scope for any prior storage phase. **Recommend treating this as its own explicit decision, not an assumed default**, given real players' launchers depend on it working correctly through any transition |
| `mubloodmoon.com.br` (MX/SPF/DKIM/DMARC) | current host | **preserved on the current mail path unless a separate, explicit mail-migration decision is made** | This program has never proposed migrating email — `README.md`'s program scope is web/API/storage/database, not mail. Any DNS cutover plan must treat mail as "keep exactly as-is" by default |
| `ftp.mubloodmoon.com.br` | A → `190.102.41.133` | Likely retired once `CURRENT_PROVIDER = ZERO` is reached (no Cloudflare-native FTP equivalent, and FTP as a deploy mechanism is already superseded by this project's own cPanel-upload/API-based workflows) | Not urgent, not blocking |

## Proxy policy (per future record, conceptual)

| Record | Policy | Why |
|---|---|---|
| `mubloodmoon.com.br` (root), `www` | `PROXIED` | Standard Cloudflare CDN/WAF/TLS termination for the web app — this is the normal, intended use case |
| `api.mubloodmoon.com.br` | `UNDECIDED` | Depends on the eventual Container-hosting mechanism and whether Cloudflare's proxy in front of Containers changes request semantics (headers, client IP, WebSocket if ever used) in a way that needs explicit verification first — not assumed either way |
| `update.mubloodmoon.com.br` | `UNDECIDED` | Depends on the R2-vs-stay-on-current-provider decision above |
| `MX` and anything mail-related | **`DNS_ONLY`, always** | Cloudflare's proxy explicitly does not support proxying MX/SMTP — mail records must never be proxied, this is a hard technical constraint, not a preference |
| `SPF`/`DKIM`/`DMARC` (TXT) | `DNS_ONLY` | TXT records are never proxied by Cloudflare in any configuration — this is definitional, not a choice |
| `ftp` | `DNS_ONLY` if kept at all | FTP is not an HTTP(S) protocol Cloudflare's standard proxy handles |

## Pre-transfer options — what can happen *before* full domain/registrar control is confirmed

Everything below is documented as available *design*, not scheduled or
authorized:

1. **Nameserver change while the registrar stays elsewhere**: technically
   the standard way any `.br` domain moves to Cloudflare DNS — Cloudflare
   is added as a zone (creating equivalent records first, unauthoritative,
   for verification), then the *registry* delegation is changed to
   Cloudflare's assigned nameservers. This requires registro.br access
   specifically (see DOMAIN_CONTROL_GAPS below), not the current hosting
   provider's cooperation — the provider is never "asked" for this, the
   registrant/registrar-account holder does it directly at registro.br.
2. **Individual DNS record changes without a nameserver change**: not
   applicable here in the useful sense — the current zone is hosted at
   the current provider's nameservers, so record-level changes would
   need cPanel zone-editor access at the *current* provider, which
   only delays rather than advances the actual Cloudflare migration.
   Useful only for TTL pre-lowering (see Cutover strategy) before a
   real cutover, not for partial service migration.
3. **CNAME/subdomain delegation**: a specific subdomain (e.g.
   `update.mubloodmoon.com.br` alone) *could* be delegated to Cloudflare
   via an `NS` record scoped to just that subdomain, without moving the
   whole zone — a real, standard DNS technique. This would let the
   launcher-update service move to Cloudflare/R2 independently of the
   main web/API cutover. **Worth Bryan's consideration as a
   lower-risk, reversible first real DNS action**, since it doesn't
   touch the root domain, `www`, `api`, or any mail record at all.
4. **Keeping current DNS but pointing selected services to Cloudflare
   via CNAME** (not a nameserver-level change): e.g. pointing
   `update.mubloodmoon.com.br` at a Cloudflare-fronted target via a
   CNAME record edited at the *current* provider's zone editor — this
   needs only DNS ZONE CONTROL at the current provider (see matrix
   above, still unknown who holds this), not registrar/nameserver
   control at all. **This is the lowest-friction pre-transfer option
   if zone-editor access at the current provider can be confirmed.**

No option above assumes the current provider's cooperation is sought
or required — every option either needs registro.br access (which is
Bryan's registrant right to obtain) or the existing cPanel zone-editor
access this project may already have (unconfirmed).

## Cutover strategy (design only — not executed, not scheduled)

1. Inventory current DNS (**this phase, complete**).
2. Create equivalent Cloudflare zone records (once Cloudflare zone
   access for this domain is confirmed) — every record in the current
   inventory table above, byte-for-byte for MX/SPF/DKIM/DMARC.
3. Verify every record resolves correctly from Cloudflare's own
   nameservers *before* changing the registry delegation (Cloudflare
   supports this — a zone can be added and its records verified while
   still unauthoritative).
4. Lower TTLs on records that will change (especially the root `A`/
   web/API targets) well before the actual cutover — the current
   TTLs (14400s/4h for most records, 86400s/24h for NS) mean a naive
   cutover could take up to a day for full global propagation;
   pre-lowering to e.g. 300s a day or more ahead shrinks that window
   substantially.
5. Validate the web/API shadows one final time against real traffic
   patterns (building on the already-proven `bloodmoon-web-shadow`
   Worker and whatever `CF-API-02R`'s shadow deployment produces).
6. Switch authoritative nameservers at the registry (registro.br) —
   **the single highest-blast-radius action in this entire program**,
   per `MIGRATION_ROADMAP.md`'s own existing characterization.
7. Monitor propagation globally (multiple public resolvers, not just
   one) until convergence.
8. Verify web, API, **and email** end-to-end post-cutover — mail is
   easy to silently break and hard to notice quickly, so this must be
   an explicit, deliberate check, not assumed from "the site loads."
9. Roll back nameservers to the current provider's if anything fails
   verification — see Rollback plan below.
10. Keep the old provider's hosting running, unchanged, for an agreed
    observation period after a successful cutover — this program's own
    Phase 8 (`CURRENT_PROVIDER = ZERO`) is explicitly the *last* step,
    not simultaneous with Phase 7's DNS cutover.

## Rollback plan (design only)

- **Old nameservers** (to revert to): `ns1.srv41.hinetworks.com.br` /
  `ns2.srv41.hinetworks.com.br` as currently delegated — but given
  this phase's own discrepancy finding, **the exact, currently-correct
  rollback target should be re-verified at rollback time**, not
  assumed to still be identical to this document's snapshot; nameserver
  hostnames served by the hosting provider are their operational
  detail, not this project's, and could change independently of any
  Cloudflare-side action.
- **Old DNS records**: this document's full inventory table above is
  the rollback source-of-truth snapshot as of 2026-09-23 — re-verify
  every record's exact current value immediately before any real
  cutover attempt, since TTLs and values can legitimately change
  between now and whenever Phase 7 actually happens.
- **Old targets**: `190.102.41.133` for every A/CNAME-resolved
  hostname currently in production.
- **TTL consideration**: rollback propagation speed is bounded by
  whatever TTL was set *on the Cloudflare-side records* immediately
  before rollback — if step 4 above already lowered TTLs, rollback is
  fast; if a cutover were ever attempted without first lowering TTLs,
  rollback could take as long as the original 4–24h TTLs.
  **Never attempt a real cutover with production TTLs still at their
  current values.**
- **Email verification**: send and receive a real test message through
  the existing mail path immediately after any rollback, don't assume
  DNS-record-level correctness implies mail is actually flowing.
- **API/web verification**: exactly the smoke-test pattern already
  established elsewhere in this program (`bloodmoon-deploy` skill's
  Phase 11) — home, login, a few unrelated routes, not just the one
  path being actively worked on.

## Domain control gaps — what Bryan will eventually need

1. **`registro.br` (registrar) portal access** — to actually change
   nameserver delegation at cutover time. Confirmed registrant identity
   is Bryan's own; whether he currently holds the login credentials for
   this specific domain's `registro.br` account is unconfirmed and is
   the single most important gap to close before Phase 7 can be
   scheduled at all.
2. **Clarify the administrative/technical contact question** — Maikon
   Jonathan Moreira Crivelli is listed in both roles on the public
   registry record, with a registration history predating Bryan's own
   registrant record by years. Whether this reflects an active,
   ongoing relationship (e.g. the original developer/host, possibly
   still relevant to hosting-account access) or a stale historical
   artifact that simply hasn't been updated is unknown from any public
   or repo source.
3. **cPanel/hosting-account access for DNS zone editing** — separate
   from registrar access; needed for the pre-transfer CNAME-delegation
   options above, and for any interim record-level change before a
   full nameserver cutover.
4. **EPP/Auth code** — only relevant if the domain were ever
   transferred to a *different* registrar; since `.br` domains use
   registro.br as the sole registrar (no third-party registrar
   ecosystem the way `.com` has), an EPP/Auth code transfer is likely
   **not applicable** here — moving DNS to Cloudflare only requires a
   nameserver delegation change at registro.br, never a registrar
   transfer. Flagged as `LIKELY_NOT_APPLICABLE`, not confirmed, since
   Bryan may have reasons (e.g. wanting the domain under a different
   entity) this phase has no visibility into.
5. **Explicit clarification on `update.mubloodmoon.com.br`'s migration
   priority** — this phase's own discovery, not previously scoped in
   any prior phase's storage or architecture work.

## Status

`DOMAIN_CONTROL_STATUS = PENDING_TRANSFER` (registrant confirmed as
Bryan; registrar/DNS-zone/nameserver-level *access* still unconfirmed).
`DOMAIN_OWNERSHIP = BRYAN_PATRICK_DOS_SANTOS` (confirmed, RDAP,
2026-09-23). Phase 7 (`MIGRATION_ROADMAP.md`) remains blocked until
Bryan confirms items 1–3 above.

## Rules for every phase in this program (unchanged)

- No phase may assume nameserver authority that isn't verified here.
- No agent contacts the current hosting provider, the registry, or any
  third-party contact found in a public record, to ask about DNS/domain
  control — that determination is Bryan's, informed by this document.
- No agent changes a DNS record, at either the current provider or
  Cloudflare, without a dated entry in `DECISIONS.md` authorizing that
  specific change.
- If a future phase needs to know whether the zone already exists in
  Cloudflare, that is a live, read-only Cloudflare API check (not a
  hosting-provider contact) — record the result here when it happens,
  with the date and method.
