---
status: CANDIDATE (not published — requires cross-check against Blood Moon's own Data/Custom/CustomBotFusion before promotion)
category: systems
confidence: CONFIRMED_VENDOR_VIDEO
source: Research/YouTube/project-gamers-oficial/transcripts/HFH8BhRZnUg.pt.json
bloodMoonStatus: BLOODMOON_LIKELY
---

# Custom Bot Fusion

A static NPC that fuses two *player-supplied* items together: it transfers the option roll (Luck/Skill/Excellent/Ancient) from a "source" item onto a "target" item, at a configurable success rate. This was the earliest of the four bot types added (predates Trader and Store). Distinct from [[custom-bot-trader]], which exchanges an item for a fixed pre-configured reward rather than combining two player items.

## Configuration shape

- **Section 1**: bot index, class, name (hard limit of **10 characters** — same limit as in-game character creation), name color, success rate %, map/coordinate/direction, balloon text (limit **60 characters**).
- **Section 2**: VIP/guild-contribution gate (Season ≥ 16, rarely used), currency cost (Money/Cash/Gold/PricePoint or WCoin/GoblinPoint depending on version), charged *after* a successful fusion.
- **Section 3**: which equipment slot category the bot accepts (0=sword,1=shield,2=armor,3–6=other armor pieces,7=wing,8=pet). Prefixing a line with `//` disables that bot entirely without deleting its configuration.
- **Section 4**: MultiIndex/Look/Skill/Excellent-option transfer flags.
- **Section 5 (BotIndexOnly)**: if `1`, only allows fusing items of the *same* category (sword+sword, staff+staff — the vendor calls mismatched fusion "confused" and disallows it); if `0`, accepts any category. Also here: an Ancient-mixing toggle, an accepted level range (±10 by default), and the number of possible excellent-option slots (1–7).

## Mechanic (confirmed live, twice)

On success, the **source item loses its options** (reduced to a bare item, keeping only its fixed per-weapon-type Skill if any) and the **target item gains** the transferred Life/Luck/Excellent options. Demonstrated with two consecutive successful fusions.

## Source

Raw transcript: [Research/YouTube/project-gamers-oficial/transcripts/HFH8BhRZnUg.pt.json](../../../../Research/YouTube/project-gamers-oficial/transcripts/HFH8BhRZnUg.pt.json) (external to this git repo, under `D:\MU\Research\`). Video: "Custom Bot Fusion - ADDED 6.4", ProjectGamers Developers, published 2022-05-19.

## Before publishing to the real Wiki

Confirm this matches Blood Moon's actual `Data/Custom/CustomBotFusion` config and in-game behavior — PROVIDER_TUTORIAL authority only.
