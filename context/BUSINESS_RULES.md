---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Business rules — CONFIRMED / PROPOSED / UNKNOWN

This pack does not invent business rules. Every row below points at the
real ADR or doc that actually confirmed it. Where no source was read
this session, the row says so and is marked `UNKNOWN` rather than
guessed — per `AGENTS.md` invariant 22.

| Rule | Status | Source |
|---|---|---|
| WCoin/BRL peg is 1:1, integer pricing | CONFIRMED (per `docs/README.md`'s narrative of ADR-0008/0020 — **ADR text itself not read this session**) | `docs/decisions/` (0008, 0020 — not present on `main`, see [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) OQ-CTX-001) |
| Direct WC transfer minimum = 20 WC | CONFIRMED per `docs/README.md`'s narrative (ADR-0022) | same caveat — ADR not present on `main` |
| Reset cap = 20, all VIP tiers, no exception | CONFIRMED per ADR-0029 (read in full this session) | `docs/decisions/0029-progression-reset-policy-current-ruling.md` |
| RMT / account-sale policy | Per `docs/README.md`'s narrative, closed via ADR-0016 — **not present on `main`**, not independently confirmed this session | UNKNOWN on this branch — see OQ-CTX-001 |
| Migration immutability once applied anywhere real | CONFIRMED, read in full this session | `docs/decisions/0030-migration-casing-static-audit.md`, `AGENTS.md` invariant 24 |
| Marketplace purchases + `TRANSFER_RESTRICTION` interaction | Per `docs/README.md`'s narrative (ADR-0022 correction) — not independently confirmed | UNKNOWN on this branch |
| Knowledge Hub: a policy-required review/approval cannot be bypassed by never requesting it | CONFIRMED, this project (Hub Phase 6) | `D:\MU\hub\src\services\policyService.ts`, `D:\MU\hub\docs\policies\orchestration-risk-policy.md` |
| Knowledge Hub: `ORCHESTRATION_ENABLED=false` fails writes before auth even runs | CONFIRMED, this project (Hub Phase 7) | `D:\MU\hub\src\index.ts` |

## Why several rows say "not independently confirmed this session"

Those ADR numbers (0008, 0016, 0020, 0022) are referenced in
`docs/README.md`'s prose but do not exist as files on this branch's
`main` (confirmed via `git ls-tree`, see [`SOURCE_INDEX.md`](SOURCE_INDEX.md)
SRC-REPO-009). This pack refuses to restate a business rule as
`CONFIRMED` from a description of a document it cannot actually read —
that would be exactly the "confident wrong guess" `docs/protocols/agent-bootstrap.md`
warns against. Treat these rows as **PROPOSED-BY-HISTORICAL-NARRATIVE,
NEEDS_VALIDATION**, not as this pack's own confirmation.
