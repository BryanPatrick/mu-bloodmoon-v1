---
sourceId: KI-010
videoId: Mxanjz4Ml3E
title: Custom Drop Reward Season 6.17 - ADDED 6.8
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
providerVersion: ADDED 6.8
topics: [systems, drop-system, currency]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/Mxanjz4Ml3E.pt.json
---

# Custom Drop Reward (Season 6.17)

A per-item ground-drop bonus system: configured "Box" items, when dropped on the ground, roll a configurable chance to grant a currency reward (Ruud, and/or WCoin/PCPoint) to whoever triggers it. Each Box item has its own success percentage and either a min/max random reward range or a fixed amount.

## Demonstrated live

3 units each of 3 different Box types (10%, 70%, 70% chance) were dropped. Results were rolled independently per unit, not guaranteed per drop. The 10%-chance Box didn't hit in 3 tries; the two 70%-chance Boxes hit on the majority of tries, granting 5,000 and 10,000 Ruud per success.

## Entities

`CustomDropReward`, `Ruud` (currency)

## Claims

CLAIM-018 (see atomic-claims.json)
