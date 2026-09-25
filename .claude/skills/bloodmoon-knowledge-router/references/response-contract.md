# Specialist response contract v1

**Status: MVP, built `SPECIALIST-03` (2026-09-25).** The small,
machine-readable shape every substantive `bloodmoon-knowledge-router`
answer should be expressible as — not a new database schema, not a Hub
concept, just the structure Claude can rely on when reading a
specialist response. Mirrors, at a smaller scale, the same
field-list-over-prose discipline the Hub's own
`Agent report contract v1` (`hub/docs/report-contract.md`) and the
original `AGENT_REPORT_SCHEMA_V1` design
(`docs/architecture/engineering-agent-orchestration.md` §B9) already
established for this project — the same pattern, not a competing one.

## Schema

```json
{
  "query": "string — the question as asked",
  "domain": "string — one of the router's known domain categories, or 'unclassified'",
  "answer": "string — the grounded answer, or null if UNKNOWN",
  "status": "CONFIRMED | LIKELY | UNKNOWN",
  "authority": {
    "model": "internal (context/GOVERNANCE.md) | external (docs/knowledge/source-authority.md)",
    "level": "string — the specific level from whichever model applies",
    "temporal_status": "CURRENT | HISTORICAL | SUPERSEDED"
  },
  "sources": [
    {"path": "string — file path, Hub row reference, or branch:path for a cross-branch source", "type": "string"}
  ],
  "conflicts": [
    {"source_a": "string", "authority_a": "string", "source_b": "string", "authority_b": "string", "resolved_by_governance": "boolean"}
  ],
  "unknowns": ["string — specific unresolved sub-questions, if any"],
  "recommended_next_lookup": "string | null — what to check next if this answer is incomplete"
}
```

## Field notes

- `status` mirrors `bloodmoon-knowledge-router`'s own step 10 vocabulary
  exactly (`CONFIRMED`/`LIKELY`/`UNKNOWN`) — never a fourth invented
  value.
- `authority` is always populated by `bloodmoon-source-authority`'s own
  output shape (§ "Expected output" in that skill) — never re-derived
  ad hoc here.
- `conflicts` is an array specifically so more than one real
  disagreement can be reported without forcing a false single answer —
  an empty array means none were found, not that the check was
  skipped.
- `sources` never contains a raw secret value, a full credential, or a
  full Hub report body — a path/reference only, same discipline the
  Hub's own `report-contract.md` already requires of its `evidence`
  field.
- `recommended_next_lookup` exists specifically for the `UNKNOWN` case —
  pointing at what a human or a follow-up query should check, rather
  than leaving a dead end.

## Why a schema at all, at this small scale

The same reasoning the original `AGENT_REPORT_SCHEMA_V1` design gave:
every real specialist answer, even informally, already has this shape
implicitly — this schema makes it explicit and diffable rather than a
differently-worded prose block each time, without adding database
schema, a new service, or any infrastructure. It is a response shape a
skill's own output follows, nothing more.
