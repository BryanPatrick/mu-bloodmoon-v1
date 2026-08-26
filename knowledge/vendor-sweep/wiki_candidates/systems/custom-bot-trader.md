---
status: CANDIDATE (not published — requires cross-check against Blood Moon's own Data/Custom/CustomBotTrader before promotion)
category: systems
confidence: CONFIRMED_VENDOR_VIDEO
source: Research/YouTube/project-gamers-oficial/transcripts/gySFdaRrS8Q.pt.json
bloodMoonStatus: BLOODMOON_LIKELY
---

# Custom Bot Trader ("Mix")

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
