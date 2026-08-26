---
sourceId: KI-011
videoId: DUK52xHToK0
title: Drop Event Devil Square - ADDED 6.8
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
providerVersion: ADDED 6.8
topics: [systems, events, drop-system]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/DUK52xHToK0.pt.json
---

# Devil Square end-of-event drop (EventItemBag)

Before update 6.8, Devil Square had no built-in end-of-event item drop (only whatever drops from its mobs during the event). This update extends the existing EventItemBag mechanism — already used by Blood Castle and Illusion Temple — to Devil Square, with 7 sub-indices (1 through 7, one per Devil Square level/stage).

## Confirms

This directly corroborates and adds detail to the pre-existing finding in `docs/drop-system-analysis.md` (`Data/EventItemBagManager.txt`, listed as "parallel system, not the normal drop path") — this video shows EventItemBag being the actual mechanism for event-end rewards across multiple events.

## Entities

`EventItemBag`, `DevilSquare` (EVENT)

## Claims

CLAIM-019
