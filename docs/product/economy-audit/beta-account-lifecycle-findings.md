---
status: DRAFT
category: product/economy-audit
audience: internal (engineering + product)
lastVerified: 2026-08-29
evidenceMethod: direct read of apps/api/prisma/schema.prisma (full-file search for beta/deletion-related fields)
---

# Beta Account Lifecycle — Findings (Part A verification)

The phase spec explicitly warns: "Do NOT assume account deletion has already happened. That must be verified separately before claiming it." This is that verification.

## Finding: no Beta-account concept exists in the schema at all today

An exhaustive search of `apps/api/prisma/schema.prisma` for anything resembling a Beta-account flag, scheduled-deletion mechanism, or Beta-reward-eligibility tracking found **nothing**. The only hit for "BETA" in the entire schema is `CLOSED_BETA`/`PUBLIC_BETA` — two values in `RoadmapStatus`, an unrelated enum used for internal feature-roadmap tracking, not account state.

Concretely, **none of the following exist today**:

- A field marking an `Account` as a temporary Beta account.
- A scheduled-deletion date or job for Beta accounts.
- A "same normalized email" eligibility record connecting a deleted Beta account to a future launch account, for the one-time reward claim the decision requires.
- Any audit trail of a Beta account having been deleted.

## Consequence for player-facing and support content

Per the decision, account creation UI must state that Beta accounts/progress will be deleted after Beta. **This entire mechanism — the account-type flag, the deletion job, the reward-eligibility linkage, the audit trail — needs to be designed and built before that UI claim would be true.** Until then, any content claiming Beta accounts "will be deleted" is describing an intended policy, not a working system, and any content claiming deletion "has happened" would be false.

This is not this phase's job to build (out of scope: `NO PRODUCTION WRITE`, `NO GAME SERVER CHANGE`) — it is flagged here so no downstream document (FAQ, account-creation copy, support runbook) accidentally asserts a mechanism exists that was not found in the real schema.
