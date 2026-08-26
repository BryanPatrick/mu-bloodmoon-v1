---
sourceId: KI-003
videoId: HFH8BhRZnUg
title: Custom Bot Fusion - ADDED 6.4
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
season: null
providerVersion: ADDED 6.4
topics: [systems, npc, item-fusion]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/HFH8BhRZnUg.pt.json
---

# Custom Bot Fusion

A static NPC that fuses two player-supplied items: transfers the option roll (Luck/Skill/Excellent/Ancient) from a source item onto a target item, at a configurable success rate. The earliest of the bot family (predates Trader/Store).

## Config sections (as demonstrated)

1. **Core**: bot index, class, name (10-char limit, same as in-game character creation), name color, success rate %, map/coordinate/direction, balloon text (60-char limit).
2. **VIP/cost**: guild-contribution gate (Season ≥ 16, rarely used), currency cost charged after success.
3. **Accepted slot category**: 0=sword,1=shield,2=armor,3–6=other armor,7=wing,8=pet. A `//`-prefixed line disables that bot without deleting its config.
4. **Transfer flags**: MultiIndex/Look/Skill/Excellent-option.
5. **BotIndexOnly**: `1` = only same-category fusion allowed (sword+sword, etc — vendor calls a mismatch "confused" and disallows it); `0` = any category. Plus: Ancient-mixing toggle, accepted level range (±10 default), excellent-option count (1–7).

## Behavior (demonstrated live)

On success: source item loses its options (reduced to bare + fixed per-category Skill); target item gains the transferred Life/Luck/Excellent options. Two consecutive successful fusions demonstrated.

## Entities

`CustomBotFusion`, `Data/Custom/CustomBotFusion`, `BotIndexOnly`

## Claims extracted

CLAIM-010, CLAIM-011

## Related

[[custom-bot-store]], [[custom-bot-trader]]
