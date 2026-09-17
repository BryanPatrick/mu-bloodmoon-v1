---
status: EXPERIMENTAL
category: context-pack-domain
lastVerified: 2026-09-17
---

# Domain: n8n

**State**: not installed anywhere in this project. No design has been
reviewed or approved. This file is a sketch of the constraints any
future design must satisfy — not a proposal to build it now.

**Non-negotiable constraint**: n8n may receive conversation exports,
create *candidate* knowledge, detect duplicates, submit review tasks,
update metrics, and notify Bryan — but it must **never** silently
promote AI-generated knowledge to authoritative truth. Every promotion
from candidate to canonical goes through the same
classify → cross-reference → human/agent validation → promotion
pipeline as any other source (see
[`../RAW_HISTORY_AND_INGESTION.md`](../RAW_HISTORY_AND_INGESTION.md)).

**Data n8n could eventually consume, kept clean now on purpose**: the
Knowledge Hub's event log and report structure (see
[`orchestration.md`](orchestration.md)) is already structured and
queryable — Phase 7-8 work explicitly left it in a shape a future n8n
reporting workflow could consume, without n8n existing yet.

**Related**: [`../DEFERRED.md`](../DEFERRED.md).
