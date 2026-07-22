import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const detailsDir = resolve(repoRoot, 'apps/web/data/mu-equipment-details')
const indexPath = resolve(repoRoot, 'apps/web/data/muEquipmentIndex.generated.json')
const ancientPath = resolve(repoRoot, 'references/game-data/muonlinefanz-ancient-items-data.json')
const outputPath = resolve(repoRoot, 'apps/web/data/muEquipmentRemap.generated.json')
const reportPath = resolve(repoRoot, 'references/game-data/equipment-remap-audit.md')

const index = JSON.parse(readFileSync(indexPath, 'utf8'))
const ancientReference = JSON.parse(readFileSync(ancientPath, 'utf8'))

const characterEvolutionMap = {
  'Dark Knight': ['Dark Knight', 'Blade Knight', 'Blade Master', 'Dragon Knight'],
  'Dark Wizard': ['Dark Wizard', 'Soul Master', 'Grand Master', 'Soul Wizard'],
  'Fairy Elf': ['Fairy Elf', 'Muse Elf', 'High Elf', 'Noble Elf'],
  Summoner: ['Summoner', 'Bloody Summoner', 'Dimension Master'],
  'Magic Gladiator': ['Magic Gladiator', 'Duel Master', 'Magic Knight'],
  'Dark Lord': ['Dark Lord', 'Lord Emperor', 'Empire Lord'],
  'Rage Fighter': ['Rage Fighter', 'Fist Master'],
  'Grow Lancer': ['Grow Lancer', 'Mirage Lancer'],
  'Rune Mage': ['Rune Mage', 'Rune Spell Master', 'Grand Rune Master'],
  Slayer: ['Slayer', 'Royal Slayer', 'Master Slayer'],
  'Gun Crusher': ['Gun Crusher', 'Gun Breaker', 'Master Gun Breaker'],
  'White Wizard': ['White Wizard', 'Light Wizard', 'Shine Wizard'],
  Lemuria: ['Lemuria', 'Warmage', 'Archmage'],
  'Illusion Knight': ['Illusion Knight', 'Mirage Knight', 'Illusion Master']
}

const characterOrder = Object.keys(characterEvolutionMap)
const playableClassNames = new Set(Object.values(characterEvolutionMap).flat())
const characterMinSeason = {
  'Dark Knight': 1,
  'Dark Wizard': 1,
  'Fairy Elf': 1,
  Summoner: 3,
  'Magic Gladiator': 1,
  'Dark Lord': 1,
  'Rage Fighter': 6,
  'Grow Lancer': 10,
  'Rune Mage': 14,
  Slayer: 15,
  'Gun Crusher': 16,
  'White Wizard': 17,
  Lemuria: 18,
  'Illusion Knight': 20
}
const armorSlots = new Set(['Armor', 'Pants', 'Helm', 'Boots', 'Gloves'])
const weaponSlots = new Set(['Axe', 'Mace', 'Bow', 'Spear', 'Sword', 'Staff', 'Stick', 'Scepter', 'Lance', 'Rune Mace', 'Short Sword', 'Claw', 'Magic Gun'])
const shieldSlots = new Set(['Shield'])
const accessorySlots = new Set(['Earring', 'Pentagram', 'Quiver'])
const masteryAncientCategories = new Set(['Bloodangel Ancient', 'Darkangel Ancient', 'Holyangel Ancient', 'Soul Ancient', 'Blue Eye Ancient', 'Manticore Ancient', 'Silver Heart Ancient', 'Brilliant Ancient', 'Apocalypse Ancient', 'Primordial Ancient'])
const ancientCategories = new Set(['Ancient Normal', 'Set Lucky', ...masteryAncientCategories])
const socketSetNames = ['Titan', 'Brave', 'Hades', 'Seraphim', 'Phantom', 'Destroy', 'Crimson', 'Eternal', 'Queen']
const masterySeasonByFamily = {
  Bloodangel: 11,
  Darkangel: 12,
  Holyangel: 13,
  Awakening: 14,
  Soul: 14,
  'Blue Eye': 15,
  Manticore: 16,
  'Silver Heart': 17,
  Brilliant: 18,
  Apocalypse: 19,
  Primordial: 20
}

