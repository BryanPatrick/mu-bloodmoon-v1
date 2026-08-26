---
sourceId: KI-007
videoId: gfMqlKeQ360
title: Server Game Master Account Level - ADDED 5.4
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
season: null
providerVersion: ADDED 5.4
topics: [systems, access-control, gamemaster]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/gfMqlKeQ360.pt.json
---

# Server Game Master Account Level

A new Section 1 in `GameMaster.txt` (alongside the pre-existing Section 0, which controls GM command access by account level) that whitelists specific logins, by account level, for access to a specific Game Server instance — a simpler alternative to using the VIP system for the same purpose.

## Behavior (demonstrated live)

`Common.dat` gets a "Server Game Master Account Level" flag + a required level number. Only accounts whose configured level in `GameMaster.txt` Section 1 matches are allowed to log into that Game Server. Test account `teste` (configured level 1, matching) logged in successfully; `teste1` (no matching entry) was blocked from the same server.

## Intended use case (per vendor)

Building restricted test/dev Game Server instances (a "DTS") for QA-only accounts, to test PvP/events/commands without exposing test conditions on the main server.

## Entities

`GameMaster.txt`, `Common.dat`

## Claims extracted

CLAIM-013

## Related

None yet.
