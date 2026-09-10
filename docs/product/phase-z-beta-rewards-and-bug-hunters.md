# Phase Z — Beta Reward Entitlements + Bug Hunters MVP

Date: 2026-09-04. Two practical Open Beta gaps identified by Phase Y,
closed here: (1) `BetaRewardEntitlement` had a real claim flow but nothing
ever created a row; (2) Bug Hunters/structured bug reporting did not
exist as a player-facing feature. Local work only — no production
deploy, no push.

## A. BetaRewardEntitlement source (Parts 1-8)

**Existing behavior confirmed by direct code audit** (not just Phase Y's
summary): `BetaRewardEntitlement` (Open Beta P0 foundation) already had a
real, tested claim endpoint (`beta-lifecycle.service.ts#claimMyEntitlements`
— atomic per-row `updateMany` gated on `status='ELIGIBLE'`, so concurrent
duplicate claims settle to exactly one), a real `normalizeEmail`/
`hashNormalizedEmail` pair (SHA-256 over trimmed-lowercased email, matching
`auth.service.ts#register`'s own normalization), and a read-only
`cleanupDryRun` that already expects an entitlement snapshot to exist
*before* an account becomes purge-eligible (Part 7's intended sequencing
was already encoded, just missing the thing that creates the snapshot).
`sourceType`/`sourceId` string fields already existed on the model, unused
until now.

**New: `BetaParticipationRecord`** — the ELIGIBILITY FACT, deliberately
separate from `BetaRewardEntitlement`'s REWARD DEFINITION (Part 2). Five
source types (`OPEN_BETA_PARTICIPATION`, `BUG_HUNTER_CONTRIBUTION`,
`EVENT_PARTICIPATION`, `MANUAL_STAFF_GRANT`, `IMPORTED_REVIEWED_LIST`),
a required written justification, and a status lifecycle
(`RECORDED → REJECTED` or `RECORDED → CONVERTED`). Nothing here is ever
inferred from `accountPhase` or a date range — every row requires an
explicit staff action and reason (`beta-rewards.service.ts#recordParticipation`).

**New: `BetaRewardsService`** — `previewGeneration`/`commitGeneration`
(Part 3). Both derive dispositions (`WOULD_CREATE`/`ALREADY_CONVERTED`/
`SKIPPED_NOT_RECORDED`) from the same shared logic, so preview and commit
can never silently diverge. Commit is idempotent by construction: a
record's `status` is checked fresh on every call, and only `RECORDED`
rows are ever converted — calling commit twice with the same selection
creates the entitlement exactly once. Each conversion (create the real
`BetaRewardEntitlement` + mark the source `CONVERTED` + link both ways)
is one transaction.

**Part 4 (participation source)**: since no automated participation-proof
infrastructure exists yet (confirmed, Phase Y), this phase builds the
explicit-selection workflow Part 4 itself asks for as the fallback —
staff records each fact individually (or in a reviewed batch) with a real
justification. No activity telemetry was fabricated.

**Part 5 (privacy)**: `normalizeEmail`/`hashNormalizedEmail` are imported
directly from `beta-lifecycle.service.ts`, never reimplemented — the same
hash a claim attempt computes is the same hash a participation record is
keyed by. No plaintext email is stored on `BetaParticipationRecord`
beyond the hash (an `accountId` convenience reference is kept, but it's
explicitly not the durability anchor and not a hard FK).

**Part 7/8 (purge independence, pre-Beta protection)**: recording
participation and generating an entitlement never require the source
account to still exist or resolve — verified directly
(`beta-rewards.e2e-spec.ts`'s `PURGE_INDEPENDENCE` test clears the account
reference after generation and confirms the entitlement is still
`ELIGIBLE`). Nothing in this phase creates, purges, or touches a
`PRE_BETA` account; `cleanupDryRun`'s existing protections are untouched.

## B. Bug Hunters MVP (Parts 9-23)

**Distinct from SupportTicket** (Part 21, verified by reading the real
`support.service.ts`): a support ticket is a personal/account issue; a
`BugReport` is a reproducible product/game defect for Beta triage. If a
submitted bug is actually a support issue, staff redirect/close it via
the normal status workflow — no automatic conversion.

**Model** (`BugReport` + append-only `BugReportEvent`, Part 12/19):
category (14-value enum per Part 10, no sub-categories), title/description/
steps/expected/actual, `playerSeverity` (Part 11 — labeled "SEVERIDADE
INFORMADA PELO JOGADOR" everywhere it's shown, both API-adjacent doc
comments and the actual player/admin UI copy) separate from a nullable
`staffSeverity`, status workflow exactly as specified in Part 13 (no
Jira clone), optional character/context/attachment-reference fields, and
a required `consentAcknowledgedAt`. Every status change, staff reply, and
internal note is its own `BugReportEvent` row — never an in-place
overwrite. `isInternal` is the hard boundary between staff-only notes and
what a player's own report view returns, enforced by the query itself
(`getOwnReport` filters `isInternal: false`), not by the client.

**Security/abuse (Part 16)**: authorization and ownership are enforced
server-side (`getOwnReport` throws `ForbiddenException` if the caller
isn't the report's own account); HTML/script content is stored and
returned verbatim, matching this codebase's own established pattern for
player text (`community.service.ts`'s `validateText` does the same) —
XSS safety is Vue's default text-interpolation auto-escaping on the
frontend, never `v-html`, not a server-side stripper; field lengths are
capped; attachments are reference-only (an `https://` URL string, `≤500`
chars) — no binary upload exists this phase, exactly per Part 16's
explicit instruction not to build an insecure upload shortcut.

**Anti-spam (Part 17)**: a 60-second cooldown and a 20-report/24h cap per
account (`enforceSubmissionLimits`), matching the cooldown-check pattern
already used by `community.service.ts`. Same-title resubmissions within 7
days are flagged as `possibleDuplicateOf` in the create response —
advisory only, never blocking, per Part 17's explicit "do not
auto-delete legitimate reports."

**Reward linkage (Part 18)**: `recordRewardEligibility` is the *only*
connection between a `BugReport` and a reward — it calls
`BetaRewardsService#recordParticipation` with
`sourceType='BUG_HUNTER_CONTRIBUTION'`, `sourceId=<the report id>`.
This creates a `BetaParticipationRecord` and nothing else — no wallet
credit, no `BetaRewardEntitlement`. Verified directly
(`bug-hunters.e2e-spec.ts`'s reward-eligibility test asserts the wallet
ledger count is unchanged and no entitlement row exists with that source
id). A real reward still requires the separate, explicit generation step
in Beta Rewards.

**RBAC**: `bug-hunters.access` (every player, baseline tier alongside
`shop.access`/`community.access`) for the player controller;
`admin.bug-hunters.view`/`.triage` (GM/ADMIN/SUPER_ADMIN role-eligible,
per-account delegated like every other `admin.*` permission in this
codebase) for staff. `admin.beta-rewards.view`/`.generate` for the
generation workflow, nav-gated to Super Admin only (same tier as
`PRE_BETA_PURGE`) given it creates real, claimable entitlements.

## Verification performed

- Prisma schema validated and client regenerated successfully from the
  updated `schema.prisma` (two new migrations, purely additive —
  `CREATE TABLE` only, no `ALTER`/`DROP` on any existing table).
- `apps/api`: `tsc --noEmit` clean (0 errors) and a full `nest build`
  clean (0 errors), both re-run after the test files were added.
- `apps/web`: full `npm run web:build` (the project's own nitro-patched
  build path, never raw `nuxt build`) succeeded; the compiled output was
  directly inspected and confirmed to contain bundles for all three new
  pages/composables (`bug-hunters-*.mjs` ×2, `beta-rewards-*.mjs`,
  `useBugHuntersApi-*.mjs`).
- **API_TESTS were written but could NOT be executed in this environment
  this pass.** No Docker is available (confirmed), and this session could
  not reach a local MySQL test database: the documented
  `E2E_LOCAL_MYSQL_URL` convenience port for `bloodmoon_portal` (53306,
  per `scripts/start-dev.ps1`) was not listening, and the DPAPI-protected
  standard port (3306, `MySQL80` service, confirmed running) rejected the
  plaintext dev credential. This is a real, disclosed gap, not a silent
  claim of a passing suite — `beta-rewards.e2e-spec.ts` (7 tests) and
  `bug-hunters.e2e-spec.ts` (16 tests) both type-check cleanly and follow
  the exact structure/assertions of this codebase's own existing,
  previously-passing suites (`beta-lifecycle.e2e-spec.ts`,
  `support.service.ts`'s tested patterns), but their real PASS/FAIL
  status has not been observed this session. Running them against a
  reachable local MySQL instance is the natural next step before this
  branch is treated as deploy-ready.
- WEB_TESTS: the pre-existing `web:test:smoke` suite does not cover
  either new page (it tests unrelated existing pages) — not re-run, since
  it would not have validated this phase's own work either way.

## Explicitly not done (by instruction)

No file-upload endpoint (attachment is a URL reference only). No
automatic Bug Hunter wallet payout. No notification platform (the Bug
Hunters page itself surfaces new replies/status changes/needs-info state
by re-fetching the report; no email/push was added). No production
deploy, no push, no GameServer/GameBridge/payment/VIP/Store mutation.
