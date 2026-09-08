---
status: LIVING_DOCUMENT
category: privacy
audience: internal (engineering + product + legal review)
lastVerified: 2026-08-30
---

# Privacy Center — status overview (Phase K, Part 14)

The real, current state of `/painel/privacidade` ("Privacidade e meus
dados") against the 7 areas Bryan named. Per his explicit instruction,
this document does not present unsupported functionality as complete.

| Area | Status | Real implementation |
|---|---|---|
| View my personal data | **COMPLETE** | `usePrivacyApi.exportMyData()` → `GET /account/deletion/export`, rendered inline on the page |
| Request data copy (export) | **COMPLETE** | Same endpoint, downloaded as a JSON file client-side |
| Correct editable personal information | **PLANNED (EM BREVE)** | No self-service correction endpoint exists; the page explicitly says so and points to support instead — never presented as available |
| Manage optional consent/preferences | **PARTIAL** (Phase K) | The `PlayerPreference` architecture now exists (see below) with an ESSENTIAL/OPTIONAL split, but no player-facing UI to toggle individual preferences was built this round — the page still shows "EM BREVE" for this, honestly |
| Deletion request | **COMPLETE** | Full self-service flow: contextual exit questionnaire (12 reasons, per-reason follow-up, retention offers) → two-step explicit confirmation → emailed-token confirmation → grace period |
| Deletion status | **COMPLETE** | `NONE`/`REQUESTED`/`CONFIRMED`/`CANCELLED`/`EXECUTED`, rendered with the real scheduled-execution date |
| Cancellation during grace period | **COMPLETE** | One-click cancel while `CONFIRMED`, re-loads status immediately |

## Player preferences foundation (Phase K, new this round)

A reusable preference architecture — schema only, no UI yet, mirroring
the survey foundation's own scope discipline (`docs/product/survey-foundation.md`).

- **`PlayerPreferenceDefinition`**: the catalog of preference keys
  (`ANNOUNCEMENTS`, `PROMOTIONAL_MESSAGES`, `SURVEY_INVITATIONS`,
  `SOCIAL_VISIBILITY`, `GUILD_INVITATIONS`, `FRIEND_REQUESTS`,
  `LAUNCHER_NOTIFICATIONS`, `EVENT_REMINDERS`), each tagged
  `ESSENTIAL` or `OPTIONAL`.
- **`PlayerPreference`**: one row per (account, definition), the
  player's actual choice (`enabled: Boolean`).
- **Hard constraint, enforced at the data layer**: `ESSENTIAL`
  preferences have no player-facing toggle at all in this schema design
  — the UI (when built) must only ever render `OPTIONAL` definitions as
  togglable. Security messages and account-critical/required service
  notifications are never modeled as optional preferences in the first
  place, so there is no toggle to accidentally expose.

See `apps/api/prisma/schema.prisma` for the real model definitions.

## What Part 14 does NOT claim

This document does not claim the Privacy Center is finished — data
correction and consent-preference UI remain genuinely unbuilt, marked
`EM BREVE` in the product itself, not silently implied. The roadmap
classification for this area in `docs/README.md` reflects the same
honest `PARTIAL` status.
