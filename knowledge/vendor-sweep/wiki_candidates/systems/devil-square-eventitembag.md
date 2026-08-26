---
status: READY_FOR_REVIEW
category: systems
confidence: CONFIRMED_RUNTIME
source: Data/EventItemBagManager.txt (real config, read 2026-08-26) + Research/YouTube/project-gamers-oficial/transcripts/DUK52xHToK0.pt.json
bloodMoonStatus: BLOODMOON_CONFIRMED
readiness:
  rawCoverage: HIGH
  sourceCount: 2 (1 PROVIDER_TUTORIAL, 1 REAL_BLOODMOON_CONFIG)
  bloodMoonVerification: CONFIRMED_BY_CONFIG
  conflictStatus: NONE
  readiness: READY_FOR_REVIEW
---

# Devil Square end-of-event drop (EventItemBag)

## Provider functionality vs. Blood Moon's real state

- **PROVIDER_DESCRIBES**: update 6.8 extends the `EventItemBag` end-of-event reward mechanism (already used by Blood Castle/Illusion Temple) to Devil Square, adding 7 configurable sub-indices.
- **BLOODMOON_REAL_STATE**: confirmed exactly — `Data/EventItemBagManager.txt` has exactly 7 Devil Square rows (indices 137–143, `SpecialValue` 70–76), each pointing at an individual `Data/EventItemBag/137 - Devil Square 1.txt` through `143 - Devil Square 7.txt` file. All 7 are active (not commented out) in the index table.

## The real EventItemBag architecture (broader than the video described)

`Data/EventItemBagManager.txt` is a 148-row flat index — not a single monolithic reward table. Each row maps an `ItemIndex`/`ItemLevel`/`MonsterClass`/`SpecialValue`/`DropMap` criterion to one individually-named file in a separate `Data/EventItemBag/` folder (148 files total, indices 000–147). The same mechanism covers Blood Castle 1–8, Chaos Castle 1–7, Illusion Temple 1–6, Devil Square 1–7, and a long tail of boss-specific and minigame-specific reward files (see `knowledge/vendor-sweep/entities/gameplay-entities.json` for the full extracted roster).

## Notable related finding

4 rows (indices 102–105, the "Jewelry Case" family) are commented out in the index table even though their individual reward files still exist on disk — a different flavor of "present but disabled" than the `Enabled=0` column pattern found elsewhere (see `CLAIM-034`).

## Sources

- Real config: `Data/EventItemBagManager.txt`, `Data/EventItemBag/` directory listing (`RemoteData/Inventory/data-root-20260826.json`).
- Vendor tutorial: [Research/YouTube/project-gamers-oficial/transcripts/DUK52xHToK0.pt.json](../../../../../Research/YouTube/project-gamers-oficial/transcripts/DUK52xHToK0.pt.json) ("Drop Event Devil Square - ADDED 6.8").

## Unresolved questions

- Individual content of each of the 7 Devil Square reward files (only the index table was read, not each per-level file).
- Whether the disabled Jewelry Case items were intentionally retired or are a pending re-enable.