// These regular armor lines were added after the Season 6 catalog. Their exact
// episode can be refined later without exposing them to the current server.
const postSeasonSixArmorFamilies = new Map([
  ['Succubus', 7],
  ['Ambition', 7],
  ['Hell Night', 7],
  ['Magic Knight', 7],
  ['Dark Devil', 7],
  ['Lazy Wind', 7],
  ['Stormwing', 7],
  ['Sticky', 7],
  ['Light Lord', 7],
  ['Trace', 7]
])

const progressionSetOrder = [
  'Leather',
  'Bronze',
  'Scale',
  'Brass',
  'Plate',
  'Dragon',
  'Pad',
  'Bone',
  'Sphinx',
  'Legendary',
  'Vine',
  'Silk',
  'Wind',
  'Spirit',
  'Guardian',
  'Atlans',
  'Storm Crow',
  'Adamantine',
  'Dark Steel',
  'Dark Phoenix',
  'Grand Soul',
  'Holy Spirit',
  'Thunder Hawk',
  'Glorious',
  'Black Dragon',
  'Great Dragon',
  'Dark Soul',
  'Red Spirit',
  'Dark Master',
  'Piercing'
]

const ancientPiecePattern = /\b(?:armor|pants|helm|helmet|boots|gloves|shield|pendant|ring|sword|blade|axe|mace|bow|crossbow|staff|stick|scepter|spear|lance|claw|book|orb|rune|gun)\b/i
const ancientEffectPattern = /\b(?:\d+\s+set option|set option|increase|double damage|excellent damage|ignore|wizardry|damage|defense|energy|agility|mana|life|hp|skill|stamina|strength|critical|excellent)\b/i

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const unique = (values) => Array.from(new Set(values.filter(Boolean)))
const keyFor = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

const correctedSetName = (value) =>
  String(value || '')
    .replace(/\bstrenght\b/gi, 'Strength')
    .replace(/\bfigther\b/gi, 'Fighter')
    .replace(/\bsilver hear\b/gi, 'Silver Heart')
    .replace(/\bconvicition\b/gi, 'Conviction')
    .replace(/\blegenday\b/gi, 'Legendary')
    .replace(/\bgrasher\b/gi, 'Crasher')
    .replace(/\s+/g, ' ')
    .trim()

const canonicalSetKey = (value) => normalize(correctedSetName(value))
const baseClassFor = (className) =>
  characterOrder.find((character) => character === className || characterEvolutionMap[character]?.includes(className)) || ''
const expandClasses = (classes) =>
  unique(classes.flatMap((className) => {
    const base = baseClassFor(className)
    return base ? characterEvolutionMap[base] : playableClassNames.has(className) ? [className] : []
  }))

function progressionClassTier(item, baseSetName, qualities) {
  const minSeason = seasonFor(item, qualities)
  if (qualities.includes('masteryAncient') || (item.category?.includes('Ancient') && minSeason >= 11)) return 3
  if (item.category === 'Set Lucky') return 2

  const haystack = normalize(`${baseSetName || item.name} ${item.name}`)
  const orderIndex = progressionSetOrder.findIndex((name) => haystack.includes(normalize(name)))

  if (orderIndex === -1) return minSeason > 6 ? 3 : 1
  if (orderIndex <= 4) return 1
  if (orderIndex <= 24) return 2
  return 3
}

function targetClassesFor(item, baseSetName, qualities, baseClasses) {
  const targetTier = progressionClassTier(item, baseSetName, qualities)

  return unique(baseClasses.map((baseClass) => {
    const classes = characterEvolutionMap[baseClass] || [baseClass]
    return classes[Math.min(targetTier - 1, classes.length - 1)] || baseClass
  }))
}

