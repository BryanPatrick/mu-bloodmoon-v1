---
status: ACTIVE
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0003: `PixPayments` preserved but never integrated

**DATE**: 2026-08-31 (Phase L Decision Closure, Decision 4)
**STATUS**: ACTIVE

## CONTEXT

A real, deliberately-designed table named `PixPayments` exists in the
GameServer database (`TxId`/`Account`/`Valor`/`PixPgmtAprovado`/
`PixResgatado`/`DataCriacao`/`DataPagamento`, confirmed via `sys.columns`,
and via the real `CREATE TABLE` script found in two independent
production-derived snapshots outside this repo). It has **0 rows** and
**no confirmed writer** anywhere searched — including, as of the
2026-08-31 provider-web second pass, an exhaustive re-check of every
payment gateway (old and new generation) in the legacy `hostbr-web` CMS,
which found zero references to it. A real, separate PIX integration
*was* found in that same legacy CMS (a Gerencianet plugin) but it writes
exclusively to its own `DmN_Donate_Gerencianet_*` tables, never to
`PixPayments`. Full detail: `docs/payments/payment-surfaces-comparison.md`,
`docs/legacy/provider-web/payments-legacy.md`.

## DECISION

`PixPayments` is classified **PRESERVE_DORMANT / DO_NOT_INTEGRATE /
DO_NOT_DELETE**:

- Document it (done — `docs/payments/payment-surfaces-comparison.md`).
- Do not insert new records into it.
- Do not build any integration against it.
- Do not remove the table at this stage.
- In a future payment phase, consider it only as a historical
  reference/retirement-review object — never a second payment
  infrastructure.

The active payment source of truth remains, unambiguously, Portal →
`Order` → `Payment` → Mercado Pago → Delivery → Ledger
(`apps/api`'s own payment modules). This decision also formalizes, for
the record: DmN legacy payment gateways (all of them, including the
newer plugin-architecture ones) = LEGACY/DEAD; `PixPayments` = DORMANT;
Portal Payment architecture = ACTIVE SOURCE OF TRUTH. No parallel payment
flow is permitted.

## WHY

A table this specifically shaped (`PixPgmtAprovado`/`PixResgatado` are
purposeful, PIX-domain-specific names, not generic placeholders) was
clearly built for a real purpose at some point, even though no writer has
ever been found across an exhaustive search of both the local backup
sources available and the GameServer's own procedure catalogue. Deleting
it destroys potentially-relevant historical schema with no way to recover
it later if a writer is eventually found (e.g., in a source not yet
discovered, or via future direct confirmation from Bryan). Integrating
against it without knowing what wrote it, or whether it was ever
trustworthy, would risk building on an unverified foundation. Preserving
it untouched costs nothing and keeps every future option open.

## ALTERNATIVES CONSIDERED

- **Delete it as dead schema**: rejected — irreversible, and the table's
  purposeful column naming suggests it may have real historical meaning
  not yet understood; deletion forecloses future investigation for no
  benefit (0 rows means it isn't costing anything to keep).
- **Integrate it as a second PIX payment path**: rejected outright — this
  project has one active payment source of truth (Portal → Mercado
  Pago), and a second, unaudited, unverified-provenance payment table
  would directly violate that architecture and create real financial
  reconciliation risk.
- **Treat it as equivalent to the Gerencianet plugin's tables and migrate
  its intent forward**: rejected — no evidence connects it to Gerencianet
  or any other confirmed gateway; conflating them would be building on a
  guess, not a finding.

## CONSEQUENCES

- Any future payment-integration work must treat `PixPayments` as
  out-of-scope by default; a decision to change this classification
  requires a new, explicit decision, not silent inclusion in a broader
  payments phase.
- The table remains available for future forensic investigation (e.g., if
  a production incident or a newly-found source ever surfaces evidence of
  its real writer).
- No code in this repository references `PixPayments` today, and this
  decision means none should be added without first revisiting this ADR.

## RELATED SYSTEMS

`docs/payments/payment-surfaces-comparison.md`,
`docs/legacy/provider-web/payments-legacy.md`,
`docs/legacy/provider-web/database-mapping.md`.
