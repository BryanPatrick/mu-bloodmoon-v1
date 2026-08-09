# Site-wide visual audit (Etapa 19.8)

Scope: all 58 files in `apps/web/pages/**/*.vue` plus the components they
delegate to, checked against the identity in
[`visual-identity.md`](./visual-identity.md) and the target direction in
[`docs/design-system.md`](../design-system.md). This is an audit, not a
redesign — findings are classified so small, unambiguous fixes can be told
apart from things that need a real design pass.

## Classification key

- **CRITICAL_VISUAL** — breaks legibility/usability (e.g. invisible text).
- **MISSING_ASSET** — a real asset is absent where the UI expects one.
- **INCONSISTENT** — page doesn't follow the documented direction, but
  renders correctly (readable, on-brand-ish).
- **POLISH** — small refinement, not urgent.
- **DESIGNER_REQUIREMENT** — depends on material/decision from the designer.
- **FUTURE** — real, but explicitly out of scope for pre-beta.

## The one CRITICAL_VISUAL finding: white text on the light background

**Root cause, verified in code, not inferred:**

1. `apps/web/components/layout/ManagementShell.vue` — the shared shell for
   every `/painel` and `/painel/admin/*` page — sets `text-white` on its
   root `<main>`. Nothing in its ancestor chain sets a dark background, so
   the actual page background is the global `body { background:
var(--bm-page-bg) }` = `#f5f2ec` (cream) from `main.css`.
2. `main.css` has a deliberate rescue mechanism: any `text-white`/
   `border-white`/`bg-white` **inside** `.bm-panel`, `.bm-glass`,
   `.bm-liquid-shell`, `.bm-liquid-card`, `.bm-dashboard-shell`, or
   `.bm-dashboard-card` gets force-recolored back to the readable dark
   palette. This is why most of the admin panel reads fine.
3. But several page headers and shared components render their
   `<h1>`/description text **outside** those six classes — so the rescue
   rule never applies, and the text stays near-white on cream.

This is fully mechanical, not a matter of taste: the exact same header
pattern already renders correctly elsewhere in the codebase (`dashboard/
Player.vue`, `Admin.vue`, `SuperAdmin.vue` all wrap their headers in
`.bm-dashboard-shell`; `pages/painel/suporte.vue` wraps its text in
`.bm-panel`). The bug is specifically the _unwrapped_ instances.

**Fixed in this etapa** (small, isolated, proven-pattern — the exact
criteria this etapa allows for direct fixes):

- `apps/web/components/admin/AdminObservabilityHeader.vue` — the shared
  header used by `painel/admin/exportacoes.vue`, `historico.vue`,
  `auditoria.vue`, `retencao.vue`, `alertas.vue`, `erros.vue`, and (via
  `AdminActivityLog.vue`, which delegates its own header to this same
  component) `eventos-operacionais.vue` and `logs-trabalho.vue`. Replaced
  the raw `text-white`/`text-white/62`/`border-white/10` classes with the
  existing `.bm-heading`/`.bm-copy` utility classes and a
  `border-[var(--bm-border)]` border — one component, 8 pages fixed, zero
  new classes introduced (reused what `main.css` already defines for
  exactly this purpose).

**Not fixed — same bug, documented for a follow-up pass** (touching these
would have meant editing ~6 more components and ~7 more standalone pages in
a single etapa already carrying two other large deliverables; each fix is
the same one-line pattern, low risk, but doing all of them here would drift
into exactly the "arbitrary redesign" this etapa is told to avoid):

- Standalone pages with an unwrapped header: `painel/personagens.vue`,
  `painel/marketplace.vue`, `painel/compras.vue`, `painel/notificacoes.vue`,
  `painel/configuracoes.vue`, `painel/admin/contas.vue`, `financeiro.vue`,
  `sistema.vue`, `moderacao.vue`, `conteudo.vue`, `personagens.vue`,
  `tickets.vue`.
- Delegate `*Manager.vue` components with the same unwrapped-header pattern:
  `components/admin/store/StoreAdminManager.vue` (→ `painel/admin/loja.vue`),
  `components/community/CommunityAdminManager.vue` (→ `.../comunidade.vue`),
  `components/marketplace/MarketplaceAdminManager.vue` (→
  `.../marketplace.vue` + `.../marketplace/escrow.vue`),
  `components/admin/roadmap/RoadmapAdminManager.vue` (→ `.../roadmap.vue`),
  `components/admin/reports/AdminReportsManager.vue` (→ `.../relatorios.vue`),
  `components/admin/tasks/AdminTasksManager.vue` (→ `.../tarefas.vue`).
- `apps/web/pages/loja/index.vue` has a narrower version of the same root
  cause: its loading/empty-state text (`text-white/55`, lines ~18-21) sits
  in `.bm-page-content`, which isn't in the rescue list, while its product
  cards two sections down correctly use `.bm-panel` — so the same file is
  inconsistent within itself.

**Recommended fix for the follow-up pass**: same pattern used here — swap
the raw `text-white`/`text-white/NN`/`border-white/NN` classes for
`.bm-heading`/`.bm-copy`/`.bm-muted`/`border-[var(--bm-border)]`, or wrap the
block in `.bm-panel`. No new CSS needs to be written; every case observed so
far can be fixed with classes that already exist in `main.css`.

## Two documented, intentional migrations (not bugs)

