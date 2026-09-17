---
status: COMPLETE
category: sessions
lastVerified: 2026-08-31
---

# Session record: Phase L closure + Phase M knowledge consolidation

```
SESSION_ID:       2026-08-31-phase-l-closure-and-phase-m-knowledge
DATE:             2026-08-31
AGENT:            Claude (Sonnet 5), Claude Code CLI
TASK:             (1) Complete Phase L Decision Closure's remaining
                   correctness work: SQL-side GameBridge audit table,
                   VIP native drift detection, permanent VIP-survives-
                   login-check regression tests. (2) Provider-web legacy
                   panel second-pass investigation. (3) Fix a real
                   vip-sync e2e test-fixture collision bug (flagged by an
                   earlier turn, fixed on user request). (4) Phase M:
                   backfill ADRs for ~21 named major decisions, establish
                   a session-record standard, document the Knowledge Hub
                   boundary, strengthen mandatory-lookup agent rules,
                   audit current-vs-history structure, establish a
                   freshness standard, produce a full 23-module map,
                   document commercial-modularity and settings-
                   architecture directions, define a documentation book
                   structure and footnote standard, build a machine-
                   readable doc index + open-risks/open-questions/test-
                   evidence indexes, and produce cleanup recommendations.
START_STATE:      Continuing from a prior context window (compacted) —
                   Phase L Decision Closure's four formal decisions
                   already made (VIP source of truth = Portal, SQL-side
                   audit approved, PixPayments preserve-dormant, hostbr-
                   web confirmed NOT_DEPLOYED). SQL audit table designed
                   but not yet installed/tested. Provider-web second-pass
                   agent already dispatched and returned findings.
                   ADR-0001/0002/0003 already existed from this same
                   session's earlier work.
DOCS_CONSULTED:    docs/README.md, docs/vip/wz-setaccountlevel-coexistence.md,
                   docs/environment/sql-server-test-environment.md,
                   docs/gameserver/database/legacy-unknown-structures.md,
                   docs/payments/payment-surfaces-comparison.md,
                   docs/decisions/ (0001-0003, pre-existing), and — via
                   three parallel background research agents this
                   session — docs/economy/, docs/vip/, docs/accounts/,
                   docs/privacy/, docs/security/, apps/api/src/modules/*,
                   apps/web/data/security.ts, apps/launcher/.
DECISIONS_USED:    ADR-0001 (VIP source of truth) and ADR-0002 (GameBridge
                   least privilege) directly governed the SQL audit
                   table's design constraints (no new grants, ownership
                   chaining, atomic audit-insert-with-mutation).
FILES_INSPECTED:   references/game-data/sql-discovery/gamebridge-extension-20260830/derived/*.sql,
                   apps/game-bridge-agent/**/*.cs (writer interface,
                   processor, all three test files),
                   apps/api/src/modules/vip-sync/vip-sync.service.ts,
                   apps/api/prisma/schema.prisma, plus ~100+ files read
                   by the three background research agents (economy/VIP
                   facts, accounts/beta/privacy facts, module boundaries)
                   — see each agent's own citations in the resulting
                   ADRs/module-map.md for the full list.
WORK_DONE:         Installed dbo.bm_GameBridgeAudit + reinstalled all
                   four bm_* procedures into both local SQL Server
                   databases; found and fixed two real bugs during
                   install (a QUOTED_IDENTIFIER procedure-creation gotcha,
                   and a post-commit audit-insert atomicity race — moved
                   every completion-audit INSERT to before COMMIT);
                   threaded CommandId/CorrelationId end-to-end through
                   the C# Agent; added two permanent regression tests
                   proving VIP survives/expires correctly against the
                   real native WZ_GetAccountLevel procedure; implemented
                   VIP native drift detection in vip-sync.service.ts
                   (new VipSyncState.driftCount/lastDriftAt fields,
                   migrated); wrote the full docs/legacy/provider-web/
                   10-file tree from the second-pass agent's findings;
                   fixed a real username-truncation collision bug in
                   vip-sync.e2e-spec.ts; wrote ADR-0004 through ADR-0017
                   (14 new ADRs) grounded in three background agents'
                   real, cited research; wrote docs/sessions/,
                   docs/knowledge/knowledge-hub-boundary.md,
                   docs/knowledge/module-map.md (23 modules, real code
                   citations), docs/knowledge/commercial-modularity.md,
                   docs/knowledge/settings-architecture-direction.md,
                   docs/knowledge/documentation-book-structure.md,
                   docs/knowledge/current-vs-history-audit.md,
                   docs/knowledge/cleanup-recommendations.md,
                   docs/protocols/agent-bootstrap.md (created earlier
                   this session, extended this pass with scoped-reading
                   guidance), docs/protocols/footnote-standard.md,
                   docs/protocols/freshness-standard.md, docs/index.json,
                   docs/open-risks.md, docs/open-questions.md,
                   docs/test-evidence-index.md, root CLAUDE.md (created
                   earlier this session).
TESTS:             125/125 (game-bridge-agent, unit + both real SQL
                   Server environments); 2/2 (new permanent VIP
                   coexistence regression tests, real native procedure);
                   7/7 (vip-sync e2e, twice consecutively after the
                   fixture fix, proving the collision is gone); 0 new
                   TypeScript errors (apps/api).
DISCOVERIES:       A real code-vs-doc pricing contradiction (WC's
                   documented 1:1 R$ peg vs. the actual non-1:1 recharge
                   price table — ADR-0008); a decided-but-never-built
                   20 WC transfer minimum (ADR-0011); an RMT policy
                   referenced by name in two meta-docs but genuinely not
                   locatable anywhere (ADR-0016, documented as a gap, not
                   invented); Bug Hunter reward tiers that are test-
                   fixture placeholders, not ratified policy (ADR-0015);
                   four backend permission keys missing from the Portal's
                   own client-side permission catalog (OQ-012); a stale
                   claim in docs/launcher/cache-and-fallback.md
                   ("not yet wired into MainWindow") that was actually
                   already fixed by a newer doc — corrected in place; two
                   source documents cited by name elsewhere in this repo
                   that don't actually exist in the current tree
                   (docs/product/ECONOMY_PRODUCT_DECISIONS.md, a "Phase
                   12" CashShop source); a second, complementary (not
                   duplicate) legacy-web investigation tree already
                   existed (docs/game-data/legacy-web-intelligence/) —
                   cross-linked rather than merged.
BUGS_FOUND:        SQL: the QUOTED_IDENTIFIER install failure and the
                   post-commit audit-insert race (both fixed, see WORK_DONE).
                   TypeScript: the vip-sync.e2e-spec.ts username-
                   truncation collision (fixed, verified via two
                   consecutive clean runs).
DOCS_UPDATED:      docs/vip/wz-setaccountlevel-coexistence.md,
                   docs/gameserver/database/legacy-unknown-structures.md,
                   docs/payments/payment-surfaces-comparison.md,
                   docs/README.md (multiple passes), docs/launcher/cache-and-fallback.md
                   (stale-claim correction), plus every new file listed
                   in WORK_DONE.
RISKS:             See docs/open-risks.md — OR-007 (WC pricing
                   discrepancy) and OR-008 (retention-duration legal gap)
                   are the two most consequential currently open.
OPEN_QUESTIONS:    See docs/open-questions.md — 15 entries, most
                   originating from this session's research (OQ-001
                   through OQ-015).
NEXT_STEP:         Part 20 (final bootstrap validation simulation) and
                   the Phase M FINAL_REPORT remain to close out this
                   session's own request. Longer-term: resolve the
                   HIGH-severity open questions (financial/tombstone
                   retention duration, OQ-006/OQ-007) via real legal
                   review; complete the X-Shop item-level review
                   (OQ-003); confirm or correct the WC pricing
                   discrepancy (OQ-001).
BRANCH:            open-beta/p0-foundation (git worktree)
COMMIT:            none (uncommitted) — per this project's standing rule,
                   only commit when the user explicitly asks
HANDOFF:           Phase L's correctness work is genuinely done and
                   tested (125/125 + 2 permanent regression tests + 7/7,
                   all real, against real SQL Server / real MySQL).
                   Phase M's knowledge-organization foundation is
                   substantially built: 17 ADRs, a module map, a session-
                   record standard, a Knowledge Hub boundary doc, a
                   machine-readable index (honestly scoped to 43/205
                   documents), and centralized risk/question/test-
                   evidence indexes. Nothing here was fabricated —
                   several ADRs and index entries explicitly document
                   gaps (RMT policy content, Bug Hunter reward table,
                   20 WC minimum) rather than inventing content to fill
                   them. A future session picking this up should start
                   at docs/README.md and docs/protocols/agent-bootstrap.md
                   like any other session — this session's own work is
                   already wired into that same entry point, not a
                   separate silo.
```
