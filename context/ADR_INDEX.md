---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-25
---

# ADR index — every known Blood Moon ADR, committed or preserved

Extends [`DECISIONS.md`](DECISIONS.md)'s committed-ADR table with the
21 ADRs (`0001-0018`, `0020`, `0022`, `0027`) found only in
`preservation/openbeta-untracked/docs/decisions/` (on `docs/agent-automation-architecture`, not on `main`)
(real content, read in full this phase — see
`preservation/OPENBETA_UNTRACKED_MANIFEST.md` (on `docs/agent-automation-architecture`, not on `main`)).
**No ADR number is ever reused or reassigned** — this index is purely
additive. Lower number does not mean older-and-invalid; several
low-numbered ADRs (e.g. 0001, 0009, 0012) remain fully current.

**Phase 12 authority correction:** the 21 preserved-only ADR files are
reference material, not committed canonical files on `main`. Their
decision content may be a `CURRENT_CANDIDATE` after individual review,
but their current *source authority* is `HISTORICAL_SOURCE` until
explicit promotion. Earlier table entries labeling all 21
`CANONICAL_DECISION` conflated a real dated decision with its archived
copy's integration status; the Authority column below is corrected.
The nine `main`-tracked ADRs remain `CANONICAL_DECISION`.

| ADR | Title | Source | Status (own frontmatter) | Domain | Current? | Supersedes | Superseded by | Authority |
|---|---|---|---|---|---|---|---|---|
| 0001 | Portal is the VIP source of truth, not the GameServer | preserved only | ACTIVE | vip | YES — no contradicting evidence found | — | — | HISTORICAL_SOURCE |
| 0002 | GameBridge least privilege + SQL-side append-only audit | preserved only | ACTIVE | game-economy / security | YES | — | — | HISTORICAL_SOURCE |
| 0003 | `PixPayments` preserved but never integrated | preserved only | ACTIVE | payments | YES | — | — | HISTORICAL_SOURCE |
| 0004 | Open Beta account lifecycle | preserved only | ACTIVE | (no matching domain — accounts) | YES | — | — | HISTORICAL_SOURCE |
| 0005 | Beta reward entitlement survives deletion via hashed email | preserved only | ACTIVE | (accounts) | YES | — | — | HISTORICAL_SOURCE |
| 0006 | Account deletion: anonymize vs. purge | preserved only | ACTIVE | (accounts/security) | YES | — | — | HISTORICAL_SOURCE |
| 0007 | Data retention — structural preservation now, duration later | preserved only | ACTIVE (durations `LEGAL_REVIEW_REQUIRED`) | (security/privacy) | PARTIAL — durations still unconfirmed per `open-questions.md` OQ-006/007 | — | — | HISTORICAL_SOURCE |
| 0008 | WCoin 1:1 peg with R$ | preserved only | ACTIVE, discrepancy resolved 2026-08-31 | payments / game-economy | YES | — | — | HISTORICAL_SOURCE |
| 0009 | WC 10% / GP+HP 5% transaction tax | preserved only | ACTIVE | game-economy | YES | — | — | HISTORICAL_SOURCE |
| 0010 | Bronze/Silver/Gold are Portal concepts, AL1-3 is GameServer-internal | preserved only | ACTIVE | vip | YES | — | — | HISTORICAL_SOURCE |
| 0011 | Direct WC transfer minimum = 20 WC | preserved only | `DECIDED_BUT_NOT_IMPLEMENTED` (2026-08-31) | payments | **Implemented since** — `docs/README.md`'s Phase Q narrative (tracked on `main`) describes a real, live-tested `/painel/transferencias` built exactly to this policy | — | closed by 0022 (implementation) | HISTORICAL_SOURCE |
| 0012 | CashShop: no standard/combat gear, cosmetics/QoL only | preserved only | ACTIVE | game-economy | YES | — | — | HISTORICAL_SOURCE |
| 0013 | X-Shop review methodology decided; item review pending | preserved only | `METHODOLOGY_DECIDED` (2026-08-31) | game-economy | **Item review since completed** — ADR-0023 (tracked on `main`) closes the item-level review this ADR left open | — | 0023 (item-level closure) | HISTORICAL_SOURCE |
| 0014 | Launcher CMS/asset fallback — client-side degradation chain | preserved only | ACTIVE | launcher | YES | — | — | HISTORICAL_SOURCE |
| 0015 | Bug Hunters reward model | preserved only | ACTIVE (2026-08-31) | (product/security — no matching domain) | YES | — | — | HISTORICAL_SOURCE |
| 0016 | **RMT policy** — no official marketplace, player RMT allowed unmediated | preserved only | ACTIVE (2026-08-31) | (economy/legal — no matching domain) | YES | — | — | HISTORICAL_SOURCE — **resolves Phase 10's OQ-CTX-003 as decision content; file remains unintegrated** |
| 0017 | Preserve modular component boundaries for future commercial modularity | preserved only | `ARCHITECTURAL_DIRECTION` | (product) | Still direction-only, not implemented | — | — | HISTORICAL_SOURCE |
| 0018 | Payment architecture Phase O — real gaps closed | preserved only | ACTIVE, tested locally | payments | Superseded-by-extension — 0019 covers Phase P's further closure | — | 0019 (partial) | HISTORICAL_SOURCE |
| 0019 | Payment operational closure Phase P | **both** (main + preserved original) | ACTIVE, tested locally; `main`'s copy adds a 2026-09-09 deploy-status freshness note (`DEPLOYED_CONFIRMED`) | payments | YES | 0018 (partial) | — | CANONICAL_DECISION |
| 0020 | WCOIN integer BRL pricing — final policy | preserved only | ACTIVE, final | payments | YES | — | — | HISTORICAL_SOURCE |
| 0021 | Payment/transfer restriction, direct WC transfer, VIP purchase UX | **both** (main + preserved original) | ACTIVE, tested locally; `main`'s copy adds a 2026-09-09 deploy-status freshness note | payments | YES | — | — | CANONICAL_DECISION |
| 0022 | Phase Q Decision Closure — market restriction audit, WC transfer UI, VIP policy | preserved only | ACTIVE, live-verified in browser, not deployed | payments / vip | YES | 0011 (implementation) | — | HISTORICAL_SOURCE |
| 0023 | Store catalog decision closure | main | ACTIVE | game-economy | YES | 0013 (item-review closure) | — | CANONICAL_DECISION |
| 0024 | Legacy shop control plane | **both** (main + preserved original) | ACTIVE; `main`'s copy adds a 2026-09-09 canonicalization note (`INTEGRATED` into `integration/open-beta`, still `NOT_DEPLOYED_CONFIRMED`) | game-economy | YES | — | — | CANONICAL_DECISION |
| 0025 | Progression control plane | main | ACTIVE | game-economy | PARTIALLY SUPERSEDED by 0029 | — | 0029 (parts) | CANONICAL_DECISION |
| 0026 | Progression evidence and balance readiness | main | ACTIVE | game-economy | PARTIALLY SUPERSEDED by 0029 | — | 0029 (parts) | CANONICAL_DECISION |
| 0027 | OR-023 forensics + balance input closure | preserved only | ACTIVE, forensics complete, remediation NOT decided | game-economy | Forensics current; remediation still `OPEN` per `open-risks.md` OR-023 | — | — | HISTORICAL_SOURCE |
| 0028 | XP stack and progression calculator | main | ACTIVE | game-economy | PARTIALLY SUPERSEDED by 0029 | — | 0029 (parts) | CANONICAL_DECISION |
| 0029 | Progression reset policy — current ruling | main | ACTIVE | game-economy | YES — supersedes parts of 0025/0026/0028 | 0025/0026/0028 (parts) | — | CANONICAL_DECISION |
| 0030 | Migration table-casing static audit + immutability governance | main | ACTIVE | infrastructure | YES | — | — | CANONICAL_DECISION |
| 0031 | Initial multi-agent automation model (Claude + internal specialist, Codex deferred) | GitHub `main` | ACTIVE (with clarification addendum) | bloodmoon-ai / orchestration | YES — scope clarified by 0033 | — | 0033 (scope clarification, not supersession) | CANONICAL_DECISION |
| 0032 | Agent automation architecture direction (Option A) | GitHub `main` | ACTIVE | bloodmoon-ai / orchestration | YES | — | — | CANONICAL_DECISION |
| 0033 | Blood Moon AI product scope and evolution model | GitHub `main` | ACTIVE | bloodmoon-ai | YES — Stage 1 COMPLETE, Stage 2 ACTIVE (2026-09-25; authorization recorded as `DEC-BLOODMOON-AI-001` + ADR addendum, 2026-09-26) | — | — | CANONICAL_DECISION |
| 0034 | `main` is the definitive canonical source of truth | GitHub `main` | ACTIVE | governance | YES | — | — | CANONICAL_DECISION |

**Source column note (2026-09-25)**: rows 0001-0030 were written when
"`main`" meant the former local `D:\MU` `main` (now
`preservation/main-snapshot-b5a4321d`); none of those files is on
GitHub `main` yet. Rows 0031-0034 are on GitHub `main`. See
[`MAIN_INTEGRATION.md`](MAIN_INTEGRATION.md).

## What changed this phase vs. Phase 10's `DECISIONS.md`

Phase 10 only had the 9 `main`-tracked ADRs. This phase adds the 21
preserved-only ones (read in full) plus real supersession/currency
detail for several — most notably: **0016 (RMT policy) directly
resolves Phase 10's `OQ-CTX-003`**; 0011 and 0013 are now marked
implemented/closed based on real evidence already in `docs/README.md`'s
`main`-tracked narrative, not invented; 0018's relationship to 0019 is
now explicit.

## Domain gaps this exercise reconfirms

Several ADRs (0004-0006, 0015-0017) map to domains this Context Pack's
12 `domains/*.md` stubs don't cover (accounts, product-direction,
security) — the same gap Phase 10's Hub-decision mapping already
found (see `OPEN_QUESTIONS.md` OQ-CTX-007). Not resolved here either —
still a real decision for Bryan on whether to add domain stubs.
