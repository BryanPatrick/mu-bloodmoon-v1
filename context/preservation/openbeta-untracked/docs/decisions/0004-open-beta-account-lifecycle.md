---
status: ACTIVE
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0004: Open Beta account lifecycle

**DATE**: 2026-08-31 (backfilled — original decision predates this ADR log; see Phase 13/`account-deletion-architecture.md`)
**STATUS**: ACTIVE

## CONTEXT

Blood Moon runs a real Open Beta window before official launch
(`apps/api/src/modules/beta-lifecycle/open-beta-window.config.ts:7-8`:
`DEFAULT_OPEN_BETA_START_AT`/`DEFAULT_OPEN_BETA_END_AT`, currently
2026-09-01 to 2026-09-15). Accounts created during this window need a
different eventual fate than accounts created after official launch —
Beta accounts and their progress cannot be kept forever without becoming
stale test data, but players who genuinely play and contribute during
Beta should not simply lose everything they earned.

## DECISION

`currentAccountPhase()` (`open-beta-window.config.ts:35-40`) derives an
`accountPhase` (`PRE_BETA`/`OPEN_BETA`/`OFFICIAL`) **at the moment of
registration only** — never retroactively reassigned later. The
player-facing registration notice states the lifecycle explicitly:

> "Esta conta é válida para o Open Beta do Blood Moon, realizado de
> 01/09/2026 a 15/09/2026. Ao final do período, a conta e o progresso do
> Open Beta serão excluídos. Recompensas elegíveis conquistadas durante o
> Beta poderão ser vinculadas posteriormente a uma nova conta criada com
> o mesmo endereço de e-mail." (`open-beta-window.config.ts:48-52`)

In short: register during the window → play → **at Beta end, the
account and its progress are deleted** → **eligible rewards earned during
Beta can later be linked to a new, post-launch account via the same
email address** (see ADR-0005 for the entitlement-preservation
mechanism).

The actual end-of-cycle deletion is not an ad-hoc script — it's a
documented 12-step workflow (`account-deletion-architecture.md:113-130`):
dry-run → cross-reference against reward entitlements → snapshot
confirmation → an explicit, reviewed `accountIds` list (never an
inferred date-range query) → execute → audit → reconciliation. The
Portal UI for this (`PRE_BETA_PURGE`, `/painel/admin/pre-beta-purge`)
requires a typed second confirmation before executing.

## WHY

A time-boxed Beta needs a clean, predictable "what happens when it ends"
answer decided *before* the window opens, not improvised afterward.
Deleting Beta accounts outright (rather than migrating them to official
status) avoids carrying forward test-cycle noise, exploit attempts, or
accounts created purely to probe the system — while the separate
reward-entitlement mechanism (ADR-0005) means a genuine early player
doesn't lose the benefit of having tested the game early, even though
their specific game-account row does not survive.

## ALTERNATIVES CONSIDERED

- **Migrate Beta accounts to official status at launch**: rejected —
  would carry forward any Beta-cycle data quality issues, test
  characters, and exploit-testing accounts directly into production,
  and would require a much more complex migration/reconciliation step
  than a clean delete-and-reclaim-by-email flow.
- **No reward preservation at all (Beta is fully disposable)**: rejected
  — would remove any incentive to participate meaningfully in Beta
  testing; see ADR-0005 for the actual mechanism chosen instead.
- **Infer which accounts to delete by date range at execution time**:
  rejected in favor of an explicit, reviewed `accountIds` list — a
  date-range query re-evaluated at execution time is exactly the kind of
  implicit, easy-to-get-wrong logic the 12-step workflow's explicit-list
  requirement was designed to avoid.

## CONSEQUENCES

- The registration notice text is player-facing legal-adjacent copy and
  is explicitly flagged `LEGAL_REVIEW_REQUIRED` /
  `legalReviewRequired: true` in the API response
  (`beta-lifecycle.service.ts:51`) — it is draft copy, not yet
  final-reviewed Terms of Service language.
- Any future change to the Beta window dates or the deletion workflow
  must keep the registration notice text and the actual deletion
  behavior in sync — the notice is a promise to the player, not just
  descriptive text.
- The `PRE_BETA_PURGE` admin capability (see ADR-0006) is scoped
  narrowly to exactly this lifecycle event — it is not a general-purpose
  account-deletion tool.

## RELATED SYSTEMS

`apps/api/src/modules/beta-lifecycle/`,
`apps/web/pages/painel/admin/pre-beta-purge.vue`,
`docs/accounts/account-deletion-architecture.md`, ADR-0005, ADR-0006.
