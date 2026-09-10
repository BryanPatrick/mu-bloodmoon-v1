---
status: ACTIVE — desired-state + effective-state layers implemented and tested locally; no runtime sync
category: decisions
audience: internal (product + engineering)
lastVerified: 2026-09-02
confidence: CONFIRMED (real code, 25 tests across 3 suites, no production change)
---

> **CANONICALIZATION UPDATE (2026-09-09, Recovery Batch 4)**: the
> feature this ADR documents (Legacy Catalog control plane) is now
> `INTEGRATED` into `integration/open-beta` (merged via
> `feature/legacy-catalog-control-plane`, M4 of the integration
> execution). This ADR itself had never been canonicalized alongside
> its own code until now. `INTEGRATED` is a Git-integration fact only
> -- it does **not** mean `DEPLOYED`; production status remains
> `NOT_DEPLOYED_CONFIRMED` per the integration manifest's own
> migration-status table. The rest of this document is preserved
> exactly as written at Phase T close.

# ADR-0024: Legacy Shop Control Plane — effective-state refresh, bulk operations, sync kill-switch

**DATE**: 2026-09-02 (Phase T)
**STATUS**: ACTIVE. Extends ADR-0023's desired-state layer with effective-
state comparison, bulk desired-state operations, and a real (but
disabled-by-default) sync permission/flag boundary. Still no GameServer
write capability anywhere in this system.

## CONTEXT

Phase S built the desired-state foundation (`LegacyCatalogItem`, 180
rows, RBAC, a basic admin UI). Bryan's own long-term direction is for
ordinary X-Shop/CashShop catalog administration to move into the Portal,
avoiding manual server-file edits for normal operations. Phase T is the
second increment toward that: it does not build real sync (the
architecture boundary ADR-0023 established — apps/api holds no live
GameServer credential — is unchanged), but it builds everything on the
Portal side that doesn't require one: a real effective-state comparison,
bulk operations, search/filtering, an audit-visible history view, and
the exact permission/flag boundary a future sync phase would plug into.

## DECISION 1 — `desiredEnabled`: ENABLED != APPROVED, a real, separate field

Added `desiredEnabled: Boolean` to `LegacyCatalogItem`, independent of
`commercialStatus`/`purchasable`. A row can be `desiredEnabled=true` and
`commercialStatus=BLOCKED` simultaneously — e.g. Bryan's own named future
uses for the 153 RED items (technical testing, GM/admin use, a
controlled event) require exactly this combination. The permanent-block
guard in `LegacyCatalogConfigService#update` was deliberately scoped to
`purchasable`/`APPROVED`/`PUBLISHED` only — `desiredEnabled` is NOT
gated by it, by design, proven by a real test
(`ENABLED_NOT_EQUAL_APPROVED`).

## DECISION 2 — effective-state refresh: a real "local import," not a live GameServer read

`legacy-catalog-effective-state.service.ts` reads a **committed
snapshot file**
(`docs/economy/legacy-catalog-effective-state-snapshot.json`), never a
live connection. The snapshot itself was generated this phase from a
fresh RemoteOps re-download of both source files, with each file's
SHA256 hash independently re-verified against the live production
GameServer at generation time (`921A7522...`/`1FBA8470...` — identical
to the copies Phase R/S already used, confirming zero drift since
then). This preserves the exact boundary ADR-0023 established: **apps/api
still never holds a live GameServer/RemoteOps credential as a runtime
dependency** — refreshing effective state is an operator action (re-run
the RemoteOps download, regenerate the snapshot, commit it), not a
button that reaches out to production from inside a request handler.

The refresh service populates only `effective*`/`driftStatus`/
`sourceLastReadAt`/`sourceFingerprint` — proven by a real test
(`EFFECTIVE_REFRESH_PRESERVES_DESIRED_STATE`) that every desired-state
field (`desiredEnabled`, `internalNotes`, `commercialStatus`, etc.) on a
real row is byte-identical before and after a refresh.

**Drift computation** (`computeDrift`): a row with `desiredEnabled=false`
(untouched default) against a real GameServer row that is live
(`enabled=true`, since row presence is the real enable mechanism —
Decision 3 below) is correctly reported `DRIFT_DETECTED` — proven live
against "Kris" this phase. This is real drift, not a false positive: the
Portal genuinely has no record of wanting this row enabled, while it
demonstrably is, on the real server.

## DECISION 3 — enable/disable mechanism: row presence, not a field (re-confirmed)

Re-confirmed, not re-guessed: neither `CustomXShop.txt` nor
`CashShopProduct.txt` has a boolean "Enabled" column. The only observed
mechanism in this shop-file family is commenting a row with `//`
(demonstrated in `CustomBuyVipAndCoin.txt`'s own disabled example rows,
Phase R). `CustomXShop.txt` additionally carries one unexplained bare
value (`0`) between its title comment and column header — reported as
`UNKNOWN_LIKELY_GLOBAL_TOGGLE_OR_RESERVED`, not asserted as a confirmed
system-wide switch. See the full field-by-field matrix in
`docs/economy/xshop-cashshop-config-field-matrix.md`.

## DECISION 4 — bulk operations: a closed, safe action enum

`LegacyCatalogConfigService#bulkUpdate` accepts exactly seven actions
(`mark-blocked`/`mark-review-required`/`hide`/`set-open-beta-allowed`/
`set-open-beta-disallowed`/`set-full-release-allowed`/
`set-full-release-disallowed`) — never a generic "bulk patch any field"
endpoint. Price/currency/options are structurally impossible to bulk-
edit (they are not represented in the action enum at all), matching
Bryan's own explicit instruction. Every bulk action still requires a
real reason and is audited **per affected row** (not one blob entry for
the whole batch — a real gap found and fixed this phase: an
earlier, batch-level-only audit entry was invisible to any individual
row's own history view, since `AuditEvent` has one `targetId`, not a
list). A shared `correlationId` still lets an operator find every row a
given bulk action touched.

