import type { DevReferenceAsset, DevReferenceGroup } from './devReferenceAssets'

type Seed = {
  title: string
  group: DevReferenceGroup
  category: string
  compatibility?: DevReferenceAsset['compatibility']
  sourceUrl: string
  notes?: string
}

const fanz = 'MU Online Fanz'
const megamu = 'MegaMu Forum'

const toCatalogAsset = (seed: Seed): DevReferenceAsset => ({
  title: seed.title,
  group: seed.group,
  category: seed.category,
  status: 'Coletar imagem',
  compatibility: seed.compatibility || 'validar',
  source: seed.sourceUrl.includes('megamu.net') ? megamu : fanz,
  sourceUrl: seed.sourceUrl,
  notes: seed.notes || 'Objeto reservado para receber imagem, dados e decisao de uso posteriormente.'
})

const characterUrl = (slug: string) => `https://muonlinefanz.com/guide/characters/${slug}/`
const itemUrl = (slug = '') => `https://muonlinefanz.com/guide/items/${slug}`
const toolItemUrl = 'https://muonlinefanz.com/tools/items/'
const monsterUrl = 'https://muonlinefanz.com/tools/mobs/'
const mapUrl = 'https://muonlinefanz.com/tools/maps/'

const characters: Seed[] = [
  ['Dark Knight', 'dark-knight', 'v6-prioridade'],
  ['Fairy Elf', 'elf', 'v6-prioridade'],
  ['Dark Wizard', 'dark-wizard', 'v6-prioridade'],
  ['Summoner', 'summoner', 'validar'],
  ['Magic Gladiator', 'magic-gladiator', 'v6-prioridade'],
  ['Dark Lord', 'dark-lord', 'v6-prioridade'],
  ['Rage Fighter', 'rage-fighter', 'validar'],
  ['White Wizard', 'white-wizard', 'high-version-futuro'],
  ['Mage', 'mage', 'high-version-futuro'],
  ['Rune Mage', 'rune-mage', 'high-version-futuro'],
  ['Slayer', 'slayer', 'high-version-futuro'],
  ['Gun Crusher', 'gun-crusher', 'high-version-futuro'],
  ['Grow Lancer', 'grow-lancer', 'high-version-futuro']
].map(([title, slug, compatibility]) => ({
  title,
  group: 'Personagens',
  category: 'Personagem externo',
  compatibility: compatibility as DevReferenceAsset['compatibility'],
  sourceUrl: characterUrl(slug),
  notes: 'Referencia de personagem para pagina dedicada, lore, formulas, skills e equipamentos.'
}))

const itemCategories: Seed[] = [
  ['Item Database', toolItemUrl, 'Catalogo geral com milhares de itens; usar como indice para baixar imagens depois.'],
  ['Combat Items', itemUrl('combat-items/'), 'Pocoes, consumiveis e itens utilitarios de combate.'],
  ['Rings', itemUrl('ring/'), 'Aneis, resistencias e acessorios.'],
  ['Necklaces', itemUrl('necklace/'), 'Pendants e colares por elemento/tipo.'],
  ['Pets', itemUrl('pets/'), 'Pets classicos e utilitarios.'],
  ['Mounts', itemUrl('mounts/'), 'Montarias e criaturas equipaveis.'],
  ['Muun', itemUrl('muun/'), 'Conteudo moderno, preservar para servidor futuro.'],
  ['Excellent Items', itemUrl('excellent-items/'), 'Itens excellent e opcoes especiais.'],
  ['Pentagrams', itemUrl('pentagrams/'), 'Sistema elemental moderno; high-version-futuro.'],
  ['Wings Capes', itemUrl('wings/'), 'Asas e capas por classe e tier.'],
  ['Earrings', itemUrl('earrings/'), 'Acessorios modernos; high-version-futuro.'],
  ['Guardian Mounts', itemUrl('guardian-mounts/'), 'Montarias guardian modernas.'],
  ['Ancient Items', itemUrl('ancient-items/'), 'Sets ancient e bonus de set.'],
  ['Lucky Sets', itemUrl('lucky/'), 'Sets lucky; validar versao.'],
  ['Socket Items', itemUrl('socket-items/'), 'Itens socket; validar escopo v6.'],
  ['Siege Items', itemUrl('siege/'), 'Itens ligados a Castle Siege.'],
  ['Moss Items', itemUrl('moss/'), 'Itens de Moss/Gamble.'],
  ['Archangel Items', itemUrl('archangel-items/'), 'Armas Archangel e versoes blessed.'],
  ['Mastery Sets', itemUrl('mastery-sets/'), 'Sets mastery modernos para servidor high-version.'],
  ['Mastery Weapons', itemUrl('mastery-weapons/'), 'Armas mastery modernas para servidor high-version.'],
  ['Enhanced Sets', itemUrl('enhanced-sets/'), 'Sets enhanced modernos.'],
  ['Enhanced Weapons', itemUrl('enhanced-weapons/'), 'Armas enhanced modernas.']
].map(([title, sourceUrl, notes]) => ({
  title,
  group: 'Equipamentos',
  category: 'Categoria externa',
  compatibility: title.includes('Mastery') || title.includes('Enhanced') || title === 'Muun' || title === 'Pentagrams' || title === 'Earrings' ? 'high-version-futuro' : 'validar',
  sourceUrl,
  notes
})) as Seed[]

