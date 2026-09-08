---
status: ARCHITECTURE_FOUNDATION_ONLY
category: product
audience: internal (engineering + product)
lastVerified: 2026-08-30
---

# Survey system — architecture foundation (Phase K, Part 15)

Schema-level foundation for the future periodic player-questionnaire
system discussed with Bryan. **No frontend/admin UI is built against
this yet** — deliberately, per Bryan's explicit "do not build an
unnecessarily huge frontend now." What exists today: 7 Prisma models,
migrated but not yet used by any endpoint or page.

## Models (`apps/api/prisma/schema.prisma`)

- **`Survey`** — the question set itself. `participationMode` is set
  per-survey (`ANONYMOUS`/`IDENTIFIED`), never per-response — a survey is
  either anonymous or identified by design, so a response can never
  silently reintroduce identity into a survey meant to stay anonymous.
- **`SurveyQuestion`** / **`SurveyOption`** — ordered questions, each with
  a `type` (`SINGLE_CHOICE`/`MULTI_CHOICE`/`RATING`/`FREE_TEXT`) and
  `required` flag; options belong to a question.
- **`SurveyCampaign`** — a named run of a `Survey` against a
  `SurveyAudience`, on a `SurveyTriggerType`
  (`ACCOUNT_AGE`/`FIRST_RESET`/`POST_EVENT`/`POST_SUPPORT`/
  `POST_PURCHASE`/`OPEN_BETA`/`MANUAL_CAMPAIGN`/`PERIODIC`). Kept
  separate from `Survey` so the same question set can be reused across
  multiple campaigns.
- **`SurveyAudience`** — deliberately generic (`ruleType`/`ruleValue`
  strings) rather than a rigid per-criterion schema, since audience-
  targeting rules are a product decision not yet made. Reserves the
  shape rather than guessing at the rule engine.
- **`SurveyResponse`** — `accountId` nullable and NOT a relation field,
  mirroring `AccountDeletionFeedback`'s precedent (`account-deletion-architecture.md`):
  an `IDENTIFIED`-mode response may still need to outlive the account
  (anonymized via `anonymizedAt`, not cascaded); an `ANONYMOUS`-mode
  response never populates `accountId` at all.
- **`SurveyAnswer`** — one row per question answered, `optionId` for
  choice questions, `freeText` for open text.

## What this enables later (not built now)

An admin survey-builder UI, a player-facing survey-taking UI, trigger
wiring (e.g. a `POST_SUPPORT` campaign firing after a ticket closes), and
audience evaluation logic against `SurveyAudience` rules. None of this
exists yet — this document exists so a future phase has real tables to
build against instead of re-deriving the shape from scratch.

## Explicit constraints honored

- **No manipulative mandatory surveys** — nothing in this schema forces
  participation; `required` is per-question (can a question be skipped
  within a survey the player already chose to take), never per-survey
  (a survey itself is never mandatory).
- **Anonymous where appropriate, identified where justified** —
  `participationMode` makes this an explicit, per-survey decision, not
  an afterthought.
- **Start/end date, target audience, results aggregation** — `startDate`/
  `endDate` on `SurveyCampaign`, `SurveyAudience` for targeting;
  aggregation itself (a reporting query/endpoint) is not built yet — the
  schema supports it (group `SurveyAnswer` by `questionId`/`optionId`)
  but no query was written this round.

## Verification this round

`npx prisma generate` — clean, no schema errors. `npx tsc --noEmit` on
`apps/api` — clean. The migration
(`prisma/migrations/20260830190000_survey_foundation/`) was hand-written
(no live local MySQL was configured in this worktree session to run
`prisma migrate dev` against) and has **not been applied to a database
this round** — flagged honestly, not silently assumed applied.