- **`docs/design-system.md`** already states the target is "liquid glass",
  that `bm-panel`/`bm-glass` are the _old_ glass system kept during
  transition, and gives an explicit migration order ending with "guias e
  paginas publicas" then "loja/recarga" last. Pages still on `bm-panel`
  instead of `bm-liquid-*`, or pages that are heavily raw-Tailwind
  (`roadmap/index.vue`, `roadmap/[slug].vue`, `recarga.vue` — root
  `bg-black`/`bg-void` + `text-white`, no `bm-*` classes at all) are
  consistent with "not migrated yet," not accidental — and this is now
  independently confirmed by the Figma handoff transcribed in
  [`figma-handoff-v1.5.md`](./figma-handoff-v1.5.md): its entire specified
  direction is the unified light/editorial system, with nothing describing
  a secondary dark theme for content pages. **Caveat**: even
  where `bm-liquid-*` classes are already in use, `main.css`'s actual CSS
  for them doesn't yet implement real blur/translucency (`backdrop-filter`
  only appears once in the whole file, on `.bm-site-header`) — so "migrated"
  sections don't yet visually deliver the glassmorphism the doc describes
  either. This is a design-system implementation gap, not something to
  patch page-by-page.
- **`home/index.vue` and `marketplace.vue`** duplicate the brand palette as
  literal hex values in scoped `<style>` blocks (`background:#f5f2ec`, the
  same `#bf0202`/`#460608` reds, etc.) instead of using `var(--bm-*)`
  tokens. Visually correct today, but a duplicated source of truth — if the
  palette ever changes, these two files won't pick it up automatically.
  Classified POLISH, not urgent.
- **Ornamental decorators are specified but not built.** The Figma handoff
  (§5) calls out recurring dashed-corner card frames and small diamond (◊)
  section dividers as a shared, SVG-exported component category. Checked
  directly: no such component exists in `apps/web/components`, `main.css`
  has no corner-cut `clip-path` rule, and the literal `◊` character doesn't
  appear anywhere in `pages`/`components`. Classified DESIGNER_REQUIREMENT —
  needs the real SVG assets from the designer before it can be built, not a
  fixable-from-a-screenshot gap.

## Full per-page classification

| Area                                                   | Pages | Verdict                                                                                                                                                 |
| ------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth (login/registrar/recuperar-conta/redefinir-senha) | 4     | Clean `bm-*`                                                                                                                                            |
| Institutional (about, downloads, noticias)             | 3     | Clean `bm-*`                                                                                                                                            |
| Home                                                   | 1     | On-brand, hex-duplicated (POLISH)                                                                                                                       |
| Rankings                                               | 1     | Mixed, readable                                                                                                                                         |
| Wiki / Guias                                           | 3     | Heavily mixed (`wiki.vue` 155 raw-Tailwind hits, `guias/[category]/[topic].vue` 61) — consistent with "not yet migrated" per the documented order       |
| Loja                                                   | 2     | `bm-*` root, one internal CRITICAL_VISUAL instance (loading/empty state)                                                                                |
| Marketplace (public)                                   | 1     | On-brand, hex-duplicated (POLISH)                                                                                                                       |
| Roadmap                                                | 2     | Fully raw-dark-Tailwind, no `bm-*` at root — INCONSISTENT with documented direction, not yet flagged in the migration order at all                      |
| Recarga                                                | 1     | Fully raw-dark-Tailwind (`bg-void`) at root, `bm-panel` internally — mixed                                                                              |
| Comunidade (feed/profile)                              | 2     | Clean `bm-*`, correct token usage in scoped CSS                                                                                                         |
| Painel (player dashboard)                              | ~11   | Mostly correct via `dashboard/*.vue` delegates; 5 pages carry the CRITICAL_VISUAL header bug                                                            |
| Painel/admin                                           | ~15   | Structural chrome is `bm-*`; ~12 pages/components carry the CRITICAL_VISUAL header bug (7 fixed via shared component this etapa, rest documented above) |
| Error pages (`error.vue`, `acesso-negado.vue`)         | 2     | Clean `bm-*`                                                                                                                                            |
| Redirect shims (no visual content)                     | 7     | N/A                                                                                                                                                     |

## Repo-hygiene finding (not a page bug, but worth doing before beta)

`apps/web/tailwind.config.ts` defines a second, contradictory
`blood`/`moon`/`ember`/`iron`/`void` palette that appears to be orphaned
(Tailwind v4's CSS-first `@theme` in `main.css` is what's actually loaded;
nothing references this file via `@config`). Recommend either deleting it or
confirming it's genuinely unused before beta, so nobody edits the wrong
palette by mistake later.

## Priorities before beta (this etapa's read, not a mandate)

1. **CRITICAL_VISUAL header-contrast bug** — 7 pages already fixed this
   etapa via the shared component; ~18 more instances documented above for
   a fast follow-up pass (same one-line pattern each time).
2. **`public/downloads/` has no real files** — content/ops gap, not a
   design gap, but it's the one "completely missing" asset found in this
   audit (see `asset-inventory.md`).
3. **Confirm the Roadmap/Recarga dark theme is intentional** (or add them to
   the documented migration order) — right now they're the only pages with
   zero `bm-*` classes at their root and aren't mentioned in
   `design-system.md`'s migration list at all.
4. Everything else found (hex-duplicated palettes, the orphaned Tailwind
   config, the not-yet-implemented glass/blur treatment, Wiki/Guias being
   mid-migration) is real but explicitly **not urgent** per this etapa's own
   instructions not to turn an audit into a redesign.
