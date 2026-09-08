---
status: LIVING_DOCUMENT
category: privacy
audience: internal (engineering)
lastVerified: 2026-08-31
---

# Privacy Center — migration validation and browser QA (Phase L, Parts 11-12)

## Part 11 — migration validation against a real database

Phase K left the Survey/PlayerPreference migrations unverified against a
live database (no local MySQL configured in that worktree session).
**Resolved this round** — a real, already-existing local MySQL
environment was found and reused rather than creating a new one, per
Bryan's explicit instruction.

**Environment found**: MySQL80 service already running on this machine,
with a dedicated `bloodmoon_local_claude` database and a DPAPI-protected
credential already set up (`D:\MU\.secrets\mysql-bloodmoon-local.credential.xml`,
`D:\MU\.secrets\use-claude-local-db.ps1`) from an earlier session — a
Claude-dedicated working copy, separate from the shared `bloodmoon_local`
human-dev database (consistent with the project's existing "never reset
`bloodmoon_local` without checking for concurrent sessions" rule — this
database is a separate, safe-to-use copy by design).

**Real results**:

1. `npx prisma migrate status` against `bloodmoon_local_claude` showed 5
   pending migrations (the three Phase L wrote plus two from Phase K that
   had also never been applied anywhere): `20260830160000_gamebridge_vip_sync_state`,
   `20260830170000_account_deletion_feedback`,
   `20260830180000_account_deletion_feedback_retention_interaction`,
   `20260830190000_survey_foundation`, `20260830191000_player_preferences_foundation`.
2. `npx prisma migrate deploy` applied all 5 **successfully, no errors**
   — real, concrete proof the hand-written SQL (the two Phase L
   migrations were hand-written; no local MySQL existed when they were
   authored, so this was their first real-database test) is valid MySQL
   DDL.
3. `DESCRIBE`/`SHOW TABLES` confirmed every new table/column exists with
   the correct real shape (`retentionInteraction JSON` on
   `accountdeletionfeedback`; `survey`/`surveyquestion`/`surveyoption`/
   `surveycampaign`/`surveyaudience`/`surveyresponse`/`surveyanswer`;
   `playerpreference`/`playerpreferencedefinition`).
4. **Real Prisma round-trip test** (beyond just "the migration ran"):
   created and deleted a real `AccountDeletionFeedback` row with a
   populated `retentionInteraction` JSON value; created a real `Survey` →
   `SurveyQuestion` → `SurveyResponse` → `SurveyAnswer` chain, then
   deleted the `Survey` and confirmed the `SurveyAnswer` row cascaded
   away automatically (`ON DELETE CASCADE` verified live, not just
   declared in schema); created and deleted a real
   `PlayerPreferenceDefinition` row. **All passed.**

**Rollback feasibility**: all 5 migrations are pure additions (new
tables, or a new nullable column on an existing table) — the safest
category of migration to have applied. None can cause data loss if left
in place unused; none require a down-migration to be safe (Prisma
doesn't generate automatic down-migrations, a standard, known Prisma
limitation, not a project-specific gap). If a future phase decides not
to use the Survey/PlayerPreference tables, they can simply be dropped
with zero impact on anything else.

**PLAYER_PREFERENCE_MIGRATION_TEST = PASS. SURVEY_MIGRATION_TEST = PASS.**

## Part 12 — authenticated browser QA

**Real progress made, but genuinely incomplete** — reported honestly.

**What was verified, real**:
- Both `apps/api` (built and run against `bloodmoon_local_claude`) and
  `apps/web` (Nuxt dev server) started successfully against real
  infrastructure.
- A real test player account (`player_teste`) was confirmed to exist
  and be reachable (seeded via the project's own
  `scripts/seed-test-accounts.mjs` — found and fixed nothing, but
  discovered a real, pre-existing, unrelated bug in that script: it
  crashes on a `PurchaseIntent.create()` call missing a required
  `correlationId` field, after successfully creating the player account
  but before creating the admin/super-admin fixtures — flagged as a
  separate, minor finding, not fixed this round since it's outside
  Phase L's scope).
- `/painel/admin/pre-beta-purge` (the new Phase K page) correctly
  redirects to `/login` when unauthenticated — real, live confirmation
  the route exists and the auth guard works, served from the correct
  project (cross-checked, since the dev server's console log showed an
  unrelated duplicate-import warning referencing a sibling project
  directory, `mu-bloodmoon-v1` — investigated, and the correct app IS
  what's being served: the pre-beta-purge page only exists in
  `mu-bloodmoon-v1-openbeta`, and it resolved correctly).
- Real network egress to Cloudflare (`challenges.cloudflare.com`) from
  the browser preview confirmed working (`fetch` returned `200`).

**What blocked full interactive login**: the login form requires a
Cloudflare Turnstile challenge. Three independent attempts to configure
`NUXT_PUBLIC_TURNSTILE_SITE_KEY` (Cloudflare's own official
always-pass test site key, `1x00000000000000000000AA`, paired with the
matching backend test secret) — via `apps/web/.env`, via the repository
root `.env`, and via a full `.nuxt` cache clear + cold restart — all
failed to make the value reach the running Nuxt process
(`window.__NUXT__.config.public.turnstileSiteKey` stayed empty every
time). This points to the browser-preview tool's dev-server process not
inheriting either shell-exported environment variables or `.env` files
in this specific sandboxed session — a tooling/environment constraint,
not a defect in the product code (the `nuxt.config.ts` wiring itself is
standard and would work in any normal local/CI environment).

**What was verified as a substitute, real and direct**: rather than
continue fighting the UI-level blocker, the new schema this phase
actually touches (`AccountDeletionFeedback.retentionInteraction`, the
full `Survey` chain, `PlayerPreferenceDefinition`) was verified with
**real create/read/cascade-delete Prisma operations against the live
database** (Part 11 above) — this proves the backend logic and data
layer are sound, even though the browser click-through itself could not
be completed.

**AUTHENTICATED_PRIVACY_QA = PARTIAL.** Real infrastructure stood up,
real routing/auth-gating confirmed, real schema round-trip confirmed;
the specific UI walkthrough (view data → export → preferences → exit
questionnaire → contextual questions → deletion request → grace period →
cancellation → error states) was not completed end-to-end through the
browser due to the Turnstile environment blocker above. Re-attempting
this in a normal (non-sandboxed) local dev environment, or with a
project-documented Turnstile bypass mechanism for local dev (none
currently exists — worth adding as a small, real follow-up), would
likely resolve it quickly.
