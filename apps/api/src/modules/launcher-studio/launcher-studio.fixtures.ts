// Part AM -- local fixtures for the Launcher Studio preview. Demonstration
// only, never read from or written to production, never used by the real
// public /launcher/bootstrap contract. Exists so an operator can see
// "what would the Home page look like logged in with 3 characters" without
// depending on a real seeded account.

export type LauncherPreviewState =
  | 'LOGGED_OUT'
  | 'LOGGED_IN_PENDING'
  | 'LOGGED_IN_ACTIVE'
  | 'ZERO_CHARACTERS'
  | 'WITH_CHARACTERS'

export const LAUNCHER_PREVIEW_STATES: LauncherPreviewState[] = [
  'LOGGED_OUT',
  'LOGGED_IN_PENDING',
  'LOGGED_IN_ACTIVE',
  'ZERO_CHARACTERS',
  'WITH_CHARACTERS'
]

export interface FixtureCharacter {
  id: string
  name: string
  className: string
  level: number
  reset: number
  masterReset: number
  guild: string | null
}

export const FIXTURE_CHARACTERS: FixtureCharacter[] = [
  { id: 'fixture-char-1', name: 'Artemis', className: 'Elf', level: 400, reset: 12, masterReset: 2, guild: 'BloodPact' },
  { id: 'fixture-char-2', name: 'BloodKnight', className: 'Dark Knight', level: 380, reset: 10, masterReset: 1, guild: 'BloodPact' },
  { id: 'fixture-char-3', name: 'ArcMage', className: 'Dark Wizard', level: 355, reset: 8, masterReset: 0, guild: null }
]

export interface FixtureAccount {
  username: string
  role: 'PLAYER'
  provisioningStatus: 'NONE' | 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED'
  characters: FixtureCharacter[]
}

export const fixtureAccountForState = (state: LauncherPreviewState): FixtureAccount | null => {
  switch (state) {
    case 'LOGGED_OUT':
      return null
    case 'LOGGED_IN_PENDING':
      return { username: 'preview_pending', role: 'PLAYER', provisioningStatus: 'PENDING', characters: [] }
    case 'ZERO_CHARACTERS':
      return { username: 'preview_new', role: 'PLAYER', provisioningStatus: 'ACTIVE', characters: [] }
    case 'LOGGED_IN_ACTIVE':
    case 'WITH_CHARACTERS':
      return { username: 'preview_active', role: 'PLAYER', provisioningStatus: 'ACTIVE', characters: FIXTURE_CHARACTERS }
    default:
      return null
  }
}

export const FIXTURE_NEWS = [
  {
    id: 'fixture-news-1',
    slug: 'temporada-6-anuncio',
    title: 'Season 6 chega ao Blood Moon',
    cardSummary: 'Nova season, novos mapas e recompensas exclusivas.',
    launcherSummary: 'Season 6 no ar -- confira as novidades.',
    cardImageUrl: null,
    heroImageUrl: null,
    publishedAt: '2026-08-01T12:00:00.000Z'
  },
  {
    id: 'fixture-news-2',
    slug: 'evento-dobro-de-drop',
    title: 'Fim de semana de drop em dobro',
    cardSummary: 'Taxas de drop dobradas neste fim de semana.',
    launcherSummary: 'Drop x2 neste fim de semana.',
    cardImageUrl: null,
    heroImageUrl: null,
    publishedAt: '2026-07-20T12:00:00.000Z'
  }
]

export const FIXTURE_EVENTS = [
  {
    id: 'fixture-event-1',
    name: 'Invasao de Kundun',
    shortDescription: 'Evento de mundo com boss especial.',
    imageUrl: null,
    startsAt: '2026-08-30T20:00:00.000Z',
    endsAt: '2026-08-30T22:00:00.000Z',
    recommendedLevel: '380+',
    calendarEnabled: true
  },
  {
    id: 'fixture-event-2',
    name: 'Golden Invasion',
    shortDescription: 'Monstros dourados em todos os mapas.',
    imageUrl: null,
    startsAt: '2026-09-05T18:00:00.000Z',
    endsAt: '2026-09-05T19:00:00.000Z',
    recommendedLevel: 'Qualquer',
    calendarEnabled: true
  }
]

export const FIXTURE_RANKING = [
  { position: 1, characterName: 'Artemis', className: 'Elf', level: 400, resets: 12 },
  { position: 2, characterName: 'BloodKnight', className: 'Dark Knight', level: 380, resets: 10 },
  { position: 3, characterName: 'ArcMage', className: 'Dark Wizard', level: 355, resets: 8 }
]

export const FIXTURE_STORE_PRODUCTS = [
  { id: 'fixture-product-1', name: 'Pacote Jewel of Bless x50', category: 'Jewels', price: 500, currency: 'WCOIN' as const, imageUrl: null },
  { id: 'fixture-product-2', name: 'Wing Set Season 6', category: 'Wings', price: 2500, currency: 'WCOIN' as const, imageUrl: null },
  { id: 'fixture-product-3', name: 'Reset Pack x5', category: 'Utility', price: 300, currency: 'GOBLIN_POINT' as const, imageUrl: null }
]
