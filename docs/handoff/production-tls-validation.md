# Production HTTPS/TLS validation - Etapa 19.5

Audit date: 2026-08-09 (America/Sao_Paulo)

## Result

Status: **BLOCKED - HTTPS exists, but HTTP is still publicly served.**

The certificates and HTTPS endpoints are valid. The beta blocker cannot be
closed because the public web host serves the same application over plain HTTP,
the API HTTP virtual host returns `503` instead of redirecting, and the main web
response does not send HSTS.

No production, DNS or certificate setting was changed during this audit.

## Observed production path

```text
Browser
  -> authoritative DNS at ns1/ns2.srv41.hinetworks.com.br
  -> A 190.102.41.133 (root and api; www aliases the root)
  -> LiteSpeed/cPanel virtual host
  -> Passenger Node application
       -> Nuxt SSR web (/home/mubloodxz/bmweb)
       -> Nest API (/home/mubloodxz/bmapi)
```

No Cloudflare proxy was found in the current path: the authoritative name
servers are not Cloudflare, DNS resolves directly to the hosting IP, and live
responses identify LiteSpeed without Cloudflare headers.

TLS terminates at the hosting/LiteSpeed layer before Passenger. The repository
does not contain the active certificate or LiteSpeed virtual-host configuration.

## Live evidence

### DNS and certificates

| Host                     | Certificate                 | Issuer            | Valid until             | Policy           | Protocol |
| ------------------------ | --------------------------- | ----------------- | ----------------------- | ---------------- | -------- |
| `mubloodmoon.com.br`     | `CN=*.mubloodmoon.com.br`   | Let's Encrypt YR1 | 2026-10-19 13:21:50 UTC | no policy errors | TLS 1.3  |
| `www.mubloodmoon.com.br` | `CN=*.mubloodmoon.com.br`   | Let's Encrypt YR1 | 2026-10-19 13:21:50 UTC | no policy errors | TLS 1.3  |
| `api.mubloodmoon.com.br` | `CN=api.mubloodmoon.com.br` | Let's Encrypt YR1 | 2026-10-14 21:35:42 UTC | no policy errors | TLS 1.3  |

Explicit protocol negotiation accepted TLS 1.2 and TLS 1.3 and rejected TLS
1.0 and TLS 1.1. AutoSSL renewal is expected from cPanel but was not proven by
an account-level inspection; expiry monitoring remains an operational need.

### HTTP versus HTTPS

| Request                                                        | Observed result             |
| -------------------------------------------------------------- | --------------------------- |
| `http://mubloodmoon.com.br/`                                   | `200`, no redirect          |
| `http://www.mubloodmoon.com.br/`                               | `200`, no redirect          |
| `http://mubloodmoon.com.br/login`                              | `200`, no redirect          |
| `http://api.mubloodmoon.com.br/api/content/entries?pageSize=1` | `503`, no redirect          |
| corresponding root/www/login HTTPS requests                    | `200`, certificate verified |
| HTTPS API content and Wiki requests                            | `200`, certificate verified |

This means credentials can still be submitted from a page initially loaded
over HTTP. HSTS on a different host does not repair that first insecure visit.

### Headers, cookies and callbacks

- HTTPS API responses use Helmet and currently include HSTS
  (`max-age=15552000; includeSubDomains`), CSP with
  `upgrade-insecure-requests`, `Referrer-Policy`, `nosniff` and frame policy.
- HTTPS Nuxt web responses do **not** currently include HSTS, CSP,
  `Referrer-Policy`, `nosniff` or a frame policy at the hosting boundary.
- The rendered production Nuxt config uses
  `https://api.mubloodmoon.com.br/api`.
- API CORS accepts the real HTTPS web origin with credentials and the expected
  auth request headers.
- The frontend state cookie is configured with `SameSite=Lax` and `Secure` in
  non-development builds. Authentication JWTs are returned in the API body and
  retained by the frontend in local storage; they are not protected by
  `HttpOnly` cookies. That is a separate XSS/session-hardening concern, not
  proof that TLS is absent.
- No `Set-Cookie` header is emitted on anonymous Home/Login requests.

### Browser and resources

The Home and Login pages were loaded with an isolated headless Chrome profile.
Both completed successfully. No certificate, SSL, CORS, mixed-content or
resource-load error was observed. Nuxt scripts/styles and the concrete Google
Fonts stylesheet returned `200` over HTTPS. The only `http://` literal in the
rendered Home document was the standard SVG XML namespace and is not a network
request.

Community media upload is authenticated and writes production data, so this
audit did not create a disposable upload. The HTTPS API route, CORS preflight,
static resource path and existing read endpoints were validated without
mutating production.

## Repository configuration decision

`deploy/nginx.bloodmoon.conf` is a legacy/template example:

- it contains placeholder domains;
- it only listens on port 80;
- production identifies LiteSpeed/cPanel, not nginx;
- the cPanel deployment runbook points to Passenger applications in `bmweb`
  and `bmapi`.

Editing this file would not alter production and would create false confidence.
It must not be treated as the source of truth for the current host.

## Required production correction

This is an infrastructure change and requires operator authorization:

1. In cPanel, open **Domains** and enable **Force HTTPS Redirect** for
   `mubloodmoon.com.br` and `api.mubloodmoon.com.br` (the associated `www`
   hostname must also be verified).
2. Confirm the resulting redirect preserves path and query and returns a
   permanent redirect for root, Login and API routes.
3. Add HSTS to the main HTTPS web response at the LiteSpeed/cPanel boundary.
   Start with a conservative value and do not request preload until every
   relevant subdomain is permanently HTTPS and renewal/rollback are proven.
4. Keep AutoSSL enabled and add expiry monitoring for both certificates.
5. Re-run the acceptance matrix below before closing the blocker.

Do not implement an application redirect based on forwarded headers without
first proving LiteSpeed's trusted `X-Forwarded-Proto` behavior; a wrong rule can
create a redirect loop. The cPanel domain-level redirect is the preferred fix
for this deployment.

## Acceptance matrix after authorization

- [ ] root HTTP redirects to the same root HTTPS URL;
- [ ] `www` HTTP redirects to the chosen canonical HTTPS host;
- [ ] Login HTTP redirects before serving HTML;
- [ ] API HTTP redirects to the same API HTTPS path and query;
- [ ] all three certificates validate with no hostname/chain error;
- [ ] Home, Login and API continue returning their expected status over HTTPS;
- [ ] main web HTTPS response includes the approved HSTS policy;
- [ ] API retains HSTS and security headers;
- [ ] login request/CORS works from the production HTTPS origin;
- [ ] assets and existing media load without mixed content;
- [ ] authenticated upload is smoke-tested with an approved test account;
- [ ] redirects preserve deep links and do not loop.

The Hub blocker must remain open until every applicable item is observed on the
live public hosts.