const details = new Map()
for (const file of readdirSync(detailsDir).filter((entry) => entry.endsWith('.json'))) {
  const items = JSON.parse(readFileSync(resolve(detailsDir, file), 'utf8'))
  for (const item of items) {
    details.set(item.key, item)
  }
}

const ancientSetToBaseClasses = new Map()
const ancientAliasToBaseClass = new Map([
  ['muren storm crow', 'Magic Gladiator'],
  ['hapy ancient', 'Summoner'],
  ['harpy ancient', 'Summoner'],
  ['khons dark steel', 'Dark Lord'],
  ['khone dark steel', 'Dark Lord'],
  ['magni piercing groove', 'Rage Fighter'],
  ['magni piercing grove', 'Rage Fighter'],
  ['kenaz arka', 'Summoner'],
  ['kenaz iria', 'Summoner'],
  ['molos nigthwing', 'Summoner'],
  ['moloso night wing', 'Summoner'],
  ['vesper nightwing', 'Summoner'],
  ['vesper night wing', 'Summoner'],
  ['burning frere', 'Summoner'],
  ['falcon frere', 'Summoner'],
  ['bloodangel magic', 'Magic Gladiator'],
  ['scale', 'Dark Knight'],
  ['silk', 'Fairy Elf'],
  ['sphinx', 'Dark Wizard'],
  ['violent wind', 'Fairy Elf'],
  ['robust', 'Rage Fighter'],
  ['gun grasher scale', 'Gun Crusher'],
  ['gun crasher scale', 'Gun Crusher'],
  ['dragon', 'Dark Knight'],
  ['guardian', 'Fairy Elf'],
  ['legendary', 'Dark Wizard'],
  ['storm crow', 'Magic Gladiator'],
  ['adamantine', 'Dark Lord'],
  ['red wing', 'Summoner'],
  ['storm jahad', 'Grow Lancer'],
  ['gru hill', 'Rage Fighter'],
  ['gun crasher frere', 'Gun Crusher'],
  ['great dragon', 'Dark Knight'],
  ['dark soul', 'Dark Wizard'],
  ['red spirit', 'Summoner'],
  ['thunder hawk', 'Magic Gladiator'],
  ['dark master', 'Dark Lord'],
  ['demonic', 'Summoner'],
  ['piercing groove', 'Rage Fighter']
])
const modernSetTokenToBaseClass = [
  [/knight/i, 'Dark Knight'],
  [/wizard/i, 'Dark Wizard'],
  [/elf\s+(attack|support|defense)/i, 'Fairy Elf'],
  [/\bmagic(?:\s+(strength|energy))?\b/i, 'Magic Gladiator'],
  [/\blord\b/i, 'Dark Lord'],
  [/summoner/i, 'Summoner'],
  [/fighter/i, 'Rage Fighter'],
  [/lancer/i, 'Grow Lancer'],
  [/\brune\b/i, 'Rune Mage'],
  [/slayer/i, 'Slayer'],
  [/gunner|gun\s*crusher|gun\s*breaker/i, 'Gun Crusher'],
  [/kundun/i, 'White Wizard'],
  [/lemuria/i, 'Lemuria'],
  [/illusion/i, 'Illusion Knight']
]
for (const [baseClass, setNames] of Object.entries(ancientReference.setsByClass || {})) {
  for (const setName of setNames) {
    const clean = setName.replace(/\s+Set$/i, '')
    ancientSetToBaseClasses.set(normalize(clean), unique([...(ancientSetToBaseClasses.get(normalize(clean)) || []), baseClass]))
  }
}

for (const sample of ancientReference.sampleSetsCapturedFromPage || []) {
  const clean = sample.name?.replace(/\s+Set$/i, '')
  if (!clean) continue
  const current = ancientSetToBaseClasses.get(normalize(clean)) || []
  ancientSetToBaseClasses.set(normalize(clean), unique([...current, ...(sample.classes || []).map(baseClassFor).filter(Boolean)]))
}

function isSetEffectText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return ancientEffectPattern.test(text) && !ancientPiecePattern.test(text)
}

