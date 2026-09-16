---
status: PARTIAL — MYSQL_INTEGRATION_PASS / MARIADB_MIGRATION_BLOCKED
category: payments
audience: internal (engineering, security, operations)
lastVerified: 2026-09-16
---

# Asaas sandbox — Phase 3 real database validation

No Asaas credential or real provider request was used. No production database,
deploy, GameBridge, or refund path was touched. The Phase 2 commit under test was
`16753dc75583fc51ec9a36c8393f29833d2cd73c` on
`payments/asaas-sandbox`. The test fixture uses a fake `fetch` that rejects any
host other than the sandbox hostname; all responses are generated locally.

## Database evidence

An isolated disposable Windows MySQL 8.0.46 instance on port 13317 applied all
56 project migrations with `prisma migrate deploy`; `prisma migrate status`
reported current. It was separate from the existing MySQL80 service and local
development database. The real-DB Asaas suite passed 13/13, and the existing
Mercado Pago recharge E2E suite passed 17/17 against this same instance. The
test validates encrypted billing at rest and authorized-service decryption,
account-delete cascade, provider-customer uniqueness under concurrency, payment
creation reservation and ambiguous response recovery, webhook persistence and
concurrent replay, ledger credit at most once, status monotonicity, mismatches,
R$10→10 WC and R$50→50 WC, rollback/retry, restart-style recovery, and fail-closed
configuration. The MySQL instance was stopped after testing.

Schema inspection confirmed the `BillingProfile` and `ProviderCustomer` foreign
keys to `Account`; one-to-one billing uniqueness; unique provider/environment/
reference and provider/environment/customer ID; nullable provider customer ID
and external payment ID; non-null creation-state enum; and unique provider/
environment/external payment ID. Direct duplicate inserts received `P2002`.
On Windows MySQL, table names are stored in lowercase (`lower_case_table_names`),
so this result must not be conflated with Linux/MariaDB table-casing behavior.

An isolated MariaDB 11.8.6 instance was then initialized in a separate WSL
`/tmp` data directory and exposed only on a test port. `prisma migrate deploy`
failed on the **sixth historical migration**,
`20260723003000_launcher_integration`, because its `CAST(0 AS JSON)` expression
is MySQL syntax not accepted by MariaDB (error 1064). Five migrations were
applied, one was failed/incomplete, and 50 remained unapplied; the new Asaas
migration was never reached on MariaDB. The historical migration was not
modified or marked resolved because changing an already-deployed migration
would alter history/checksums. `prisma migrate status` confirmed the gap. Thus
the MariaDB-specific success gate remains **blocked** despite the MySQL pass.
The temporary MariaDB server and data directory were removed after the test.

## Billing encryption review

`BillingProfileService` uses Node AES-256-GCM, a random 96-bit nonce, 128-bit
authentication tag, Account ID as AAD, and a `v1.iv.tag.ciphertext` envelope.
The key source is the separate runtime `BILLING_PII_KEY_B64` (32 decoded bytes).
The `v1` prefix identifies the envelope format, but there is **no keyring or
rotation implementation** yet. No generic, approved cross-domain PII envelope
exists: the current `GameCredentialEnvelopeService` has GameBridge-specific AAD
and purpose, while `TwoFactorService` protects 2FA secrets. Reusing either
domain's key would be inappropriate. The separate billing key is therefore
documented, not silently treated as an approved shared abstraction. Security/
privacy review of key custody, rotation, data retention, and account deletion is
still required before production. Fake legal name/document were not found in
the database ciphertext or test/server logs.

## Remaining gates and safe continuation

1. Decide and implement a MariaDB-compatible migration strategy **without
   rewriting applied migration history**; prove the entire clean migration
   chain on MariaDB 11 in a fresh disposable database. The project test harness
   currently advertises `mariadb:11`, so this incompatibility affects more than
   Asaas. Do not `db push` or mark the failed migration resolved as a substitute.
2. Re-run the Asaas real-DB suite and Mercado Pago regression on that MariaDB
   instance. Then review billing key rotation and LGPD retention/correction.
3. Only after these gates may sandbox credentials and real provider calls be
   considered in a separate authorized phase. Asaas remains disabled by default.

Local host note: installing MariaDB core packages in WSL temporarily replaced
pre-existing WSL MySQL packages; the original four MySQL packages were restored
and its service returned to the original inactive state. The Windows disposable
MySQL data directory remained stopped at
`D:\MU\asaas-phase3-disposable-20260916` because the local command safety
guard rejected its recursive removal. It contains only the isolated test
database and should be removed through an approved cleanup path; it is not a
running service or production database.
