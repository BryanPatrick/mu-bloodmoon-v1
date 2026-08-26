---
sourceId: KI-005
videoId: EpUJmEBn16Y
title: Custom Info Drop Switch - ADDED 7.8
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
season: null
providerVersion: ADDED 7.8 (toggle); underlying feature ADDED 7.6 or 7.7
topics: [systems, ui, client]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/EpUJmEBn16Y.pt.json
---

# Custom Info Drop Switch

An on/off toggle for the "GetItemInfo" client feature: hovering over a ground item (before pickup) shows a tooltip with its name and attributes (Luck etc). The underlying feature shipped without an off switch in 7.6/7.7; this update adds the toggle by admin request.

## Behavior (demonstrated live)

- ON: hover over a dropped item → tooltip with name + attributes.
- OFF (both related flags set to 0): hover shows nothing; holding Alt still shows the plain name only.

## Operator warning (preserved verbatim finding)

Requires copying an updated client-side file (referred to as "get my info" / `.mpg`) into the client folder, not just a server-side config change. Vendor explicitly warns: if the server uses a launcher/patcher, be careful not to accidentally open the launcher and download an OLDER update, which would overwrite the newly-updated client file — recommends testing by launching the game executable directly during testing, only pointing the launcher at the update once validated.

## Entities

`GetItemInfo`, `CustomInfoDropSwitch`

## Claims extracted

CLAIM-012 (verification BLOCKED — no safe read-only path for client-rendered UI behavior; see verification-queue.json)

## Related

None yet.
