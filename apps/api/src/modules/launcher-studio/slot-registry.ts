// Launcher CMS Studio -- the slot registry. This file, not a database
// table, is the single source of truth for which slots exist, on which
// page, with which type and constraints. The CMS can only ever write a
// value for a slot id declared here, of the declared type, inside the
// declared constraints -- never an arbitrary key, never x/y, never CSS/
// XAML/HTML/JS. Adding a new editable region to the Launcher means adding
// an entry here (a code change, reviewed like any other), never something
// the CMS can do to itself.
//
// Scope note (Part B/Q/R/S/T/U): this registry covers GLOBAL/structural
// slots only -- one hero, one campaign banner, the fixed social/utility
// rail, class-icon and currency-icon mappings, page-level banners. Per-
// entity editorial content (individual News articles, Events, Store
// products) is NOT modeled as slots here -- each is already its own
// collection with its own CRUD/draft/publish lifecycle (KnowledgeEntry via
// admin-content, extended with the Launcher fields in this phase's
// migration; ShopProduct/StoreCategory via the existing commerce module).
// Forcing a one-of-many News article through a singleton slot table would
// both violate "one row per slot id" and duplicate a CRUD system that
// already exists -- seededocs/launcher/launcher-slot-registry.md.

export type LauncherPageKey =
  | 'HOME'
  | 'ACCOUNT'
  | 'NEWS'
  | 'EVENTS'
  | 'RANKING'
  | 'STORE'
  | 'SETTINGS'

export const LAUNCHER_PAGES: LauncherPageKey[] = [
  'HOME',
  'ACCOUNT',
  'NEWS',
  'EVENTS',
  'RANKING',
  'STORE',
  'SETTINGS'
]

// Part C -- the closed set of content types the CMS may ever send. No
// "arbitrary JSON" escape hatch.
export type SlotType =
  | 'IMAGE'
  | 'TEXT'
  | 'RICH_TEXT_LIMITED'
  | 'LINK'
  | 'COLOR_TOKEN'
  | 'FONT_TOKEN'
  | 'BOOLEAN'
  | 'ORDERED_LIST'
  | 'REFERENCE'
  | 'DATE_TIME'

// Part J/K -- allowlisted visual tokens. A slot may optionally expose a
// subset of these; the value is always the token name, never a raw hex,
// raw font-family, or CSS.
export type VisualTokenAxis =
  | 'fontToken'
  | 'fontSizeToken'
  | 'textColorToken'
  | 'accentColorToken'
  | 'alignmentToken'
  | 'opacityToken'

// Part K -- conceptual font roles; Launcher/Web map each token to a real
// font. The CMS only ever sends the token.
export const FONT_TOKENS = ['DISPLAY', 'SERIF', 'UI', 'COMPACT'] as const
export type FontToken = typeof FONT_TOKENS[number]

export const FONT_SIZE_TOKENS = ['SM', 'MD', 'LG', 'XL', 'DISPLAY'] as const
export type FontSizeToken = typeof FONT_SIZE_TOKENS[number]

// Part L -- allowlisted color tokens.
export const COLOR_TOKENS = [
  'TEXT_PRIMARY',
  'TEXT_MUTED',
  'CRIMSON',
  'GOLD',
  'PURPLE',
  'SUCCESS',
  'WARNING'
] as const
export type ColorToken = typeof COLOR_TOKENS[number]

export const ALIGNMENT_TOKENS = ['START', 'CENTER', 'END'] as const
export type AlignmentToken = typeof ALIGNMENT_TOKENS[number]

export const OPACITY_TOKENS = ['FULL', 'MUTED', 'FAINT'] as const
export type OpacityToken = typeof OPACITY_TOKENS[number]

export const VISUAL_TOKEN_VALUES: Record<VisualTokenAxis, readonly string[]> = {
  fontToken: FONT_TOKENS,
  fontSizeToken: FONT_SIZE_TOKENS,
  textColorToken: COLOR_TOKENS,
  accentColorToken: COLOR_TOKENS,
  alignmentToken: ALIGNMENT_TOKENS,
  opacityToken: OPACITY_TOKENS
}

// Part M -- the same category vocabulary as the LauncherAsset.category
// column (kept as plain strings here, not a Prisma import, so this file
// has zero database dependency and can be unit-tested/reused by the web
// preview without pulling in Prisma).
export type LauncherAssetCategoryValue =
  | 'LAUNCHER'
  | 'WEBSITE'
  | 'GAME'
  | 'CLASSES'
  | 'ITEMS'
  | 'EVENTS'
  | 'NEWS'
  | 'CAMPAIGNS'
  | 'BRANDING'
  | 'SYSTEM'

