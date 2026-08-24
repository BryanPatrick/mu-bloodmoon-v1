# SQL discovery — Phase 3C write-schema re-verification, 2026-08-24

`sourceType: REAL_SQL_METADATA + REAL_AGGREGATE_DATA`. Re-verifies the
live `MEMB_INFO`/`AccountCharacter` schema before the first real write,
per Phase 3C Part A's explicit instruction not to trust the previously
recorded legacy INSERT statement as complete.

## Chain

- **raw/01-membinfo-column-metadata.txt** — full, current column-level
  metadata (nullability, identity, defaults) for all 34 `MEMB_INFO`
  columns, captured live.
- **raw/02-real-values-not-null-columns.txt** — real, safe (non-personal)
  values for every `NOT NULL` column across all 6 existing accounts.
- **raw/03-accountcharacter-metadata-and-constraints.txt** — same for
  `AccountCharacter`, plus PK/trigger/check-constraint confirmation.
- **derived/write-set-decision.md** — the resulting minimal write-set
  decision and every chosen column value, with reasoning.

## Headline finding

The previously recorded legacy web `create_account()` INSERT column list
is missing 7 real, `NOT NULL`, no-default columns
(`AccountLevel`, `AccountExpireDate`, `Lock`, `RewardVip`, `RewardCoin`,
`RewardIndication`, `Admin`). Confirms Phase 3C's own instruction not to
assume the legacy INSERT is complete was necessary, not just cautious.
Real values for all 14 required columns were captured from the 6 existing
accounts, with one deliberate, documented deviation (`ctl1_code`) to
avoid a possible privilege-escalation risk.

## Bootstrap and controlled real-write result

- `dbo.DmN_CreateGameAccount` was installed through the authorized
  RemoteOps admin path; `bm-sql` was not modified.
- `bloodmoon_writer` has one object-level `EXECUTE` grant and no direct
  table access or broad server/database role.
- The controlled QA write created exactly one `MEMB_INFO` and one
  `AccountCharacter` row. All other monitored table deltas were zero.
- Same-command replay and fresh-ledger response-loss recovery returned
  the original `memb_guid` without another row.
- See `raw/04-*` through `raw/08-*` for sanitized acceptance evidence,
  test results, and the remediated local-credential incident record.