const equipmentSeeds: Seed[] = [
  ...[
    'Leather Set',
    'Bronze Set',
    'Scale Set',
    'Brass Set',
    'Plate Set',
    'Dragon Set',
    'Black Dragon Set',
    'Dark Phoenix Set',
    'Great Dragon Set',
    'Ashcrow Set'
  ].map((title) => ({
    title,
    group: 'Equipamentos' as DevReferenceGroup,
    category: 'Sets - Dark Knight',
    compatibility: 'v6-prioridade' as DevReferenceAsset['compatibility'],
    sourceUrl: toolItemUrl,
    notes: 'Objeto de set classico para guerreiro; adicionar imagem do item/set quando coletada.'
  })),
  ...[
    'Pad Set',
    'Bone Set',
    'Sphinx Set',
    'Legendary Set',
    'Grand Soul Set',
    'Dark Soul Set',
    'Venom Mist Set',
    'Eclipse Set'
  ].map((title) => ({
    title,
    group: 'Equipamentos' as DevReferenceGroup,
    category: 'Sets - Dark Wizard',
    compatibility: 'v6-prioridade' as DevReferenceAsset['compatibility'],
    sourceUrl: toolItemUrl,
    notes: 'Objeto de set classico para mago; adicionar imagem do item/set quando coletada.'
  })),
  ...[
    'Vine Set',
    'Silk Set',
    'Wind Set',
    'Spirit Set',
    'Guardian Set',
    'Iris Set',
    'Holy Spirit Set',
    'Divine Set',
    'Red Spirit Set'
  ].map((title) => ({
    title,
    group: 'Equipamentos' as DevReferenceGroup,
    category: 'Sets - Fairy Elf',
    compatibility: 'v6-prioridade' as DevReferenceAsset['compatibility'],
    sourceUrl: characterUrl('elf'),
    notes: 'Set da Fairy Elf citado na referencia da Fairy Elf; pronto para receber imagem e dados detalhados.'
  })),
  ...[
    'Storm Crow Set',
    'Thunder Hawk Set',
    'Hurricane Set',
    'Volcano Set',
    'Valiant Set'
  ].map((title) => ({
    title,
    group: 'Equipamentos' as DevReferenceGroup,
    category: 'Sets - Magic Gladiator',
    compatibility: 'v6-prioridade' as DevReferenceAsset['compatibility'],
    sourceUrl: toolItemUrl,
    notes: 'Objeto de set para Magic Gladiator; validar disponibilidade na versao do servidor.'
  })),
  ...[
    'Light Plate Set',
    'Adamantine Set',
    'Dark Steel Set',
    'Dark Master Set',
    'Sunlight Set'
  ].map((title) => ({
    title,
    group: 'Equipamentos' as DevReferenceGroup,
    category: 'Sets - Dark Lord',
    compatibility: 'v6-prioridade' as DevReferenceAsset['compatibility'],
    sourceUrl: characterUrl('dark-lord'),
    notes: 'Objeto de set do Dark Lord; Dark Master ja possui referencias locais no projeto.'
  })),
  ...[
    'Short Bow',
    'Crossbow',
    'Bow',
    'Golden Crossbow',
    'Elven Bow',
    'Tiger Bow',
    'Silver Bow',
    'Bluewing Crossbow',
    'Aquagold Crossbow',
    'Saint Crossbow',
    'Celestial Bow',
    'Divine Crossbow',
    'Great Reign Crossbow',
    'Sylph Wind Bow',
    'Aileen Bow'
  ].map((title) => ({
    title,
    group: 'Equipamentos' as DevReferenceGroup,
    category: 'Armas - Fairy Elf',
    compatibility: 'v6-prioridade' as DevReferenceAsset['compatibility'],
    sourceUrl: characterUrl('elf'),
    notes: 'Arma de Fairy Elf catalogada para wiki e galeria visual; adicionar imagem individual depois.'
  })),
  ...[
    'Kris',
    'Short Sword',
    'Katana',
    'Sword of Assassin',
    'Blade',
    'Gladius',
    'Falchion',
    'Serpent Sword',
    'Salamander Sword',
    'Light Saber',
    'Legendary Sword',
    'Heliacal Sword',
    'Double Blade',
    'Lighting Sword',
    'Giant Sword',
    'Sword of Destruction',
    'Dark Breaker',
    'Knight Blade',
    'Bone Blade'
  ].map((title) => ({
    title,
    group: 'Equipamentos' as DevReferenceGroup,
    category: 'Armas - Espadas',
    compatibility: 'v6-prioridade' as DevReferenceAsset['compatibility'],
    sourceUrl: toolItemUrl,
    notes: 'Arma classica catalogada para receber imagem, requisitos e classe compatível.'
  })),
  ...[
    'Skull Staff',
    'Angelic Staff',
    'Serpent Staff',
    'Thunder Staff',
    'Gorgon Staff',
    'Legendary Staff',
    'Staff of Resurrection',
    'Chaos Lightning Staff',
    'Staff of Destruction',
    'Dragon Soul Staff',
    'Kundun Staff'
  ].map((title) => ({
    title,
    group: 'Equipamentos' as DevReferenceGroup,
    category: 'Armas - Staffs',
    compatibility: 'v6-prioridade' as DevReferenceAsset['compatibility'],
    sourceUrl: toolItemUrl,
    notes: 'Staff catalogado para mago/summoner conforme validacao de versao.'
  })),
  ...[
    'Battle Scepter',
    'Master Scepter',
    'Great Scepter',
    'Lord Scepter',
    'Great Lord Scepter',
    'Absolute Scepter'
  ].map((title) => ({
    title,
    group: 'Equipamentos' as DevReferenceGroup,
    category: 'Armas - Dark Lord',
    compatibility: 'v6-prioridade' as DevReferenceAsset['compatibility'],
    sourceUrl: characterUrl('dark-lord'),
    notes: 'Scepter do Dark Lord para receber imagem e dados; manter brilho da arma contido.'
  }))
]

