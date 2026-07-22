import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const harvestPath = resolve(repoRoot, 'references/game-data/source-harvest/guiamu-com-ar/guiamu-com-ar-data.json')
const equipmentPath = resolve(repoRoot, 'apps/web/data/muEquipmentIndex.generated.json')
const outputPath = resolve(repoRoot, 'references/game-data/guiamu-ancient-sets-normalized.json')

const harvest = JSON.parse(readFileSync(harvestPath, 'utf8'))
const equipment = JSON.parse(readFileSync(equipmentPath, 'utf8'))
const sourcePage = harvest.pages.find((page) =>
  page.title === 'Conjuntos Antigos (ACC)' && page.url?.includes('lang=pt')
)

if (!sourcePage?.tables?.[0]?.rows) {
  throw new Error('Ancient set source table was not found in the harvested data.')
}

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim()
  .toLowerCase()

const titleTranslations = new Map([
  ['almofadas', 'pad'], ['almofada', 'pad'], ['ossos', 'bone'], ['osso', 'bone'],
  ['lendario', 'legendary'], ['esfinge', 'sphinx'], ['couro', 'leather'], ['escama', 'scale'],
  ['latao', 'brass'], ['dragao', 'dragon'], ['guardiao', 'guardian'], ['seda', 'silk'],
  ['vinha', 'vine'], ['vento', 'wind'], ['violento', 'violent'], ['espirito', 'spirit'],
  ['alma', 'soul'], ['mestre', 'master'], ['escuro', 'dark'], ['aco', 'steel'],
  ['corvo', 'crow'], ['trovao', 'thunder'], ['falcao', 'hawk'], ['grande', 'great'],
  ['vermelho', 'red'], ['adamantino', 'adamantine'], ['glorioso', 'glorious'],
  ['perfurante', 'piercing'], ['ranhura', 'groove']
])
const stopWords = new Set(['conjunto', 'de', 'do', 'da', 'das', 'dos', 'antigo', 'antiga'])
const canonicalTokens = (value) => normalize(value)
  .split(' ')
  .filter((token) => token && !stopWords.has(token))
  .map((token) => titleTranslations.get(token) || token)

const ancientItems = equipment.filter((item) => item.category === 'Ancient Normal')
const candidates = ancientItems.map((item) => ({
  name: item.name,
  tokens: new Set(canonicalTokens(item.name))
}))
const exactTitleAliases = new Map(Object.entries({
  'conjunto de couro guerreiro': 'Warrior Leather',
  'conjunto de couro anonimo': 'Anonymous Leather',
  'conjunto nevoa bronze': 'Mist Bronze',
  'conjunto de latao nuvem': 'Cloud Brass',
  'conjunto de escala eplete': 'Eplete Scale',
  'conjunto de escala berserker': 'Berserker Scale',
  'conjunto de pratos kantata': 'Kantata Plate',
  'conjunto de pratos rave': 'Rave Plate',
  'conjunto de dragao vicioso': 'Vicious Dragon',
  'conjunto bragi fenix negra': 'Bragi Dark Phoenix',
  'conjunto de videira ceto': 'Ceto Vine',
  'conjunto de videira drake': 'Drake Vine',
  'conjunto vento elfico': 'Elvian Wind',
  'conjunto muren atlans': 'Muren Storm Crow',
  'conjunto apis valente': 'Apis Valiant',
  'conjunto asa vermelha chrono': 'Chrono Red Wing',
  'conjunto asa vermelha semeden': 'Semeden Red Wing',
  'conjunto antigo da harpia': 'Hapy Ancient',
  'conjunto demoniaco eluna': 'Elune Demonic',
  'conjunto de fogo sagrado vega': 'Vega Sacred Fire',
  'conjunto fogo sagrado chamer': 'Chamer Sacred Fire',
  'conjunto tempestade sagrada de horus': 'Horus Holy Storm',
  'conjunto emile kanaz': 'Kenaz Iria',
  'conjunto arkajin kanaz': 'Kenaz Arka',
  'conjunto asa noturna molossus': 'Molos Nigthwing',
  'conjunto asa noturna vesper': 'Vesper Nightwing',
  'conjunto frere ardente': 'Burning Frere',
  'conjunto falcao frere': 'Falcon Frere',
  'conjunto de sinalizadores magicos magus': 'Camill Sate',
  'conjunto de sinalizadores magicos baldur': 'Carthy Sate'
}))

function matchSetName(sourceTitle) {
  const exactAlias = exactTitleAliases.get(normalize(sourceTitle))
  if (exactAlias) return { name: exactAlias, overlap: 2, score: 1 }

  const tokens = new Set(canonicalTokens(sourceTitle))
  const ranked = candidates.map((candidate) => {
    const overlap = [...tokens].filter((token) => candidate.tokens.has(token)).length
    const union = new Set([...tokens, ...candidate.tokens]).size
    return { ...candidate, overlap, score: union ? overlap / union : 0 }
  }).sort((a, b) => b.overlap - a.overlap || b.score - a.score || a.name.localeCompare(b.name))

  return ranked[0]?.overlap >= 2 ? ranked[0] : null
}

