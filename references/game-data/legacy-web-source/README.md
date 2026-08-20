# Legacy web source — raw provenance record

This directory holds **provenance metadata only** — `provenance.json`
records where the actual raw legacy CMS source lives, its SHA-256 hash,
collection date, and which docs/references derive from it. The raw source
itself (two `.tar.gz` cPanel backup archives, ~46MB each) is **not** copied
into this repository, per the existing policy already stated in
`references/web-source-current/catalog.json` ("Nao versionar nem
compartilhar" — both archives contain a `constants.php` with live SQL
Server and AdminCP credentials).

## Chain: SOURCE → RAW → NORMALIZED → DERIVED

- **SOURCE**: the vendor-supplied legacy web portal + AdminCP, as it
  existed in production at two points in time.
- **RAW**: the two `.tar.gz` archives themselves, on disk outside git,
  hashed and registered in `provenance.json` — `hostbr-backup-20260716`
  and `bloodmoon-production-20260816`.
- **NORMALIZED**: `references/web-source-current/catalog.json` and
  `normalized-domains.json` (structural file/byte inventories, no code
  content).
- **DERIVED**: `docs/game-data/legacy-web-intelligence/*.md`,
  `docs/current-web-source-catalog.md`, `docs/current-admincp-catalog.md`
  — narrative findings, quoting only the minimal verbatim fragments needed
  to prove a table/column/join, never full files.

## Classification (per Game Data Platform Phase 2A rules)

Both archives: **RAW_COMPLETE** — the actual bytes exist, are intact, and
are now hashed and registered. `hostbr-backup-20260716` already had its own
recorded SHA-256 in a sibling `README.txt`; this record's re-computed hash
matches it exactly (untampered). `bloodmoon-production-20260816` had **no**
prior provenance record — this is a **RAW_EVIDENCE_GAP** that this
registration closes (hash and path now recorded; the original collector/
tool is `UNKNOWN`, only the filename and file-system mtime date it).

No conclusion in `docs/game-data/legacy-web-intelligence/` is
`MISSING_SOURCE` or `UNKNOWN_PROVENANCE` as of this record — every finding
traces back to one of the two archives above.

## Secrets

Neither archive is sanitized. Both contain a `constants.php` with live SQL
Server and AdminCP credentials — never extracted, reproduced, or committed
anywhere in this repository. See `provenance.json`'s `secretsNote` fields.
