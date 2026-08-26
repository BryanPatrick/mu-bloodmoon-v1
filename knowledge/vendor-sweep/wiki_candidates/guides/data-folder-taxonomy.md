---
status: NEEDS_VERIFICATION
category: guides
confidence: CONFIRMED_VENDOR_VIDEO
source: Research/YouTube/project-gamers-oficial/transcripts/jXr8q_NGotQ.pt.json
bloodMoonStatus: UPSTREAM_MU
readiness:
  rawCoverage: MEDIUM (1 video source only)
  sourceCount: 1
  bloodMoonVerification: PARTIALLY_CONFIRMED_BY_CONFIG
  conflictStatus: NONE
  readiness: NEEDS_VERIFICATION
  note: "Part of this taxonomy is now independently confirmed by this sweep's own real-config reads -- Data/Custom/ contains 90 real files including CustomBotStore.txt/CustomBotTrader.txt/CustomBotFusion.txt/CustomBotBuffer.txt (see RemoteData/Inventory/data-custom-20260826.json), matching the video's description. The Command/Event/Monster/Item folder claims remain video-only, not yet independently re-verified against the real Data/ tree."
---

# GameServer Data/ folder taxonomy (vendor orientation)

The vendor's own beginner-orientation tour of the `GameServer/Data/` tree — the first consolidated map of what each subfolder is for found anywhere in this project's corpus. Useful as a starting index when hunting for where a given piece of server behavior is configured.

| Folder / area | Purpose (per vendor) |
|---|---|
| `Data/SharoMix` | NPC configs, Harmony refinery, Stone refinery (gem/stone upgrade systems) |
| `Data/Character` | PvP configuration |
| player-commands folder | player-facing chat commands |
| GM-commands folder | GM-facing chat commands |
| `Data/Common.dat` (referred to informally as "o como") | central config: experience rate, drop rate, server name, and "várias outras coisas" (many other things) |
| `Data/Custom` | ~48 custom systems: gem bank, custom offline-attack, custom shop/history, guild extras, events, and more |
| `Data/Event` | per-event on/off + tuning: Blood Castle, Devil Square, Illusion Temple, Chaos Castle, hide-and-seek, tag, "and other new events" |
| GameServerInfo / Item area | HP/Mana recovery percentages for Soul/blood/energy potions |
| `Data/Skill` | skill damage values and timing/cooldown |
| `Data/Item` | item configuration |
| `Data/Monster` | monster names and stats — **kept separate between the main Game Server and the Castle-Siege (CS) Game Server** |
| command-strings file (referred to as edited via "mandioca", likely a mistranscribed tool name) | editable command name strings and which currency (Cash/Gold/PCPoint) a command charges |

## Operator warning (verbatim finding — high operational value)

When copying configuration from a test/secondary Game Server instance to the main Game Server, **do not copy or overwrite the `Command` and `Event` folders** — these are legitimately different between server instances (main vs. CS/secondary). The vendor's stated procedure: select everything under `Data/`, then explicitly **deselect** `Command` and `Event` before copying. `Data/Custom` is called out with the same warning — some customs "only work on the main Game Server" and should not be blindly copied either.

This is a direct, vendor-stated description of a real failure mode (config corruption from a naive full-folder copy between server instances) that is directly relevant to any future config-deployment or server-replication tooling for Blood Moon.

## Source

Raw transcript: [Research/YouTube/project-gamers-oficial/transcripts/jXr8q_NGotQ.pt.json](../../../../Research/YouTube/project-gamers-oficial/transcripts/jXr8q_NGotQ.pt.json) (external to this git repo, under `D:\MU\Research\`). Video: "Primeiras Configurações do Servidor", ProjectGamers Developers, published 2021-06-29.

## Note

This taxonomy describes the vendor's own generic engine, not a verified map of Blood Moon's actual current `Data/` tree — treat folder names/locations as UPSTREAM_MU / a starting hypothesis, and confirm against Blood Moon's real filesystem (already partially covered by `catalog/vps-inventory.json`) before relying on it operationally.
