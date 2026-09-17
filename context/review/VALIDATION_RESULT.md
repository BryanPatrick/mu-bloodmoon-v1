---
status: ACTIVE
category: context-pack
audience: internal (the assigned independent reviewer)
lastVerified: 2026-09-17
---

# Validation result (last real run)

```bash
node context/validate.mjs
```

```
PASS (30 files checked, 0 issues)
```

Covers: broken relative links, unknown `status:` values, secret-shaped
strings, duplicate/undefined `SRC-*` references, unknown authority
levels, and — new this phase — every one of the 125 preserved files'
hash still matches what was recorded at preservation time (checked
against `preservation/_hashes_reference.tsv`).

**Secret scan** (`git grep` across both `mu-bloodmoon-v1` and the
separate Knowledge Hub repository, plus the new preservation archive):
**PASS** — zero real secrets found. Two coarse-pattern false positives
inspected by hand: an unrelated hyphenated adjective that happens to
contain the same three letters the `sk-` API-key prefix pattern
matches on; and a documented placeholder describing a known
*historical* legacy vulnerability, itself already classified `CLOSED
(not deployed)`.

Full detail: [`../VALIDATION.md`](../VALIDATION.md),
[`../GOVERNANCE.md`](../GOVERNANCE.md)'s security-classification
section.

**Reviewer note**: re-run the command yourself rather than trusting
this file — it's a snapshot, and your review should confirm the
current state, not just this recorded one.
