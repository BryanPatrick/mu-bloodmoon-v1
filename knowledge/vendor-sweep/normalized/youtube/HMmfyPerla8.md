---
sourceId: KI-015
videoId: HMmfyPerla8
title: ResetMin & ResetMax Events update 2.0.1.6
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
providerVersion: update 2.0.1.6
topics: [progression, events, reset]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/HMmfyPerla8.pt.json
---

# ResetMin/ResetMax event entry gate

Adds a minimum/maximum reset-count requirement to enter Blood Castle, Chaos Castle, Devil Square, and Illusion Temple. `-1`/`-1` disables the check. Demonstrated live: a character with 100 resets was blocked from an event configured `ResetMin=21`/`ResetMax=99` (100 > 99), then succeeded once the max was raised to accommodate it — confirming the check runs at join time, not just as a display.

## Progression relevance

First FACT-tier progression mechanism found in this sweep (as opposed to the earlier RECOMMENDATION-tier build-points advice). Not yet confirmed whether Blood Moon actually uses non-default (`-1`/`-1`) values for any of its 4 affected events — the demo used illustrative numbers, not real Blood Moon config.

## Entities

`ResetMin`, `ResetMax`, Blood Castle, Chaos Castle, Devil Square, Illusion Temple

## Claims

CLAIM-035

## Related

[[PROG-002]] (progression-entries.json)
