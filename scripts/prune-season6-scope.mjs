import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '..')
const apply = process.argv.includes('--apply')

const allowedBaseClasses = new Set([
  'Dark Knight',
  'Dark Wizard',
  'Fairy Elf',
  'Magic Gladiator',
  'Dark Lord',
  'Summoner',
  'Rage Fighter'
])

const allowedClasses = new Set([
  'Dark Knight',
  'Blade Knight',
  'Blade Master',
  'Dark Wizard',
  'Soul Master',
  'Grand Master',
  'Fairy Elf',
  'Muse Elf',
  'High Elf',
  'Magic Gladiator',
  'Duel Master',
  'Dark Lord',
  'Lord Emperor',
  'Summoner',
  'Bloody Summoner',
  'Dimension Master',
  'Rage Fighter',
  'Fist Master'
])
const postSeasonCategories = new Set(['Muun', 'Pentagram', 'Earring', 'Magic Gun', 'Rune Mace', 'Short Sword'])
const postSeasonItemPattern = /\b(fidelity|nightwing|wings of silence|cloak of limit|bloodangel|darkangel|holyangel|blue eye|manticore|silver heart|apocalypse|primordial)\b/i

const json = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\bset\b/gi, '')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim()
  .toLowerCase()

const remapPath = join(repoRoot, 'apps/web/data/muEquipmentRemap.generated.json')
const indexPath = join(repoRoot, 'apps/web/data/muEquipmentIndex.generated.json')
const detailRoot = join(repoRoot, 'apps/web/data/mu-equipment-details')
const fullSetsPath = join(repoRoot, 'apps/web/data/muFullSetImages.generated.json')
const sourcePlanPath = join(repoRoot, 'references/game-data/source-harvest/postgres-import-plan.json')
const normalizedSourcePath = join(repoRoot, 'references/game-data/source-harvest/normalized-index.json')
const elfManifestPath = join(repoRoot, 'references/game-assets/muonlinefanz/elf/manifest.json')
const elfExclusivePath = join(repoRoot, 'references/game-assets/muonlinefanz/elf/elf-exclusive-items.json')
const elfCopyLogPath = join(repoRoot, 'references/game-assets/muonlinefanz/elf/copy-log.json')
const remap = json(remapPath)
const originalItems = remap.items

function isSeasonSixItem(item) {
  if ((item.minSeason ?? 1) > 6) return false
  if (postSeasonCategories.has(item.category)) return false
  if (postSeasonItemPattern.test(`${item.name} ${item.title}`)) return false
  const baseClasses = item.baseClasses || []
  if (!baseClasses.length) return true
  return baseClasses.some((name) => allowedBaseClasses.has(name))
}

function sanitizeItem(item) {
  const sanitized = structuredClone(item)
  for (const key of ['baseClasses', 'targetClasses']) {
    if (Array.isArray(sanitized[key])) sanitized[key] = sanitized[key].filter((name) => allowedBaseClasses.has(name))
  }
  if (Array.isArray(sanitized.playableClasses)) {
    sanitized.playableClasses = sanitized.playableClasses.filter((name) => allowedClasses.has(name))
  }
  if (Array.isArray(sanitized.variants)) {
    sanitized.variants = sanitized.variants.filter((variant) => (variant.minSeason ?? sanitized.minSeason ?? 1) <= 6)
  }
  return sanitized
}

const keptItems = originalItems.filter(isSeasonSixItem).map(sanitizeItem)
const keptKeys = new Set(keptItems.map((item) => item.key))
const removedItems = originalItems.filter((item) => !keptKeys.has(item.key))
const removedKeys = new Set(removedItems.map((item) => item.key))
const originalIndex = json(indexPath)
const keptIndex = originalIndex
  .filter((item) => keptKeys.has(item.key))
  .map((item) => ({
    ...item,
    usableBy: (item.usableBy || []).filter((name) => allowedClasses.has(name) || allowedBaseClasses.has(name))
  }))

