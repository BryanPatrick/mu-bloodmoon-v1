---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Knowledge master index

The top-level "how do I find X" router for Blood Moon's knowledge
ecosystem. Written for Phase 18/18B (2026-09-18, "pente fino" knowledge
preservation + global audit). Supersedes the separately-requested
`KNOWLEDGE_INVENTORY.md` (Phase 18) — folded in here rather than
duplicated, per the "do not duplicate unnecessarily" instruction.

## Three layers, no dual authority (Phase 18B §38)

1. **Knowledge Hub** (Cloudflare D1, `akh` CLI, project slug `bloodmoon`) —
   structured, machine-operational state: tasks, decisions, sessions,
   handoffs, a small curated set of `knowledge_items`/`sources`. Query it
   with `akh bootstrap bloodmoon` / `akh knowledge list bloodmoon` /
   `akh source list bloodmoon` (read-only, needs `AI_KNOWLEDGE_HUB_API_KEY`
   from `hub/.env.local`). See `SOURCE_REGISTRY.md` for real current counts.
2. **Repository knowledge docs** (`mu-bloodmoon-v1/docs/`, `context/`,
   `knowledge/vendor-sweep/`) — durable, curated, git-tracked, human- and
   agent-readable reference. This is where `LEGACY_SUPPLIER_INDEX.md`,
   `docs/economy/*`, the ADRs, and the vendor knowledge sweep live.
3. **Raw archives** (`D:\MU\Research`, `RemoteData`, `Archives`, `Deploy`,
   `Database`, `Knowledge`, `catalog` — deliberately outside git) — original
   source evidence: tutorial files, decompiled launcher source, backup
   tarballs, VPS inventories. See `SOURCE_REGISTRY.md`.

A knowledge item never lives authoritatively in two of these at once — the
Hub's `bloodmoon-legacy-web-backup` source, for example, is a *pointer* to
the raw archive at `D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\`, not a
copy of it.

## Router: task → domain → source → runbook

```
TASK ("how do I do X?")
  -> DOMAIN (see docs/knowledge/knowledge-sweep.md's topic list, or
     TOPIC_COVERAGE.md for maturity per domain)
  -> Is it a current, operational Blood Moon system?
       YES -> context/SOURCE_INDEX.md / context/REPOSITORY_KNOWLEDGE_MAP.md
              -> the relevant docs/ file -> PROCEDURE_INDEX.md for the runbook
       NO  -> is it legacy/vendor/historical?
              YES -> this file's "Legacy & vendor" section below
                     -> LEGACY_SUPPLIER_INDEX.md / VPS_DOCUMENTATION_INDEX.md
                     -> knowledge/vendor-sweep/ (node scripts/knowledge-query.mjs)
              NO  -> KNOWLEDGE_GAPS.md (it may be a known, tracked gap)
  -> CONFLICTS.md (check before trusting a single source)
  -> PROCEDURE_INDEX.md (runbook exists? risk? approval needed?)
