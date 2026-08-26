---
status: READY_FOR_REVIEW
category: systems
confidence: CONFIRMED_RUNTIME
source: Research/YouTube/project-gamers-oficial/transcripts/HFH8BhRZnUg.pt.json + Data/Custom/CustomBotFusion.txt (real config, read 2026-08-26)
bloodMoonStatus: BLOODMOON_CONFIRMED
readiness:
  rawCoverage: HIGH
  sourceCount: 2 (1 PROVIDER_TUTORIAL, 1 REAL_BLOODMOON_CONFIG)
  bloodMoonVerification: CONFIRMED_BY_CONFIG
  conflictStatus: NONE (1 correction — see below)
  readiness: READY_FOR_REVIEW
---

# Custom Bot Fusion

A static NPC that fuses two *player-supplied* items together: it transfers the option roll (Luck/Skill/Excellent/Ancient) from a "source" item onto a "target" item, at a configurable success rate. This was the earliest of the four bot types added (predates Trader and Store). Distinct from [[custom-bot-trader]], which exchanges an item for a fixed pre-configured reward rather than combining two player items.

**Verified against real config 2026-08-26**: present as `Data/Custom/CustomBotFusion.txt`, but both configured entries (BotFusion1 at Lost Tower, BotFusion2 at Lorencia) have `Enabled=0` — deployed but currently switched off, same pattern as Trader. **Correction**: the "same-category-only" restriction field is really named `OnlySameType` (with a companion `DestinyLower` level-range flag), not "BotIndexOnly" as this sweep's initial video-transcript-based normalization guessed — the tutorial's audio was imprecise on this point. See `atomic-claims.json` CLAIM-010/011/017.

## Configuration shape

- **Section 1**: bot index, class, name (hard limit of **10 characters** — same limit as in-game character creation), name color, success rate %, map/coordinate/direction, balloon text (limit **60 characters**).
- **Section 2**: VIP/guild-contribution gate (Season ≥ 16, rarely used), currency cost (Money/Cash/Gold/PricePoint or WCoin/GoblinPoint depending on version), charged *after* a successful fusion.
- **Section 3**: which equipment slot category the bot accepts (real config confirms: 0=Weapon,1=Shield,2=Helm,3=Armor,4=Pants,5=Gloves,6=Boots,7=Wing,8=Pet). Prefixing a line with `//` disables that bot entirely without deleting its configuration.
- **Section 4**: AllowLevel/AllowOpt/AllowLuck/AllowSkill/AllowExc/AllowFFFFItems transfer flags (real field names, confirmed).
- **Section 5 (`OnlySameType` + `DestinyLower`)**: `OnlySameType=1` only allows fusing items of the *same* category (sword+sword, staff+staff — the vendor calls mismatched fusion "confused" and disallows it); `0` accepts any category. `DestinyLower=1` additionally restricts fusion to cases where the destination item's level is within the source item's level ±10. Also here: an Ancient-mixing toggle (real config: always `1` in both Blood Moon entries), an item-level ceiling, and the number of possible excellent-option slots.

## Mechanic (confirmed live, twice)

On success, the **source item loses its options** (reduced to a bare item, keeping only its fixed per-weapon-type Skill if any) and the **target item gains** the transferred Life/Luck/Excellent options. Demonstrated with two consecutive successful fusions.

## Source

Raw transcript: [Research/YouTube/project-gamers-oficial/transcripts/HFH8BhRZnUg.pt.json](../../../../Research/YouTube/project-gamers-oficial/transcripts/HFH8BhRZnUg.pt.json) (external to this git repo, under `D:\MU\Research\`). Video: "Custom Bot Fusion - ADDED 6.4", ProjectGamers Developers, published 2022-05-19.

## Before publishing to the real Wiki

Confirm this matches Blood Moon's actual `Data/Custom/CustomBotFusion` config and in-game behavior — PROVIDER_TUTORIAL authority only.
