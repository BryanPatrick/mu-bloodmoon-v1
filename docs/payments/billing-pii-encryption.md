---
status: LOCAL_HARDENING_COMPLETE, LEGAL_REVIEW_REQUIRED_FOR_RETENTION
category: payments/security
audience: internal (product + security review)
lastVerified: 2026-09-17
---

# Billing PII encryption — architecture, key lifecycle, LGPD boundaries

Local-hardening phase, done in an isolated Claude worktree
(`payments/asaas-local-hardening-claude`, based on Codex's
`payments/asaas-sandbox` at `08a1f30a`) while Codex was unavailable.
Still sandbox-only — no real Asaas credentials, no real Asaas network
call, anywhere in this phase.

## Envelope format

```
<format>.<keyVersion>.<nonce>.<authTag>.<ciphertext>
```
5 dot-joined, base64url-encoded segments (`format`/`keyVersion` are
plain strings, the rest are base64url). `format` (currently `1`) is
explicitly separate from `keyVersion` (`v1`, `v2`, ...) so the
serialization itself can evolve later without conflating "how is this
encoded" with "which key encrypted it".

A 4-segment value (`v1.nonce.authTag.ciphertext`, no explicit format
field) is the pre-hardening shape this same codebase wrote before this
phase — still decryptable, treated as `format=1, keyVersion=v1`
implicitly, the same backward-compatibility convention this project's
existing `TwoFactorService` keyring already established for 2FA secrets
(`apps/api/src/modules/auth/two-factor.service.ts`) -- see "Reused
security primitive" below.

**One real backward-compatibility exception, not a bug**: the AAD
hardening (below) changes what's cryptographically bound into every new
envelope. A record encrypted before this phase (AAD = raw `accountId`
only) will **not** decrypt under this phase's `openField` (AAD =
`billing-profile:<accountId>:<fieldName>`) — GCM authentication is
bound to the exact AAD used at encryption time, so this is an
unavoidable consequence of closing the AAD-substitution gap, not a
compatibility oversight. Confirmed as a non-issue for this phase: `git
grep BillingProfile` across account/deletion code found zero references
before this phase touched it, and Asaas is sandbox-only, pre-launch —
there is no known real `BillingProfile` row anywhere that predates this
change. If one is ever found, it needs explicit re-encryption (decrypt
under the *old* AAD scheme, re-seal under the new one) as a one-time
migration step, not a silent compatibility path.

## Key loading and rotation

Reuses this project's own existing security primitive rather than
inventing a second convention: `apps/api/src/modules/auth/two-factor.service.ts`'s
versioned-keyring pattern (per-version env vars + an active-version
selector + a self-describing envelope). Concretely for billing:

```
BILLING_PII_KEY_B64          -- v1's key (unchanged name/value from
                                 before this phase -- any already-
                                 configured sandbox environment keeps
                                 working)
BILLING_PII_KEY_V2_B64       -- v2's key, once introduced
BILLING_PII_ACTIVE_KEY_VERSION -- which version encrypt() uses for new
                                 writes; defaults to v1 (unchanged
                                 behavior) until explicitly advanced
```
Each key must be exactly 32 raw bytes, base64-encoded — the same strict
requirement the pre-hardening implementation already had for v1;
extended unchanged to every version rather than loosened.

**Rotation sequence** (design + tested, not executed against any real
data this phase):
1. Generate `BILLING_PII_KEY_V2_B64` — fresh, random, never derived from
   v1. Set alongside (not replacing) `BILLING_PII_KEY_B64`.
2. Deploy with `BILLING_PII_ACTIVE_KEY_VERSION` still unset/`v1` — proves
   the new code path is byte-compatible with every existing v1 record
   before anything changes.
3. Set `BILLING_PII_ACTIVE_KEY_VERSION=v2` — new writes use v2; every
   existing v1 record remains fully readable (`keyForVersion` looks up
   whichever version an envelope actually claims, not the active one).
