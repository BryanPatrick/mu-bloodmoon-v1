---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Governance — how this Context Pack governs itself

## Precedence (this pack sits below everything that already existed)

Extending `docs/architecture/engineering-governance.md`'s own
source-of-truth precedence list (not replacing it):

1. Security/approval gates the agent itself enforces.
2. [`AGENTS.md`](../AGENTS.md) — universal invariants.
3. The canonical document for that specific domain (existing
   `docs/architecture/`, `docs/security/`, `docs/payments/`, etc.).
4. The relevant ADR in [`docs/decisions/`](../docs/decisions/).
5. **This Context Pack** (`context/`) — an index/summary layer over 1-4,
   plus the Knowledge Hub's own structured state where it is
   authoritative (see the file-vs-Hub rule below). Never higher
   precedence than the document it points to.
6. The relevant phase manifest / handoff doc.
7. Temporary notes (chat, scratch reasoning) — lowest precedence.

If anything in `context/` ever disagrees with the document it points to,
the pointed-to document wins, and the disagreement is a bug in this pack
to fix — not a judgment call to make silently.

## File-vs-Hub authority rule

- **Structured, operational, frequently-changing state** (task status,
  claims, approvals, review decisions, event history) is authoritative
  in the Knowledge Hub's own database — never re-derived or cached as
  truth inside `context/`.
- **Human-readable, durable project documentation** (why a decision was
  made, what a domain's architecture is, what a business rule is) is
  authoritative in this repository — `docs/`, `AGENTS.md`, ADRs, and this
  Context Pack's own index files.
- Both sides may reference the other (a `context/domains/*.md` stub may
  name a real Hub task/decision ID; a Hub knowledge item may cite a repo
  doc path), but **neither side auto-syncs into the other**. A future,
  explicitly-designed and explicitly-approved sync job could change
  this — not implemented, not assumed. See
  [`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md).

## Never duplicate, never compete

Every file under `context/` that touches a domain already covered by
`docs/` must: (a) name the real file(s) it summarizes, by path; (b) keep
its own content short enough that the real doc is still the one worth
reading for depth; (c) get updated or deleted, not left stale, if the
underlying doc it summarizes changes shape. A `context/` file that starts
to grow its own independent narrative instead of pointing outward is a
sign this rule is being violated.

## Security / secret classification

Applies to every document under `context/` and to
`docs/operations/chat-history-ingestion.md`:

| Class | Meaning | Example |
|---|---|---|
| `PUBLIC_PLAYER` | Safe for a player to read (game mechanics, public rules) | Item stats already in `knowledge/` |
| `INTERNAL` | Safe for any project agent/engineer, never for players | This entire Context Pack, `docs/` |
| `RESTRICTED` | Internal, but scoped to specific roles (e.g. financial risk detail) | `docs/payments/`'s risk-signal detail |
| `SECRET_REFERENCE_ONLY` | The *existence* of a secret may be named; its *value* never appears anywhere | "a staging API key exists for `claude-code-real-staging`" — never the raw token |

**Mandatory rule, no exception**: no document in `context/` may ever
contain an actual secret value (API key, password, connection string,
token). A reference to *where* a secret lives (e.g. "staging's key is in
the scratchpad `.tsv`, never committed") is fine; the value itself is
not. See [`VALIDATION.md`](VALIDATION.md) for the scan that checks this
mechanically before this pack is considered done.

## Validation

See [`VALIDATION.md`](VALIDATION.md) for the lightweight, non-over-engineered
check this pack runs on itself (duplicate decision IDs, broken doc
references, inconsistent status values, secret patterns).