const removedImagePaths = new Set()
const keptImagePaths = new Set()
const collectImages = (item, target) => {
  if (item.image?.localPath) target.add(resolve(repoRoot, item.image.localPath))
  if (item.image?.publicPath) target.add(resolve(repoRoot, 'apps/web/public', item.image.publicPath.replace(/^\/+/, '')))
  for (const path of Object.values(item.pieceImages || {})) {
    target.add(resolve(repoRoot, 'apps/web/public', String(path).replace(/^\/+/, '')))
  }
}
removedItems.forEach((item) => collectImages(item, removedImagePaths))
keptItems.forEach((item) => collectImages(item, keptImagePaths))

const detailUpdates = []
for (const file of readdirSync(detailRoot).filter((name) => name.endsWith('.json'))) {
  const path = join(detailRoot, file)
  const items = json(path)
  const filtered = items.filter((item) => keptKeys.has(item.key))
  if (filtered.length !== items.length) detailUpdates.push({ path, before: items.length, after: filtered.length, value: filtered })
}

const fullSets = json(fullSetsPath)
const keptNames = new Set(keptItems.flatMap((item) => [normalize(item.name), normalize(item.baseSetName)]).filter(Boolean))
const keptFullSets = fullSets.filter((item) => {
  const name = normalize(item.title)
  return [...keptNames].some((keptName) => keptName === name || keptName.includes(name) || name.includes(keptName))
})

function collectKnowledgeRemovals(root, fileName) {
  if (!existsSync(root)) return []
  const removals = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (!entry.isDirectory()) continue
    const descriptor = join(path, fileName)
    if (existsSync(descriptor)) {
      const data = json(descriptor)
      const partIds = fileName === 'set.json'
        ? (data.parts || []).map((part) => part.itemId).filter(Boolean)
        : []
      const setHasNoSeasonSixParts = partIds.length > 0 && !partIds.some((id) => keptKeys.has(id))
      if (removedKeys.has(data.id) || ((data.minSeason ?? 1) > 6) || setHasNoSeasonSixParts) removals.push(path)
    } else {
      removals.push(...collectKnowledgeRemovals(path, fileName))
    }
  }
  return removals
}

const knowledgeRemovals = [
  ...collectKnowledgeRemovals(join(repoRoot, 'knowledge/equipment/items'), 'item.json'),
  ...collectKnowledgeRemovals(join(repoRoot, 'knowledge/equipment/sets'), 'set.json')
]

const referenceRoots = [
  join(repoRoot, 'references/game-assets/guiamuonline'),
  join(repoRoot, 'references/game-assets/source-harvest'),
  join(repoRoot, 'references/game-assets/muonlinefanz')
]
const postSeasonAssetPattern = /(bloodangel|darkangel|holyangel|awakening|blue-eye|silver-heart|manticore|brilliant-ancient|soul-ancient|apocalypse-ancient|primordial-ancient|mastery|magic-gun|rune-mace|pentagram|muun)/i
const removedImageNames = new Set([...removedImagePaths].map((path) => basename(path).toLowerCase()))
const referenceRemovals = []
const walkReferences = (root) => {
  if (!existsSync(root)) return
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) walkReferences(path)
    else if (removedImageNames.has(entry.name.toLowerCase())) referenceRemovals.push(path)
  }
}
referenceRoots.forEach(walkReferences)

for (const root of [
  join(repoRoot, 'apps/web/public/dev-references'),
  join(repoRoot, 'apps/web/public/images/game-assets/guiamuonline'),
  join(repoRoot, 'apps/web/public/images/game-assets/muonlinefanz'),
  join(repoRoot, 'apps/web/public/images/game-assets/socket-items'),
  join(repoRoot, 'references/game-assets/webzen'),
  join(repoRoot, 'references/game-assets/guiamuonline'),
  join(repoRoot, 'references/game-assets/muonlinefanz'),
  join(repoRoot, 'references/game-assets/socket-items')
]) {
  const walkPostSeasonAssets = (directory) => {
    if (!existsSync(directory)) return
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) walkPostSeasonAssets(path)
      else if (postSeasonAssetPattern.test(relative(root, path))) referenceRemovals.push(path)
    }
  }
  walkPostSeasonAssets(root)
}