function isAncientPieceText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return Boolean(text) && !/^opci/i.test(text) && ancientPiecePattern.test(text) && !isSetEffectText(text)
}

function splitEffects(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  const matches = [...text.matchAll(/(?:^|\s)(\d+\s+Set option\s*:\s*)(.*?)(?=\s+\d+\s+Set option\s*:|$)/gi)]
  if (matches.length) {
    return matches.map((match) => `${match[1].trim()} ${match[2].trim()}`.replace(/\s+:/, ':'))
  }
  return isSetEffectText(text) ? [text] : []
}

function baseNameFromAncient(item) {
  if (item.category === 'Ancient Normal' || item.category === 'Set Lucky') {
    const words = item.name.replace(/\s*\(.+?\)\s*/g, ' ').trim().split(/\s+/)
    return words.length > 1 ? words.slice(1).join(' ') : item.name
  }

  const masteryCategory = [...masteryAncientCategories].find((category) => category === item.category)
  if (masteryCategory) {
    const family = masteryCategory.replace(/\s+Ancient$/i, '')
    const familyIndex = item.name.toLowerCase().indexOf(family.toLowerCase())
    return (familyIndex === -1 ? item.name : item.name.slice(familyIndex)).replace(/\s+/g, ' ').trim()
  }

  return item.name
}

function itemGroup(item) {
  if (ancientCategories.has(item.category)) return 'set'
  if (armorSlots.has(item.category)) return 'set-piece'
  if (weaponSlots.has(item.category)) return 'weapon'
  if (shieldSlots.has(item.category)) return 'shield'
  if (item.category === 'Wings') return 'wing'
  if (accessorySlots.has(item.category)) return 'accessory'
  if (item.category === 'Muun') return 'pet'
  return 'misc'
}

function qualitiesFor(item) {
  const qualities = []
  if (ancientCategories.has(item.category)) {
    if (item.category === 'Set Lucky') qualities.push('lucky')
    else if (masteryAncientCategories.has(item.category)) qualities.push('normal', 'excellent', 'masteryAncient', 'ancient')
    else qualities.push('ancient')
  } else {
    qualities.push('normal')
    if (item.listStats?.excellentDrop && item.listStats.excellentDrop !== '~') qualities.push('excellent')
    if (socketSetNames.some((name) => normalize(item.name).includes(normalize(name)))) qualities.push('socket')
  }
  return unique(qualities)
}

function seasonFor(item, qualities) {
  const haystack = normalize(`${item.name} ${item.category}`)
  const family = Object.keys(masterySeasonByFamily).find((name) => haystack.includes(normalize(name)))
  if (family) return masterySeasonByFamily[family]
  const postSeasonSixFamily = [...postSeasonSixArmorFamilies.entries()]
    .find(([name]) => haystack.includes(normalize(name)))
  if (postSeasonSixFamily) return postSeasonSixFamily[1]
  if (qualities.includes('lucky')) return 6
  if (qualities.includes('socket')) return 4
  return 1
}

function classesFor(item, baseSetName) {
  const aliasBaseClass = ancientAliasToBaseClass.get(normalize(item.name)) || ancientAliasToBaseClass.get(normalize(baseSetName))
  const modernBaseClass = modernSetTokenToBaseClass.find(([pattern]) => pattern.test(item.name))?.[1]
  const baseFromAncient = ancientSetToBaseClasses.get(normalize(item.name)) || ancientSetToBaseClasses.get(normalize(baseSetName)) || []
  const fromUsable = (item.usableBy || []).filter((className) => playableClassNames.has(className) || characterEvolutionMap[className])
  const explicitBaseClasses = unique([
    ...baseFromAncient,
    ...fromUsable.map((className) => baseClassFor(className) || className)
  ])
  const baseClasses = explicitBaseClasses.length
    ? explicitBaseClasses
    : unique([aliasBaseClass, modernBaseClass])
  return {
    baseClasses,
    playableClasses: expandClasses(baseClasses.length ? baseClasses : fromUsable)
  }
}

