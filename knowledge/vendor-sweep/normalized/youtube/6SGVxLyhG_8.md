---
sourceId: KI-001
videoId: 6SGVxLyhG_8
title: Custom Bot Store - ADDED 7.6
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
season: null
providerVersion: ADDED 7.6
topics: [systems, npc, shop]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/6SGVxLyhG_8.pt.json
---

# Custom Bot Store

A static NPC vendor players buy fixed-stock items from, for zen and/or Cash. Configured entirely in `Data/Custom/`.

## Config sections (as demonstrated)

1. **Placement**: map, X/Y/Z, class/model, active flag, display name.
2. **Item slots on the NPC's own paperdoll** (cosmetic): 0=weapon, 1=shield, 2=armor, 7=wing, 8=pet.
3. **Stock table**: per item — price (zen and/or Cash), item level, Luck/Skin/durability/excellent flags, socket range (1–255 or `*`/-1 = any). 3 unused columns reserved for future options.

## Behavior

- Purchase via Alt+right-click or the `D` key on the NPC.
- Purchase fails cleanly if the player lacks required zen or Cash (checked independently).
- **Shop capacity is limited by the physical display grid**, not the configured slot count — a wing (larger sprite) may silently fail to render even with "room" in the config (demonstrated: 3 configured wings, only 2 rendered/purchasable).

## Entities

`CustomBotStore`, `Data/Custom/`

## Claims extracted

CLAIM-006, CLAIM-007 (see atomic-claims.json)

## Related

[[custom-bot-trader]], [[custom-bot-fusion]] — same static-NPC bot family, same `Data/Custom/` convention, 30-instance cap per type (CLAIM-009).
