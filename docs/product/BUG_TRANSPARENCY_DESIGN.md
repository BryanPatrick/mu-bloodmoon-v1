---
status: DRAFT
category: product/economy
audience: internal (product + engineering)
lastVerified: 2026-08-29
---

# Bug Transparency — Public Visibility Design (Part Y)

Goal: let players see that a bug was reported, who had the first valid report, timestamp/order, current status, severity, and eventual reward status — **without** disclosing active exploit reproduction steps.

## Public statuses (as decided)

`RECEIVED` → `UNDER_REVIEW` → `CONFIRMED` / `NOT_REPRODUCED` / `DUPLICATE` → `FIXED`

## What's safe to show publicly vs. what stays internal

| Field | Public? | Why |
|---|---|---|
| Report ID / short reference | Yes | Lets the reporter and community track it |
| Reporter (display name, opt-in) | Yes, only if the reporter opts in | Reputation/credit motivation without forcing exposure |
| Submission timestamp | Yes | Establishes first-valid-report order |
| Status (`RECEIVED`/`UNDER_REVIEW`/etc.) | Yes | Core transparency goal |
| Severity (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`) | Yes, **only once status reaches `CONFIRMED` or later** | Publishing severity on an unconfirmed report could itself hint at exploit value before triage |
| General category (e.g. "Reset", "Guild", "Market") | Yes | Helps players avoid duplicate reports without exposing mechanics |
| Reward status (pending/credited) | Yes, once determined | Matches the transparency goal directly |
| Exact reproduction steps | **Never public while exploitable** | Explicit instruction — this is the one hard line |
| Screenshots/video evidence | **Never public** | Same risk as reproduction steps, often shows the exploit directly |
| Internal triage notes | Never public | Standard practice |
| Which account/character was affected (if not the reporter) | Never public without consent | Privacy |

## Duplicate handling, made visible without exposing mechanics

When a report is marked `DUPLICATE`, the public view can show "linked to report #N" (the original) without re-exposing either report's reproduction details — this lets a player confirm their report was seen and correctly triaged without granting them insight into an unrelated exploit they hadn't found themselves.

## Relationship to the existing real schema

`PurchaseIntentStatus`/`StoreDeliveryStatus` already include a `MANUAL_REVIEW` state pattern in the real schema (confirmed this phase), and `RechargeIntentStatus` has its own `MANUAL_REVIEW` value too — the same "typed status enum with a public-safe subset" shape used here is consistent with how the rest of the codebase already models review workflows, not a new pattern invented for this feature.

## Not designed this phase

- Where this status feed actually renders (Help Center? dedicated Bug Hunters page? both?) — a UI/IA decision, not addressed here.
- Whether severity becomes visible before or after reward crediting — left as a sequencing detail for whoever implements this.
