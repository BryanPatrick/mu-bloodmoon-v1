---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Codex independent Context Pack review — Phase 12

Scope: branch `phase-9/context-pack-v1-foundation`, base
`63e9a7a7b251c1e2d4d4a91e96bc4c1115c21009`. This is a content
audit, not approval of production readiness or a merge. The first pass
used only `AGENTS.md`, `context/`, the independent-review instructions,
and branch metadata. Specific claims were then checked against the
named ADRs, the Asaas Phase 5 branch, and targeted repository evidence.

## Twenty-question context sufficiency test (before deep repo lookup)

`External?` means the pack was insufficient to settle the answer
confidently *from context alone*, not that a lookup had already happened.

| # | Answer available from the Context Pack | Confidence | Context source | External? |
|---|---|---|---|---|
| 1 | Same active VIP tier extends; different tier waits for expiry. | MEDIUM | `domains/vip.md`, `ADR_INDEX.md` | NO |
| 2 | Asaas is not production-enabled. | HIGH | `domains/payments.md` | NO |
| 3 | Staging is `ai-knowledge-hub-staging`; orchestration was disabled when idle. | HIGH as dated snapshot | `INFRASTRUCTURE.md`, `domains/knowledge-hub.md` | NO |
| 4 | n8n is not installed; it is design-only. | HIGH | `domains/n8n.md` | NO |
| 5 | Hub holds durable task truth; n8n is a proposed integration/scheduling layer, not orchestrator core. | HIGH | `domains/n8n.md`, `GOVERNANCE.md` | NO |
| 6 | Real lifecycle was proven in staging by the Claude Phase 9 pilot. | HIGH | `domains/orchestration.md` | NO |
| 7 | Blood Moon AI is planned, not implemented. | HIGH | `domains/bloodmoon-ai.md` | NO |
| 8 | The Hub owns live task/claim/approval state. | HIGH | `GOVERNANCE.md` | NO |
| 9 | Preserved ADR-0016 allows unmediated player RMT; the old `BUSINESS_RULES.md` simultaneously called it unknown. | LOW before lookup | `ADR_INDEX.md` vs. old `BUSINESS_RULES.md` | YES |
| 10 | ADR-0025/0026/0028 are only partly superseded by 0029. | HIGH | `SUPERSEDED_DECISIONS.md` | NO |
| 11 | Four full manuals are preserved but absent from `main`. | HIGH as branch fact | `OPEN_QUESTIONS.md` OQ-CTX-008 | NO |
| 12 | Old SITE_BETA_BLOCKED/NO-GO is unresolved. The pack originally overstated that password recovery was disproven; later source lookup shows code exists but deployed email/reset QA remains open. | LOW before lookup | `REPOSITORY_KNOWLEDGE_MAP.md` §6 | YES |
| 13 | No *real Codex* staging pilot had run at the pack's snapshot date. | HIGH as dated snapshot | `DEFERRED.md` | NO |
| 14 | Repo wins for current technical documentation; Hub wins for operational state/history. | HIGH | `GOVERNANCE.md` | NO |
| 15 | No ChatGPT history was imported. | HIGH | `RAW_HISTORY_AND_INGESTION.md` | NO |
| 16 | WC recharge uses integer BRL and 1 WC = R$1; source-reading claims conflicted. | MEDIUM before lookup | `BUSINESS_RULES.md` vs. `ADR_INDEX.md` | YES |
| 17 | Openbeta originals were not committed to main; 125 files were copied for preservation. | HIGH as dated snapshot | `OPEN_QUESTIONS.md` OQ-CTX-005 | NO |
| 18 | `claude-code-real-staging` lacks approval grant/request, resource recovery and system admin. | HIGH | `domains/orchestration.md` | NO |
| 19 | OR-023 forensics finished; remediation remains unknown after the cited date. | HIGH about uncertainty | `domains/game-economy.md` | NO |
| 20 | A future chat export enters as `SOURCE`/`CHAT_TRANSCRIPT`, never direct authority. | HIGH | `RAW_HISTORY_AND_INGESTION.md` | NO |

Result before deeper lookup: 17 sound answers from context; 3 required
targeted source lookup (9, 12, 16); 1 was internally ambiguous (9);
1 was materially misleading from context (12). The initial Phase 12
pass counted 18/2/0, but the independent Hub text recheck below exposed
the error in question 12. This is not a quality score.

## Evidence-backed findings and corrections

1. **Incorrect policy, fixed.** `BUSINESS_RULES.md` and
   `domains/game-economy.md` said ADR-0029 approved a 20-reset cap for
   every tier. Its Decision 2 says the opposite: target cap
   `UNRESOLVED`, while observed effective settings are
   `{AL0:20, AL1:20, AL2:20, AL3:50}`. Both summaries now visibly
   preserve and correct the old claim.
2. **Stale Asaas status, fixed.** `CURRENT_STATE.md`,
   `domains/payments.md`, and `REPOSITORY_KNOWLEDGE_MAP.md` still awaited
   the MySQL/MariaDB rerun. Commit `066ad3be` on the separate Asaas
   Phase 5 branch documents 56/56 migrations and 48/48 DB tests per
   engine, plus 114/114 common unit tests. No real provider Sandbox
   contract was proven by that local result; the summaries now say so.
3. **Wrong source authority, fixed.** `ADR_INDEX.md` and the
   preservation manifest labeled all 21 archived-only ADR copies
   `CANONICAL_DECISION`, contradicting the pack's own rule that the
   125 preserved files are reference material. Their source authority
   is now `HISTORICAL_SOURCE`, with decision content eligible for
   individual review as `CURRENT_CANDIDATE`; none was promoted.
