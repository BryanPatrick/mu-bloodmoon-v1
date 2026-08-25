# Provisioning health tooling (security hardening Part U)

Two complementary, read-only tools, split by where their credentials
actually live -- there is no single machine that safely holds Portal DB,
Cloudflare, and MU SQL access all at once, so a single "one script does
everything" tool would either need broader access than it should have or
silently skip a system.

## `apps/api/src/provisioning-health.ts` -- Portal side

Same standalone `NestFactory.createApplicationContext` pattern as
`reconcile.ts`/`migrate-two-factor-keys.ts` -- runs inside the app's own
environment (cPanel's "Run JS script", a cron job, or locally against
`bloodmoon_local_claude` for testing), so it never needs a separate
credential.

Reports, as one JSON object on stdout (plus a human-readable summary line
via the logger):

- `provisioningStatusCounts` -- PENDING/PROVISIONING/ACTIVE/FAILED
- `oldestPendingAgeSeconds` / `oldestProvisioningAgeSeconds`
- `stuck.PENDING_TOO_LONG` (>10min with zero dispatch attempt),
  `stuck.PROVISIONING_TOO_LONG` (>15min still in-flight),
  `stuck.FAILED_RETRYABLE_EXHAUSTED` (count of FAILED identities that hit
  the reconciliation worker's own 8-attempt automatic ceiling)
- `attemptOutcomeCounts` -- from `GameProvisioningAttempt`, grouped by
  outcome (DISPATCHED/RECONCILED_ACTIVE/RECONCILED_FAILED/ERROR/etc.)
- `reconciliationRunner.lastAttemptAgeSeconds` /
  `.appearsStale` (no attempt logged in 5+ minutes while PENDING/FAILED
  work exists)
- `featureFlag.provisioningOnRegisterConfigured` /
  `.reconciliationWorkerEnabled` -- **presence only**, never a value

No account id, email, username, or PII of any kind. No secret, credential,
or ciphertext, ever.

## `D:\MU\Tools\RemoteOps\bm-provisioning-health.ps1` -- Cloudflare + MU SQL side

Runs locally, using the already-authenticated local `wrangler` OAuth
session and the existing read-only `bm-sql` bridge -- neither of which
exist anywhere except this machine, so this half of the check cannot run
inside production the way the Portal-side script does.

Reports:

- `QUEUE_HEALTH` -- confirms `bloodmoon-production-game-commands` exists
  with an active producer+consumer binding
- `D1_HEALTH` -- `game_command` status distribution, `STUCK_COMMANDS`
  count (anything in `AVAILABLE`/`CLAIMED`/`FAILED_RETRYABLE`)
- `AGENT_HEALTH` / `AGENT_INSTANCES` -- from `agent_heartbeats`,
  `buffer_state`, `buffer_depth`, and staleness (>120s since last seen)
- `SQL_OBSERVER_HEALTH` -- `bm-sql health`, confirms the read-only bridge
  is reachable and still correctly denied write/execute

Purely `SELECT`/list operations -- there is no mutation path in this
script at all, so there is nothing to gate behind a flag (Part AG's
"require explicit flag for mutations" doesn't apply here; there are none).

## Retention note (Part Z/AA, verified not built here)

D1 command retention is **already implemented** (not new in this phase):
`apps/game-data-worker/src/index.ts`'s `scheduled` handler + a real
`[triggers] crons = ["17 4 * * *"]` in `wrangler.toml` call
`deleteExpiredCommandHistory`, which only ever deletes terminal-state rows
(`SUCCEEDED`/`FAILED_FINAL`/`EXPIRED`) older than the retention window --
verified by reading the deployed source, not just the design doc.

The Agent's `ProvisioningLedger` (SQLite, on the Agent host) has **no**
retention/pruning logic at all -- every row is kept forever. At current
real scale (2 total commands ever, per the live D1 check performed during
this phase) this is not an active problem, and implementing pruning in a
live production Agent service without a safe, tested deploy path for the
Agent (which this phase does not have) would violate Part AA's own
"implement pruning only if safe" instruction. Recorded here as a known,
low-urgency gap for whoever next has Agent deploy access, not fixed in
this phase.
