# Account identity integrity — findings summary

Source: `../normalized/account-identity-facts.json`, derived from `../raw/*.txt`.
Full narrative and recommendation: `docs/game-data/account-identity.md`.

## No anomaly found

Every integrity check came back clean: `memb_guid` has zero duplicates,
zero nulls; `memb___id` has zero duplicates *today* (the missing DB
constraint remains a structural risk, not an active data problem);
`AccountCharacter` has 100% coverage of both accounts and characters;
every character slot value matches a real `Character.Name` with zero
orphans; zero characters are claimed by more than one account; and
`Character.AccountID` agrees with `AccountCharacter`'s slot-based
ownership for all 12 characters with zero conflicts.

## The chain, confirmed real

```
MEMB_INFO.memb_guid (int, real IDENTITY PK, seed 1 increment 1)
  -- read-only correlator in application code, never a legacy code write target --
MEMB_INFO.memb___id (varchar(10), login username, NOT DB-unique)
  = AccountCharacter.Id (varchar(10), AccountCharacter's own real PK)
  -> AccountCharacter.GameID1..GameID10 (character slots, real Character.Name values, zero orphans)
  = Character.Name (varchar(10), Character's real PK)
```

`Character.AccountID` independently agrees with this chain for every
character in the live database.
