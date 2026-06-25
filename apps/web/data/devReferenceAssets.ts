import { externalMuReferenceAssets } from './externalMuReferences'
import elfManifest from '../../../references/game-assets/muonlinefanz/elf/manifest.json'
import socketManifest from '../../../references/game-assets/socket-items/manifest.json'

export type DevReferenceGroup = 'Personagens' | 'Equipamentos' | 'Mapas' | 'Monstros' | 'Fontes'

export type DevReferenceStatus = 'Imagem local' | 'Catalogado' | 'Coletar imagem'

export type DevReferenceLibrary = 'Referencias de desenvolvimento' | 'Gerados e otimizados'

export type DevReferenceAsset = {
  id?: string
  title: string
  group: DevReferenceGroup
  category: string
  image?: string
  status: DevReferenceStatus
  compatibility: 'v6-prioridade' | 'validar' | 'high-version-futuro' | 'referencia-visual'
  library?: DevReferenceLibrary
  source: string
  sourceUrl?: string
  notes: string
}

const visual = '/dev-references/visual'
const publicGameAssets = '/dev-references/game-assets'

export const devReferenceGroups: DevReferenceGroup[] = ['Personagens', 'Equipamentos', 'Mapas', 'Monstros', 'Fontes']

type ElfManifestItem = {
  id: string
  title: string
  category: string
  originalPath: string
  enhancedPath: string | null
  source: string
  sourceUrl: string
  ownership: 'shared' | 'elf-exclusive'
  usableBy: string[]
  compatibility: DevReferenceAsset['compatibility']
  duplicatedFrom: string | null
  needsExactImage: boolean
  watermarkPolicy: string
  notes: string
}

type SocketManifestItem = {
  id: string
  title: string
  family: string
  part: 'set' | 'armor-piece' | 'weapon' | 'shield' | 'seed-sphere'
  category: string
  publicPath: string
  source: string
  compatibility: DevReferenceAsset['compatibility']
  notes: string
}

const elfAssetCategoryLabels: Record<string, string> = {
  'ammunition-quivers': 'Municoes e Aljavas - Fairy Elf',
  armor: 'Armaduras - Fairy Elf',
  classes: 'Classes - Fairy Elf',
  shields: 'Escudos compartilhados',
  skills: 'Skills - Fairy Elf',
  weapons: 'Armas - Fairy Elf',
  wings: 'Asas - Fairy Elf'
}

const toPublicReferencePath = (path: string) =>
  path
    .replace(/^references\/game-assets/, publicGameAssets)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '/')

const elfOriginalReferenceAssets: DevReferenceAsset[] = (elfManifest as ElfManifestItem[]).map((item) => ({
  id: item.id,
  title: item.title,
  group: 'Equipamentos',
  category: elfAssetCategoryLabels[item.category] || `Fairy Elf - ${item.category}`,
  image: toPublicReferencePath(item.originalPath),
  status: 'Imagem local',
  compatibility: item.compatibility,
  library: 'Referencias de desenvolvimento',
  source: item.source,
  sourceUrl: item.sourceUrl,
  notes: [
    item.ownership === 'shared'
      ? `Item compartilhado. Usavel por: ${item.usableBy.join(', ')}.`
      : `Item exclusivo/fortemente associado a: ${item.usableBy.join(', ')}.`,
    item.duplicatedFrom ? `Imagem provisoria duplicada de ${item.duplicatedFrom}; revisar quando houver imagem exata.` : '',
    item.needsExactImage ? 'Precisa de imagem exata futuramente.' : '',
    item.notes
  ].filter(Boolean).join(' ')
}))

const socketReferenceAssets: DevReferenceAsset[] = ((socketManifest as { items: SocketManifestItem[] }).items || []).map((item) => ({
  id: item.id,
  title: item.title,
  group: 'Equipamentos',
  category: item.category,
  image: item.publicPath,
  status: 'Imagem local',
  compatibility: item.compatibility,
  library: 'Referencias de desenvolvimento',
  source: item.source,
  sourceUrl: 'https://muonlinefanz.com/guide/items/socket/',
  notes: `${item.notes} Familia: ${item.family}. Tipo: ${item.part}.`
}))

const imageBackedReferenceKeys = new Set(
  elfOriginalReferenceAssets.map((asset) => `${asset.group}-${asset.category}-${asset.title}`)
)

