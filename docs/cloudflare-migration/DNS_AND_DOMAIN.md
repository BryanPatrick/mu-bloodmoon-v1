---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-24
---

# DNS and domain control

## Verified facts (repo/docs only, per this phase's explicit instruction)

| Question | Answer | Evidence |
|---|---|---|
| Authoritative nameservers today | `ns1.srv41.hinetworks.com.br`, `ns2.srv41.hinetworks.com.br` — the current hosting provider's own DNS | `docs/handoff/production-tls-validation.md`, 2026-08-09 live audit |
| Is Cloudflare in the DNS/request path today | **No.** The same audit states explicitly: "No Cloudflare proxy was found in the current path: the authoritative name servers are not Cloudflare, DNS resolves directly to the hosting IP, and live responses identify LiteSpeed without Cloudflare headers." | same |
| Current A records | `mubloodmoon.com.br` and `api.mubloodmoon.com.br` both resolve to `190.102.41.133`; `www` aliases the root | same |
| Registrar / account holder for the domain | **UNKNOWN** — not recorded in any tracked doc found this phase | — |
| Who administratively controls the hosting provider's DNS zone editor (cPanel zone editor vs. a separate registrar panel) | **UNKNOWN** — not recorded | — |
| Whether the domain has been added as a zone in Bryan's Cloudflare account | **UNKNOWN** — not checked this phase (would require a Cloudflare API zone-list call; deliberately not made, since this document's instruction was repo/docs only, and the account's OAuth token was not read/extracted to make that call) | — |

## What this phase confirmed about the Cloudflare account itself (not the domain)

Live, read-only `wrangler whoami` (2026-09-22, this phase): the
authenticated Cloudflare account's OAuth token has `zone:read` but
**no zone-write/DNS-edit scope at all**. Whatever the domain's current
Cloudflare status turns out to be, this specific credential cannot
change DNS — see `CURRENT_STATE.md` for the full scope list.

## Status

`DOMAIN_CONTROL_STATUS = PENDING_TRANSFER, VERIFIED_CURRENTLY_NON_CLOUDFLARE`

Concretely: the domain's authoritative DNS is confirmed **not yet**
under Cloudflare, and registrar/zone-editor control is unverified from
this repo. This program's Phase 7 (DNS/domain cutover) explicitly
cannot start until Bryan has confirmed sufficient control to (a) add
the zone to Cloudflare and (b) update the domain's nameservers at the
registrar. Nothing before Phase 7 requires that control — Phases 1–6
work entirely on `workers.dev` subdomains and non-production
identifiers.

## Rules for every phase in this program

- No phase may assume nameserver authority that isn't verified here.
- No agent contacts the current hosting provider to ask about DNS/domain
  control — that determination is Bryan's, informed by this document.
- No agent changes a DNS record, at either the current provider or
  Cloudflare, without a dated entry in `DECISIONS.md` authorizing that
  specific change.
- If a future phase needs to know whether the zone already exists in
  Cloudflare, that is a live, read-only Cloudflare API check (not a
  hosting-provider contact) — record the result here when it happens,
  with the date and method.

## Web-only transition preflight — 2026-09-24

Public, read-only DNS queries confirmed:

| Record | Current result | Web-only cutover rule |
|---|---|---|
| root A | `190.102.41.133` | the only production target intended to move, together with www |
| www | CNAME -> root | move with root; preserve the public hostname |
| api A | `190.102.41.133` | **must remain on the current provider** |
| update A | `190.102.41.133` | **must remain untouched** |
| MX | priority 0 -> root | preserve exactly; because it targets root, the future Cloudflare zone must keep an unproxied mail-reachable target rather than assuming the Web target can also receive SMTP |
| SPF | current provider A/MX/IP/include policy present | preserve byte-for-byte during any zone transfer |
| DKIM | historically inventoried at `default._domainkey` | preserve byte-for-byte; this resolver returned an invalid-packet error for the long TXT response, so the live value was not reasserted in this phase |
| DMARC | `v=DMARC1; p=none;` | preserve exactly; do not combine policy tightening with Web cutover |

The approved transition changes only where root/www serve HTTP Web
traffic. API, update, MX/SPF/DKIM/DMARC and MySQL are explicitly outside
the cutover.

Before any cutover Bryan must verify and record:

1. authenticated access to the `registro.br` account for this domain;
2. ability to change **and revert** authoritative nameservers;
3. authenticated control of the current DNS zone for TTL preparation;
4. a complete, dated zone export/inventory;
5. the exact old root/www values and current TTLs;
6. an operator who can perform rollback without waiting for provider
   support;
7. a Cloudflare zone pre-populated with API, update and every mail record
   before delegation changes.

Until these are recorded, `REGISTRO_CONTROL = UNKNOWN` and the
production cutover gate remains closed.