4. **Premature old NO-GO dismissal, fixed.** The Hub mapping's
   `Current? = NO` for `cf5f14c2`/`53034c0c` implied the entire old
   decision was stale. A fresh read of the Hub text shows that
   `fa8e9ad0` itself says email delivery was blocked then; the later
   SMTP handoff still requires deployed end-to-end QA. Only the literal
   claim of no recovery implementation is disproven. Both rows remain
   `UNRESOLVED` and the supporting summaries were corrected.
   The Hub's real rows were not mutated.
5. **Stale provenance/index text, fixed.** Phase 9 language in
   `BUSINESS_RULES.md`, `DEFERRED.md`, and several domain stubs still
   said preserved ADRs had not been read or Hub decisions still needed
   indexing. Phase 11 evidence says they were read; these summaries
   have been corrected without treating the archive as canonical.
6. **Missing navigation, bounded fix.** Added `community` (STUB),
   `security` (PARTIAL), and `testing` (PARTIAL), pointing only to
   verified code/docs. This does not revalidate six older Hub product
   decisions marked `NEEDS_REVIEW`.

## Independent spot checks and unresolved boundaries

- ADR chain: preserved 0011 records the 20-WC minimum as then
  not-yet-implemented; preserved 0022 records its later local
  implementation. Preserved 0013 decides a review method; tracked
  0023 closes the item-level catalog review. Tracked 0029 explicitly
  supersedes portions of 0025/0026/0028, including the cap ruling.
- Preserved sources sampled: `0016-rmt-policy-gap.md`
  (`CURRENT_CANDIDATE` decision content), `legacy/provider-web` entries
  (`HISTORICAL`), and `store` documents (`DRAFT_FOR_REVIEW`). Their
  archival status was respected. The validator independently checks
  all 125 preserved file hashes against the manifest.
- Hub mapping: the index covers 26 decisions, with the old NO-GO pair
  unresolved and six other Blood Moon decisions marked `NEEDS_REVIEW`.
  Phase 12 continuation independently re-read six targeted production
  D1 decision texts read-only: the two old NO-GO records, the later
  recovery record, and three Hub/orchestration authority records.
  All 26 rows still have Hub status `active`; none has a supersession
  link, and no title is payment-related. No row was changed. The
  targeted text recheck exposed the recovery overstatement above.
  A read-only staging
  D1 query found only synthetic `codex-staging`, no real Codex actor.
- Open questions/risks: preserved OQ-005/0016 was rechecked as resolved;
  preserved OQ-018-021 and OR-023 remain uncertain/current-state
  dependent. A past implementation claim is not taken as proof that a
  production-readiness risk is closed.
- Idea versus decision: n8n, Blood Moon AI, unified notifications,
  referral and marketing are not represented as implemented or
  approved. `bloodmoon-ai.md` attributes one proposal to a prior Bryan
  brief that is not in `SOURCE_INDEX.md`; a durable source record for
  that brief would improve traceability before any design promotion.
- File-versus-Hub authority is clear in `GOVERNANCE.md`; the 21 archived
  ADR labels were its material violation and are corrected above.

## Beta-readiness evidence required later (no GO/NO-GO decision here)

`BETA_NO_GO_CURRENT_EVIDENCE`: the historical decisions genuinely
recorded six/seven blockers on 2026-08-08. **Confirmed current
readiness gap:** the tracked SMTP handoff still requires a deployed
mailbox request/reset/session-revocation test. **Disproven literal
claim:** password-recovery code does not exist; tokens and endpoints
were implemented later. **Unknown current blocker status:** CAPTCHA
and rate limiting, payment-gateway/delivery availability, marketplace/
escrow/GameBridge homologation, 404 behavior, non-Community test
coverage, HTTPS/TLS, and recovery's actual deployed end-to-end result.
No current GO/NO-GO is inferred from the old rows.

Re-test the old six/seven cited blockers against current deployment:
password-recovery end-to-end (not yet proven by the cited handoff),
404/error handling, CAPTCHA plus rate limiting, payment-gateway
availability and payment flow, marketplace/escrow/GameBridge claims,
test coverage, and HTTPS/TLS. Capture deployed commit, environment,
test date and reproducible evidence for each; classify each as
confirmed, disproven or unknown. Then create a fresh dated decision
that explicitly supersedes the old Hub NO-GO if the evidence warrants
it. This review does not silently change the Hub decision status.

## Domain sufficiency after corrections

Original 12 domains: `SUFFICIENT` = knowledge-hub, orchestration;
`PARTIAL` = payments, game-economy, n8n, bloodmoon-ai, notifications;
`STUB` = marketplace, vip, launcher, referral, marketing;
`MISLEADING` = none *after* the concrete corrections above. New domains:
community = STUB, security = PARTIAL, testing = PARTIAL.

## Boundaries

The Context Pack is useful for bootstrap orientation, but should not
merge yet: the 21 archived ADRs need individual review/integration
under Bryan's existing no-wholesale-promotion decision; the beta
NO-GO needs fresh evidence rather than a guessed supersession; and a
real staging-Codex report/independent review lifecycle has not been
demonstrated by this repo-only work. The deployed staging Worker
returned `503 orchestration_disabled` to an unauthenticated, invalid
claim diagnostic; no staging write was made. No
Openbeta original, production Hub row, payment code, or GameServer
code was changed. No chat-history import occurred.

Validator: `node context/validate.mjs` = PASS (42 authored files,
0 issues; all 125 archived hashes verified). A separate
high-confidence secret-pattern scan found one lexical false positive
inside preserved ADR-0014 (ordinary text spanning `sk-`), no secret.