const sourceItems = index.map((summary) => {
  const detail = details.get(summary.key) || summary
  const qualities = qualitiesFor(summary)
  const group = itemGroup(summary)
  const baseSetName = ancientCategories.has(summary.category) ? baseNameFromAncient(summary) : armorSlots.has(summary.category) ? summary.name : null
  const classInfo = classesFor(summary, baseSetName)
  const targetClasses = targetClassesFor(summary, baseSetName, qualities, classInfo.baseClasses)
  const values = Object.values(summary.listStats || {})
  const ancientPieces = ancientCategories.has(summary.category) ? unique(values.filter(isAncientPieceText)) : []
  const setOptions = ancientCategories.has(summary.category) ? unique(values.flatMap(splitEffects)) : []
  const sample = (ancientReference.sampleSetsCapturedFromPage || []).find((entry) => normalize(entry.name?.replace(/\s+Set$/i, '')) === normalize(summary.name) || normalize(entry.name?.replace(/\s+Set$/i, '')) === normalize(baseSetName))
  const sampleOptions = sample?.setOptions?.map((option) => `${option.pieces} Set option: ${option.option}`) || []
  const samplePieces = sample?.pieces?.map((piece) => piece.name) || []
  const warnings = []

  if (ancientCategories.has(summary.category) && !classInfo.baseClasses.length) warnings.push('missing-character-class-map')
  if (ancientCategories.has(summary.category) && !ancientPieces.length && !samplePieces.length) warnings.push('missing-ancient-piece-list')
  if (ancientCategories.has(summary.category) && !setOptions.length && !sampleOptions.length) warnings.push('missing-ancient-set-options')
  if (!summary.image?.publicPath && !summary.image?.sourceUrl) warnings.push('missing-image')
  if ((summary.usableBy || []).includes('B')) warnings.push('source-has-unknown-class-token-b')

  const baseClassMinSeason = classInfo.baseClasses.length
    ? Math.min(...classInfo.baseClasses.map((className) => characterMinSeason[className] || 1))
    : 1

  return {
    key: summary.key,
    name: summary.name,
    title: summary.title,
    category: summary.category,
    categorySlug: summary.categorySlug,
    group,
    baseSetName,
    qualities,
    minSeason: Math.max(seasonFor(summary, qualities), baseClassMinSeason),
    sourceUrl: summary.sourceUrl,
    image: summary.image,
    baseClasses: classInfo.baseClasses,
    playableClasses: classInfo.playableClasses,
    targetClasses,
    slots: ancientCategories.has(summary.category)
      ? unique([...ancientPieces, ...samplePieces])
      : [summary.category],
    setOptions: unique([...setOptions, ...sampleOptions]),
    levelStatsCount: detail.levelStats?.length || 0,
    hasExcellentStats: Boolean(detail.levelStats?.some((stat) => stat.excellentDefense || stat.excellentRequiredStrength || stat.excellentRequiredAgility)),
    listStats: summary.listStats || {},
    warnings
  }
})

// Armor pages are stored one row per slot. The Wiki needs one catalog record per
// set while retaining those source rows for item-level lookups and admin editing.
const armorFamilies = new Map()
for (const item of sourceItems.filter((entry) => entry.group === 'set-piece')) {
  const familyKey = canonicalSetKey(item.name)
  if (!familyKey) continue
  const family = armorFamilies.get(familyKey) || []
  family.push(item)
  armorFamilies.set(familyKey, family)
}

