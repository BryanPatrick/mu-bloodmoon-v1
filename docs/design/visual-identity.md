# Visual identity — what BloodMoon actually is (Etapa 19.8)

This document catalogs the **existing, designer-approved** visual identity of
BloodMoon. It does not invent a new identity. Where the project already has a
document for something, this file points at it instead of duplicating it:

- **The most specific, authoritative source found so far**: the Figma UI
  Specification & Developer Handoff v1.5, transcribed in
  [`figma-handoff-v1.5.md`](./figma-handoff-v1.5.md) — exact color tokens,
  grid, typography, and per-page (Home/Marketplace/Wiki) Figma node specs.
  It was shared directly by the operator, not found in the repository during
  the original audit — read it first if you need precise values.
- **Target UI direction, component classes, migration order**: already fully
  documented in [`docs/design-system.md`](../design-system.md) ("liquid
  glass / glassmorphism", `bm-liquid-*` classes, `bm-panel`/`bm-glass`
  explicitly marked as "old, still accepted during transition"). Read that
  file first — this document does not repeat it.
- **Before/after screenshots of the v1.5 UI transition**: already captured in
  [`docs/design-history/`](../design-history/README.md) — the same "v1.5"
  as the handoff above, for the same three pages.
- **In-game item/equipment art harvesting**: already documented in
  `references/game-assets/README.md` — unrelated to UI/branding, not
  repeated here.

What follows is what those documents don't already cover: the logo, the
character art direction, the actual implemented color/type tokens (as
opposed to the target direction), and the icon system.

## Logo

Single source of truth in code: `apps/web/components/branding/BloodLogo.vue`,
which renders `/images/logo-bloodmoon.png` — the only logo asset referenced
anywhere in `apps/web` (confirmed by a repo-wide search). Used by
`SiteHeader.vue` and `SiteFooter.vue`.

Designer references live in `references/visual/`:

- `logo-bloodmoon-sem-fundo-referencia.png` — transparent-background crest,
  dark gunmetal + blood-red + silver, spiked gothic frame, rune-etched
  border, red gem accents top and bottom.
