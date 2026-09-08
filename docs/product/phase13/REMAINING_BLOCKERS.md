---
status: FINAL
category: product/economy
audience: internal (product + engineering)
lastVerified: 2026-08-30
---

# What's Left After This Phase (Part Q)

This phase built the **foundation** for the four P0 blockers. None of the following is done yet, and none of it should be assumed done because the foundation exists:

## Still blocking Open Beta (01/09/2026)

1. **X-Shop's actual GameServer resolution.** This phase found there is nothing in apps/api/apps/web to change — the fix is disabling/reconfiguring `CustomXShop.txt` on the real GameServer, which needs both GameServer operational access (not available this phase) and Bryan's decision on `QUESTIONS_FOR_BRYAN.md` P0 #1.
2. **VIP pricing and benefit-percentage decisions.** The purchase mechanism works end-to-end (tested), but every `VipProductConfig` row starts at price 0/disabled, and every `VipBenefitConfig` value is hard-clamped to 0/disabled in code. Nothing is purchasable or beneficial until both are explicitly decided and an admin configures them.
3. **Beta account phase for pre-existing accounts.** New registrations get `accountPhase` assigned automatically now. The 9 real accounts found in Phase 12's read-only audit were never touched or reclassified this phase — they still have whatever `accountPhase` the migration's default assigned them (`PRE_BETA`), which may or may not be the right classification for each; this needs a one-time reconciliation pass, not built this phase.

## Real engineering gaps, not flags to flip

4. **VIP GameServer sync worker.** `GameBridgeJob(GRANT_VIP)` rows are created on every purchase but nothing consumes them — apps/api's `VipEntitlement` is the only place VIP status is currently real. A player's in-game experience won't reflect their VIP purchase until this is built.
5. **Beta cleanup execution.** Only the dry-run/reporting side exists. Actually deleting anything — even for a single, explicitly-approved account — requires a new, real `GameBridgeOperation` for progress deletion (confirmed not to exist) plus the full snapshot-then-delete sequence from `BETA_ACCOUNT_LIFECYCLE_DESIGN.md`, none of which was built this phase (explicitly forbidden: "This phase may prepare production-ready migrations/code. It must NOT execute destructive Beta cleanup").
6. **Frontend UI.** No form fields exist yet for the three new marketplace tax rates, no VIP purchase page, no Beta registration notice checkbox. The backend accepts and validates all of this; nothing renders it to a player yet.

## Genuinely unresolved from prior phases

7. **Portal (apps/api Postgres/MySQL production) account count** — still not obtained. No safe, sanctioned read-only credential path was found in this environment for the *production* database (as opposed to the local dev database this phase's tests ran against).
8. **Whether VIP status changes an account's AL0-3 bracket** (and therefore its XP rate) — the single most important open link between VIP and gameplay benefit, not resolvable without either engine source or an in-game empirical test.
