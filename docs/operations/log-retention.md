# Log retention and secret-logging audit (security hardening Part X/Y)

## Static secret-logging scan

`scripts/scan-secret-logging.mjs` (`npm run security:scan-log-secrets`).
Read-only, no network access, exit code 0/1. Scans `apps/api/src` for any
`logger.*`/`console.*` call whose argument text mentions a suspicious
identifier (`password`, `secret`, `token`, `credential`, `ciphertext`,
`envelope`, `authorization`, `connectionString`, `hmac`, `keyring`, ...)
without also showing a recognized redaction marker already established in
this codebase (`.slice(`, `safeMessage(`/`errorMessage(` helper calls,
`error instanceof`, `.code`, `keyVersion`, etc.).

This is a **static, compile-time safeguard** -- it catches a risky logging
pattern before a line is ever written, which is a meaningfully different
(and, for a codebase with no SSH/shell access to its own production log
files, more actionable) guarantee than scanning already-written log
output for a leak after the fact.

Run as of this phase: `LOG_SECRET_SCAN = PASS` (0 findings against the
real `apps/api/src` tree).

## What this phase could not check

Actual production log **files** were not scanned, because there is no
safe way to reach them: the cPanel hosting has no SSH/shell (confirmed
repeatedly across this project's history), and this phase did not pursue
another cPanel browser round-trip to view them through the File Manager
or a log viewer, given the standing guidance to avoid unnecessary cPanel
visits when a task doesn't strictly require one. If a future session has
reason to inspect them directly, they'd need to go through File Manager
or whatever log-viewing surface cPanel exposes for this Node.js app
(unexplored as of this writing).

## Retention

Application-level log rotation/retention on the cPanel host was not
independently verified this phase for the same reason (no direct file
access). Cloudflare Worker logs are subject to Cloudflare's own retention
(not configured by this repo). D1 command-history retention **is**
verified and documented in `docs/operations/provisioning-health.md`.

## Recommendation, not implemented this phase

If/when direct access to the production Node.js app's own log output
becomes available (or if the app is changed to ship structured logs
somewhere queryable), extend `scan-secret-logging.mjs`'s pattern list to
also run against a sample of real log output, not just source code -- the
two catch different failure modes (a risky call site vs. an actual
runtime value that happened to look secret-shaped for an unrelated
reason, or vice versa).
