---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Deferred — decided not to do yet, not forgotten

Each entry names *why* it's deferred and *what would need to be true*
to un-defer it — a `DEFERRED` item is a decision, not an oversight.

| Item | Why deferred | What would un-defer it |
|---|---|---|
| Assigning `DEC-<DOMAIN>-NNN` human-readable IDs to Knowledge Hub decisions | Requires reading each of the 26 real decisions' actual content; out of this phase's staging-only scope | A session explicitly scoped to read + map them, reviewed before being treated as canonical |
| Real Codex staging pilot | No real Codex session available this phase; independently schedulable per `D:\MU\hub\docs\operations\orchestration-staging.md`'s own pilot design | A real Codex session, its own staging actor/key, a fresh go-ahead |
| n8n installation or integration | Explicitly prohibited this phase; no design has been reviewed/approved yet beyond `domains/n8n.md`'s sketch | A reviewed design + explicit authorization |
| Chat-history ingestion pipeline — execution | Design only, per `RAW_HISTORY_AND_INGESTION.md` and `docs/operations/chat-history-ingestion.md`; no real transcript has been supplied | Bryan supplies a real export; the already-designed pipeline is then actually run |
| Multi-configuration changeset/preview for progression | Named `NOT_BUILT` in `docs/README.md`'s own Phase U/V narrative — carried forward here only as a pointer, not re-decided | A future phase explicitly scoped to build it |
| GameServer sync for the legacy-catalog / progression control planes | `NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE` per `docs/README.md`'s Phase S/T/U narrative | Confirmed runtime knowledge (e.g. whether `Reload` is remotely triggerable) |
| Automatic sync between this Context Pack and the Knowledge Hub | `GOVERNANCE.md`'s file-vs-Hub rule explicitly keeps both manual for now | An explicitly designed, explicitly approved sync job |
