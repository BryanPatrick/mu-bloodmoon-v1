---
status: READY_FOR_REVIEW
category: systems
confidence: CONFIRMED_RUNTIME
source: Research/YouTube/project-gamers-oficial/transcripts/6SGVxLyhG_8.pt.json + Data/Custom/CustomBotStore.txt (real config, read 2026-08-26)
bloodMoonStatus: BLOODMOON_CONFIRMED
readiness:
  rawCoverage: HIGH (video transcript + real config both present)
  sourceCount: 2 (1 PROVIDER_TUTORIAL, 1 REAL_BLOODMOON_CONFIG)
  bloodMoonVerification: CONFIRMED_BY_CONFIG
  conflictStatus: NONE
  readiness: READY_FOR_REVIEW
---

# Custom Bot Store

A static NPC ("bot") placed on a map that sells a fixed list of items for zen and/or Cash (WCoin), configured entirely through `Data/Custom/CustomBotStore.txt` — no code changes. One of four static-NPC bot types from this vendor engine, alongside [[custom-bot-trader]], [[custom-bot-fusion]], and CustomBotBuffer — **the only one of the four currently active on Blood Moon.**

## Confirmed live on Blood Moon

Bot index 0 ("Luffen", display name `.::CASH STORE::.`) is configured and **active** in the real `Data/Custom/CustomBotStore.txt`, placed on map 0 (Lorencia) at coordinates 141/134. This is a real, deployed feature, not just a vendor template — verified 2026-08-26 by reading the live config directly (see `atomic-claims.json` CLAIM-006, CLAIM-017).

## Configuration shape (confirmed against the real file)

- **Section 1 — placement**: bot index, class, active flag, ColorName, name, shop display name, map, X/Y, direction.
- **Section 2 — item slots**: which equipment slots the NPC's own paperdoll shows. Confirmed mapping: `0=Weapon, 1=Shield, 2=Helm, 3=Armor, 4=Pants, 5=Gloves, 6=Boots, 7=Wings, 8=Pet` (the video was unclear on slot 2; the real config's header comment confirms Helm).
- **Section 3 — stock**: per item, item type/index/level/Opt/Luck/Skill/Durability/Excellent/Ancient, up to 5 socket columns, a `TypeSell` column, and price in Money/Cash/Gold/PcPoint. Blood Moon's live store (5 configured items) does not exercise the socket columns (all `*`) or most price fields (only `Money` is non-zero).

## Operational constraint

**Shop capacity is limited by the physical grid size of the display, not just a slot count.** A wing (4×1 item shape) may not visually fit even if the configured slot list has "room" — the vendor demonstrated 3 configured wings rendering as only 2 visible/purchasable, with the 3rd silently absent. Anyone configuring a store with large items (wings, some pets) should verify the live rendering after each addition rather than trusting the config file alone. (Not independently re-verified against Blood Moon's own store, which only sells small items — no wings configured.)

## Purchase flow (confirmed live, in the tutorial video)

Player holds **Alt + right-click**, or presses **D**, on the NPC to open the buy interface. Purchase fails cleanly (with an in-game message) if the player lacks the required zen or Cash — confirmed both currencies are checked independently.

## Sources

- Raw transcript: [Research/YouTube/project-gamers-oficial/transcripts/6SGVxLyhG_8.pt.json](../../../../Research/YouTube/project-gamers-oficial/transcripts/6SGVxLyhG_8.pt.json) (external to this git repo, under `D:\MU\Research\`). Video: "Custom Bot Store - ADDED 7.6", ProjectGamers Developers, published 2023-08-07.
- Real config: `RemoteData/Inventory/custom-bot-configs/CustomBotStore.txt` (external to this git repo, under `D:\MU\RemoteData\`), downloaded 2026-08-26 via `bm-remote` (RemoteOps, read-only).

## Remaining before full Wiki publication

In-game visual confirmation (does the Lorencia "Luffen" NPC actually render/function as configured) has not been performed — this is a config-level confirmation only, not a live gameplay observation.
