import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const remapFile = resolve(repoRoot, 'apps/web/data/muEquipmentRemap.generated.json')
const outputFile = resolve(repoRoot, 'references/game-data/equipment-postgres-import-plan.json')

const remap = JSON.parse(readFileSync(remapFile, 'utf8'))

const groupMap = {
  set: 'SET',
  'set-piece': 'SET_PIECE',
  weapon: 'WEAPON',
  shield: 'SHIELD',
  wing: 'WING',
  accessory: 'ACCESSORY',
  pet: 'PET',
  jewel: 'JEWEL',
  consumable: 'CONSUMABLE',
  misc: 'MISC'
}

const qualityMap = {
  normal: 'NORMAL',
  excellent: 'EXCELLENT',
  ancient: 'ANCIENT',
  socket: 'SOCKET',
  masteryAncient: 'MASTERY_ANCIENT',
  lucky: 'LUCKY'
}

function slotFromPieceName(name, fallback = 'Item') {
  if (/\bhelm(?:et)?\b/i.test(name)) return 'Helm'
  if (/\barmor\b/i.test(name)) return 'Armor'
  if (/\bpants\b/i.test(name)) return 'Pants'
  if (/\bgloves\b/i.test(name)) return 'Gloves'
  if (/\bboots\b/i.test(name)) return 'Boots'
  if (/\bshield\b/i.test(name)) return 'Shield'
  if (/\bring\b/i.test(name)) return 'Ring'
  if (/\bpendant\b/i.test(name)) return 'Pendant'
  if (/\b(sword|blade|axe|mace|bow|crossbow|staff|stick|scepter|spear|lance|claw|book|orb|rune|gun|star)\b/i.test(name)) return 'Weapon'
  return fallback
}

const equipment = remap.items.map((item) => ({
  key: item.key,
  name: item.name,
  title: item.title,
  category: item.category,
  categorySlug: item.categorySlug,
  group: groupMap[item.group] || 'MISC',
  baseSetName: item.baseSetName,
  sourceUrl: item.sourceUrl,
  minSeason: item.minSeason,
  status: item.warnings?.length ? 'NORMALIZED' : 'REVIEWED',
  rawData: {
    listStats: item.listStats,
    image: item.image
  },
  remapData: {
    baseClasses: item.baseClasses,
    playableClasses: item.playableClasses,
    targetClasses: item.targetClasses,
    warnings: item.warnings,
    hasExcellentStats: item.hasExcellentStats
  }
}))

const variants = remap.items.flatMap((item) =>
  item.qualities.map((quality) => ({
    equipmentKey: item.key,
    quality: qualityMap[quality] || 'NORMAL',
    minSeason: item.minSeason,
    data: {
      sourceQuality: quality,
      classes: item.playableClasses,
      targetClasses: item.targetClasses,
      warnings: item.warnings
    }
  }))
)

const pieces = remap.items.flatMap((item) =>
  (item.slots || []).map((piece, index) => ({
    equipmentKey: item.key,
    name: piece,
    slot: slotFromPieceName(piece, item.category),
    imagePath: item.image?.publicPath || null,
    sortOrder: index,
    data: {
      baseSetName: item.baseSetName,
      category: item.category
    }
  }))
)

const options = remap.items.flatMap((item) =>
  (item.setOptions || []).map((option, index) => ({
    equipmentKey: item.key,
    scope: item.qualities.includes('masteryAncient') ? 'mastery-ancient' : item.qualities.includes('ancient') ? 'ancient' : 'set',
    label: option,
    sortOrder: index,
    data: {
      source: 'remap'
    }
  }))
)

const plan = {
  generatedAt: new Date().toISOString(),
  sourceFile: 'apps/web/data/muEquipmentRemap.generated.json',
  totals: {
    equipment: equipment.length,
    variants: variants.length,
    pieces: pieces.length,
    options: options.length,
    warnings: remap.totals
  },
  equipment,
  variants,
  pieces,
  options
}

mkdirSync(dirname(outputFile), { recursive: true })
writeFileSync(outputFile, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')

console.log(`Equipment import plan written to ${outputFile}`)
console.log(JSON.stringify(plan.totals, null, 2))
