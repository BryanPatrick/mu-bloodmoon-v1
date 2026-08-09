# Production HTTPS/TLS validation - Etapa 19.5

Audit date: 2026-08-09 (America/Sao_Paulo)

## Result

Status: **COMPLETED - HTTPS is mandatory on the production web and API hosts.**

On 2026-08-09, the authorized cPanel UAPI operation enabled Force HTTPS
Redirect for `mubloodmoon.com.br` and `api.mubloodmoon.com.br`. The `www` alias
inherits the main-domain redirect. No DNS, certificate, application or legacy
nginx configuration was changed.

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
1.0 and TLS 1.1. The cPanel account reports no AutoSSL exclusions and no AutoSSL
problems for the main or API domain. The valid wildcard certificate covers the
main domain and `www`; the valid API certificate covers the API host. Automated
expiry monitoring remains an operational hardening item.

### HTTP versus HTTPS

| Request                                                                  | Observed result                                          |
| ------------------------------------------------------------------------ | -------------------------------------------------------- |
| `http://mubloodmoon.com.br/`                                             | `301` to the same HTTPS URL                              |
| `http://www.mubloodmoon.com.br/wiki?tab=sets&x=1`                        | `301`; host, path and query preserved                    |
| `http://mubloodmoon.com.br/login?from=tls-audit&x=1`                     | `301`; path and query preserved                          |
| `http://api.mubloodmoon.com.br/api/content/entries?pageSize=1&x=1`       | `301`; path and query preserved                          |
| following each redirect                                                  | one hop, no loop, final `200`, certificate verified      |
| Home, Login, Wiki, Roadmap, Downloads, `www` and API directly over HTTPS | expected `200` responses, certificate verified          |

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

## Production change and HSTS decision

The change used cPanel's account-level
`SSL/toggle_ssl_redirect_for_domains` UAPI with state enabled for only the main
and API domains. A read-back returned `ssl_redirect=1` for both. `www` is the
main domain's server alias and was separately tested over HTTP and HTTPS.

HSTS remains a separate hardening item. The API already sends HSTS through
Helmet. The main web host does not. The account also serves other subdomains,
including `update` and hosting/mail aliases, so `includeSubDomains` must not be
enabled without validating all of them. cPanel did not expose a safe host-only
HSTS toggle in the workflow used here, and changing Nuxt or production files
was not necessary for HTTPS enforcement. HSTS preload was not enabled.

## Acceptance matrix after authorization

- [x] root HTTP redirects to the same root HTTPS URL;
- [x] `www` HTTP redirects to the same `www` HTTPS URL;
- [x] Login HTTP redirects before serving HTML;
- [x] API HTTP redirects to the same API HTTPS path and query;
- [x] all three certificates validate with no hostname/chain error;
- [x] Home, Login, Wiki, Roadmap, Downloads and API return their expected HTTPS status;
- [x] API retains HSTS and security headers;
- [x] login and media CORS preflights work from the production HTTPS origin;
- [x] Nuxt assets, fonts and existing resource paths remain HTTPS-only;
- [x] redirects preserve deep links and queries without loops;
- [ ] main web HSTS: deferred as separate hardening, not an enforcement blocker;
- [ ] authenticated upload mutation: not run without an approved disposable test account; route, CORS and media redirect were validated without writing production data.

The production HTTPS enforcement blocker is closed. The two unchecked
hardening/safe-mutation items are explicitly outside its acceptance boundary.