const externalReferenceAssetsWithoutImageBackedDuplicates = externalMuReferenceAssets.filter(
  (asset) => !imageBackedReferenceKeys.has(`${asset.group}-${asset.category}-${asset.title}`)
)

const localDevReferenceAssets: DevReferenceAsset[] = [
  {
    title: 'Fairy Elf - hero aprovada',
    group: 'Personagens',
    category: 'Fairy Elf',
    image: `${visual}/elfa-hero-aprovada-asa-voo.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Referencia aprovada para corpo, realismo, asa lv3 em escala 2.5x e leitura de personagem.'
  },
  {
    title: 'Wind Set - Fairy Elf Blood Moon teste v1',
    group: 'Equipamentos',
    category: 'Armaduras - Fairy Elf',
    image: '/dev-references/generated/equipment/fairy-elf/wind-set-bloodmoon-test-v1.png',
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Primeiro teste de traducao realista do Wind Set: preservar silhueta azul/ciano, metal rigido em ombros, elmo, luvas e botas, com malha flexivel nas areas nao rigidas. Enquadramento feito para caber inteiro no preview de equipamentos.'
  },
  {
    title: 'Wind Set - Fairy Elf Blood Moon teste v2',
    group: 'Equipamentos',
    category: 'Armaduras - Fairy Elf',
    image: '/dev-references/generated/equipment/fairy-elf/wind-set-bloodmoon-test-v2.png',
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Segunda tentativa com leitura mais nostalgica: placas azuis mais limpas, menos segmentacao moderna, elmo e ombreiras mais iconicos, corpo inteiro com margem para preview de equipamento.'
  },
  {
    title: 'Wind Set - remaster sem personagem v1',
    group: 'Equipamentos',
    category: 'Armaduras - Fairy Elf',
    image: '/dev-references/generated/equipment/fairy-elf/wind-set-remaster-equipment-only-v1.png',
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Remaster do Wind Set sem personagem: conjunto em exposicao com elmo, peitoral, ombreiras, manoplas, cintura e botas separados, preservando metal azul/ciano rigido e malha flexivel escura.'
  },
  {
    title: 'Wind Set - remaster fiel ao original v1',
    group: 'Equipamentos',
    category: 'Armaduras - Fairy Elf',
    image: '/dev-references/generated/equipment/fairy-elf/wind-set-original-faithful-remaster-v1.png',
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Remaster conservador do visual original equipado: pose frontal neutra, silhueta classica, azul/ciano dominante, melhoria de nitidez e leitura sem remodelar o set.'
  },
  {
    title: 'Fairy Elf - pose arqueira agachada',
    group: 'Personagens',
    category: 'Fairy Elf',
    image: `${visual}/elfa-pose-arqueira-agachada.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Pose ofensiva olhando para a direita, usada como direcao para pagina da Fairy Elf.'
  },
  {
    title: 'Poses de modelo para preview - grade 1',
    group: 'Personagens',
    category: 'Poses para preview de equipamentos',
    image: `${visual}/poses-modelo-preview-1.jpeg`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia para poses de catalogo: corpo inteiro, postura elegante, leitura clara do equipamento e margem segura para cards.'
  },
  {
    title: "Tooltip Ancient - Rave's Plate Armor topo",
    group: 'Fontes',
    category: 'Tooltip de itens',
    image: `${visual}/tooltips/tooltip-ancient-raves-plate-armor-top.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia de item Ancient: nome verde, stats em branco, restricoes de classe em vermelho, opcoes em azul e titulo de informacao do set em amarelo.'
  },
  {
    title: "Tooltip Ancient - Rave's Plate Armor continuacao",
    group: 'Fontes',
    category: 'Tooltip de itens',
    image: `${visual}/tooltips/tooltip-ancient-raves-plate-armor-bottom.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Continua a imagem anterior: lista bonus Ancient ativos em azul abaixo das pecas do set em verde.'
  },
  {
    title: 'Poses de modelo para preview - vestido preto',
    group: 'Personagens',
    category: 'Poses para preview de equipamentos',
    image: `${visual}/poses-modelo-preview-2.jpeg`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia para poses femininas simples e fortes, com peso em uma perna e corpo virado sem esconder armadura.'
  },
  {
    title: 'Poses de modelo para preview - guia numerado',
    group: 'Personagens',
    category: 'Poses para preview de equipamentos',
    image: `${visual}/poses-modelo-preview-3.jpeg`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia para selecionar variações de pose em previews de set, evitando cortes e mantendo silhueta legivel.'
  },
  {
    title: 'Fairy Elf - pose em floresta',
    group: 'Personagens',
    category: 'Fairy Elf',
    image: `${visual}/elfa-pose-arqueira-floresta.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia de dinamica corporal para composicoes em Noria.'
  },
  {
    title: 'Fairy Elf - corpo e asa MU',
    group: 'Personagens',
    category: 'Fairy Elf',
    image: `${visual}/elfa-mu-online-corpo-asa.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia de armadura branca, vermelho, asa translucida e identidade visual classica.'
  },
  {
    title: 'Fairy Elf - rosto',
    group: 'Personagens',
    category: 'Fairy Elf',
    image: `${visual}/elfa-rosto-referencia.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia facial: loira, traços delicados, sem capacete quando o objetivo for destacar beleza.'
  },
  {
    title: 'Dark Lord - hero Blood Castle realista',
    group: 'Personagens',
    category: 'Dark Lord',
    image: `${visual}/dark-lord/dark-lord-hero-realista-blood-castle.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Referencia salva para realismo, enquadramento amplo e fundo Blood Castle.'
  },
  {
    title: 'Dark Lord - Dark Master aprovado',
    group: 'Personagens',
    category: 'Dark Lord',
    image: `${visual}/dark-lord/dark-lord-hero-dark-master-composicao-aprovada.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Composicao com Dark Master, capa lv3 e menos brilho na arma.'
  },
  {
    title: 'Dark Lord - imagem cortada',
    group: 'Personagens',
    category: 'Dark Lord',
    image: `${visual}/dark-lord/dark-lord-hero-cortado-referencia.jpeg`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Guardar como alerta de enquadramento: deixar mais respiro acima e nao centralizar demais o personagem.'
  },
  {
    title: 'Dark Lord - pose principal',
    group: 'Personagens',
    category: 'Dark Lord',
    image: `${visual}/dark-lord/pose-dl-principal.jpeg`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Pose de autoridade com cetro inclinado, capa longa e leitura de comando.'
  },
  {
    title: 'Dark Lord - rosto original',
    group: 'Personagens',
    category: 'Dark Lord',
    image: `${visual}/dark-lord/visual-dl-original.jpeg`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia classica: cabelo branco, tiara com gema, expressao seria.'
  },
  {
    title: 'Dark Lord - rosto realista',
    group: 'Personagens',
    category: 'Dark Lord',
    image: `${visual}/dark-lord/visual-dl-rosto-realista.jpeg`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia de rosto realista para reduzir aspecto artificial nas proximas imagens.'
  },
  {
    title: 'Dark Lord - hero aprovacao inicial',
    group: 'Personagens',
    category: 'Dark Lord',
    image: `${visual}/dark-lord/dark-lord-hero-aprovacao-inicial.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Imagem gerada guardada para comparar direcao visual, realismo e enquadramento nas proximas versoes.'
  },
  {
    title: 'Dark Lord - Dark Master Blood Castle',
    group: 'Personagens',
    category: 'Dark Lord',
    image: `${visual}/dark-lord/dark-lord-hero-dark-master-blood-castle.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Versao gerada com Dark Master e Blood Castle para referencia de composicao e luz.'
  },
  {
    title: 'Dark Lord - cinematic oficial',
    group: 'Personagens',
    category: 'Dark Lord',
    image: `${visual}/dark-lord/cinematic-oficial-dl-referencia.jpeg`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia cinematica para armadura, ombreiras, luz forte lateral e presenca sombria.'
  },
  {
    title: 'Logo Blood Moon - vermelha',
    group: 'Fontes',
    category: 'Marca',
    image: `${visual}/logo-bloodmoon-vermelha-referencia.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Variação de logo guardada para marca, favicon e estudos de header.'
  },
  {
    title: 'Aileen Bow',
    group: 'Equipamentos',
    category: 'Armas - Fairy Elf',
    image: `${visual}/elfa-aileen-bow-referencia.png`,
    status: 'Imagem local',
    compatibility: 'validar',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario / MU Online Fanz',
    sourceUrl: 'https://muonlinefanz.com/guide/characters/elf/',
    notes: 'Arma visual usada na Fairy Elf. Validar disponibilidade e tier no Blood Moon v6.'
  },
  {
    title: 'Asa lv3 da Fairy Elf - item',
    group: 'Equipamentos',
    category: 'Asas - Fairy Elf',
    image: `${visual}/elfa-asa-lv3-item-referencia.png`,
    status: 'Imagem local',
    compatibility: 'v6-prioridade',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia de asa lv3: translucida verde, veios vermelhos, brilho nas pontas e escala grande.'
  },
  {
    title: 'Asa lv3 da Fairy Elf - ingame',
    group: 'Equipamentos',
    category: 'Asas - Fairy Elf',
    image: `${visual}/elfa-asa-lv3-ingame.png`,
    status: 'Imagem local',
    compatibility: 'v6-prioridade',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia in-game para proporcao, cor e efeito luminoso.'
  },
  {
    title: 'Dark Lord - Great Lord Scepter',
    group: 'Equipamentos',
    category: 'Armas - Dark Lord',
    image: `${visual}/dark-lord/great-lord-scepter-referencia.jpeg`,
    status: 'Imagem local',
    compatibility: 'v6-prioridade',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Cetro com nucleo brilhante sutil; evitar brilho exagerado na arma.'
  },
  {
    title: 'Dark Lord - capa lv3 item',
    group: 'Equipamentos',
    category: 'Capa - Dark Lord',
    image: `${visual}/dark-lord/capa-lv3-dl-item.jpeg`,
    status: 'Imagem local',
    compatibility: 'v6-prioridade',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia de padrao vermelho/dourado da capa lv3.'
  },
  {
    title: 'Dark Lord - capa lv3 ingame',
    group: 'Equipamentos',
    category: 'Capa - Dark Lord',
    image: `${visual}/dark-lord/capa-lv3-dl-ingame-2.jpeg`,
    status: 'Imagem local',
    compatibility: 'v6-prioridade',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia de capa aberta no corpo e proporcao para voo/presenca.'
  },
  {
    title: 'Dark Lord - tamanho da capa',
    group: 'Equipamentos',
    category: 'Capa - Dark Lord',
    image: `${visual}/dark-lord/tamanho-capa-dl-referencia.jpeg`,
    status: 'Imagem local',
    compatibility: 'v6-prioridade',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Guardar escala: capa grande e dominante, sem cobrir completamente armadura.'
  },
  {
    title: 'Dark Master set',
    group: 'Equipamentos',
    category: 'Sets - Dark Lord',
    image: `${visual}/dark-lord/dark-master-set-1.jpeg`,
    status: 'Imagem local',
    compatibility: 'v6-prioridade',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Set solicitado para refazer o Dark Lord com visual mais fiel.'
  },
  {
    title: 'Dark Master set - miniatura',
    group: 'Equipamentos',
    category: 'Sets - Dark Lord',
    image: `${visual}/dark-lord/dark-master-set-0.jpeg`,
    status: 'Imagem local',
    compatibility: 'v6-prioridade',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Complemento visual do Dark Master set.'
  },
  {
    title: 'Dark Lord - corvo',
    group: 'Equipamentos',
    category: 'Companheiros',
    image: `${visual}/dark-lord/corvo-dl-referencia.jpeg`,
    status: 'Imagem local',
    compatibility: 'v6-prioridade',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia para Dark Raven.'
  },
  {
    title: 'Bows e Crossbows da Fairy Elf',
    group: 'Equipamentos',
    category: 'Catalogo externo',
    status: 'Catalogado',
    compatibility: 'v6-prioridade',
    source: 'MU Online Fanz',
    sourceUrl: 'https://muonlinefanz.com/guide/characters/elf/',
    notes: 'Short Bow, Crossbow, Bow, Golden Crossbow, Elven Bow, Tiger Bow, Silver Bow, Bluewing Crossbow, Aquagold Crossbow, Saint Crossbow, Celestial Bow, Divine Crossbow, Great Reign Crossbow, Sylph Wind Bow e Aileen Bow.'
  },
  {
    title: 'Sets classicos da Fairy Elf',
    group: 'Equipamentos',
    category: 'Catalogo externo',
    status: 'Catalogado',
    compatibility: 'v6-prioridade',
    source: 'MU Online Fanz',
    sourceUrl: 'https://muonlinefanz.com/guide/characters/elf/',
    notes: 'Vine, Silk, Wind, Spirit, Guardian, Iris, Holy Spirit, Divine e Red Spirit.'
  },
  {
    title: 'Sets modernos da Fairy Elf',
    group: 'Equipamentos',
    category: 'Catalogo externo',
    status: 'Catalogado',
    compatibility: 'high-version-futuro',
    source: 'MU Online Fanz',
    sourceUrl: 'https://muonlinefanz.com/guide/characters/elf/',
    notes: 'Bloodangel, Darkangel, Holyangel, Manticore, Silver Heart, Brilliant, Soul e Blue Eye para servidor futuro.'
  },
  {
    title: 'Noria - floresta realista',
    group: 'Mapas',
    category: 'Noria',
    image: '/images/hero-elfa-noria.png',
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Mapa base da home: floresta de Noria, vagalumes, luz de por do sol e atmosfera fantastica.'
  },
  {
    title: 'Noria - gramado, ponte e rio',
    group: 'Mapas',
    category: 'Noria',
    image: '/images/guide-elfa-hero.png',
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Quadrante alternativo para pagina da Fairy Elf, com rio/ponte e personagem em destaque.'
  },
  {
    title: 'Blood Castle',
    group: 'Mapas',
    category: 'Blood Castle',
    image: '/images/guide-dark-lord-hero.png',
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Gerados e otimizados',
    source: 'Gerada no projeto',
    notes: 'Fundo usado para Dark Lord; manter mais claro para leitura do site.'
  },
  {
    title: 'Monstros e bosses',
    group: 'Monstros',
    category: 'Catalogo externo',
    status: 'Coletar imagem',
    compatibility: 'validar',
    source: 'MU Online Fanz',
    sourceUrl: 'https://muonlinefanz.com/guide/',
    notes: 'Categoria reservada para spots, bosses, drops e monstros. Imagens externas ainda precisam ser baixadas/autorizadas e separadas.'
  },
  {
    title: 'MegaMu - skills e dados por versao',
    group: 'Fontes',
    category: 'Dados',
    status: 'Catalogado',
    compatibility: 'validar',
    source: 'MegaMu Forum',
    sourceUrl: 'https://megamu.net/forum/showthread.php?tid=11675',
    notes: 'Referencia coletada para formulas, skills e diferencas de versao. Usar como base bruta antes de publicar.'
  },
  {
    title: 'MU Online Fanz - Fairy Elf',
    group: 'Fontes',
    category: 'Dados',
    status: 'Catalogado',
    compatibility: 'validar',
    source: 'MU Online Fanz',
    sourceUrl: 'https://muonlinefanz.com/guide/characters/elf/',
    notes: 'Dados de lore, evolucao, formulas, skills, equipamentos, asas, sets e conteudo moderno da Fairy Elf.'
  },
  {
    title: 'MU Online Fanz - Excellent Items',
    group: 'Fontes',
    category: 'Dados',
    status: 'Catalogado',
    compatibility: 'validar',
    source: 'MU Online Fanz',
    sourceUrl: 'https://muonlinefanz.com/guide/items/excellent/',
    notes: 'Referencia coletada para itens Excellent, opcoes ofensivas/defensivas, obtencao, FO, drops e separacao entre excellent, upgrade/bless, +15, harmony, luck e additional option.'
  },
  {
    title: 'Logo Blood Moon',
    group: 'Fontes',
    category: 'Marca',
    image: `${visual}/logo-bloodmoon-sem-fundo-referencia.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Logo principal do servidor guardada como referencia.'
  },
  {
    title: 'Padrao translucido Microsoft',
    group: 'Fontes',
    category: 'UI',
    image: `${visual}/ui-icones-translucidos-microsoft.png`,
    status: 'Imagem local',
    compatibility: 'referencia-visual',
    library: 'Referencias de desenvolvimento',
    source: 'Usuario',
    notes: 'Referencia de translucidez, brilho, blur e menus do site.'
  }
]

export const devReferenceAssets: DevReferenceAsset[] = [
  ...localDevReferenceAssets,
  ...elfOriginalReferenceAssets,
  ...socketReferenceAssets,
  ...externalReferenceAssetsWithoutImageBackedDuplicates
]
