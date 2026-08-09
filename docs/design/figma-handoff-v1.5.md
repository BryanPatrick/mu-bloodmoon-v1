# Blood Moon Website — UI Specification & Developer Handoff v1.5

**Source note**: this document transcribes a Figma-based design handoff
that the operator shared directly as images in a chat session on
2026-08-09. It was **not found anywhere in the repository** during the
Etapa 19.8 audit (`docs/design/visual-identity.md`,
`docs/design/asset-inventory.md`) — a targeted repo-wide search for its
title and color tokens (before writing this file) confirmed zero matches.
**This is the single most authoritative design source found so far** — more
specific and more complete than `docs/design-system.md` (which documents
target CSS classes and migration order, but not exact tokens, grid specs,
or page-level Figma references) and than `references/visual/README.md`
(which covers character art direction, not UI layout/tokens).

**Caveat on precision**: this transcription is read from screenshots, not
from the live Figma file or an exported JSON/CSS. Hex values and node
dimensions below are transcribed as carefully as possible but should be
verified against the actual Figma file before being treated as
pixel-exact. **Recommendation**: get the real Figma file (or an exported
`tokens.json`/style-dictionary) checked into this repository — ideally
under `references/visual/` or a new `references/figma/` — so this
transcription can be replaced with a verifiable source and future agents
don't have to rely on chat history to find it again.

## 1. Visão geral do projeto

- **Escopo atual**: Home, Marketplace e Wiki (three pages specified in this
  handoff revision).
- **Canvas base**: 1728×3005 px (matches the Home/Wiki page canvas; see
  per-page specs below).
- **Direção visual**: "Editorial medieval com base marfim, vinho e
  contraste raro" — ivory/parchment base, wine-red, rare (sparing) high
  contrast. This matches what Etapa 19.8 already found implemented in
  `main.css`'s light-parchment palette — see §Reconciliation below.