export interface SlotConstraints {
  maxLength?: number
  minLength?: number
  aspectRatio?: string
  maxSizeBytes?: number
  allowedFormats?: string[]
  maxItems?: number
  minItems?: number
  fixedItemKeys?: string[]
  itemShape?: Record<string, SlotType>
  assetCategory?: LauncherAssetCategoryValue
  referenceKind?: 'KNOWLEDGE_ENTRY_NEWS' | 'KNOWLEDGE_ENTRY_EVENT' | 'LAUNCHER_ASSET'
}

export interface SlotDefinition {
  id: string
  page: LauncherPageKey
  label: string
  description: string
  type: SlotType
  required: boolean
  constraints: SlotConstraints
  visualTokens: VisualTokenAxis[]
  defaultValue: unknown
}

const image = (
  id: string,
  page: LauncherPageKey,
  label: string,
  description: string,
  opts: { aspectRatio: string; assetCategory: LauncherAssetCategoryValue; required?: boolean }
): SlotDefinition => ({
  id,
  page,
  label,
  description,
  type: 'IMAGE',
  required: opts.required ?? false,
  constraints: {
    aspectRatio: opts.aspectRatio,
    maxSizeBytes: 5 * 1024 * 1024,
    allowedFormats: ['image/png', 'image/jpeg', 'image/webp'],
    assetCategory: opts.assetCategory
  },
  visualTokens: [],
  defaultValue: null
})

const text = (
  id: string,
  page: LauncherPageKey,
  label: string,
  description: string,
  opts: { maxLength: number; required?: boolean; visualTokens?: VisualTokenAxis[] }
): SlotDefinition => ({
  id,
  page,
  label,
  description,
  type: 'TEXT',
  required: opts.required ?? false,
  constraints: { maxLength: opts.maxLength },
  visualTokens: opts.visualTokens ?? ['fontToken', 'fontSizeToken', 'textColorToken', 'alignmentToken'],
  defaultValue: ''
})

const link = (id: string, page: LauncherPageKey, label: string, description: string): SlotDefinition => ({
  id,
  page,
  label,
  description,
  type: 'LINK',
  required: false,
  constraints: { maxLength: 512 },
  visualTokens: [],
  defaultValue: ''
})

const boolean = (id: string, page: LauncherPageKey, label: string, description: string): SlotDefinition => ({
  id,
  page,
  label,
  description,
  type: 'BOOLEAN',
  required: true,
  constraints: {},
  visualTokens: [],
  defaultValue: false
})

const reference = (
  id: string,
  page: LauncherPageKey,
  label: string,
  description: string,
  referenceKind: SlotConstraints['referenceKind']
): SlotDefinition => ({
  id,
  page,
  label,
  description,
  type: 'REFERENCE',
  required: false,
  constraints: { referenceKind },
  visualTokens: [],
  defaultValue: null
})

const orderedList = (
  id: string,
  page: LauncherPageKey,
  label: string,
  description: string,
  opts: { itemShape: Record<string, SlotType>; maxItems: number; minItems?: number }
): SlotDefinition => ({
  id,
  page,
  label,
  description,
  type: 'ORDERED_LIST',
  required: false,
  constraints: { itemShape: opts.itemShape, maxItems: opts.maxItems, minItems: opts.minItems ?? 0 },
  visualTokens: [],
  defaultValue: []
})