```

## Quick answers to the example lookups (Phase 18B §17)

| Question | Answer path |
|---|---|
| "How does WCoin reach the game?" (legacy) | `LEGACY_SUPPLIER_INDEX.md` — full traced flow, file:line evidence |
| "Where is XShop configured?" | `docs/economy/xshop-cashshop-config-field-matrix.md` |
| "How does current Asaas WC reach the game?" | `CASH_VIP_INTEGRATION_MAP.md` Part 4 — explicit gap, `NOT IMPLEMENTED / NOT ENABLED` |
| "How is VIP bought in the legacy system?" | `CASH_VIP_INTEGRATION_MAP.md` Parts 1-3 — two distinct paths (web donation packages vs. in-game `/buyvip`), kept separate |
| "How is Buy Vip And Coin implemented?" | `CASH_VIP_INTEGRATION_MAP.md` Part 1, `XUeN6U74zME` section; machine: `node scripts/knowledge-query.mjs source XUeN6U74zME` (KI-044, CLAIM-111..117) |
| "Is /buyvip or CustomBuyVipAndCoin active on Blood Moon?" | **No — present but disabled/inert** in the preserved snapshots: CLAIM-101 (`CommandBuyVipSwitch = 0`, prices 0) and CLAIM-118 (every row commented out); `CASH_VIP_INTEGRATION_MAP.md` Part 3 |
| "Where does real money enter vs. get spent (legacy)?" | Entry: the DmN web donation flow — CLAIM-123, `LEGACY_SUPPLIER_INDEX.md`; spend: the in-game `/buyvip` / CustomBuyVipAndCoin — CLAIM-100..118. Never the same flow (`CASH_VIP_INTEGRATION_MAP.md` Part 2) |
| "Machine-index lookup for the Cash/VIP cluster" | `node scripts/knowledge-query.mjs query "buy_vip"` (also `vip`, `coin`, `wcoin`, `cash`, `cashshop`, `xshop`, `game_currency`, `custom_buy_vip`, `custom_buy_vip_and_coin` — separator-insensitive since Phase 18D) |
| "How do I change a GameServer setting?" | `PROCEDURE_INDEX.md` row "Configure a GameServer setting" → `KNOWLEDGE_NO_RUNBOOK` for most families (GAP-P18-07); the narrow Buy-Vip/Custom-config reload case is `RUNBOOK_READY` (see the next row of that table) |
| "Does GameServer need a restart for a CashShop config change?" | `KNOWLEDGE_GAPS.md` GAP-P18-07 — `UNKNOWN` for `CustomXShop.txt`/`CashShopProduct.txt` specifically; a *different*, related config family (`Data/Command`/`Data/Custom`) is `LIVE_RELOAD_CONFIRMED` — don't conflate the two, `PROCEDURE_INDEX.md`'s reload row states the boundary explicitly |
| "How do we publish a launcher update?" | `PROCEDURE_INDEX.md` — legacy documented in `ANALISE-LAUNCHER.md`; current system not re-verified this phase |
| "Where is the reset configuration?" | `context/ADR_INDEX.md` ADR-0025/ADR-0029 (`main`-tracked, `CANONICAL_DECISION`) — progression/reset control plane and current reset policy |
| "Where is Blood Coin represented?" | `context/domains/game-economy.md` + `context/BUSINESS_RULES.md`; dedicated phase doc `docs/phases/blood-coin-public-name-completion/phase-manifest.md` |
| "How does Marketplace escrow work?" | `docs/payment-and-escrow-flow.md`, `docs/marketplace-game-bridge.md` — real ledger/reservation code exists; GameBridge worker itself is a deliberate always-fail scaffold |
| "Is GameBridge active?" | ~~NO — `MU_BRIDGE_ENABLED=false` by default everywhere~~ **(Phase 20)** the question is ambiguous — "GameBridge" names seven things (`GAMEBRIDGE_DISAMBIGUATION.md`). `MARKETPLACE_DELIVERY_WORKER`: no (`MU_BRIDGE_ENABLED=false`). `GAME_COMMAND_TRANSPORT`: **yes for `CREATE_GAME_ACCOUNT` only** (deployed 2026-08-24; state not re-verified); GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE/PURGE not deployed and not runnable end to end from committed code |
| "What is Portal WC in game terms?" / "Cash vs WCoinC?" / "Is Blood Coin WC?" | `CURRENCY_TERMINOLOGY.md` — Cash↔WCoinC CONFIRMED, Gold↔WCoinP and PcPoint↔GoblinPoint STRONGLY_SUPPORTED; Portal WC target **UNRESOLVED**; Blood Coin = `GOBLIN_POINT`, not WC |
| "Can the command channel credit game currency? Which option?" | `GAME_CURRENCY_DELIVERY_ANALYSIS.md` — not safe as-is; conditional recommendation Option B with nine prerequisites; **not a decision** |
| "Where are vendor tutorials?" | `VPS_DOCUMENTATION_INDEX.md` → `D:\MU\Research\Vendor\Tutorials\` (48 files, hash-verified) |
| "Which videos are not processed?" | `VIDEO_SOURCES.md` + `KNOWLEDGE_GAPS.md` GAP-P18-01c |
| "How did the legacy Cash purchase work?" | `LEGACY_SUPPLIER_INDEX.md` — this audit's central finding |
| "How do I restore the portal DB?" | `PROCEDURE_INDEX.md` → `bloodmoon-deploy` skill, `RUNBOOK_READY` |
| "Where is a specific vendor tutorial?" | `VPS_DOCUMENTATION_INDEX.md` → `D:\MU\Research\Vendor\Tutorials\` |
| "Where are production security procedures?" | `PROCEDURE_INDEX.md` row "Rotate a production credential" → `docs/security/secret-rotation.md`/`secret-incident-history.md` |
| "How do I find a source's authority/version?" | `docs/knowledge/source-authority.md` — the 10-level scale, applied consistently across this whole system |

Formal 20-scenario lookup test run 2026-09-18 (Phase 18C Part 14):
20/20 scenarios resolved with a real answer; 6 `DIRECT_SUCCESS` (question
already in this table verbatim before this phase), 13 `ONE_EXTRA_HOP`
(answer existed but wasn't yet in this table — 8 of those were added to
this table during this same pass, the rest route cleanly through
`PROCEDURE_INDEX.md`/`SOURCE_REGISTRY.md`), 1 `AMBIGUOUS`-then-fixed (the
GameServer restart question — a naive agent could wrongly generalize the
Buy-Vip reload finding to X-Shop/CashShop.txt; both the gap register and
the procedure row now state the boundary explicitly). 0 `MANUAL_SEARCH`,
0 `WRONG_SOURCE`. Full per-scenario table not duplicated here — see this
phase's final report.

## Legacy & vendor knowledge (this audit's focus)

- **Vendor**: ProjectGamers engine + "Free MU CMS"/"DmN MuCMS" web package.
  See `LEGACY_SUPPLIER_INDEX.md`.
- **Currency vocabulary and mapping (Phase 20)**: `CURRENCY_TERMINOLOGY.md`.
- **What "GameBridge" means (Phase 20)**: `GAMEBRIDGE_DISAMBIGUATION.md`.
- **Game-currency delivery analysis (Phase 20)**: `GAME_CURRENCY_DELIVERY_ANALYSIS.md`.
- **VPS documentation**: `VPS_DOCUMENTATION_INDEX.md`.
- **Video/tutorial sources**: `VIDEO_SOURCES.md`.
- **External websites**: `EXTERNAL_SOURCES.md`.
- **Topic maturity**: `TOPIC_COVERAGE.md`.
- **Known gaps**: `KNOWLEDGE_GAPS.md`.
- **Known conflicts/near-conflicts**: `CONFLICTS.md`.
- **Operational procedures**: `PROCEDURE_INDEX.md`.
- **Full source inventory**: `SOURCE_REGISTRY.md`.

## Machine layer and its guardrails (Phase 18D)

The prose docs and `knowledge/vendor-sweep/*.json` are two layers of the same
knowledge and can drift apart. Guardrails that now exist:
`node docs/knowledge/validate.mjs` (docs ↔ machine consistency: duplicate
source ids, claims citing a missing source, unknown topics, duplicate claims,
broken transcript paths, registered videos without a machine artifact, prose
citing a claim that does not exist — each proven to fire by injecting the
defect), `node scripts/knowledge-validate.mjs` (schema/graph integrity) and
`node scripts/knowledge-tools-test.mjs` (21 checks incl. the Cash/VIP lookup
regression and an "evidence ceiling" check that no vendor-video-only claim can
be `BLOODMOON_CONFIRMED`). After editing any claim, re-run the three
generators (`knowledge-transcript-inventory`, `knowledge-canonical-facts
--write`, `knowledge-provenance-report --write`) — never hand-edit their outputs.

## Existing methodology (not re-created, already mature)

- `docs/knowledge/knowledge-sweep.md` — the RAW→NORMALIZED→DERIVED→PRODUCT_USE
  discipline and the sweep process itself.
- `docs/knowledge/source-authority.md` — the 10-level authority scale +
  Blood-Moon-relevance axis.
- `docs/knowledge/conflict-resolution.md` — never-silently-pick-a-winner rule.
- `docs/knowledge/raw-capture.md` — RAW preservation rules, secrets handling.
- `docs/knowledge/vps-ingestion.md` — the VPS read-only boundary + tooling.
- `docs/knowledge/wiki-preparation.md` — DERIVED-to-Wiki-candidate discipline.

This audit extends these with real 2026-09-18 data and the legacy Cash-flow
finding; it does not replace or restate them.

## Future RAG/search assessment (Phase 18B §39)

Current structured files (Hub + `knowledge/vendor-sweep/*.json` + this
index) are sufficient for the lookup patterns tested this phase — every
question resolved in 1-3 hops via file-path/topic routing, not free-text
search. A full-text or vector index is not recommended yet: the corpus is
still small enough (64 Hub items, 44 vendor-sweep sources / 138 claims, ~30 docs/economy
+ ADR files) for structured routing to outperform search infrastructure
overhead. Revisit if/when the corpus grows past what a router table can
reasonably enumerate, or if the 3 untranscribed videos (and any future
sweep) push the vendor-sweep corpus significantly larger.

## Practical "full utilization" status (Phase 18B §35 definition)

| Criterion | Status |
|---|---|
| All known sources inventoried | YES — Hub (64/7), vendor-sweep (41), raw archives, repo docs |
| High-value sources preserved | YES — legacy web backup, VPS tutorials, launcher source, all hash-verified |
| Searchable derivatives available | PARTIAL — `knowledge-query.mjs` covers the vendor sweep; repo docs are grep/read-searchable but not full-text indexed |
| Source authority known | YES — existing scale applied consistently |
| Topic mapping available | YES — `TOPIC_COVERAGE.md` |
| Critical conflicts explicit | YES — none found this phase beyond 2 near-conflicts, both resolved with reasoning |
| Common operations runbooked | MOSTLY — 8/13 `RUNBOOK_READY`, gaps are all in the legacy/dormant-system area, expected |
| Gaps visible | YES — `KNOWLEDGE_GAPS.md`, 10 entries, none hidden |
