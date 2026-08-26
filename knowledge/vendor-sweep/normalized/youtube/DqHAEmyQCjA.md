---
sourceId: KI-004
videoId: DqHAEmyQCjA
title: ItemDrop per vips - UPDATED 7.0
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
season: null
providerVersion: UPDATED 7.0
topics: [drop-system, vip, config]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/DqHAEmyQCjA.pt.json
verificationStatus: CONFIRMED_BY_CONFIG (see atomic-claims.json CLAIM-004)
---

# ItemDrop.txt VIP-tier drop-rate columns (update 7.0)

Vendor update adding 4 VIP-tier drop-rate columns (Free/VIP1/VIP2/VIP3) to `Data/Item/ItemDrop.txt`, replacing what the video describes as a single prior drop-rate column.

## What changed (per the vendor)

Before: after the "monster max level" column, one drop-rate column. After 7.0: four columns in sequence, one per account tier (Free, VIP1, VIP2, VIP3), each independently settable per item row.

## Migration note (per the vendor)

Existing custom rows written before the update need the 4 new columns added manually, or the operator can start from the new default file and re-apply customizations — the update does not auto-migrate old rows.

## VERIFIED against Blood Moon (2026-08-26, Phase 2)

Blood Moon's real `Data/Item/ItemDrop.txt` header line reads:

```
//Index Level Grade Option0 Option1 Option2 Option3 Option4 Option5 Option6 Duration MapNumber MonsterClass MonsterLevelMin MonsterLevelMax DropRate_AL0 DropRate_AL1 DropRate_AL2 DropRate_AL3 Comment
```

This is an exact structural match to the described post-7.0 format (AL0-3 = Free/VIP1/VIP2/VIP3, consistent with the AL0-3 naming convention already established elsewhere in this codebase, e.g. `ItemDropRate_AL0..3` in `Common.dat`). All 92 data lines are commented out and every rate value is `0` — the feature exists structurally but is entirely unused/inert on Blood Moon. See [[itemdrop-vip-columns-verification]] and `knowledge-conflicts.json` CONFLICT-001 for the related finding that the vendor's own `ItemDrop.htm` tutorial document (captured pre-sweep) still describes the older single-column format.

## Entities

`ItemDrop.txt`, `DropRate_AL0`, `DropRate_AL1`, `DropRate_AL2`, `DropRate_AL3`

## Claims extracted

CLAIM-004 (this is the highest-confidence, fully-verified claim in this sweep round)

## Related

[[drop-rate-system]] (Knowledge/Systems/drop-rate-system.json — the pre-existing 3-layer Account/Map/Monster drop discipline this file's DropRate_AL0-3 naming convention matches)
