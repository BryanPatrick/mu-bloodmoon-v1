# Asset inventory (Etapa 19.8)

What exists, what was searched for and not found, and what's actually
missing. See [`visual-identity.md`](./visual-identity.md) for the identity
these assets express, and [`visual-audit.md`](./visual-audit.md) for how
they're used (or not used) across pages.

## Designer material search — what was found

A broad search (`docs/`, `references/`, `work/`, repo root) for anything
resembling a designer's asset-request list — files or content mentioning
"pendente", "falta", "solicitado", "TODO asset", "briefing", or similar —
**found nothing matching that description checked into this repository.**
What exists instead is **art-direction reference material**, which is a
different thing (guidance for art that already exists in iterations, not a
request list for art that's missing):

- `references/visual/README.md` + 16 images — character art direction
  (Elfa, Dark Lord), two logo references, one UI-icon-style reference. Full
  detail in `visual-identity.md`.
- `references/game-assets/README.md` + `reference-index.json` — in-game
  item/equipment art harvesting catalog (2,024 items), unrelated to UI
  branding.
- `apps/web/public/dev-references/` — an exact mirror of `references/visual/`
  plus extra reference material not documented in the README:
  `poses-modelo-preview-1/2/3.jpeg` (generic stock fashion-photography
  poses — a body-language/stance reference for artists, not BloodMoon
  content) and `tooltips/tooltip-ancient-raves-plate-armor-{top,bottom}.png`
  (equipment tooltip crop references, relevant to the Wiki/equipment system,
  not to this etapa's branding/achievements scope).

**If a designer asset-request list exists, it is not in this repository.**
The operator should confirm whether one exists outside the repo (e.g. in a
task tracker, a shared drive, or a chat thread) before this gap is treated
as "nothing was ever requested."

## What exists — production assets (`apps/web/public/`)

| Category                | Location                                                                        | Count / size                                                                          | Notes                                                 |
| ----------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Logo                    | `images/logo-bloodmoon.png`                                                     | 1 file, 1.6 MB                                                                        | Matches designer reference (see `visual-identity.md`) |
| Hero art                | `images/hero-elfa-noria.png`, `guide-elfa-hero.png`, `guide-dark-lord-hero.png` | 3 files, 2.2–2.8 MB each                                                              | Real, on-brief production art                         |
| Class mascots (chibi)   | `images/characters/chibi/`                                                      | 7 files, one per Season 6 class                                                       | Real art; live-page usage not yet confirmed           |
| Equipment/item art      | `images/game-assets/guiamuonline/items/original/`                               | 916 files                                                                             | Wiki/equipment reference art                          |
| Wiki section art        | `images/game-assets/guiamuonline/wiki-sections/original/*`                      | ~1,800 files across 8 sections (events/quests/skills/tutorials/drops/npcs/maps/spots) |                                                       |
| Full equipment sets     | `images/game-assets/muonlinefanz/full-sets/original/`                           | 37 files                                                                              |                                                       |
| Elf-class dev reference | `dev-references/game-assets/muonlinefanz/elf/**`                                | ~157 files across armor/weapons/shields/etc.                                          | Dev-only, mirrors external research                   |
| Socket items            | `dev-references/socket-items/original/`                                         | 192 files                                                                             | Dev-only                                              |
| Favicons                | `favicon.ico`, `favicon.png`, `favicon.svg`                                     | 3 files                                                                               |                                                       |
| Downloads               | `downloads/`                                                                    | **0 real files** — only a `README.md` placeholder note                                | See gap below                                         |

No stub/placeholder-named files (`placeholder`, `temp`, `TODO`, `test`) were
found anywhere under `public/`. Every image asset inspected is real,
sizable production or reference art — this project does not have a
"generic stock icon" placeholder problem. The gaps that exist are gaps of
**absence** (nothing there yet) or **wiring** (asset exists but isn't
referenced from where it should be), not gaps of **low quality**.

## Confirmed gaps

1. **`public/downloads/` has no actual downloadable files.** `pages/downloads.vue`
   is a fully built page on the `bm-*` design system, but there is nothing
   real behind its download links yet. This is a content/ops gap (someone
   needs to produce and host the actual client/launcher build), not a
   visual-design gap — flagged here because it's the one clear
   "asset completely absent" finding from this audit.
2. **Achievement icons: zero exist.** Confirmed via the Prisma
   `CommunityAchievement`/`CommunityBadge` tables — no seed data, no
   migration inserts, no fixture file defines a single real achievement or
   badge. `imageUrl` is a free-text URL field with no upload pipeline behind
   it. Full detail in `achievements-visual-system.md`.
3. **`ui-icones-translucidos-microsoft.png` (translucent/glass icon
   reference) has no implementation yet** — see `visual-identity.md`'s icon
   section. Not urgent for beta by itself, but relevant if the operator
   wants achievement-icon containers (or any icon containers) to use a glass
   treatment matching this reference.

## Confirmed non-gaps (checked, found fine)

- Logo: real, matches reference (see `visual-identity.md`).
- Hero/character art: real, on-brief.
- No broken external image dependencies (no `unsplash`/`picsum`/stock-host
  URLs anywhere in `apps/web`).
- No emoji-as-icon usage anywhere in `apps/web`.
- Icon system (`lucide-vue-next` + `BloodMoonIcon.vue`) is internally
  consistent, not fragmented across multiple libraries.

## Recommended next step (not done in this etapa)

Confirm with the operator whether a designer asset-request list exists
outside this repository. If one does, it should be imported into this
document (or a new one linked from here) so future etapas don't have to
re-search for it.
