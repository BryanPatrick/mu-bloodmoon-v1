---
status: COMPLETE
category: sessions
lastVerified: 2026-08-31
---

# Session record: Phase N — policy reconciliation + commerce readiness

```
SESSION_ID:       2026-08-31-phase-n-policy-reconciliation
DATE:             2026-08-31
AGENT:            Claude (Sonnet 5), Claude Code CLI
TASK:             Reconcile three real policy/documentation discrepancies
                   Phase M found (WCoin 1:1 peg vs. real recharge pricing,
                   RMT policy gap, Bug Hunter reward policy gap) using
                   Bryan's explicit product decisions, before the
                   Payment implementation phase begins. Investigate the
                   real commerce.service.ts price table fully before
                   changing anything. Confirm X-Shop stays pending and
                   financial retention stays LEGAL_REVIEW_REQUIRED
                   without blocking Payment architecture design. Produce
                   the payment readiness contract for the next phase.
START_STATE:      Phase M complete: 17 ADRs, module map, open-questions/
                   open-risks/test-evidence indexes, docs/index.json all
                   established. OQ-001 (WC pricing discrepancy), OQ-004
                   (Bug Hunter placeholder values), OQ-005 (RMT policy
                   content not found) all open. ADR-0016 explicitly
                   recorded "content not located, do not invent."
DOCS_CONSULTED:    docs/decisions/0008-wcoin-1to1-peg-with-brl.md,
                   0015-bug-hunters-reward-model.md,
                   0016-rmt-policy-gap.md, 0007-data-retention-current-stance.md,
                   0013-xshop-review-methodology.md, docs/open-questions.md,
                   docs/open-risks.md, docs/vip/vip-benefit-decisions.md.
DECISIONS_USED:    ADR-0008/0009 governed the WC-vs-GP/HP scoping
                   decision (fix WC only, leave GP/HP untouched).
                   ADR-0005 governed the Bug Hunter Beta-delivery
                   mechanism (reuse BetaRewardEntitlement, don't build a
                   parallel one). ADR-0006 informed the account-sale
                   safeguard list (recovery/2FA/chargeback/etc. mirror
                   account-deletion's own concerns).
FILES_INSPECTED:   apps/api/src/modules/commerce/commerce.service.ts
                   (read in full — seed data, ensureSeeded(), the real
                   webhook-confirmed crediting path at line ~1142),
                   apps/api/prisma/schema.prisma (RechargePackage/
                   RechargeIntent), apps/web/data/management.ts,
                   apps/web/pages/recarga.vue, apps/api/test/recharge-payments.e2e-spec.ts,
                   docs/vip/vip-benefit-decisions.md.
WORK_DONE:         Full investigation of commerce.service.ts's
                   RechargePackage price table before any change
                   (confirmed real/live/production-relevant, not test
                   data; confirmed the conflict is real — R$19,90
                   credited 500 WC). Added wcoinBaseForBrl() (exported,
                   pure) encoding the 1:1 rule explicitly. Corrected the
                   WCOIN seed packages to real 1:1 pricing (R$10/20/50/100
                   -> 10/20/50/100 WC), with exactly one authorized
                   promotion (R$50 -> +5 WC bonus). Left GOBLIN_POINT/
                   HUNT_POINT packages untouched (out of scope). Mirrored
                   the fix in apps/web/data/management.ts. Added
                   apps/api/test/wcoin-pricing.e2e-spec.ts (15 tests).
                   Updated ADR-0008/0015/0016/0007/0013 in place,
                   preserving original text visibly per this project's
                   history rule. Wrote docs/payments/payment-readiness-contract.md.
                   Reconciled docs/open-questions.md (closed OQ-001,
                   OQ-004, OQ-005; added OQ-016/017/018), docs/open-risks.md
                   (resolved OR-007, added OR-009), docs/index.json,
                   docs/README.md.
TESTS:             15/15 (new apps/api/test/wcoin-pricing.e2e-spec.ts —
                   pure conversion function + real seed-data-constant
                   checks, deliberately DB-free after a real test-
                   isolation problem was found and fixed mid-session);
                   16/16 (existing apps/api/test/recharge-payments.e2e-spec.ts,
                   confirmed no regression); 0 new TypeScript errors.
DISCOVERIES:       A real, direct conflict confirmed by reading the
                   actual webhook-confirmed crediting code (not
                   inferred): R$19,90 credited 500 WC via
                   walletLedger.credit(recharge.amount + recharge.bonus, ...).
                   A real test-isolation bug found while writing the new
                   test: bloodmoon_local_claude had 10 leftover
                   RechargePackage rows from unrelated prior test runs
                   (some from 2026-08-27/30), meaning ensureSeeded()'s
                   lazy-seed-if-empty check silently no-ops against a
                   polluted shared dev database — worked around by
                   testing the exported seed-data constant directly
                   instead of the DB-insertion mechanism, avoiding a
                   real FK-constraint deletion hazard (leftover rows had
                   real RechargeIntent references). A pre-existing
                   parseBrlPrice quirk confirmed (not a bug): it treats
                   "." as a thousands separator it strips, so a
                   dot-decimal string like "50.00" parses as 5000, not
                   50 -- documented in the new test rather than "fixed"
                   (RechargePackage.price is always stored in Brazilian
                   comma-decimal format elsewhere in the codebase; a
                   leftover "10.00" test row is what surfaced this).
BUGS_FOUND:        The WC pricing conflict itself (fixed, see WORK_DONE).
                   The bloodmoon_local_claude leftover-row test-isolation
                   issue (worked around in the new test's design, not
                   independently fixed at the DB level -- out of this
                   phase's scope; the leftover rows themselves were left
                   untouched since some have real FK references).
DOCS_UPDATED:      docs/decisions/0007, 0008, 0013, 0015, 0016;
                   docs/payments/payment-readiness-contract.md (new);
                   docs/open-questions.md, docs/open-risks.md,
                   docs/index.json, docs/README.md.
RISKS:             OR-009 (new) -- production's real RechargePackage
                   table was never read; whether it already holds the
                   old non-1:1 values, and whether any real player
                   already purchased under them, is unknown and must be
                   checked before this local fix is ever deployed.
OPEN_QUESTIONS:    OQ-002 (20 WC minimum, still unimplemented), OQ-003
                   (X-Shop review, still pending), OQ-006/007 (retention
                   durations, still LEGAL_REVIEW_REQUIRED), OQ-016 (bug
                   report system unbuilt), OQ-017 (account-sale
                   safeguards undesigned), OQ-018 (production
                   RechargePackage state unknown).
NEXT_STEP:         The Payment implementation phase itself, using
                   docs/payments/payment-readiness-contract.md as its
                   input contract. Before deploying this phase's local
                   fix: a real, read-only check of production's
                   RechargePackage table (OQ-018/OR-009).
BRANCH:            open-beta/p0-foundation (git worktree)
COMMIT:            none (uncommitted) — per this project's standing rule,
                   only commit when the user explicitly asks
HANDOFF:           Three real policy gaps are closed with Bryan's actual
                   decisions, not invented content. One real code bug
                   (the WC pricing conflict) is fixed and tested locally,
                   never deployed. The Payment implementation phase can
                   now begin using docs/payments/payment-readiness-contract.md
                   as its starting contract -- it should NOT re-litigate
                   the WC peg, RMT policy, or Bug Hunter reward table,
                   all of which are now settled. It SHOULD still treat
                   X-Shop, financial/security retention durations, and
                   account-sale safeguards as genuinely open, and should
                   arrange a real production read (OQ-018) before this
                   phase's local pricing fix is ever deployed.
```
