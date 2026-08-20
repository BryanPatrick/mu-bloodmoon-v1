# SQL discovery — Phase 2D real Cloudflare end-to-end proof, 2026-08-20

`sourceType: REAL_CLOUDFLARE_INFRA_END_TO_END` (see `metadata.json`).
Closes `END_TO_END_REAL_INFRA` by proving the complete chain — real SQL,
real Agent code, real signed HTTPS, real Cloudflare Worker, real D1, real
apps/api — with no simulated link anywhere.

## Chain

- **raw/** — 5 files: real Cloudflare provisioning, a real CLI-quirk
  diagnosis (BOM injection), the full real Agent→Cloudflare proof (real
  heartbeat/event/dedupe/nonce-replay/sequence-guard), five real
  auth-failure rejections, and the apps/api real diagnostic proof.
- **normalized/e2e-results.json** — every sub-proof's PASS/FAIL status in
  one machine-readable summary.
- **derived/end-to-end-report.md** — the full narrative, what was and
  wasn't done, and the regression results.

## Headline finding

`END_TO_END_REAL_INFRA = PASS`. Every one of Part T's seven required
sub-proofs (SQL read, normalized snapshot, event sent, Worker accepted,
D1 persisted, apps/api consulted, diagnostic reflected real state) is
backed by a real, independently-verifiable execution against real
infrastructure — not a partial or simulated substitute for any of them.

Cross-references: `docs/game-data/cloudflare-resources.md` (what was
provisioned), `docs/game-data/deployment-topology.md` (Phase 2C's
same-host connectivity, unchanged), and
`references/game-data/sql-discovery/phase-2c-real-connectivity-20260820/`
(the SQL-side proof this phase builds on).
