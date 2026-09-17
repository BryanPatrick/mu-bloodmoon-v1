---
status: ESTABLISHED
category: protocol
audience: internal (anyone writing documentation in this repo)
lastVerified: 2026-08-31
---

# Documentation freshness standard

Formalizes the frontmatter convention already in real, growing use
across this repo's newer docs (every file created in Phase K/L/M uses
some form of this), so it's explicit and consistent going forward rather
than each document inventing its own shape.

## Standard frontmatter fields

Every important technical document should carry:

```yaml
---
status: <see status vocabulary below>
category: <domain area, e.g. vip, security, gamebridge>
audience: internal (who this is for)
lastVerified: YYYY-MM-DD
confidence: <see confidence vocabulary below>
---
```

`confidence` is optional but strongly recommended for any document
making factual claims about how the system works (as opposed to a pure
process/protocol document like this one, where it's less meaningful).

## Confidence vocabulary

- **CONFIRMED** — verified directly against real code, a real running
  system, or real data (a query result, a test run, a file read). The
  strongest claim.
- **STRONG_EVIDENCE** — multiple independent signals point the same way,
  but not a single, direct, unambiguous confirmation (e.g. "three
  independent read-only checks all indicate NOT_DEPLOYED" — strong, but
  each check alone leaves a residual gap the doc should still name).
- **HYPOTHESIS** — a reasonable inference or design proposal, not yet
  verified against the real system. Common in architectural-direction
  documents (e.g. `docs/knowledge/commercial-modularity.md`) where the
  content is a proposal, not an observed fact.
- **UNKNOWN** — actively searched for and not found, or genuinely
  unresolved. Never silently omitted — an UNKNOWN marked as such is more
  useful than no marker at all, because it tells a future reader "this
  was checked, not just never asked."

## Schema/data-sensitive documents — additional fields

Any document describing a database schema, a live system's current
state, or anything that can drift out of sync with reality without the
document itself changing, should also carry:

```yaml
verifiedAgainst: <what was actually checked — a specific database, a specific commit, a specific environment>
environment: <e.g. bloodmoon_gameserver_lab, production (read-only), local dev>
version: <if applicable — a schema version, a migration name, a commit-adjacent marker>
```

Real example of this discipline already in practice:
`docs/gameserver/database/lab-environment.md` and
`docs/environment/sql-server-test-environment.md` both name the exact
environment/database every claim was checked against, not just "the
database" generically.

## Status vocabulary (non-exhaustive — domain-appropriate values are fine)

Common values already in real use across this repo:
`ESTABLISHED`, `ACTIVE`, `LIVING_INDEX`, `CRITICAL_FIX_APPLIED_AND_TESTED_LOCALLY`,
`ARCHITECTURAL_DIRECTION`, `SECOND_PASS_COMPLETE`, `SUPERSEDED`,
`OUTDATED`, `HISTORICAL`, `DECIDED_BUT_NOT_IMPLEMENTED`,
`CONTENT_NOT_LOCATED`, `INFRASTRUCTURE_ONLY`. Pick whichever value most
precisely describes the document's real state — don't force-fit into a
generic list when a more specific, honest status exists (several ADRs
created in Phase M use bespoke statuses like `METHODOLOGY_DECIDED` for
exactly this reason).

## Maintenance rule

`lastVerified` should be updated whenever a document's claims are
re-checked against reality — not just when the document's prose is
edited for style. A document that's been re-read and confirmed accurate
but not re-verified against the actual system should keep its old
`lastVerified` date, not get a false-freshness bump. This matters because
`lastVerified` is what tells a future reader (per
`docs/protocols/agent-bootstrap.md`) how much to trust a claim without
re-checking it themselves.

## Marking history without destroying it

Per this repo's standing rule (never silently overwrite history — see
the `~~strikethrough~~` correction pattern already used in
`docs/gameserver/database/legacy-unknown-structures.md` and
`docs/launcher/cache-and-fallback.md`): when a document's claim turns out
to be wrong or stale, mark it visibly (`SUPERSEDED`, `OUTDATED`, or an
inline `~~strikethrough~~` + correction), never delete the old text
silently. Use `status: SUPERSEDED` or `status: HISTORICAL` at the
document level when the *entire* document is no longer current but is
kept for historical reference (distinct from `OUTDATED`, which suggests
the document should be actively refreshed rather than left as a
deliberate historical artifact).

## Related

`docs/protocols/agent-bootstrap.md` (which relies on freshness markers to
decide how much to trust a doc before acting), `docs/README.md`'s own
`lastVerified` field (the central index practices what this standard
preaches).