## DECISION 5 — sync: permission-gated AND flag-gated AND unimplemented, three independent reasons it can never fire

`LegacyCatalogConfigService#sync(channel, user)` is the concrete shape
Part 17/18 asked for, deliberately built as a guard with nothing behind
it:

1. Requires `admin.store.legacy-catalog.sync` specifically (not `.edit`)
   — an admin with edit-only access is rejected, proven by a real test.
2. Checks `XSHOP_RUNTIME_SYNC_ENABLED`/`CASHSHOP_RUNTIME_SYNC_ENABLED`
   (env flags, matching this codebase's own existing
   `MERCADO_PAGO_REFUND_ENABLED` precedent — no new settings framework
   was built, per `docs/knowledge/settings-architecture-direction.md`'s
   own "do not invent a sixth incompatible mechanism" instruction).
   Neither flag is set in any environment this project ships — default
   is OFF everywhere, proven by a real test even for `SUPER_ADMIN`.
3. Even if both of the above passed, the method's own body still throws
   `NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE` — there is no command
   dispatch code behind the guard at all. This is deliberate: the
   reload/restart requirements for every field remain `UNKNOWN` (the
   field matrix's own honest conclusion), so no real command could be
   correctly implemented yet regardless of the permission/flag question.

## DECISION 6 — search and filters

`LegacyCatalogConfigService#list` now supports search (item name OR
`legacyKey` substring match — proven to still find the 3 dead Axes rows
by their technical ID even though their `itemName` is a placeholder) and
filters for `desiredEnabled`/`effectiveEnabled`/`currencyDesired`/
`openBetaAllowed`/`fullReleaseAllowed`/`driftStatus`, in addition to
Phase S's existing `channel`/`commercialStatus`/`bryanDecision`.
Category-based search (X-Shop's `technicalIdentifiers.category`) was
considered and deliberately deferred — MySQL JSON path filtering via
Prisma adds real complexity for a filter dimension name/legacyKey search
already substantially covers (a category name like "Wings" also appears
in several item names).

## Part 10 — one deliberate correction to Phase S's own initial-state choice

Decision 2 (the 12 accessories) now seed as `commercialStatus=REVIEW_REQUIRED`,
not `BLOCKED` as Phase S originally chose — Bryan's own Part 10
instruction explicitly specified this. Decision 1 (153 RED) and Decision
3 (3 dead rows) remain `BLOCKED`, unchanged. This is a scoped, deliberate
revision to one bucket, not a silent reinterpretation of the whole
policy — the change is visible in `legacy-catalog-config.service.ts`'s
own inline comment at the exact line it applies.

## ALTERNATIVES CONSIDERED

- **A live GameServer read for effective state (wiring RemoteOps/SSH
  into apps/api)**: rejected again this phase, same reasoning as
  ADR-0023 — a real architecture/security decision this phase does not
  make unilaterally. The committed-snapshot approach delivers genuine,
  hash-verified real data without that tradeoff.
- **One audit entry per bulk batch instead of per row**: rejected after
  finding it broke per-item history visibility — see Decision 4.
- **A new unified settings/feature-flag system for the sync kill-switches**:
  rejected — no such system exists in this codebase yet
  (`docs/knowledge/settings-architecture-direction.md` is a direction
  document, not an implementation), and building one now would be
  disproportionate to two boolean flags when an established env-var
  pattern already exists and is already used for an analogous case
  (Mercado Pago refund/poll flags).
- **Letting `desiredEnabled` inherit the Decision 1/3 permanent-block
  guard**: rejected — would have prevented Bryan's own named legitimate
  future uses (GM/admin use, controlled events) for RED items.

## CONSEQUENCES

- The Portal now has a real, tested, evidence-grounded view of drift
  between what it wants and what the GameServer actually has — the
  first real step toward the long-term sync architecture, without
  taking on live GameServer write/read risk this phase.
- Bulk operations make managing 180 rows practical without 180
  individual edits, while remaining structurally incapable of bulk
  price/option changes or bulk-approving RED items.
- The sync permission/flag/no-implementation triple-guard means a
  future phase can add real command dispatch behind `#sync()` without
  needing to first invent the RBAC or kill-switch boundary — both
  already exist and are already tested.
- Reload/restart requirements remain the real, honest blocker to any
  actual sync implementation — unchanged by this phase, not solvable
  without either engine source or a live non-production test instance.

## RELATED SYSTEMS

`apps/api/src/modules/commerce/legacy-catalog-config.service.ts`
(bulk/search/sync additions), `legacy-catalog-effective-state.service.ts`
(new), `apps/api/prisma/schema.prisma` (`desiredEnabled`, `effective*`,
`sourceLastReadAt`, `sourceFingerprint`, `NOT_MANAGED` drift state),
`apps/api/prisma/migrations/20260902110000_phase_t_legacy_catalog_effective_state/`,
`docs/economy/legacy-catalog-effective-state-snapshot.json` (new, real
data),
`docs/economy/xshop-cashshop-config-field-matrix.md` (new),
`apps/api/test/store-legacy-catalog-phase-t.e2e-spec.ts` (new),
`apps/web/pages/painel/admin/catalogo-legado.vue` (tabs, detail drawer,
bulk bar, drift column),
`apps/web/composables/useLegacyCatalogApi.ts`,
`docs/decisions/0023-store-catalog-decision-closure.md`,
`docs/knowledge/settings-architecture-direction.md`.
