# SQL discovery — Phase 3A password scheme determination, 2026-08-20

`sourceType: REAL_SQL_METADATA + REAL_AGGREGATE_DATA + LEGACY_CODE_CONFIRMED`.
Determines `GAME_PASSWORD_SCHEME` for the Unified Account contract
without ever reading a real password value or hash.

## Chain

- **raw/01-password-length-distribution.txt** — the safe, aggregate,
  length-only real-data query and the full reasoning chain.
- **normalized/password-scheme.json** — machine-readable summary.
- **derived/password-scheme-report.md** — the finding and its design
  consequence.

## Headline finding

`GAME_PASSWORD_SCHEME = CONFIRMED: plaintext` — three independent lines
of evidence (column size, real length distribution, legacy code path)
converge on the same conclusion. This is the evidentiary backing for
`docs/game-data/unified-account.md`'s rejection of "same password reused
as the MU credential" as a design option.