const maps: Seed[] = [
  'Acheron',
  'Aida',
  'Arena',
  'Atlans',
  'Atlans (Abyss)',
  'Balgass Barracks',
  "Crimson Flame's Icarus",
  'Crywolf',
  'Cubera Mine',
  'Debenter',
  'Deep Dungeon',
  'Devias',
  'Dungeon',
  'Elveland',
  'Event Square',
  'Ferea',
  'Icarus',
  'Kalima',
  'Kanturu Relics',
  'Kanturu Ruins',
  'Karutan',
  'Land of Trials',
  'Loren Market',
  'Lorencia',
  'Lost Tower',
  'Nars',
  'Nixies Lake',
  'Noria',
  'Raklion',
  'Scorched Canyon',
  'Swamp of Darkness',
  'Swamp of Peace',
  'Tarkan',
  'Uruk Mountain',
  'Valley of Loren',
  'Vulcanus'
].map((title) => ({
  title,
  group: 'Mapas',
  category: title === 'Noria' || title === 'Lorencia' || title === 'Devias' || title === 'Dungeon' || title === 'Atlans' || title === 'Lost Tower' || title === 'Tarkan' || title === 'Icarus' ? 'Mapas classicos' : 'Mapas modernos/eventos',
  compatibility: title === 'Noria' || title === 'Lorencia' || title === 'Devias' || title === 'Dungeon' || title === 'Atlans' || title === 'Lost Tower' || title === 'Tarkan' || title === 'Icarus' ? 'v6-prioridade' : 'validar',
  sourceUrl: mapUrl,
  notes: 'Mapa catalogado para receber imagem, spots, NPCs e monstros quando coletados.'
})) as Seed[]