const publicImageRemovals = [...removedImagePaths].filter((path) => existsSync(path) && !keptImagePaths.has(path))
let sourcePlanUpdate = null
let normalizedSourceUpdate = null
let elfManifestUpdate = null
const sourceFileRemovals = []
if (existsSync(sourcePlanPath)) {
  const sourcePlan = json(sourcePlanPath)
  const keptEntries = sourcePlan.entries.filter((entry) => entry.scope !== 'FUTURE_SEASON' && (entry.seasonMin ?? 1) <= 6)
  const keptEntryKeys = new Set(keptEntries.map((entry) => entry.canonicalKey))
  const keptEntryAssets = sourcePlan.entryAssets.filter((link) => keptEntryKeys.has(link.entryCanonicalKey))
  const keptAssetHashes = new Set(keptEntryAssets.map((link) => link.assetSha1))
  const keptAssets = sourcePlan.assets.filter((asset) => keptAssetHashes.has(asset.sha1))
  const removedEntries = sourcePlan.entries.filter((entry) => !keptEntryKeys.has(entry.canonicalKey))
  const removedAssets = sourcePlan.assets.filter((asset) => !keptAssetHashes.has(asset.sha1))

  for (const entry of removedEntries) {
    for (const path of Object.values(entry.rawData?.files || {})) {
      if (typeof path === 'string') sourceFileRemovals.push(resolve(repoRoot, path))
    }
  }
  for (const asset of removedAssets) {
    if (asset.localPath) sourceFileRemovals.push(resolve(repoRoot, asset.localPath))
  }

  sourcePlanUpdate = {
    value: {
      ...sourcePlan,
      generatedAt: new Date().toISOString(),
      scope: { maxSeason: 6, maxCharacter: 'Rage Fighter' },
      totals: {
        ...sourcePlan.totals,
        entries: keptEntries.length,
        assets: keptAssets.length,
        entryAssets: keptEntryAssets.length,
        futureSeasonEntries: 0
      },
      entries: keptEntries,
      assets: keptAssets,
      entryAssets: keptEntryAssets
    },
    beforeEntries: sourcePlan.entries.length,
    afterEntries: keptEntries.length,
    beforeAssets: sourcePlan.assets.length,
    afterAssets: keptAssets.length
  }

  if (existsSync(normalizedSourcePath)) {
    const normalizedSource = json(normalizedSourcePath)
    const keptUrls = new Set(keptEntries.map((entry) => entry.sourceUrl))
    const keptHashes = new Set(keptAssets.map((asset) => asset.sha1))
    const pages = normalizedSource.pages.filter((page) => keptUrls.has(page.url))
    const uniqueImages = normalizedSource.uniqueImages.filter((asset) => keptHashes.has(asset.sha1))
    normalizedSourceUpdate = {
      value: {
        ...normalizedSource,
        generatedAt: new Date().toISOString(),
        scope: { maxSeason: 6, maxCharacter: 'Rage Fighter' },
        totals: {
          ...normalizedSource.totals,
          canonicalPages: pages.length,
          uniqueImages: uniqueImages.length
        },
        pages,
        uniqueImages
      },
      beforePages: normalizedSource.pages.length,
      afterPages: pages.length
    }
  }
}