- `logo-bloodmoon-vermelha-referencia.png` — the same crest composited over
  a full blood-moon/castle scene (carries a visible AI-tool watermark in the
  corner, so it's a mood reference, not a deliverable).

**Verified: the production logo (`public/images/logo-bloodmoon.png`) is the
same artwork as the "sem-fundo" reference** — same crest, transparent
background, re-exported/recompressed (different file size, not
byte-identical, but visually the same approved mark). This is not a
placeholder; it's correctly in place.

## Character art direction

`references/visual/README.md` is the actual designer brief for character
art, and it's specific enough to quote directly rather than paraphrase:

> Todas as novas artes de personagens devem seguir uma linguagem mais
> realista/cinematografica, mesmo sendo sobre jogo. Evitar aparencia
> artificial, plastificada ou excessivamente 3D.

Two characters have reference sets today:

- **Elfa** (`references/visual/elfa-*.png`): base pose, face reference,
  crouching-archer pose marked as the primary reference, wing proportion
  reference (`elfa-hero-aprovada-asa-voo.png` is explicitly the _approved_
  final reference — wings must read as flight-functional, and other
  characters' wings should use this size as a minimum, up to 1x larger).
- **Dark Lord** (`references/visual/dark-lord/*`): pose reference, two face
  references (classic vs. realistic), the Dark Master armor set, the level-3
  cape (explicitly compared in scale to the Elfa's wings — meant to dominate
  the silhouette without hiding the body), the Great Lord Scepter, the raven
  mascot, and several "hero" composition attempts with notes on what to keep
  (Blood Castle backdrop, contained scepter glow) and what to avoid (too
  much yellow particle glow, character too centered/too high in frame —
  leave breathing room so smaller crops don't clip the character).

**Verified in production**: `apps/web/public/images/hero-elfa-noria.png` and
`guide-elfa-hero.png`/`guide-dark-lord-hero.png` are real, on-brief,
production-quality art matching this direction — not placeholders. The Elfa
hero image specifically matches the crouching-archer pose reference.

A **third, intentional art tier** exists alongside the realistic hero art:
`apps/web/public/images/characters/chibi/` has one stylized, super-deformed
mascot portrait per class (`dark-knight`, `dark-lord`, `dark-wizard`,
`fairy-elf`, `magic-gladiator`, `rage-fighter`, `summoner` — all 7 MU Online
Season 6 classes). These keep the same palette/silhouette cues as the
realistic art (e.g. the chibi Dark Lord keeps the white hair, black/gold
armor, deep red cape, tiara) but in a cute/simplified style. This looks like
a deliberate second tier for compact UI contexts (character-select tiles,
small icons), not an inconsistency with the realistic hero art — the two
styles serve different UI contexts and both stay on-brand. Confirming where
the chibi set is actually wired into pages today (vs. sitting ready-but-unused)
is listed as an open question in `visual-audit.md`.

## Implemented tokens (as opposed to the target direction)

Read from `apps/web/assets/css/main.css` (the file actually loaded by
`nuxt.config.ts`):

- **Palette**: a light "parchment" background (`--bm-page-bg: #f3f0ea`), a
  blood-red accent scale (`--color-blood-50`…`900`, centered on
  `--color-ember`/`--color-blood-500: #9f0202`), `--color-moon: #f3f0ea`,
  `--color-iron: #756d67`, `--color-void: #110e10`, heading color
  `--bm-heading: #540809` (deep wine). These now match the Figma handoff's
  tokens (Background/Primary Wine/Action Red/Dark/Surface) exactly — see
  the reconciliation table in `figma-handoff-v1.5.md`, updated after the
  operator asked for the values to be snapped to spec rather than left
  "same family, not identical."
- **Type**: display/heading font `Cinzel` (serif, gothic-adjacent, matches
  the logo's carved-stone letterforms), body font `Manifold`/`Inter`. The
  Figma handoff confirms `Manifold` is the intended body font and `Inter`
  was only used for the handoff document itself — not a live-site
  recommendation.
- **Shadows**: `--shadow-glow` (soft red glow) and `--shadow-panel` (deep,
  soft drop shadow) — both consistent with "premium, readable" direction in
  `design-system.md`.
- `color-scheme: light` is hardcoded; there is no dark-mode toggle, no
  `prefers-color-scheme` handling, and no `data-theme` mechanism anywhere in
  `apps/web`.

**A second, contradictory token set exists and is very likely dead code**:
`apps/web/tailwind.config.ts` defines its own `blood`/`moon`/`ember`/`iron`/
`void` palette with **different hex values** than `main.css` (e.g. its
`ember` is `#f59e0b` amber/orange vs. `main.css`'s `--color-ember: #bf0202`
blood-red). Nothing in the Tailwind v4 CSS-first setup (`@nuxt/ui` v4,
`@theme` block in `main.css`) references this file via `@config`, and no
Tailwind PostCSS/Vite plugin loads it — so class names almost certainly
resolve through `main.css`'s tokens in the live build, not this file's. This
is a repo-hygiene finding (an orphaned, contradictory config file), not a
live visual bug — see `visual-audit.md` for the recommended cleanup.

## Icon system

- **`lucide-vue-next`** is the dominant icon library — used in 39 of 116
  page/component files. Flat, single-color line icons that inherit
  `currentColor`.
- **`apps/web/components/ui/BloodMoonIcon.vue`** is a small, hand-built set
  of 16 game-specific stroke icons (`season`, `xp`, `drop`, `reset`,
  `master`, `status`, `swords`, `helmet`, `trophy`, `book`, `characters`,
  `items`, `maps`, `progress`, `systems`) — also `currentColor`-based, so it
  composes cleanly with the rest of the palette.
- No competing icon library (no Heroicons, Font Awesome, `@iconify`) was
  found anywhere in `apps/web`. This part of the system is genuinely
  consistent — one primary library plus one small purpose-built supplement,
  not fragmented.
- **This does not yet match** the "translucent icon" designer reference
  (`references/visual/ui-icones-translucidos-microsoft.png` — Microsoft's
  glossy, folded-glass Fluent icon style). The closest implementation today,
  `.bm-icon-tile`/`.bm-dashboard-icon` in `main.css`, is a plain
  bordered/white tile, not a translucent glass tile. Read together with
  `design-system.md`'s stated "liquid glass" direction, this reference looks
  like it's describing the _material treatment_ the target direction wants
  for icon containers generally (not just achievements) — worth the operator
  confirming intent, since implementing true glass/blur tiles site-wide is a
  design-system-level change, not a small fix.

## Summary: what's real vs. what's a gap

| Element                          | Status                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Logo                             | Matches designer reference exactly, correctly in production                          |
| Elfa / Dark Lord hero art        | Matches designer reference direction, real production-quality art in use             |
| Chibi class mascots              | Real, on-brand assets; usage in live pages not yet confirmed (see `visual-audit.md`) |
| Color/type tokens (`main.css`)   | Implemented, internally consistent, matches logo/hero-art palette                    |
| `tailwind.config.ts` palette     | Orphaned/contradictory, very likely dead code — recommend removing                   |
| Translucent/glass icon treatment | Referenced by the designer, not yet implemented anywhere in the UI                   |
| Dark mode                        | Not implemented, not referenced by any design doc — not a gap unless requested       |
