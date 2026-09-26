---
status: ACTIVE
category: knowledge
audience: internal (product + engineering + Blood Moon AI)
lastVerified: 2026-09-26
---

# Portal / player knowledge — foundation

First structured layer of product/player knowledge for Blood Moon AI,
created in `BLOODMOON-AI-07` (2026-09-26). Internal only (`STAGE 2`):
nothing here is served to players, and no chatbot, endpoint, telemetry
or auto-publishing exists.

## Source rule (read first)

Portal knowledge is taken from **real code at the last evidenced
production deploy**, commit `1c272db` (deploy manifest
`docs/deployments/deploy-2026-09-14-api-web-production-deploy/deploy-manifest.md`
on `preservation/main-snapshot-b5a4321d`, `SOURCE_COMMIT: 1c272db…`),
plus current docs and decisions on `main`. **`main`'s own `apps/` tree is
78 commits behind that commit** (it lacks VIP, wallet, wallet transfer,
progression, bug hunters, health and more), so reading `main`'s `apps/`
would describe an older portal. Read deployed code with
`git show 1c272db:<path>`. Anything deployed after 2026-09-14 is not
evidenced and is `UNKNOWN` here.

## Files

| File | What it answers |
|---|---|
| [`PORTAL_FEATURE_INVENTORY.md`](PORTAL_FEATURE_INVENTORY.md) | What features exist, route, audience, login/role, purpose, status |
| [`SITE_NAVIGATION.md`](SITE_NAVIGATION.md) | "Where do I see X / how do I get to Y" — real routes and menu entries only |
| [`USE_CASES.md`](USE_CASES.md) | Use-case pattern + the first representative player flows |
| [`FAQ.md`](FAQ.md) | FAQ entry contract + validated entries with internal vs player-safe answers |
| [`KNOWLEDGE_GAP_LIFECYCLE.md`](KNOWLEDGE_GAP_LIFECYCLE.md) | `UNKNOWN` → gap → research → validation → promotion → answer |

## Visibility

Every entry carries one of the classifications from
`docs/architecture/bloodmoon-ai-product-vision.md` §8:
`PUBLIC_PLAYER`, `AUTHENTICATED_PLAYER`, `INTERNAL_SYSTEM`,
`OPERATIONS_PRIVATE`, `SECURITY_PRIVATE`, `SECRET_NEVER_AI_OUTPUT`.
Admin/GM routes and security mechanics are never part of a player-safe
answer.