- **Status do arquivo**: responsividade ainda não documentada em frames
  próprios; estados interativos (hover/focus/loading/empty) ainda
  pendentes; header e footer repetidos por página devem virar componentes
  (i.e., the Figma file itself isn't component-ized yet).
- **Última revisão**: 31 de julho de 2026.

## 2. Inventário de páginas

| Page            | Content blocks                                                                  | Canvas                                   |
| --------------- | ------------------------------------------------------------------------------- | ---------------------------------------- |
| **Home**        | Hero, Configuração do servidor, Diferenciais, Novidades, CTA comunidade, Footer | 1728×3005 px                             |
| **Marketplace** | Busca/Filtros, Ordenação, Lista de itens, Paginação, Footer                     | 1728×3900 px (approx.)                   |
| **Wiki**        | Busca, Tags populares, Categorias, Tópicos populares, Atualizações, Footer      | 1728×3005 px, ~597 px hero, 6 categories |

## 3. Sistema visual global

### Color tokens (as documented in the handoff)

| Token        | Hex (as read)       | Usage                     |
| ------------ | ------------------- | ------------------------- |
| Background   | `#F3F0EA`           | Fundo principal do site   |
| Primary Wine | `#540809`           | Títulos e detalhes        |
| Action Red   | `#9F0202`           | Botões e destaques        |
| Dark         | `#110E10`           | Footer e contraste        |
| Surface      | `#E3E0DF` (approx.) | Cards e áreas secundárias |

### Typography

- **Display/Editorial**: Cinzel — "faixa de uso 33–68 px, usar com
  espaçamento amplo e contraste alto" — the wordmark-style headline font
  (matches the logo's carved-stone letterforms; example shown: "A LUA DE
  SANGUE").
- **Interface/Content**: the spec is explicit here and this is an important
  clarification — _"Manifold no projeto original; Inter pode ser usado
  apenas neste documento técnico."_ i.e. **Manifold is the real body font**;
  Inter was only a stand-in for the spec document itself, not a
  recommendation to use Inter in the live site. Sizes: navegação/subtítulos
  18–30 px, corpo/apoio 12–16 px.
- **Hierarchy**: hero display 50–68 px; títulos de seção 32–40 px;
  subtítulos 18–25 px; labels 12–15 px com tracking; corpo 12–16 px.

### Spacing & geometry

- Margens laterais recorrentes: 150–172 px (desktop).
- Container principal recomendado: 1428 px.
- Blocos amplos podem chegar a 1536 px.
- Raios recorrentes: 7, 8, 10, 13 e 19 px.
- Divisores finos: 1–2 px.

## 4. Estrutura e grid

- **Desktop base**: largura base 1728 px; header central 1428 px; conteúdo
  principal 1264–1536 px; footer em largura integral; altura dos layouts
  ~3005 px.
- **Breakpoints recomendados**: Desktop 1440 px; Laptop 1024–1439 px;
  Tablet 768–1023 px; Mobile 360–767 px.
- **Comportamento responsivo**: header colapsa para menu móvel; cards
  passam de 3 colunas para 1; sidebar do Marketplace vira drawer; listas
  priorizam stack ou scroll horizontal; hero mantém foco na ilustração e
  legibilidade.

## 5. Componentes compartilhados (per the spec — not yet componentized in Figma itself, per §1)

- **Header**: reutilizado nas três páginas; logo à esquerda, navegação
  central, ações à direita; criar variantes: default, item ativo, menu
  mobile.
- **Botões**: primário vinho/vermelho com texto branco; secundário
  outline; definir hover, pressed, focus e disabled.
- **Footer**: bloco escuro com colunas de navegação; mesmo conteúdo base
  nas três páginas; transformar em componente mestre.
- **Search Field**: campo largo com ícone à esquerda; Wiki usa busca de
  destaque no hero; Marketplace mistura busca e filtros.
- **Cards**: surface clara com borda discreta; raios entre 10–16 px; criar
  estados hover e selected.
- **Decoradores**: elementos, linhas e cantos recortados são recorrentes
  (the small ◊ diamond dividers and dashed-corner card frames visible in
  the mockups); exportar preferências em SVG; evitar recriar ornamentos
  simples manualmente per-component.

## 6. Especificações por página (Figma node references, as documented)

- **Home — Main Page** (node `474:20226`, canvas 1728×3005 px): header node
  `474:20244`; hero node `474:20277` (1803×903 px, imagem full-bleed com
  thumbnails laterais); configuração do servidor node `474:20228` (seis
  métricas em grade 3×2); diferenciais node `474:20300` (bloco amplo com
  quatro benefícios); últimas novidades node `474:20335` (card principal +
  dois cards compactos); CTA comunidade node `474:20381` (Discord + criação
  de conta); footer node `474:20408` (1728×380 px). Note from the spec:
  "o hero deve continuar sendo cortado para nao comprometer a Lua de
  Sangue" (the hero crop must never cut off the blood moon).
- **Marketplace** (node `437:39`, canvas 1728×3900 px approx.): header node
  `443:220`; footer node `437:221`; hero node `443:218` (1788×399 px, busca
  central e tabs entre Itens/Guias); filtros: categoria, classe, tipo,
  raridade e nível mínimo; cards de item nodes `444:88`, `444:117` e
  `444:155` (1156×379.66 px); paginação node `444:258`; sidebar de filtros
  node `441:214` (471 px de largura). "Em tablet/mobile, filtros devem
  abrir em drawer e os atributos precisam empilhar."
- **Wiki** (node `457:22`, canvas 1728×3005 px): header node `457:193`;
  footer node `457:23`; hero node `457:60` (1793×597 px, busca e tags
  populares); título da transição "Pesquise no Wiki" node `458:432`;
  categorias node `459:60` (grade 3×2); painel duplo de tópicos e
  atualizações node `470:212` (1437×741 px). "Conteúdo deve ser dinâmico e
  reutilizar um template de artigo." "Em mobile, cards viram lista de uma
  coluna e a busca ocupa 100%."

## 7. Assets e entrega para desenvolvimento

- **Exportação**: ícones e ornamentos vetoriais como SVG; fotografias e
  backgrounds como WebP/AVIF quando possível; PNG somente quando
  transparência for necessária; gerar versões desktop/tablet/mobile dos
  heróis; nomes de arquivo em kebab-case e sem espaços.
- **Dev Mode / handoff**: marcar os frames como "Ready for Dev"; adicionar
  anotações para padding, crop e responsividade; documentar destino dos
  links e CTAs; indicar conteúdo estático versus conteúdo vindo do banco;
  converter medidas absolutas em containers e grid.

## 8. Pendências antes do handoff final (the designer's own TODO list)

This is the closest thing found so far to the "material do designer
indicando assets que ainda precisavam ser produzidos" that Etapa 19.8's
brief asked for — it's Figma-file-side pendencies, not code-side missing
assets, but it's real, designer-authored, and unresolved:

**Design/sistema**:

- Criar frames responsivos para tablet e mobile.
- Transformar header, footer, botões e cards em componentes.
- Padronizar raios, espaçamentos e nomenclatura das camadas.
- Criar variantes de estados interativos.
- Revisar o tamanho da navegação desktop.

**Conteúdo/nomenclatura**:

- Marketplace possui layers nomeados como "Hero — Wiki" (renomear).
- Revisar grafias e consistência em português e inglês nas categorias da
  Wiki.
- Confirmar dados finais do servidor antes da publicação.
- **Definir se Marketplace é consulta, comércio real ou enciclopédia** —
  this is a real, still-open product question directly relevant to
  `docs/handoff/beta-commerce-strategy.md` (Etapa 19.7), which found the
  live Marketplace already implements real currency-moving commerce
  (`POST marketplace/orders`), not just a consulta/enciclopédia. Worth the
  operator reconciling this designer-side open question with the
  already-implemented backend behavior.

## 9. Checklist de aprovação (from the spec, not yet completed)

**Checklist A** (content/product): Conteúdo revisado e aprovado; Links e
ações definidos; Imagens finais substituídas; Componentes compartilhados
criados; Versões responsivas aprovadas.

**Checklist B** (dev-readiness): Estados hover/focus definidos; Assets
exportados; Frames marcados como Ready for Dev; Permissões de Dev Mode
liberadas; Responsável por QA definido.

Per the spec's own footer note: _"A Figma continua sendo a fonte de
verdade para medidas e assets. Este frame registra contexto, padrões e
decisões de implementação."_ — i.e. this handoff document is explicitly a
**secondary reference**; the live Figma file remains authoritative. This
transcription is one step further removed (screenshots of the handoff
document), so treat it accordingly.

## Reconciliation against the live implementation (Etapa 19.8 findings)

Comparing this spec's tokens against `apps/web/assets/css/main.css` (the
file the site actually loads):

| Spec token   | Spec hex            | Closest implemented token    | Implemented hex | Match?                     |
| ------------ | ------------------- | ---------------------------- | --------------- | -------------------------- |
| Background   | `#F3F0EA`           | `--bm-page-bg`               | `#f5f2ec`       | Same family, not identical |
| Primary Wine | `#540809`           | `--bm-heading` / `--bm-wine` | `#460608`       | Same family, not identical |
| Action Red   | `#9F0202`           | `--color-ember` / `--bm-red` | `#bf0202`       | Same family, not identical |
| Dark         | `#110E10`           | `--color-void` / `--bm-dark` | `#101010`       | Very close                 |
| Surface      | `#E3E0DF` (approx.) | `--bm-surface`               | `#ebe6df`       | Same family, not identical |

**Read on this**: every token is in the same color family and clearly
derived from this direction — this is not a mismatch of intent, it's drift
in exact values during implementation (or during this transcription's OCR
uncertainty — see caveat at the top). Worth the operator deciding whether
to snap `main.css`'s tokens to the exact spec values once the real Figma
file/export is available, or to treat the current implementation as the
now-canonical version and update the Figma file to match instead.

**Connection to `docs/design-history/`**: that directory (already found in
Etapa 19.8) captures before/after screenshots explicitly labeled "Blood
Moon UI v1.5" for the same three pages (Home, Marketplace, Wiki) — almost
certainly the implementation pass this handoff document specified. Its
`v1.5-local-2026-08-01/wiki-desktop.png` shows a Wiki variant with a sidebar
category list and a full-bleed dark forest/Elfa-archer photo hero, which
looks different at first glance from both this handoff's parchment-hero
mockup and the screenshot the operator shared directly. **Verified by
loading the live built site** (`apps/web/.output`, `/wiki` route) rather
than guessing from screenshots: the current implementation renders on
`#f5f2ec` (`body` background, matching `--bm-page-bg` exactly), with the
"PESQUISE NO WIKI" hero, the six category cards (Personagens/Itens/Mapas/
Progresso/Sistemas/Guias), and the "PESQUISAS POPULARES" tag row — i.e. it
matches the operator's shared screenshot and is consistent with this
handoff's direction. The `v1.5-local` capture in `design-history/` appears
to be an earlier iteration with a different hero treatment that was later
simplified, not a currently-live alternate version — worth the operator
confirming if precise history matters, but not a live inconsistency.

This handoff **confirms** two Etapa 19.8 findings rather than contradicting
them:

1. **Manifold is the intended body font**, not Inter — matches
   `main.css`'s `--font-sans: Manifold, Inter, system-ui, sans-serif`
   exactly (Inter as a fallback, not the primary choice).
2. **The whole specified direction is unified light/editorial** — nothing
   in this handoff describes a secondary dark theme for content pages. This
   strengthens `visual-audit.md`'s reading that `roadmap/index.vue`,
   `roadmap/[slug].vue`, and `recarga.vue` (raw dark Tailwind, `bg-black`/
   `bg-void`, no `bm-*` classes) are pages that haven't been migrated to
   this system yet, not an intentional second visual language.

It also surfaces one thing Etapa 19.8 didn't have: the recurring "decorator"
ornaments (dashed-corner card frames, ◊ diamond section dividers) visible
throughout the mockups are called out explicitly in §5 as a shared
component category to export as SVG. **Checked**: neither pattern exists in
code today — `apps/web/components` has no decorator/ornament component,
`main.css` has no `clip-path`/corner-cut rule for cards, and a repo-wide
search for the literal `◊` character in `pages`/`components` returns zero
matches. This is a real, concrete gap between the approved visual direction
and the live site: the site's cards/dividers today are plain rounded
rectangles (`.bm-panel`/`.bm-liquid-card`, see `visual-identity.md`), not
the ornamented, cut-corner style shown in the mockups. Classified
DESIGNER_REQUIREMENT in `visual-audit.md` terms — it needs the actual SVG
ornament assets from the designer/Figma file before it can be built, it
isn't something to improvise from a screenshot.