if (existsSync(elfManifestPath)) {
  const elfManifest = json(elfManifestPath)
  const keptElfItems = elfManifest.filter((item) => item.compatibility !== 'high-version-futuro')
  const removedElfItems = elfManifest.filter((item) => item.compatibility === 'high-version-futuro')
  const removedElfPaths = new Set()

  for (const item of removedElfItems) {
    for (const path of [item.originalPath, item.enhancedPath]) {
      if (!path) continue
      removedElfPaths.add(path.replace(/\\/g, '/'))
      sourceFileRemovals.push(resolve(repoRoot, path))
      sourceFileRemovals.push(resolve(repoRoot, path.replace(/^references\/game-assets/, 'apps/web/public/dev-references/game-assets')))
    }
  }

  elfManifestUpdate = {
    value: keptElfItems,
    before: elfManifest.length,
    after: keptElfItems.length,
    removedPaths: removedElfPaths
  }
}

const allFileRemovals = [...new Set([...publicImageRemovals, ...referenceRemovals, ...sourceFileRemovals])]
const bytes = allFileRemovals
  .filter((path) => existsSync(path))
  .reduce((total, path) => total + statSync(path).size, 0)

const report = {
  mode: apply ? 'apply' : 'dry-run',
  equipment: { before: originalItems.length, after: keptItems.length, removed: removedItems.length },
  index: { before: originalIndex.length, after: keptIndex.length },
  detailFilesChanged: detailUpdates.length,
  fullSetImages: { before: fullSets.length, after: keptFullSets.length },
  knowledgeDirectoriesRemoved: knowledgeRemovals.length,
  publicImagesRemoved: publicImageRemovals.length,
  referenceFilesRemoved: referenceRemovals.length,
  sourceHarvest: sourcePlanUpdate
    ? {
        entriesBefore: sourcePlanUpdate.beforeEntries,
        entriesAfter: sourcePlanUpdate.afterEntries,
        assetsBefore: sourcePlanUpdate.beforeAssets,
        assetsAfter: sourcePlanUpdate.afterAssets
      }
    : null,
  normalizedSourcePages: normalizedSourceUpdate
    ? { before: normalizedSourceUpdate.beforePages, after: normalizedSourceUpdate.afterPages }
    : null,
  elfReferences: elfManifestUpdate
    ? { before: elfManifestUpdate.before, after: elfManifestUpdate.after }
    : null,
  estimatedFreedMB: Number((bytes / 1024 / 1024).toFixed(2))
}

if (apply) {
  const byKey = Object.fromEntries(keptItems.map((item) => [item.key, item]))
  writeJson(remapPath, {
    ...remap,
    generatedAt: new Date().toISOString(),
    scope: { maxSeason: 6, maxCharacter: 'Rage Fighter' },
    totals: {
      ...remap.totals,
      items: keptItems.length,
      ancientItems: keptItems.filter((item) => (item.qualities || []).includes('ancient')).length
    },
    items: keptItems,
    byKey
  })
  writeJson(indexPath, keptIndex)
  detailUpdates.forEach(({ path, value }) => writeJson(path, value))
  writeJson(fullSetsPath, keptFullSets)
  if (sourcePlanUpdate) writeJson(sourcePlanPath, sourcePlanUpdate.value)
  if (normalizedSourceUpdate) writeJson(normalizedSourcePath, normalizedSourceUpdate.value)
  if (elfManifestUpdate) {
    writeJson(elfManifestPath, elfManifestUpdate.value)
    if (existsSync(elfExclusivePath)) {
      writeJson(
        elfExclusivePath,
        json(elfExclusivePath).filter((item) => item.compatibility !== 'high-version-futuro')
      )
    }
    if (existsSync(elfCopyLogPath)) {
      writeJson(
        elfCopyLogPath,
        json(elfCopyLogPath).filter((item) => {
          const target = String(item.Target || '').replace(/\\/g, '/')
          return !elfManifestUpdate.removedPaths.has(target)
        })
      )
    }
  }
  knowledgeRemovals.forEach((path) => rmSync(path, { recursive: true, force: true }))
  allFileRemovals.forEach((path) => rmSync(path, { force: true }))
}

console.log(JSON.stringify(report, null, 2))
if (!apply) console.log('Run with --apply to perform the scoped cleanup.')