4. Explicit, batchable re-encryption (design only, not built as a
   runnable tool this phase — mirrors
   `apps/api/src/migrate-two-factor-keys.ts`'s shape closely enough that
   adapting it is the natural next step, not a fresh design): for each
   `BillingProfile` row where `keyVersionOf(ciphertext) !== activeKeyVersion()`,
   decrypt under the old key, re-seal under the active one, write back.
   Idempotent by construction (`keyVersionOf` after re-encryption always
   matches active, so a re-run only touches genuinely stale rows).
5. **Never automatic.** No startup hook re-encrypts anything; no key is
   ever retired automatically. Retirement of `BILLING_PII_KEY_B64`
   itself is only safe once a real, explicit count of remaining
   `v1`-versioned rows is zero — a read-only query
   (`SELECT COUNT(*) ... ` filtered by `keyVersionOf` per row, the same
   check `TwoFactorService`'s own rollout plan already uses for 2FA) —
   not implemented as a running service this phase, but the primitive
   (`keyVersionOf`) it would be built on is real, tested, and exported.

`v1 encrypt/decrypt`, `v2 encrypt/decrypt`, `ACTIVE=v1 writes v1`,
`ACTIVE=v2 writes v2`, `v1 record decrypts while v2 active`, `missing
key fails closed`, `unknown-but-well-formed version fails closed`,
`malformed version string rejected as invalid envelope` — all real,
automated, passing (`apps/api/src/modules/payments/billing-crypto.spec.ts`,
19/19 tests).

## AAD hardening

Before this phase: AAD was `accountId` alone. Any two ciphertexts for
the same account (`legalNameCiphertext`, `cpfCnpjCiphertext`) were
therefore interchangeable under GCM's own authentication check — a
`legalNameCiphertext` value would decrypt "successfully" if placed in
the `cpfCnpjCiphertext` column position, or vice versa, since nothing in
the AAD distinguished which field a ciphertext belonged to.

After: `billing-profile:<accountId>:<fieldName>`. Tested, real, passing:
Account A's ciphertext rejected under Account B; `cpfCnpj` ciphertext
rejected when presented as `legalName`; `legalName` ciphertext rejected
when presented as `cpfCnpj` — all three under the *same* key and *same*
account where relevant, isolating the AAD as the actual mechanism being
tested, not just "wrong key."

## Tamper resistance

Tested, real, passing: modified ciphertext, modified nonce, modified
auth tag, modified envelope format field, and modified key-version field
all fail to decrypt — no plaintext is ever returned for anything that
didn't authenticate exactly as written.

## Normalization

`cpfCnpj`: digits-only (`replace(/\D/g, '')`), already the pre-existing
behavior in `billing-profile.service.ts`, unchanged by this phase.
Stored encrypted, never in plaintext, never logged.

`legalName`: trimmed only (already pre-existing). Deliberately not
further transformed — aggressive normalization of a human legal name
(case-folding, accent-stripping, etc.) risks corrupting real names and
was explicitly warned against; left as-is.

## Search / uniqueness

No document-lookup-by-CPF/CNPJ requirement exists anywhere in the
current Asaas sandbox flow (confirmed: `BillingProfile` is looked up
exclusively by `accountId`, never by document number, across
`billing-profile.service.ts` and its spec). No blind-index/HMAC lookup
token was designed or built — correctly out of scope until a real
duplicate-detection requirement exists; storing anything for lookup
convenience alone would directly contradict "do not persist plaintext
CPF/CNPJ merely for lookup convenience."

## API / DTO exposure audit (performed this phase)

`git grep` across `apps/api/src/modules/payments/` and
`.../commerce/` for `legalName|cpfCnpj|Ciphertext|nonce|authTag` found
exactly two categories of real match: (1) `asaas.provider.ts`'s customer
payload construction (`legalName`/`cpfCnpj` as plain fields) — the one
place this data is *supposed* to be plaintext, constructed at call time
from freshly-decrypted billing data, never persisted a second time; (2)
`commerce.controller.ts`'s `saveBillingProfile` request DTO — the
write-in path from the client, not a read/response exposure. No
response DTO, admin listing, webhook payload, or payment-event structure
anywhere in these modules returns `legalName`, `cpfCnpj`, or any
ciphertext/nonce/tag field. `PLAINTEXT_BILLING_DATA_IN_API_RESPONSES = NOT_FOUND`.

## Logging audit (performed this phase)

Every `logger.error`/`console.*` call found in
`apps/api/src/modules/commerce/` routes its message through a
`safeMessage()` helper (`payment-reconciliation.service.ts:329`) before
logging. **Real, minor finding, not a blocker**: `safeMessage` currently
only truncates to 500 characters — it does not affirmatively redact
secret-like content. No code path in these modules was found that
constructs an `Error` whose `.message` includes raw `legalName`,
`cpfCnpj`, an Asaas API key, or a ciphertext envelope, so this is not a
live leak today — but `safeMessage` itself provides no structural
guarantee against a *future* change introducing one. Worth hardening
`safeMessage` to pattern-match and redact common secret shapes as its
own small follow-up; not done this phase (scope: billing encryption, not
a general logging-sanitization pass).

## Sandbox/production separation (audited, confirmed already robust)

`asaas.config.ts`'s `loadAsaasConfig()` was already correctly fail-closed
before this phase touched anything — confirmed, not modified:
`baseUrl`'s TypeScript type is `typeof ASAAS_SANDBOX_URL` (cannot even
type-check as anything else), the function's return value hardcodes
`baseUrl: ASAAS_SANDBOX_URL` regardless of what `ASAAS_BASE_URL` claims,
and enabling the integration additionally requires `NODE_ENV` in
`development`/`test`, `ASAAS_ENVIRONMENT === 'sandbox'`, an API key
prefixed `$aact_hmlg_` (Asaas's own sandbox-key convention), and
`DATABASE_URL` pointing at `localhost`/`127.0.0.1`/`::1`. No changes
were needed or made here.

## LGPD purpose and access boundary

**Purpose**: billing/payment provider integration only — collecting
`legalName`/`cpfCnpj` exists solely to create and identify an Asaas
customer record for PIX recharge.

**Local data held**: `legalName`, `cpfCnpj` (both encrypted at rest, per
above).

**Access boundary**: the raw decryption primitive (`openField`) has
exactly one real call site in the whole codebase — `billing-profile.service.ts`'s
own `open()` wrapper — confirmed via `git grep openField` (definition,
that one call site, and its test file only). That wrapper is in turn
called from exactly two places, both inside the same service:
`saveForAccount`'s idempotency check and `ensureAsaasCustomer`'s
provider payload construction. No other module (assistant, Wiki, game
services, marketplace, telemetry) imports `billing-crypto.ts` or
`billing-profile.service.ts` — confirmed via `git grep`: every real
importer of either file (`commerce.controller.ts`, `commerce.service.ts`,
`payments.module.ts`, and the two spec files) is inside the
`payments`/`commerce` modules themselves. This satisfies "the assistant, Wiki, game services,
marketplace, telemetry, etc. must not receive BillingProfile PII by
default" as a structural fact (nothing imports the code path that could
reach it), not merely a policy statement.

## Retention and account-deletion interaction

See `docs/payments/financial-retention-policy.md` (existing document,
extended this phase with a `BillingProfile`-specific section) for the
full retention-decision gap — deliberately not duplicated here.

**One real, previously undocumented finding from this phase's audit**:
`BillingProfile.account` is `onDelete: Cascade` in `schema.prisma` — if
an `Account` row is ever hard-deleted, `BillingProfile` would be
silently cascade-deleted with it, regardless of any retention decision.
`git grep BillingProfile` across `apps/api/src/modules/accounts/` and
`docs/accounts/` returned zero results — this table is not yet
referenced anywhere in the account-deletion architecture at all. Per the
existing retention policy's own established pattern for
`RechargeIntent`/`PurchaseIntent` (financial records are structurally
excluded from deletion, independent of any retention-duration decision),
`BillingProfile` likely needs the same treatment, but this phase did not
trace the full account-deletion service to confirm whether
`NORMAL_ACCOUNT_DELETION` or `PRE_BETA_PURGE` could ever actually reach
a hard `Account` delete that would trigger this cascade — flagged as a
specific, scoped follow-up (see Codex handoff), not resolved here.