const groupedArmorSets = [...armorFamilies.entries()].map(([familyKey, family]) => {
  const preferredName = correctedSetName(
    family
      .map((item) => item.name)
      .sort((a, b) => correctedSetName(a).length - correctedSetName(b).length)[0]
  )
  const qualities = unique(family.flatMap((item) => item.qualities))
  const baseClasses = unique(family.flatMap((item) => item.baseClasses))
  const playableClasses = expandClasses(baseClasses)
  const minSeason = Math.max(
    Math.max(...family.map((item) => item.minSeason || 1)),
    baseClasses.length
      ? Math.min(...baseClasses.map((className) => characterMinSeason[className] || 1))
      : 1
  )
  const representative = {
    ...family[0],
    name: preferredName,
    category: 'Armor Set'
  }
  const targetClasses = targetClassesFor(representative, preferredName, qualities, baseClasses)
  const slots = family
    .sort((a, b) => [...armorSlots].indexOf(a.category) - [...armorSlots].indexOf(b.category))
    .map((item) => `${preferredName} ${item.category}`)
  const sourceImages = family.map((item) => item.image).filter(Boolean)
  const image = sourceImages.find((entry) => entry?.publicPath || entry?.sourceUrl) || sourceImages[0] || null
  const warnings = unique(family.flatMap((item) => item.warnings).filter((warning) => warning !== 'missing-image'))
  if (!sourceImages.some((entry) => entry?.publicPath || entry?.sourceUrl)) warnings.push('missing-image')
  if (!baseClasses.length) warnings.push('missing-character-class-map')

  return {
    key: `armor-set-${keyFor(familyKey)}`,
    name: preferredName,
    title: preferredName,
    category: 'Armor Set',
    categorySlug: 'armor-set',
    group: 'set',
    baseSetName: preferredName,
    qualities,
    minSeason,
    sourceUrl: family.find((item) => item.sourceUrl)?.sourceUrl || null,
    image,
    baseClasses,
    playableClasses,
    targetClasses,
    slots,
    setOptions: [],
    levelStatsCount: Math.max(...family.map((item) => item.levelStatsCount || 0)),
    hasExcellentStats: family.some((item) => item.hasExcellentStats),
    listStats: Object.fromEntries(family.map((item) => [item.category, item.listStats])),
    warnings,
    sourcePieceKeys: family.map((item) => item.key)
  }
})

const remapped = [...sourceItems, ...groupedArmorSets]

const byKey = Object.fromEntries(remapped.map((item) => [item.key, item]))
const warningTotals = {}
for (const item of remapped) {
  for (const warning of item.warnings) {
    warningTotals[warning] = (warningTotals[warning] || 0) + 1
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  totals: {
    items: remapped.length,
    ancientItems: remapped.filter((item) => ancientCategories.has(item.category)).length,
    missingClassMap: warningTotals['missing-character-class-map'] || 0,
    missingAncientPieceList: warningTotals['missing-ancient-piece-list'] || 0,
    missingAncientSetOptions: warningTotals['missing-ancient-set-options'] || 0,
    missingImages: warningTotals['missing-image'] || 0
  },
  warningTotals,
  items: remapped,
  byKey
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

const warningRows = Object.entries(warningTotals)
  .sort((a, b) => b[1] - a[1])
  .map(([warning, count]) => `- ${warning}: ${count}`)
  .join('\n')

const ancientMissing = remapped
  .filter((item) => ancientCategories.has(item.category) && item.warnings.length)
  .slice(0, 80)
  .map((item) => `- ${item.name} (${item.category}): ${item.warnings.join(', ')}`)
  .join('\n')

writeFileSync(reportPath, `# Equipment Remap Audit

Generated at: ${payload.generatedAt}

## Totals

- Items remapped: ${payload.totals.items}
- Ancient/lucky/mastery entries: ${payload.totals.ancientItems}
- Missing character/class map: ${payload.totals.missingClassMap}
- Missing ancient piece list: ${payload.totals.missingAncientPieceList}
- Missing ancient set options: ${payload.totals.missingAncientSetOptions}
- Missing images: ${payload.totals.missingImages}

## Warning totals

${warningRows || '- No warnings'}

## Ancient entries needing review

${ancientMissing || '- No ancient warnings'}

## Rule

This generated file is the global equipment audit layer. Do not patch only one set in the UI when a rule belongs to a quality family such as Ancient, Excellent, Socket, Lucky or Mastery Ancient.
Update the remap rules here, regenerate, then let the UI consume the generated data.
`, 'utf8')

console.log(`Equipment remap written to ${outputPath}`)
console.log(JSON.stringify(payload.totals, null, 2))
