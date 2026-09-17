---
status: ACTIVE — policy persisted from Bryan's explicit product decision (Phase N, 2026-08-31)
category: decisions
audience: internal (engineering + product + security)
lastVerified: 2026-08-31
---

# ADR-0015: Bug Hunters reward model — confirmed severity rewards, first-valid-report rule, Beta-safe delivery

**DATE OF THIS RECORD**: 2026-08-31 (Phase N) — the underlying reward-amount policy predates this record; Phase M found the exact same amounts already sitting as test-fixture data, unconfirmed as real policy. Phase N confirms they were real all along.
**STATUS**: ACTIVE, authoritative

## PHASE N RESOLUTION (authoritative policy, persisted 2026-08-31)

**A report is reward-eligible only after validation.** Reward goes to
the **first sufficiently valid / reproducible report** — not the first
vague mention. A report that merely gestures at a problem without enough
detail to confirm and reproduce it does not start the eligibility clock;
the first report that clears the reproducibility bar does.

**Severity rewards** (confirmed, matches the values Phase M found already
sitting as test-fixture data in `apps/api/test/beta-lifecycle.e2e-spec.ts`
— see "Historical note" below for why that convergence matters):

| Severity | Reward |
|---|---|
| LOW | 5 WC |
| MEDIUM | 15 WC |
| HIGH | 30 WC |
| CRITICAL | 40 WC |

**Beta reward behavior**: during Open Beta, a confirmed eligible Bug
Hunter reward is preserved **separately from the temporary Beta
account** — it must use the Beta reward entitlement/lifecycle system
(ADR-0005: hashed-email anchor, not a live account FK). Reward
eligibility survives Beta account deletion (ADR-0004) and is later
claimable under the same approved same-email policy as any other Beta
reward entitlement. This is not a new mechanism — it is the existing
`BetaRewardEntitlement` design (already real, see DECISION below),
confirmed as the correct and required delivery path for Bug Hunter
rewards specifically, not a parallel system.

**Bug report status lifecycle** — confirm/preserve these statuses:
`RECEIVED`, `UNDER_REVIEW`, `CONFIRMED`, `DUPLICATE`, `NOT_REPRODUCED`,
`FIXED`.

**Public transparency, scoped carefully**: safe metadata may be exposed
publicly — ticket ID, a generic title, category, the reporter's display
identity (where policy allows), the first-valid timestamp, status,
severity. **Exploit reproduction details must never be exposed publicly
before safe disclosure** — the boundary is the same "safe metadata only,
never the reproduction steps" split used in responsible-disclosure
programs generally, not a Blood-Moon-specific invention.

## Historical note — why the test-fixture convergence matters (preserved, not deleted)

Phase M (2026-08-31) found `BUG_HUNTER_LOW=5 WC` /
`BUG_HUNTER_MEDIUM=15 WC` / `BUG_HUNTER_HIGH=30 WC` /
`BUG_HUNTER_CRITICAL=40 WC` sitting as literal test-fixture values in
`apps/api/test/beta-lifecycle.e2e-spec.ts`, and correctly declined to
treat them as confirmed policy — "test fixture" is not the same
evidentiary weight as a product decision, even when the numbers turn out
to be right. Phase N's authoritative policy uses the **exact same four
values**. This is worth recording explicitly: the test fixture was
apparently written with the real intended amounts already in mind (by
whoever wrote it), but the repository had no way to know that without
Bryan's own confirmation — which is precisely why Phase M was right not
to promote a test fixture to policy on its own authority. The lesson
generalizes: a coincidentally-correct-looking value in test data is still
not a substitute for a persisted decision.

## DECISION (mechanism — unchanged from Phase M, still accurate)

**Real and working**: `BUG_HUNTER_REWARD` exists as a
`WalletTransactionType` enum value (`schema.prisma:2197`), and the
delivery mechanism reuses `BetaRewardEntitlement` — the same durable,
hashed-email-anchored, one-time-claimable entitlement design as Beta
rewards generally (see ADR-0005). `rewardType` on that model is a plain
`String` field, not a real enum — any tier name is technically
acceptable input, nothing in the schema constrains it to a fixed set
(the four severity names above are enforced by process/policy, not by a
database constraint — worth a future schema tightening, not done here).

**Not yet built**: the bug-report status lifecycle
(`RECEIVED`/`UNDER_REVIEW`/etc.) has no corresponding schema model,
controller, or admin UI anywhere in `apps/api`/`apps/web` — this ADR
confirms the *policy* for what that system must do once built; it does
not claim the system exists yet. Same for the public-transparency
metadata surface (ticket ID, generic title, etc.) — no public bug-report
listing endpoint exists today.

## WHY

**First-valid-report, not first-mention**, rewards the work of actually
confirming and reproducing an issue, not just noticing something might
be wrong — this avoids rewarding vague "something seems broken" reports
that provide no actionable information, while still being fair to
whoever does the real work of nailing down a reproducible case, even if
someone else mentioned it vaguely first.

**Beta-safe delivery via the existing entitlement system** (rather than
a bespoke bug-hunter-specific reward table) avoids building a second,
parallel "survive account deletion" mechanism when one already exists
and is already proven (ADR-0005) — consistent with this project's
general preference for reusing an established pattern over building a
parallel one.

**Public transparency with a hard reproduction-details boundary** lets
the community see that reports are taken seriously and rewarded fairly
(status, severity, timestamp) without turning the public bug tracker
into an exploit-disclosure feed before a fix ships — standard
responsible-disclosure practice, applied here rather than invented.

## ALTERNATIVES CONSIDERED

- **Reward the first mention, regardless of detail**: rejected — would
  reward low-effort "something's broken somewhere" reports over the real
  work of reproduction, and would create a race to post vague reports
  first rather than useful ones.
- **A bespoke bug-hunter-specific survives-Beta-deletion mechanism**:
  rejected — ADR-0005's entitlement system already solves exactly this
  problem generically; building a second one would duplicate proven
  infrastructure for no benefit.
- **Full public disclosure of exploit details immediately upon
  confirmation**: rejected — would hand working exploits to bad actors
  before a fix ships; the safe-metadata-only public surface exists
  specifically to avoid this while still being transparent about status.

## CONSEQUENCES

- The four severity/reward values are now real policy — safe to build
  against, safe to reference in future admin tooling or player-facing
  copy about the program (once the reporting system itself is built).
- `rewardType`'s lack of a real enum constraint (see DECISION) is a real,
  minor gap worth closing whenever the bug-report system is actually
  built — not urgent today since nothing currently writes arbitrary
  values there in production.
- Building the actual bug-report intake/triage/status system
  (`RECEIVED`→...→`FIXED`) and its admin workflow remains real,
  unbuilt future work — this ADR fixes the *policy*, not the
  *implementation gap*.
- `docs/open-questions.md`'s Bug Hunter entry (OQ-004) is now closed for
  the reward-table question; a new, narrower open item should track "the
  bug-report status/transparency system itself is not yet built" if that
  work isn't scheduled elsewhere.

## RELATED SYSTEMS

`apps/api/prisma/schema.prisma` (`BetaRewardEntitlement`,
`WalletTransactionType.BUG_HUNTER_REWARD`),
`apps/api/test/beta-lifecycle.e2e-spec.ts`,
`docs/decisions/0004-open-beta-account-lifecycle.md`,
`docs/decisions/0005-beta-reward-entitlement-preservation.md`,
`docs/open-questions.md`.
