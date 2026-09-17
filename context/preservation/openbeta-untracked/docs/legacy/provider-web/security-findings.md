---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering + security)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read)
---

# Legacy provider-web — security findings

**Constraint this investigation was run under, honored throughout: no
secret/credential/PII value is printed anywhere in this document — only
location, type, and (where applicable) remediation status.** This panel
is NOT_DEPLOYED to production (see
`docs/vip/wz-setaccountlevel-coexistence.md` Decision 1) — these findings
are historical/reference value for what NOT to repeat in Blood Moon's own
code, not an active exposure.

1. **Plaintext SQL Server `sa` password and admin-panel credentials
   committed to webroot.** `constants.php` (webroot, not even under
   `application/`): the SQL Server host/port/login/password (the `sa`
   superuser account) are all in plaintext, alongside the CMS admin-panel
   master username, password, a numeric PIN, and a security salt. If this
   single file were ever exposed, it would grant full SQL Server `sa`
   access plus full admin-panel access.
2. **Plaintext SMTP password.** `application/config/email_config.json`
   (the `smtp_password` field) — plaintext SMTP credential.
3. **CSRF protection loaded but almost entirely unenforced.** The `csrf`
   library is loaded in the constructors of `controller.lost_password.php`,
   `controller.registration.php`, `controller.account_panel.php`,
   `controller.donate.php`, `controller.warehouse.php`,
   `controller.shop.php`, and three plugins (`mercadopago`,
   `ruud_exchange`, `workshop`) — but the actual verification call is
   **commented out everywhere except one place**:
   `controllers/controller.shop.php` (the VIP-purchase handler). Every
   other CSRF-loading controller/plugin has its check disabled. The
   warehouse view even still emits a CSRF token that's never checked
   server-side — decorative only. Net effect: registration, password
   reset, account-panel actions, donations, and warehouse actions had no
   real CSRF protection; only VIP purchase did.
4. **`ip()` helper trusts client-controlled headers over the real socket
   address.** `system/common.php` builds the effective IP via a sequence
   of *unconditional* `if(!empty(...))` assignments (not `elseif`), so
   later checks silently overwrite earlier ones — the order is
   `HTTP_CLIENT_IP` → `HTTP_X_FORWARDED_FOR` → `REMOTE_ADDR` →
   `HTTP_CF_CONNECTING_IP` → **`HTTP_X_REAL_IP` (last, so it wins)**.
   `HTTP_X_REAL_IP` is attacker-controlled request-header input, not a
   socket-derived value — any client can set that header to spoof the
   reported IP. This directly defeats Paygol's payment-callback
   authenticity control (an IP allowlist, its *only* control — see
   [`payments-legacy.md`](payments-legacy.md)): an attacker can spoof the
   header and call the endpoint directly to credit their own account.
5. **CuentaDigital webhook has no cryptographic verification** (detail in
   [`payments-legacy.md`](payments-legacy.md)) — relies solely on
   knowledge of an opaque order hash returned in the callback, with no
   HMAC/signature and no server-to-server confirmation call.
6. **Password-reset tokens use a non-cryptographic entropy source.**
   `models/model.account.php` builds the lost-password activation code as
   `strtoupper(sha1(microtime()))` — wall-clock time, not a CSPRNG
   (`random_bytes()`). Combined with an often-narrowable request
   timestamp, this weakens resistance to targeted guessing versus a
   properly random token, partially mitigated by a 10-minute reuse
   window.
7. **Passwords stored in plaintext for this deployment's actual
   configuration.** `constants.php` sets `MD5 = 0`. With that setting,
   both the admin "edit account" password reset and the user-facing
   lost-password reset write `memb__pwd = '<plaintext password>'`
   directly to `MEMB_INFO` — no hashing at all in this configured mode.
   This mirrors the historical native MU GameServer convention of storing
   `memb__pwd` in cleartext (already documented as
   `LEGACY_ENGINE_CONSTRAINT` in `docs/security/gameserver-credential-audit.md`)
   rather than being a bug this CMS introduced — but it confirms this
   specific deployment never used the CMS's own available hashed-password
   code paths (`MD5==1`/`MD5==2`) either.
8. **Admin panel exposes an arbitrary raw-SQL executor and unescaped DDL
   builders.** `models/model.admin.php`'s `add_column()`/`drop_column()`/
   `drop_procedure()` build `ALTER TABLE`/`DROP PROCEDURE` DDL via raw
   string concatenation with **zero escaping** (SQL identifiers can't be
   parameterized, but there's also no allowlist/regex validation), and
   `insert_sql_data($sql, $db)` executes **any** SQL string handed to it
   verbatim. Primarily invoked by the plugin-install/uninstall flow
   (reading bundled `sql_schemes/*.sql`, not normally attacker-supplied
   text), but the functions exist as a general-purpose capability
   reachable from any authenticated admin session — a compromised admin
   session (weak credential per finding #1) equals full raw DDL/DML
   execution against the shared `MuOnline` database.
9. **Minor: unescaped string concatenation in bulk character deletion.**
   `models/model.admin.php`'s `delete_characters()` builds a
   `Name IN ('a','b',...)` clause by directly concatenating each
   character name without the `->escape()` call used two lines later for
   the account parameter. The actual call site sources the name list from
   a DB read of the target account's own real characters, not directly
   from request input — low exploitability absent an already-malicious
   character name in the DB, but inconsistent with the escaping
   discipline used everywhere else in the same function/file.
10. **Referral abuse control may have been silently non-functional.**
    `check_referral_ips()` cross-references `DmN_IP_Log`, but the actual
    `INSERT INTO DmN_IP_Log` call inside `login_user()` is itself
    commented out in this snapshot (see
    [`database-mapping.md`](database-mapping.md)) — meaning the table may
    not have actually been populated on ordinary logins, silently
    degrading both the admin "accounts by IP" tool and this referral
    check.

## What was NOT found (explicitly, since absence is informative)

No classic string-concatenated SQL injection using raw `$_GET`/`$_POST`
values was found in the models/controllers spot-checked
(`model.market.php`, `model.character.php`, `controller.ajax.php`,
`controller.market.php`) — the codebase consistently uses PDO-style
`:named` prepared statements or a manual `->escape()` wrapper for the
dynamic-identifier cases (config-driven, not request-driven) in every
file read this pass, aside from the two exceptions in findings #8 and #9
above (both DDL/admin-invoked, not directly public-facing).

## Relevance to Blood Moon

None of this code is deployed or reachable in production. Its value is
purely as a checklist of patterns to avoid: unescaped DDL builders,
header-trusted IP derivation, commented-out-but-still-loaded security
middleware, and non-cryptographic token generation are all worth an
explicit negative-check against the current Portal codebase, though none
of this investigation found evidence that Blood Moon repeats any of them.
