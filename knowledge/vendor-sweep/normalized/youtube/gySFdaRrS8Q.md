---
sourceId: KI-002
videoId: gySFdaRrS8Q
title: Custom Bot Trader - ADDED 7.6
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
season: null
providerVersion: ADDED 7.6
topics: [systems, npc, item-exchange]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/gySFdaRrS8Q.pt.json
---

# Custom Bot Trader ("Mix")

A static NPC that exchanges a required player item for a fixed, pre-configured reward item, gated by a success-rate roll. Distinct from Bot Fusion (transfers options between two player items) — Trader gives a fixed reward for a fixed input.

## Config sections (as demonstrated)

1. **Placement**: bot index (0–29, max 30), class, ColorName (0–7), map/coordinate/direction, balloon text.
2. **Usage cost**: flat zen/Cash/Gold/WCoin/GoblinPoint charged to attempt the trade, independent of the item requirement. Optional VIP/guild-contribution gate (Season ≥ 6.3, rarely used).
3. **Display items** on the bot's own paperdoll (cosmetic).
4. **Mix table** per bot-index: required input item (level range, e.g. +0 to +9), reward item (its own level range), success rate %, randomized reward Life/Luck/Skill/Excellent ranges, with/without-Skin flag.
5. **BotMixAssociation**: lets multiple bot-indexes share one mix table, or each define its own.

## Behavior (demonstrated live)

- Failed roll (against success %) → input item lost, no reward.
- 50% rate: failed attempt 1, succeeded attempt 2 (same item). 100% rate: succeeded twice in a row.
- 30-instance cap confirmed shared across Trader/Buffer/Fusion (same convention).

## Operator note

Vendor advises against direct SQL currency edits on a server with active players — recommends a dedicated panel/site function instead.

## Entities

`CustomBotTrader`, `Data/Custom/`

## Claims extracted

CLAIM-008, CLAIM-009

## Related

[[custom-bot-store]], [[custom-bot-fusion]]
