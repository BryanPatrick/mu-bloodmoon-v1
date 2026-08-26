---
status: READY_FOR_REVIEW
category: systems
confidence: CONFIRMED_RUNTIME
source: Research/YouTube/project-gamers-oficial/transcripts/gySFdaRrS8Q.pt.json + Data/Custom/CustomBotTrader.txt (real config, read 2026-08-26)
bloodMoonStatus: BLOODMOON_CONFIRMED
readiness:
  rawCoverage: HIGH
  sourceCount: 2 (1 PROVIDER_TUTORIAL, 1 REAL_BLOODMOON_CONFIG)
  bloodMoonVerification: CONFIRMED_BY_CONFIG
  conflictStatus: NONE
  readiness: READY_FOR_REVIEW
---

# Custom Bot Trader ("Mix")

**Verified against real config 2026-08-26**: present on Blood Moon as `Data/Custom/CustomBotTrader.txt`, but both configured entries (BotTrade1, BotTrade2) have `Enabled=0` — the feature is deployed but currently switched off. The mix data itself ("WingBK" 50% success, "WingBK2" 100% success) is essentially the vendor's own demo/template data, matching the tutorial's live example almost exactly — file `LastWriteTimeUtc` is 2023-08-08, one day after the tutorial's 2023-08-07 publish date, strongly suggesting it was deployed right when the vendor released it and never customized. See `atomic-claims.json` CLAIM-008/009/017.

A static NPC that trades a specific input item for a specific output item, gated by a configurable success percentage — the vendor calls this a "mix" system. Distinct from [[custom-bot-fusion]] (which transfers *options between two player-supplied items*): Trader exchanges a player's item for a *fixed, pre-configured* reward item.

## Configuration shape (GameMaster-style multi-section file)

- **Section 1**: bot index (0–29, max 30 bots of this type per server), class/model, ColorName (0–7, name color above the NPC), map/coordinate/direction, balloon text.
- **Section 2**: usage cost — a flat amount of zen/Cash/Gold/WCoin/GoblinPoint charged just to *attempt* the trade (independent of the item requirement); an optional VIP/guild-contribution gate (Season ≥ 6.3, rarely used per the vendor).
- **Section 3**: which items the bot's paperdoll displays (cosmetic only).
- **Section 4 (the actual mix table)**: per bot-index — required input item (with a level/+ range, e.g. Wing +0 to +9), reward item (with its own level range), success rate % , and randomized-on-success ranges for the reward's Life/Luck/Skill/Excellent-option count and with/without-Skin flag for weapons.
- **Section 5 (BotMixAssociation)**: lets multiple bot-indexes share one mix-table definition, or each define its own.

## Mechanic (confirmed live, twice)

If the combination **fails** (roll against the success %), **the input item is lost and no reward is given** — there is no partial refund. A 50%-rate trade failed on attempt 1 and succeeded on attempt 2 with the same item; a 100%-rate trade succeeded immediately both times tested.

## Operator warning (verbatim finding, worth preserving)

The vendor explicitly advises against editing player currency directly via SQL while the server has active/online players ("pode dar problema nas moedas dos players" — can cause player currency problems), recommending a dedicated site/panel edit function instead of a raw `UPDATE` against a live database. This is a general operational caution, not specific to Trader, but it was stated in this video.

## Source

Raw transcript: [Research/YouTube/project-gamers-oficial/transcripts/gySFdaRrS8Q.pt.json](../../../../Research/YouTube/project-gamers-oficial/transcripts/gySFdaRrS8Q.pt.json) (external to this git repo, under `D:\MU\Research\`). Video: "Custom Bot Trader - ADDED 7.6", ProjectGamers Developers, published 2023-08-07.

## Before publishing to the real Wiki

Confirm this matches Blood Moon's actual `Data/Custom/CustomBotTrader` config and in-game behavior — PROVIDER_TUTORIAL authority only.
