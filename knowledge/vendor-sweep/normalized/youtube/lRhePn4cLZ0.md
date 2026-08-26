---
sourceId: KI-013
videoId: lRhePn4cLZ0
title: Custom Jewel Bank And Custom Event Time - UPDATED 6.1
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
providerVersion: UPDATED 6.1
topics: [systems, ui, events]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/lRhePn4cLZ0.pt.json
---

# Jewel Bank shortcut change + Event Timer panel

Two independent client-side UX updates, explicitly stated to apply to all versions (not version-exclusive):

1. **Jewel Bank shortcut**: changed from an F5+S5 key combo to a single `J` key, opening inventory and jewel bank side by side. Click a jewel count to withdraw 1 or 10 at a time. `/pack <jewel> <n>` deposits from inventory into the bank. A known bug: PEC (fragment) deposits don't work yet in this build, per the narrator.
2. **Event Timer panel**: `H` key shows a schedule of currently-active events, gated by a `CustomEventTimer=1` flag in `Data/Custom`. Only enabled events appear (both built-in events and ones configured via the separate "Invasion Manager" system).

## Entities

`CustomJewelBank`, `CustomEventTimer`

## Claims

CLAIM-022, CLAIM-023