const monsters: Seed[] = [
  'Aegis',
  'Agon',
  'Alpha Crust',
  'Alquamos',
  'Assassin',
  'Axe Warrior',
  'Bahamut',
  'Balgass',
  'Balram',
  'Balrog',
  'Beam Knight',
  'Berserker',
  'Blood Assassin',
  'Blood Soldier',
  'Bloody Death Rider',
  'Bloody Golem',
  'Bloody Orc',
  'Bloody Witch Queen',
  'Blue Golem',
  'Bone Scorpion',
  'Bow Scout',
  'Budge Dragon',
  'Bull Fighter',
  'Burning Lava Giant',
  'Chain Scorpion',
  'Chaos Castle Archer',
  'Chaos Castle Guardsman',
  'Chaos Castle Wizard',
  'Chief Skeleton Warrior',
  'Condra',
  'Cursed Lich',
  'Cursed Wizard',
  'Cyclops',
  'Dark Elf',
  'Dark Knight',
  'Death Cow',
  'Death Gorgon',
  'Death King',
  'Death Rider',
  'Death Tree',
  'Devil',
  'Elite Yeti',
  'Giant',
  'Goblin',
  'Golden Dragon',
  'Gorgon',
  'Hell Hound',
  'Hell Spider',
  'Hydra',
  'Ice Monster',
  'Lich',
  'Metal Balrog',
  'Minotaur',
  'Poison Bull Fighter',
  'Red Dragon',
  'Skeleton',
  'Spider',
  'Tantalose',
  'White Wizard',
  'Yeti'
].map((title) => ({
  title,
  group: 'Monstros',
  category: title.includes('Golden') || title.includes('Dragon') || title.includes('Balgass') || title.includes('Balrog') || title.includes('Hydra') || title.includes('White Wizard') ? 'Bosses/Eventos' : 'Monstros',
  compatibility: 'validar',
  sourceUrl: monsterUrl,
  notes: 'Monstro catalogado para receber imagem, level, mapa, spot e tabela de drop.'
})) as Seed[]

const systemsAndEvents: Seed[] = [
  ['Chaos Castle', 'Mini-game', 'https://muonlinefanz.com/guide/minigames/chaos-castle/'],
  ['Blood Castle', 'Mini-game', 'https://muonlinefanz.com/guide/minigames/blood-castle/'],
  ['Devil Square', 'Mini-game', 'https://muonlinefanz.com/guide/minigames/devil-square/'],
  ['Illusion Temple', 'Mini-game', 'https://muonlinefanz.com/guide/minigames/illusion-temple/'],
  ['Doppelganger', 'Mini-game', 'https://muonlinefanz.com/guide/minigames/doppelganger/'],
  ['Castle Siege', 'Sistema', 'https://muonlinefanz.com/guide/minigames/castle-siege/'],
  ['Crywolf Invasion', 'Sistema', 'https://muonlinefanz.com/guide/minigames/crywolf-invasion/'],
  ['Combat Mechanics', 'Sistema', 'https://muonlinefanz.com/guide/systems/combat-mechanics/'],
  ['PVP Mechanics', 'Sistema', 'https://muonlinefanz.com/guide/systems/pvp-mechanics/'],
  ['Party System', 'Sistema', 'https://muonlinefanz.com/guide/systems/party-system/'],
  ['Guild System', 'Sistema', 'https://muonlinefanz.com/guide/systems/guild-system/'],
  ['Gens System', 'Sistema', 'https://muonlinefanz.com/guide/systems/gens-system/']
].map(([title, category, sourceUrl]) => ({
  title,
  group: 'Fontes',
  category,
  compatibility: title === 'Gens System' || title === 'Doppelganger' || title === 'Illusion Temple' ? 'high-version-futuro' : 'validar',
  sourceUrl,
  notes: 'Referencia de sistema/evento para organizar imagens, regras e dados antes de publicar.'
})) as Seed[]

export const externalMuReferenceAssets: DevReferenceAsset[] = [
  ...characters,
  ...itemCategories,
  ...equipmentSeeds,
  ...maps,
  ...monsters,
  ...systemsAndEvents,
  {
    title: 'MegaMu - topico base de skills',
    group: 'Fontes',
    category: 'Dados',
    status: 'Catalogado',
    compatibility: 'validar',
    source: megamu,
    sourceUrl: 'https://megamu.net/forum/showthread.php?tid=11675',
    notes: 'Fonte adicional para skills, NPCs, quests e sistemas por versao.'
  }
].map((asset) => ('status' in asset ? asset : toCatalogAsset(asset)))
