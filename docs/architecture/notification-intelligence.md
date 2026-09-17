---
status: DESIGN — conceptual architecture only, nothing implemented
category: architecture
audience: internal (Bryan + any engineering agent)
lastVerified: 2026-09-16
confidence: PROPOSAL — no channel integration, no WhatsApp, no email sending implemented
---

# Notification intelligence — conceptual architecture

**DATE**: 2026-09-16. **SCOPE**: design only. No WhatsApp integration,
no email sending, no notification infrastructure implemented this
phase. Companion to `docs/architecture/engineering-agent-orchestration.md`
(B14) and `docs/architecture/bloodmoon-ai-assistant.md`.

## B14 — Notification router design

The core split: **`EVENT`** is decoupled from **`CHANNEL`**. An event
fires once, describing something that happened; a per-player
preference table decides which channel(s), if any, receive it. Adding
a channel later (say, Discord) never requires touching every event
definition — it's one more row type in the preference table.

```
EVENT (fires once)              CHANNELS (0 or more, per player pref)
MarketplaceItemSold        -->  AppNotification, EmailNotification,
                                 WhatsAppNotification
WishlistedItemAppeared     -->  (same channel set, independently chosen)
NewBid                     -->  ...
Outbid                     -->  ...
PaymentConfirmed           -->  ...
WCCredited                 -->  ...
EventStarting               -->  ...
MaintenanceScheduled        -->  ...
AccountSecurityAlert        -->  (security alerts likely force at
                                  least one always-on channel,
                                  regardless of preference -- a
                                  deliberate exception, not an oversight)
```
Each event carries a payload (item id, amount, timestamp, etc.); the
router looks up the player's channel preferences for that event
*category* (not necessarily one preference per exact event type — a
smaller set of categories like "marketplace," "payments," "security,"
"events" is more manageable for a player to configure than dozens of
individual toggles).

## B20 — Notification intelligence rules

Rule categories to design for, once this is built (not implemented
this phase):

- **Wishlist price threshold**: notify only when a wishlisted item's
  price crosses a player-set threshold, not on every price change.
- **Item availability**: a wishlisted item appearing at all, separate
  from price.
- **Auction bid / outbid**: real-time-ish, since outbid notifications
  are time-sensitive by nature.
- **Sale confirmation**: fires once, on the actual sale event.
- **Event timing**: reminder windows (e.g. 10 minutes before), not
  just an instant-start ping.
- **Progression recommendation**: lower urgency, batchable rather than
  instant.
- **Market trend**: lowest urgency, a digest-style notification rather
  than instant, since no single trend data point is time-critical.

**Anti-spam, required from day one of any real implementation, not
bolted on later**:
- **Dedup**: the same underlying event should never generate two
  notifications across channels if the player only wants one; and a
  rapidly-repeating event (e.g. price flickering across a threshold
  several times) should collapse to one notification, not one per
  flicker.
- **Cooldown**: a minimum interval between notifications of the same
  category for the same player, even if multiple qualifying events
  fire within it.
- **Priority**: security/payment-confirmation notifications bypass
  cooldown/quiet-hours; market-trend digests never do.
- **User preference**: per-category channel choice (above), plus an
  overall opt-out per category.
- **Quiet hours**: player-configurable window where only
  highest-priority notifications (security) are ever sent immediately;
  everything else queues until the window ends.
- **Channel preference**: some players want everything in-app only;
  respecting that fully (not defaulting to email/WhatsApp "just in
  case") is part of the same preference model, not a separate concern.

This rule set is exactly the kind of short, well-defined, high-volume
logic n8n is genuinely well suited for (per
`engineering-agent-orchestration.md`'s B3 evaluation) — event in,
preference lookup, dedup/cooldown check, channel fan-out — none of it
needs agent-level reasoning, which is why this document recommends it
as a candidate first real n8n use case if that integration layer is
ever built, rather than the orchestration engine itself.
