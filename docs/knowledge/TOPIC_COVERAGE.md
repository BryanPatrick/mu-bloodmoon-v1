---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Topic coverage matrix

Per-topic maturity, evidence-based (2026-09-18). `RAW`/`EXTRACTED`/
`CANONICAL`/`RUNBOOK`/`CODE_REF` are rated MATURE / PARTIAL / WEAK / NONE.

| Topic | RAW sources | Extracted | Canonical knowledge | Runbook | Current code ref | Open gaps |
|---|---|---|---|---|---|---|
| CASH_WCOIN (legacy purchase flow) | MATURE (full PHP source preserved) | MATURE (end-to-end trace this phase) | MATURE (`LEGACY_SUPPLIER_INDEX.md`) | NONE (legacy system, not operational) | N/A (never integrated with current Portal) | GAP-P18-01/02/03 |
| XSHOP_CASHSHOP (in-game shop config) | MATURE (hash-verified files) | MATURE (`xshop-cashshop-config-field-matrix.md`) | MATURE (ADR-0012/0013/0023/0024) | PARTIAL (Portal admin UI exists, sync unimplemented) | `legacy-catalog-config.service.ts` | GAP-P18-07/08 |
| VIP | MATURE | PARTIAL | MATURE (ADR-0001/0010) | PARTIAL | Portal VIP module | None new this phase |
| PAYMENTS (current) | MATURE | MATURE | MATURE (ADR-0008/0009/0019/0020/0021) | PARTIAL (Mercado Pago live; Asaas direction decided, see project memory) | `payments`/`commerce` modules | Marketplace Plan B gate (separate, Phase 17) |
| GAMESERVER (ops) | MATURE (VPS inventory, RemoteOps) | PARTIAL | PARTIAL | WEAK (no non-production test instance exists) | N/A | GAP-P18-07 (reload/restart unknowns) |
| LAUNCHER | MATURE (decompiled source + docs) | MATURE (`ANALISE-LAUNCHER.md`) | MATURE | PARTIAL (rebuild plan documented, not built) | `apps/launcher` (current, rebuilt) | None new this phase |
| MARKETPLACE / ESCROW / GAMEBRIDGE | MATURE (current code) | MATURE | MATURE (many ADRs/handoffs) | PARTIAL (Plan B gate, Phase 17, separate session) | `marketplace.service.ts` etc. | Tracked in Phase 17, not this audit |
| DATABASE (game DB schema) | MATURE (~140 tables inventoried) | PARTIAL (structural only, no row-level data copied to Hub) | PARTIAL | WEAK | N/A | DMN CMS decommission decision (GAP-P18-05) |
| DEPLOYMENT / BACKUP | MATURE (real backup series, hash-verified) | MATURE | MATURE | MATURE (`bloodmoon-deploy` skill + docs) | N/A | None new this phase |
| SECURITY | PARTIAL | PARTIAL | MATURE (incident history docs) | PARTIAL | N/A | Credential rotation plan (Phase 17, separate) |
| EVENTS | MATURE (99 atomic claims) | MATURE | PARTIAL (44-video event inventory, 3 transcribed) | WEAK | Real config files | Long-standing, not newly found |
| ITEM_DELIVERY (in-game item grant from web) | MATURE (source located) | WEAK (not traced this phase) | NONE | NONE | N/A | GAP-P18-09 |
| ADMINISTRATION / CMS (legacy DmN panel) | MATURE (74 tables + full PHP source) | MATURE | MATURE (`legacy-dmn-cms-and-currency-investigation.md`) | NONE (dormant, undecided) | N/A (not integrated) | GAP-P18-04/05 |

## Reading this matrix

"MATURE" means real, hash/code-verified evidence exists and has been turned
into a canonical document a future agent can read directly — not that the
underlying legacy system itself is well-designed or complete. Several
MATURE-rated legacy topics (CASH_WCOIN, ADMINISTRATION/CMS) describe systems
that were fully built but never used — maturity here is about *our knowledge
of them*, not their production status.
