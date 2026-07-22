import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const planPath = path.join(root, 'references', 'game-data', 'equipment-postgres-import-plan.json')
const plan = JSON.parse(await readFile(planPath, 'utf8'))
const equipment = Array.isArray(plan.equipment) ? plan.equipment : []
const variants = Array.isArray(plan.variants) ? plan.variants : []

function fail(message) {
  throw new Error(`Equipment catalog check failed: ${message}`)
}

function setByKey(key) {
  return equipment.find((item) => item.key === key && item.group === 'SET')
}

function assertSet(key, expected) {
  const item = setByKey(key)
  if (!item) fail(`missing grouped set ${key}`)

  const sourcePieceKeys = item.remapData?.sourcePieceKeys ?? []
  if (sourcePieceKeys.length < expected.minimumPieces) {
    fail(`${key} has ${sourcePieceKeys.length} source pieces; expected at least ${expected.minimumPieces}`)
  }

  const targetClasses = item.remapData?.targetClasses ?? []
  for (const className of expected.targetClasses) {
    if (!targetClasses.includes(className)) fail(`${key} is missing target class ${className}`)
  }
}

const groupedSets = equipment.filter((item) => item.group === 'SET')
const groupedArmorSets = groupedSets.filter((item) => item.categorySlug === 'armor-set')

if (groupedArmorSets.length < 190) {
  fail(`only ${groupedArmorSets.length} armor sets were grouped`)
}

assertSet('armor-set-leather', {
  minimumPieces: 5,
  targetClasses: ['Dark Knight', 'Magic Gladiator', 'Dark Lord', 'Rage Fighter']
})
assertSet('armor-set-black-dragon', { minimumPieces: 5, targetClasses: ['Blade Knight'] })
assertSet('armor-set-great-dragon', { minimumPieces: 5, targetClasses: ['Blade Knight'] })

const qualities = new Set(
  variants
    .filter((variant) => groupedSets.some((item) => item.key === variant.equipmentKey))
    .map((variant) => variant.quality)
)

for (const quality of ['NORMAL', 'EXCELLENT', 'ANCIENT', 'SOCKET', 'LUCKY']) {
  if (!qualities.has(quality)) fail(`set variants do not include quality ${quality}`)
}

const futureClasses = new Set([
  'Grow Lancer',
  'Rune Mage',
  'Slayer',
  'Gun Crusher',
  'White Wizard',
  'Mage',
  'Illusion Knight',
  'Alchemist'
])
const seasonSixLeaks = groupedSets.filter((item) => {
  if (Number(item.minSeason ?? 1) > 6) return false
  const baseClasses = item.remapData?.baseClasses ?? []
  return baseClasses.length > 0 && baseClasses.every((className) => futureClasses.has(className))
})

if (seasonSixLeaks.length > 0) {
  fail(`future-only sets marked for Season 6: ${seasonSixLeaks.map((item) => item.name).join(', ')}`)
}

for (const futureSetName of ['Awakening Knight', 'Silver Heart Elf Defense', 'Ambition']) {
  const item = groupedArmorSets.find((set) => set.name === futureSetName)
  if (item && Number(item.minSeason ?? 1) <= 6) {
    fail(`${futureSetName} is incorrectly available in Season ${item.minSeason}`)
  }
}

console.log(
  JSON.stringify(
    {
      equipment: equipment.length,
      variants: variants.length,
      groupedSets: groupedSets.length,
      groupedArmorSets: groupedArmorSets.length,
      qualities: [...qualities].sort(),
      seasonSixFutureLeaks: seasonSixLeaks.length
    },
    null,
    2
  )
)
