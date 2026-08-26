---
status: CANDIDATE (not published — requires cross-check against Blood Moon's own Data/Custom/CustomBotStore before promotion)
category: systems
confidence: CONFIRMED_VENDOR_VIDEO
source: Research/YouTube/project-gamers-oficial/transcripts/6SGVxLyhG_8.pt.json
bloodMoonStatus: BLOODMOON_LIKELY
---

# Custom Bot Store

A static NPC ("bot") placed on a map that sells a fixed list of items for zen and/or Cash (WCoin), configured entirely through `Data/Custom/` text files — no code changes. One of four confirmed static-NPC bot types from this vendor engine, alongside [[custom-bot-trader]], [[custom-bot-fusion]], and CustomBotBuffer.

## Configuration shape

- **Section 1 — placement**: map, X/Y coordinates, class/model, active flag, shop display name (shown as "Cash" or similar above the NPC).
- **Section 2 — item slots**: which equipment slots the NPC's own paperdoll shows (0=weapon, 1=shield, 2=armor?, 7=wing, 8=pet — pet/mount slots usable to decorate the NPC itself, e.g. showing it mounted).
- **Section 3 — stock**: per item, price (zen and/or Cash), item level, Luck/Skin/durability/excellent-option flags, and a socket-count range (1–255, or -1/`*` for "any"). Three extra columns exist in the file but are explicitly unused as of this video ("reserved for future options").

## Operational constraint

**Shop capacity is limited by the physical grid size of the display, not just a slot count.** A wing (4×1 item shape) may not visually fit even if the configured slot list has "room" — the vendor demonstrated 3 configured wings rendering as only 2 visible/purchasable, with the 3rd silently absent. Anyone configuring a store with large items (wings, some pets) should verify the live rendering after each addition rather than trusting the config file alone.

## Purchase flow (confirmed live)

Player holds **Alt + right-click**, or presses **D**, on the NPC to open the buy interface. Purchase fails cleanly (with an in-game message) if the player lacks the required zen or Cash — confirmed both currencies are checked independently.

## Source

Raw transcript: [Research/YouTube/project-gamers-oficial/transcripts/6SGVxLyhG_8.pt.json](../../../../Research/YouTube/project-gamers-oficial/transcripts/6SGVxLyhG_8.pt.json) (external to this git repo, under `D:\MU\Research\`). Video: "Custom Bot Store - ADDED 7.6", ProjectGamers Developers, published 2023-08-07.

## Before publishing to the real Wiki

Confirm this matches Blood Moon's actual `Data/Custom/CustomBotStore` (or equivalent) config file and in-game behavior — this candidate is PROVIDER_TUTORIAL authority only, not yet CONFIRMED_RUNTIME against Blood Moon itself.