export const SLOT_REGISTRY: SlotDefinition[] = [
  // HOME
  image('home.brandLogo', 'HOME', 'Logo da marca', 'Logo exibida no topo do launcher.', {
    aspectRatio: '1:1',
    assetCategory: 'BRANDING'
  }),
  boolean('home.hero.enabled', 'HOME', 'Hero ativo', 'Ativa/desativa o banner principal da Home.'),
  image('home.hero.image', 'HOME', 'Imagem do hero', 'Imagem principal de destaque da Home.', {
    aspectRatio: '16:9',
    assetCategory: 'CAMPAIGNS'
  }),
  text('home.hero.title', 'HOME', 'Titulo do hero', 'Titulo principal do banner de destaque.', { maxLength: 80 }),
  text('home.hero.subtitle', 'HOME', 'Subtitulo do hero', 'Texto de apoio do banner de destaque.', { maxLength: 160 }),
  text('home.hero.ctaLabel', 'HOME', 'Texto do botao', 'Rotulo do botao de acao do hero.', { maxLength: 40, visualTokens: [] }),
  link('home.hero.ctaUrl', 'HOME', 'Link do botao', 'Destino do botao de acao do hero.'),
  boolean('home.campaign.enabled', 'HOME', 'Campanha ativa', 'Ativa/desativa a faixa de campanha (ex.: Open Beta).'),
  text('home.campaign.title', 'HOME', 'Titulo da campanha', 'Titulo da faixa de campanha.', { maxLength: 80 }),
  text('home.campaign.subtitle', 'HOME', 'Subtitulo da campanha', 'Texto de apoio da faixa de campanha.', { maxLength: 160 }),
  text('home.campaign.versionLabel', 'HOME', 'Rotulo de versao', 'Ex.: "Season 6", "Open Beta".', { maxLength: 40, visualTokens: [] }),
  image('home.campaign.image', 'HOME', 'Imagem da campanha', 'Imagem da faixa de campanha.', {
    aspectRatio: '21:9',
    assetCategory: 'CAMPAIGNS'
  }),
  text('home.campaign.ctaLabel', 'HOME', 'Texto do botao da campanha', 'Rotulo do botao da faixa de campanha.', { maxLength: 40, visualTokens: [] }),
  link('home.campaign.ctaUrl', 'HOME', 'Link da campanha', 'Destino do botao da faixa de campanha.'),
  reference('home.activeEvent', 'HOME', 'Evento ativo', 'Evento em destaque exibido na Home.', 'KNOWLEDGE_ENTRY_EVENT'),
  reference('home.nextEvent', 'HOME', 'Proximo evento', 'Proximo evento exibido na Home.', 'KNOWLEDGE_ENTRY_EVENT'),
  orderedList('home.socials', 'HOME', 'Redes sociais', 'Lista ordenada de redes sociais (maximo 5).', {
    itemShape: { id: 'TEXT', label: 'TEXT', url: 'LINK', iconAssetId: 'REFERENCE', enabled: 'BOOLEAN' },
    maxItems: 5
  }),
  link('home.utilities.support.url', 'HOME', 'Link de suporte', 'URL do utilitario SUPORTE.'),
  link('home.utilities.site.url', 'HOME', 'Link do site', 'URL do utilitario SITE.'),
  link('home.utilities.wiki.url', 'HOME', 'Link da wiki', 'URL do utilitario WIKI.'),
  orderedList('home.characterClassIcon', 'HOME', 'Icones de classe', 'Mapa de classe para icone.', {
    itemShape: { classKey: 'TEXT', iconAssetId: 'REFERENCE' },
    maxItems: 12
  }),

  // ACCOUNT -- Part R: only what makes sense as editorial content. Never
  // character data.
  orderedList('account.classIcon', 'ACCOUNT', 'Icones de classe (Conta)', 'Mapa de classe para icone na tela de Conta.', {
    itemShape: { classKey: 'TEXT', iconAssetId: 'REFERENCE' },
    maxItems: 12
  }),
  image('account.guildEmblem', 'ACCOUNT', 'Emblema de guild (generico)', 'Placeholder generico exibido quando a guild nao tem emblema proprio.', {
    aspectRatio: '1:1',
    assetCategory: 'BRANDING'
  }),

  // EVENTS -- page-level banner only; individual events are their own
  // KnowledgeEntry rows (kind=EVENT), not slots.
  image('events.activeBanner', 'EVENTS', 'Banner da pagina de eventos', 'Banner de destaque no topo da pagina de Eventos.', {
    aspectRatio: '21:9',
    assetCategory: 'EVENTS'
  }),

  // RANKING
  orderedList('ranking.classIcon', 'RANKING', 'Icones de classe (Ranking)', 'Mapa de classe para icone no Ranking.', {
    itemShape: { classKey: 'TEXT', iconAssetId: 'REFERENCE' },
    maxItems: 12
  }),

  // STORE -- Part U: currency icons are global/singleton; individual
  // products remain ShopProduct/StoreCategory (existing commerce module).
  orderedList('store.currencyIcon', 'STORE', 'Icones de moeda', 'Icone de cada moeda da loja (WCoin/Goblin Point/Hunt Point).', {
    itemShape: { currency: 'TEXT', iconAssetId: 'REFERENCE' },
    maxItems: 3,
    minItems: 3
  }),
  image('store.featuredBannerImage', 'STORE', 'Banner de destaque da loja', 'Banner opcional no topo da pagina de Loja.', {
    aspectRatio: '21:9',
    assetCategory: 'CAMPAIGNS'
  })
]

export const SLOT_BY_ID = new Map(SLOT_REGISTRY.map((slot) => [slot.id, slot]))

export const slotsForPage = (page: LauncherPageKey) => SLOT_REGISTRY.filter((slot) => slot.page === page)

export const isKnownPage = (value: string): value is LauncherPageKey =>
  (LAUNCHER_PAGES as string[]).includes(value)
