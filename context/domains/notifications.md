---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: PARTIAL
---

# Domain: Notifications

**STATUS**: PLANNED design exists (unmerged branch); no unified
notification system is implemented. Specific per-feature flows
(payment confirmation, VIP entitlement) exist within their own domains,
not through a shared service — unchanged finding from Phase 9.

**CURRENT STATE**: `architecture/agent-orchestration-foundation`,
`docs/architecture/notification-intelligence.md` (read this phase):
`EVENT` decoupled from `CHANNEL` — an event (`MarketplaceItemSold`,
`WishlistedItemAppeared`, `NewBid`, `Outbid`, `PaymentConfirmed`,
`WCCredited`, `EventStarting`, `MaintenanceScheduled`,
`AccountSecurityAlert`) fires once; a per-player preference table
(scoped to a smaller set of *categories* — marketplace/payments/
security/events — not one toggle per event type) decides which
channel(s) receive it. `AccountSecurityAlert` deliberately forces at
least one always-on channel regardless of preference. Rule categories
sketched for later: wishlist price threshold, item-availability,
bid/outbid (time-sensitive), sale confirmation, event-timing reminders.

**ACTIVE DECISIONS**: none — `status: DESIGN`, unimplemented, unmerged.

**AUTHORITATIVE SOURCES**: `docs/architecture/notification-intelligence.md`
(branch `architecture/agent-orchestration-foundation`).

**OPEN QUESTIONS**: which channels ship first (email/Discord/WhatsApp/
in-app); WhatsApp provider cost is explicitly unresearched (see
`domains/n8n.md`'s cost-model note, §B29 of the companion doc).

**DEFERRED ITEMS**: any channel integration — none implemented, none
scheduled.

**RELATED TASKS/HANDOFFS**: none in the Knowledge Hub or `docs/handoff/`
this phase.