const slotLabels = new Map([
  ['leme', 'Helm'], ['capacete', 'Helm'], ['armadura', 'Armor'], ['luvas', 'Gloves'],
  ['calcas', 'Pants'], ['botas', 'Boots'], ['anel', 'Ring'], ['pingente', 'Pendant'],
  ['escudo', 'Shield']
])
const classTranslations = new Map([
  ['cavaleiro das trevas', 'Dark Knight'], ['cavaleiro da lamina', 'Blade Knight'],
  ['mestre das laminas', 'Blade Master'], ['mago das trevas', 'Dark Wizard'],
  ['mestre da alma', 'Soul Master'], ['gladiador magico', 'Magic Gladiator'],
  ['senhor das trevas', 'Dark Lord'], ['lutador de raiva', 'Rage Fighter'],
  ['elfo fada', 'Fairy Elf'], ['elfa fada', 'Fairy Elf'], ['invocadora', 'Summoner']
])

function parseCell(cell) {
  const lines = String(cell || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const sourceTitle = lines[0] || ''
  const infoIndex = lines.findIndex((line) => normalize(line).includes('informacoes sobre opcoes'))
  const seasonLine = [...lines].reverse().find((line) => /^temporada\s+\d+/i.test(normalize(line)))
  const minSeason = Number.parseInt(seasonLine?.match(/\d+/)?.[0] || '1', 10)
  const matched = matchSetName(sourceTitle)
  const beforeOptions = infoIndex === -1 ? lines.slice(1) : lines.slice(1, infoIndex)
  const pieces = []
  const classes = []

  for (let index = 0; index < beforeOptions.length; index += 1) {
    const line = beforeOptions[index]
    const normalized = normalize(line)
    const slot = slotLabels.get(normalized)
    if (slot) {
      pieces.push({ slot, sourceLabel: line, stat: beforeOptions[index + 1] || null })
      continue
    }

    for (const [sourceClass, className] of classTranslations) {
      if (normalized.includes(sourceClass) && !classes.includes(className)) classes.push(className)
    }

    if (normalized.includes('anel') && !pieces.some((piece) => piece.slot === 'Ring')) {
      pieces.push({ slot: 'Ring', sourceLabel: line, stat: null })
    }
    if (normalized.includes('pingente') && !pieces.some((piece) => piece.slot === 'Pendant')) {
      pieces.push({ slot: 'Pendant', sourceLabel: line, stat: null })
    }
    if (normalized.includes('escudo') && !pieces.some((piece) => piece.slot === 'Shield')) {
      pieces.push({ slot: 'Shield', sourceLabel: line, stat: beforeOptions[index + 1] || null })
    }
    if (/^(?:dano|magia|defesa|taxa|velocidade)/i.test(normalize(beforeOptions[index + 1] || '')) &&
      !/^(?:dano|magia|defesa|taxa|velocidade)/i.test(normalized) &&
      !pieces.some((piece) => piece.sourceLabel === line)) {
      pieces.push({ slot: 'Weapon', sourceLabel: line, stat: beforeOptions[index + 1] || null })
    }
  }

  const optionLines = infoIndex === -1 ? [] : lines.slice(infoIndex + 1).filter((line) => !/^temporada\s+\d+/i.test(normalize(line)))
  const options = []
  let piecesRequired = null
  for (const line of optionLines) {
    const marker = normalize(line).match(/^(\d+)\s*(?:efeitos? de conjunto|definir efeito|efeitos? de set)/)
    if (marker) {
      piecesRequired = Number.parseInt(marker[1], 10)
      continue
    }
    if (!piecesRequired) continue
    options.push({ pieces: piecesRequired, label: line })
  }

  return {
    sourceTitle,
    matchedName: matched?.name || null,
    matchScore: matched?.score || 0,
    overlap: matched?.overlap || 0,
    minSeason,
    classes,
    pieces,
    options
  }
}

const sets = sourcePage.tables[0].rows.flat().filter(Boolean).map(parseCell)
const payload = {
  generatedAt: new Date().toISOString(),
  sourceUrl: sourcePage.url,
  totals: {
    sourceSets: sets.length,
    matchedSets: sets.filter((set) => set.matchedName).length,
    unmatchedSets: sets.filter((set) => !set.matchedName).length,
    options: sets.reduce((total, set) => total + set.options.length, 0),
    pieces: sets.reduce((total, set) => total + set.pieces.length, 0)
  },
  sets
}

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
console.log(JSON.stringify(payload.totals, null, 2))
if (payload.totals.unmatchedSets) {
  console.log('Unmatched:', sets.filter((set) => !set.matchedName).map((set) => set.sourceTitle).join(' | '))
}
