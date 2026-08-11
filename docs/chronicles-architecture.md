# Blood Moon Chronicles MVP

## Public experience

The first public route is `/gazeta`. The visual name is **Gazeta de Lorencia**, while implementation names remain generic under `Chronicles` so the product can be renamed later.

Prepared future routes, not implemented in this MVP:

- `/gazeta/[slug]`
- `/gazeta/edicao/[slug]`

## Current source of truth

The MVP reuses the existing `KnowledgeEntry` CMS and public content API.

- `NEWS` and `EVENT` entries with `PUBLISHED` status and `SEASON_6` scope are read by the Gazeta.
- Related `ReferenceAsset` images are reused when they have a public path.
- Existing admin CRUD, permission `admin.content.manage`, and audit trail remain the editorial administration surface.
- No database schema, Guilds, Community, Commerce, Marketplace, or launcher module was changed.

The existing editorial status mapping is:

| Chronicle concept | Current CMS status |
| ----------------- | ------------------ |
| DRAFT             | RAW                |
| IN_REVIEW         | REVIEWED           |
| APPROVED          | APPROVED           |
| PUBLISHED         | PUBLISHED          |
| ARCHIVED          | ARCHIVED           |

`SCHEDULED` is not supported by `KnowledgeEntry` today. Scheduling is a future CMS enhancement and must not be simulated by the public page.

## Real content and demo content

`useChronicles` first requests published `NEWS` and `EVENT` entries. When at least one entry exists, the page renders only CMS content.

When the API is unavailable or contains no published editorial entries, `chronicles.demo.ts` supplies presentation-only stories. Every demo story has:

- `source: DEMO`
- `isDemo: true`
- a code comment stating it is not telemetry

The page also renders a visible notice explaining that the edition is demonstrative. Daily, weekly, and monthly cards never display invented counts.

## Future event pipeline

```text
Operational or game event
  -> Chronicle candidate
  -> configurable safety and relevance rules
  -> editorial review
  -> article or edition
  -> publication
```

Automatic ingestion is outside this MVP. Potentially offensive, accusatory, or player-targeted content must always be reviewable before publication.

## Future integrations

Published chronicles may later expose stable cards for:

- Community feed labels `OFICIAL`, `GAZETA`, and `CHRONICLE`
- launcher highlights
- Discord and social media
- newsletters
- season retrospectives, narration, and cinematics

Audio/TTS and video generation are intentionally represented only as disabled `Em breve` previews.
