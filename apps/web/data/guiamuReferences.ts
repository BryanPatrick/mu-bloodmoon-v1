export type GuiaMuReferenceType =
  | 'drops'
  | 'skills'
  | 'maps'
  | 'spots'
  | 'events'
  | 'quests'
  | 'npcs'
  | 'tutorials'
  | 'items'

export type GuiaMuReferenceStatus = 'seeded' | 'needs-scrape' | 'partial' | 'ready-for-review'

export type GuiaMuReferenceSource = {
  key: string
  type: GuiaMuReferenceType
  title: string
  sourceUrl: string
  topicKeys: string[]
  status: GuiaMuReferenceStatus
  scope: string
  notes: string
  assetPolicy: string
}

const referenceOnlyImagePolicy = 'Imagens externas ficam como referencia interna com fonte. Para publicacao, usar asset proprio/remasterizado sem marca dagua.'

export const guiamuReferenceSources: GuiaMuReferenceSource[] = [
  {
    key: 'drop-normal-lorencia',
    type: 'drops',
    title: 'Drops normais por mapa e monstro',
    sourceUrl: 'https://www.guiamuonline.com/lorencia-drop-normal',
    topicKeys: ['drops', 'bosses', 'mapas-e-pvm', 'maps-and-pvm', 'mapas-y-pvm'],
    status: 'needs-scrape',
    scope: 'Lorencia e demais mapas listados no aside de Drop Normal.',
    notes: 'Coletar cada mob, imagem de referencia, categorias de item e caracteristicas do drop.',
    assetPolicy: referenceOnlyImagePolicy
  },
  {
    key: 'skills-dark-knight',
    type: 'skills',
    title: 'Skills - Dark Knight',
    sourceUrl: 'https://www.guiamuonline.com/dark-knight-skill',
    topicKeys: ['dark-knight', 'skills'],
    status: 'needs-scrape',
    scope: 'Skills de classe, armas, orbs, videos, mana, AG, dano e descricao.',
    notes: 'Transformar cada skill em card tecnico para usar no perfil do personagem.',
    assetPolicy: referenceOnlyImagePolicy
  },
  {
    key: 'skills-index',
    type: 'skills',
    title: 'Indice de skills por personagem',
    sourceUrl: 'https://www.guiamuonline.com/skills-mu-online',
    topicKeys: ['skills', 'personagens', 'personajes', 'characters'],
    status: 'needs-scrape',
    scope: 'Dark Knight, Dark Wizard, Fairy Elf, Magic Gladiator, Dark Lord, Summoner, Rage Fighter e classes futuras.',
    notes: 'Usar como mapa para encontrar as rotas de skill de todos os personagens.',
    assetPolicy: referenceOnlyImagePolicy
  },
  {
    key: 'mapa-lorencia',
    type: 'maps',
    title: 'Mapas por cidade',
    sourceUrl: 'https://www.guiamuonline.com/lorencia-mapa',
    topicKeys: ['mapas', 'maps', 'mapas-e-pvm', 'maps-and-pvm', 'mapas-y-pvm'],
    status: 'needs-scrape',
    scope: 'Mapas, imagens de cidade, conexoes e pontos relevantes.',
    notes: 'Agrupar cidades com mais de uma imagem dentro do mesmo objeto de mapa.',
    assetPolicy: referenceOnlyImagePolicy
  },
  {
    key: 'spots-up',
    type: 'spots',
    title: 'Spots de Up',
    sourceUrl: 'https://www.guiamuonline.com/spot/spot.html',
    topicKeys: ['spots-de-up', 'spots-de-level', 'leveling-spots', 'mapas-e-pvm', 'maps-and-pvm', 'mapas-y-pvm'],
    status: 'needs-scrape',
    scope: 'Spots por mapa, coordenadas e agrupamento de monstros.',
    notes: 'Relacionar spots com mapas, monstros e drops para consulta rapida na Wiki.',
    assetPolicy: referenceOnlyImagePolicy
  },
  {
    key: 'eventos-mu-online',
    type: 'events',
    title: 'Eventos MU Online',
    sourceUrl: 'https://www.guiamuonline.com/eventos-mu-online',
    topicKeys: ['eventos', 'events', 'blood-castle', 'devil-square', 'chaos-castle', 'castle-siege', 'crywolf', 'outros-eventos', 'otros-eventos', 'other-events'],
    status: 'needs-scrape',
    scope: 'Eventos, regras, requisitos, entradas, horarios e recompensas.',
    notes: 'Separar eventos de temporada, invasoes, quests-evento e eventos de servidor.',
    assetPolicy: referenceOnlyImagePolicy
  },
  {
    key: 'quests-mu-online',
    type: 'quests',
    title: 'Quests MU Online',
    sourceUrl: 'https://www.guiamuonline.com/quest-mu-online',
    topicKeys: ['quests', 'primeiros-passos', 'primeros-pasos', 'first-steps'],
    status: 'needs-scrape',
    scope: 'Evolucao de classe, eventos com quest, requisitos e recompensas.',
    notes: 'Separar por versao quando o site possuir mais de uma pagina para o mesmo evento.',
    assetPolicy: referenceOnlyImagePolicy
  },
  {
    key: 'npcs-mu-online',
    type: 'npcs',
    title: 'NPCs',
    sourceUrl: 'https://www.guiamuonline.com/npc',
    topicKeys: ['npcs', 'mapas', 'maps'],
    status: 'needs-scrape',
    scope: 'NPCs por mapa, funcao, coordenadas e imagens de referencia.',
    notes: 'Relacionar NPC com quests, comercio, chaos machine, eventos e mapas.',
    assetPolicy: referenceOnlyImagePolicy
  },
  {
    key: 'como-jogar',
    type: 'tutorials',
    title: 'Como jogar',
    sourceUrl: 'https://www.guiamuonline.com/como-jugar',
    topicKeys: ['como-jogar', 'como-jugar', 'how-to-play', 'primeiros-passos', 'primeros-pasos', 'first-steps'],
    status: 'needs-scrape',
    scope: 'Introducao, comandos, fluxo inicial e instrucoes para novos jogadores.',
    notes: 'Adaptar linguagem para o Blood Moon e remover detalhes que nao se aplicam a Season 6.',
    assetPolicy: referenceOnlyImagePolicy
  },
  {
    key: 'equipment-local-catalog',
    type: 'items',
    title: 'Catalogo local de equipamentos',
    sourceUrl: '/wiki',
    topicKeys: [
      'armas',
      'armas-e-escudos',
      'weapons',
      'weapons-and-shields',
      'armas-y-escudos',
      'escudos',
      'shields',
      'asas-e-capas',
      'alas-y-capas',
      'wings-and-capes',
      'acessorios',
      'accessories',
      'pets-e-mounts',
      'pets-y-mounts',
      'pets-and-mounts',
      'consumiveis',
      'consumibles',
      'consumables',
      'jewels',
      'itens-excellent',
      'items-excellent',
      'excellent-items',
      'itens-ancient',
      'items-ancient',
      'ancient-items',
      'itens-socket',
      'items-socket',
      'socket-items',
      'archangel'
    ],
    status: 'partial',
    scope: 'Itens ja coletados no projeto e novas categorias que precisam ser expostas na Wiki.',
    notes: 'Listar todos os itens existentes, criar menus faltantes e ligar cada item ao tipo correto antes de publicar.',
    assetPolicy: 'Usar referencias locais como base e gerar versoes otimizadas quando necessario.'
  }
]

export const guiamuTopicLabels: Record<GuiaMuReferenceType, string> = {
  drops: 'Drops',
  skills: 'Skills',
  maps: 'Mapas',
  spots: 'Spots de Up',
  events: 'Eventos',
  quests: 'Quests',
  npcs: 'NPCs',
  tutorials: 'Tutoriais',
  items: 'Itens'
}

export const guiamuStatusLabels: Record<GuiaMuReferenceStatus, string> = {
  seeded: 'Fonte cadastrada',
  'needs-scrape': 'Coleta pendente',
  partial: 'Coleta parcial',
  'ready-for-review': 'Pronto para revisar'
}

export const getGuiamuSourcesForTopic = (topicKey: string) =>
  guiamuReferenceSources.filter((source) => source.topicKeys.includes(topicKey))
