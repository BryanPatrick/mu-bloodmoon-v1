---
sourceId: KI-012
videoId: LbNZ98OSjVg
title: Custom Monster - UPDATED 6.9
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
providerVersion: UPDATED 6.9
topics: [systems, monsters, progression]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/LbNZ98OSjVg.pt.json
---

# CustomMonster.txt Reward Level / Reward Points columns

Adds 2 new reward columns to the existing `CustomMonster.txt` (which already supported Quest/GoblinPoint/Reset/MasterReset rewards on kill): `Reward Level` and `Reward Points`. Configured per monster, these grant direct level-ups or a custom "points" currency on kill, independent of normal XP (both accrue in parallel).

## Demonstrated live

Killing a configured spider granted +10 levels per kill directly (stacking with normal XP-based leveling observed in the same test). A separate test showed +10 "points" per kill instead.

## Intended use case (per vendor)

Purpose-built "build point" farming maps for level 400+ characters, typically combined with open PvP on the same map (players competing for kills/spawns).

## Entities

`CustomMonster.txt`, `Reward Level`, `Reward Points` — first MONSTER-adjacent and PROGRESSION-adjacent evidence in this sweep.

## Claims

CLAIM-020, CLAIM-021
