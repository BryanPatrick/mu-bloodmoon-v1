---
status: DESIGN_REFERENCE
category: product/economy
audience: internal (engineering + product)
lastVerified: 2026-08-29
evidenceMethod: direct read of apps/api/prisma/schema.prisma (Account, AccountModeration, GameBridgeJob models)
---

# Beta Account Lifecycle — Schema Marking, Deletion, and Reward Entitlement Design (Parts I/J/K/L)

**Nothing in this document is implemented.** Design only, per the phase's explicit `NO PRODUCTION WRITE` / `Do not implement` instructions.

## Part I — how to mark a Beta account (design, not applied)

### Current schema reality

`Account` (`apps/api/prisma/schema.prisma`) has no phase/lifecycle field at all — confirmed again this phase (no change since Phase 11's finding). The closest existing concept is `AccountStatus { ACTIVE, PENDING, BLOCKED }`, which is about account activation state, not Beta-vs-official phase, and reusing it for that purpose would conflate two unrelated concerns.

### Design options considered

| Option | Distinguishes PRE_BETA/OPEN_BETA/OFFICIAL without relying only on `createdAt`? | Notes |
|---|---|---|
| `accountPhase` enum field directly on `Account` | Yes | Simplest; one field, one source of truth |
| `betaParticipant: Boolean` + separate `betaCycleId` | Partially — boolean alone can't distinguish multiple Beta cycles if there's ever more than one | Needs the cycle id to be meaningful |
| A separate `BetaParticipation` record (see Part K) referenced from `Account` | Yes, and doubles as the reward-entitlement record | Avoids adding Beta-specific fields to the core `Account` model at all |

### Recommendation (marked as a recommendation)

Add a single `accountPhase: AccountPhase` enum field (`PRE_BETA | OPEN_BETA | OFFICIAL`) directly on `Account`, defaulted at creation time based on the real Beta window (01/09/2026–15/09/2026) rather than inferred after the fact from `createdAt` — i.e. the value is set explicitly at registration, not derived by comparing dates later (dates drift in meaning if the Beta window itself ever changes; an explicitly-set field doesn't). This directly satisfies the instruction to distinguish phases "without relying only on creation date." Pair it with a `BetaParticipation` record (Part K) for anything reward-specific, so `Account.accountPhase` stays a simple, cheap-to-query classification and the richer entitlement data lives separately.

## Part J — exact deletion lifecycle design

Per the phase's numbered sequence, mapped to what's real vs. what needs building:

| Step | Design | Real infrastructure to build on |
|---|---|---|
| 1. Freeze Beta | Stop accepting new `OPEN_BETA`-phase registrations; flip a feature flag | No existing "registration freeze" flag found this phase — would be new |
| 2. Snapshot eligibility | Compute and persist which accounts/emails qualify for reward carry-over, before touching anything | This is exactly what `BetaRewardEntitlement` (Part K) is for — it must be populated *before* step 5/6 destroy the source data |
| 3. Preserve reward entitlement | Same record, `status: ELIGIBLE`, decoupled from the `Account` row it originated from | — |
| 4. Preserve required audit/security evidence | `AuditEvent`/`AccountSession` rows already exist and are real — decide (a product call, not a technical one) whether these get retained past account deletion for a compliance window, or deleted with the account | Real audit-log model already exists (`AuditEvent` — actor, ipAddress, userAgent, result, severity) |
| 5. Delete Beta game progress | **No existing mechanism.** `GameBridgeOperation` (real enum: `LOCK_ITEM, RELEASE_ITEM, TRANSFER_ITEM, DELIVER_ITEM, CREDIT_CURRENCY, SYNC_INVENTORY`) has no delete/wipe operation — would need a new operation type, and this touches the actual GameServer/SQL character data, which is explicitly out of this phase's `NO GAME SERVER CHANGE` scope to even prototype |
| 6. Delete disposable Beta account data where policy allows | Standard Prisma cascade delete on `Account` (many relations already use `onDelete: Cascade`) — technically straightforward, but must happen *after* steps 2-4, not before |
| 7. Retain only required records separately | `BetaRewardEntitlement` (Part K) is exactly this — deliberately decoupled from `Account` via a hashed/normalized email, not a live foreign key, so it survives the account's deletion |
| 8. Allow official account creation later with same email | Since `Account.email` is `@unique`, a NEW official account can only be created with that email once the OLD Beta account (holding that email) is actually deleted — this makes step 6's completion a hard prerequisite for step 8, not just a sequencing preference |
| 9. One-time reward claim | `BetaRewardEntitlement.status` transitions `ELIGIBLE → CLAIMED` exactly once, enforced by the claim endpoint checking current status before transitioning (standard idempotent-claim pattern, not built yet) |

**Sequencing constraint worth flagging explicitly**: steps 2-4 (snapshot/preserve) **must** complete and be verified before step 5/6 (delete) run — this is a one-way door. Any implementation of this must treat 2-4 as a hard precondition gate on 5-6, not just an ordering suggestion.

## Part K — BetaRewardEntitlement (design, not applied)

```
model BetaRewardEntitlement {
  id                  String   @id @default(uuid())
  betaCycleId         String   // e.g. "2026-09-open-beta" -- supports more than one Beta cycle ever existing
  normalizedEmailHash String   // hashed, not plaintext -- see privacy note below
  originalAccountId   String?  // kept only as long as legally/technically appropriate; nullable so it can be cleared post-deletion without breaking the row
  rewardType          String
  rewardAmount        Int
  reason              String
  sourceType          String   // e.g. BUG_HUNTER_REWARD, EVENT_PARTICIPATION, RANKING -- mirrors the Phase 11 WC transaction taxonomy where applicable
  sourceId            String?
  status              BetaRewardEntitlementStatus @default(PENDING)
  createdAt           DateTime @default(now())
  claimedAt           DateTime?
  claimedByAccountId  String?  // the NEW official account, set only on claim

  @@index([normalizedEmailHash, betaCycleId])
  @@index([status])
}

enum BetaRewardEntitlementStatus {
  PENDING
  ELIGIBLE
  REJECTED
  CLAIMED
  REVOKED
}
```

**Privacy note, addressing "do not store more personal data than necessary"**: the entitlement record stores a **hash** of the normalized email, not the plaintext email, and not a live foreign key to the original `Account` (which may no longer exist after step 6). `originalAccountId` is kept only transiently for audit purposes during the Beta-to-launch window and can be nulled out once no longer needed — the row's ability to grant a reward depends only on `normalizedEmailHash` matching a newly-created official account's own normalized+hashed email, not on the original account still existing. This is consistent with `AccountModeration`'s and `AuditEvent`'s existing pattern of keeping actor/target references nullable-on-delete (`onDelete: SetNull`) rather than hard-blocking deletion — the same discipline extends naturally here.

## Part L — Beta account creation notice (draft copy)

**`LEGAL_REVIEW_REQUIRED`** — this is draft product copy, not reviewed language.

> Esta conta é para o **Open Beta** do Blood Moon (01/09/2026 – 15/09/2026).
>
> Ao final do Beta, **esta conta e todo o progresso do personagem serão apagados**. Isso é esperado — o Open Beta é um ambiente de teste.
>
> Recompensas elegíveis conquistadas durante o Beta (ex.: recompensas de Bug Hunters) **não são apagadas** — elas ficam vinculadas ao seu e-mail e podem ser resgatadas em uma nova conta criada com o mesmo e-mail no lançamento oficial.
>
> Ao aceitar, você reconhece que está participando de um ambiente de teste e concorda com os [Termos de Uso].

This directly reflects the decisions in `ECONOMY_PRODUCT_DECISIONS.md`'s Open Beta section and nothing beyond them — no promise of a specific reward amount, no specific claim-window deadline (none was decided), no legal language about data retention beyond what's stated.
