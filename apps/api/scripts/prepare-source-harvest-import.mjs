import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const sourceFile = resolve(repoRoot, 'references/game-data/source-harvest/normalized-index.json')
const outputFile = resolve(repoRoot, 'references/game-data/source-harvest/postgres-import-plan.json')

const data = JSON.parse(readFileSync(sourceFile, 'utf8'))

const sourceMeta = {
  'guiamu-com-ar': {
    key: 'guiamu-com-ar',
    title: 'GuiaMu Argentina',
    baseUrl: 'https://guiamu.com.ar/?lang=pt',
    publisher: 'GuiaMu Argentina',
    language: 'pt'
  },
  'webzen-gameinfo-pt': {
    key: 'webzen-gameinfo-pt',
    title: 'Webzen MU Online Game Info PT',
    baseUrl: 'https://muonline.webzen.com/pt/gameinfo',
    publisher: 'WEBZEN',
    language: 'pt'
  }
}

const categoryToKind = new Map([
  ['character', 'CHARACTER'],
  ['drop', 'DROP'],
  ['event', 'EVENT'],
  ['item', 'ITEM'],
  ['map', 'MAP'],
  ['npc', 'NPC'],
  ['quest', 'QUEST'],
  ['skill', 'SKILL'],
  ['spot', 'MAP'],
  ['uncategorized', 'UNKNOWN']
])

const scopeToDb = new Map([
  ['mu-game', 'NEEDS_REVIEW'],
  ['off-topic-candidate', 'OFF_TOPIC'],
  ['needs-review', 'NEEDS_REVIEW']
])

function stableId(input) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 16)
}

function firstKind(categories) {
  for (const category of categories || []) {
    const kind = categoryToKind.get(category)
    if (kind && kind !== 'UNKNOWN') return kind
  }
  return 'UNKNOWN'
}

function inferSeason(page) {
  const text = `${page.canonicalTitle || ''} ${page.url || ''}`.toLowerCase()
  const seasonMatch = text.match(/(?:season|temporada)[^\d]*(\d{1,2})/)
  if (!seasonMatch) {
    return {
      scope: page.scope === 'off-topic-candidate' ? 'OFF_TOPIC' : 'NEEDS_REVIEW',
      seasonMin: null,
      seasonMax: null
    }
  }

  const season = Number(seasonMatch[1])
  if (season <= 6) {
    return { scope: 'SEASON_6', seasonMin: season, seasonMax: season }
  }

  return { scope: 'FUTURE_SEASON', seasonMin: season, seasonMax: season }
}

const sources = Object.values(sourceMeta)

const entries = data.pages.map((page) => {
  const season = inferSeason(page)
  const fallbackScope = scopeToDb.get(page.scope) || 'NEEDS_REVIEW'

  return {
    sourceKey: page.sourceKey,
    sourceUrl: page.url,
    canonicalKey: `${page.sourceKey}:${page.slug}:${stableId(page.url)}`,
    slug: page.slug,
    title: page.canonicalTitle,
    kind: firstKind(page.categories),
    scope: season.scope === 'NEEDS_REVIEW' ? fallbackScope : season.scope,
    status: page.scope === 'off-topic-candidate' ? 'ARCHIVED' : 'NORMALIZED',
    seasonMin: season.seasonMin,
    seasonMax: season.seasonMax,
    rawData: {
      categories: page.categories,
      headings: page.headings,
      paragraphCount: page.paragraphCount,
      tableCount: page.tableCount,
      imageCount: page.imageCount,
      duplicateUrls: page.duplicateUrls,
      files: page.files
    }
  }
})

const assets = data.uniqueImages.map((image) => ({
  sourceKey: image.localPath.includes('/guiamu-com-ar/') || image.localPath.includes('\\guiamu-com-ar\\')
    ? 'guiamu-com-ar'
    : 'webzen-gameinfo-pt',
  sourceUrl: image.sourceUrls?.[0] || null,
  localPath: image.localPath,
  publicPath: null,
  kind: 'IMAGE',
  mimeType: image.contentType || null,
  sha1: image.sha1,
  bytes: image.bytes || null,
  status: 'RAW',
  metadata: {
    sourceUrls: image.sourceUrls || [],
    pageUrls: image.pageUrls || []
  }
}))

const entryAssets = []
const entryByUrl = new Map(entries.map((entry) => [entry.sourceUrl, entry]))

for (const asset of assets) {
  for (const pageUrl of asset.metadata.pageUrls) {
    const entry = entryByUrl.get(pageUrl)
    if (!entry) continue
    entryAssets.push({
      entryCanonicalKey: entry.canonicalKey,
      assetSha1: asset.sha1,
      role: 'reference',
      sortOrder: entryAssets.length
    })
  }
}

const plan = {
  generatedAt: new Date().toISOString(),
  sourceFile: sourceFile.replace(`${repoRoot}\\`, '').replaceAll('\\', '/'),
  totals: {
    sources: sources.length,
    entries: entries.length,
    assets: assets.length,
    entryAssets: entryAssets.length,
    offTopicEntries: entries.filter((entry) => entry.scope === 'OFF_TOPIC').length,
    futureSeasonEntries: entries.filter((entry) => entry.scope === 'FUTURE_SEASON').length,
    season6Entries: entries.filter((entry) => entry.scope === 'SEASON_6').length
  },
  sources,
  entries,
  assets,
  entryAssets
}

mkdirSync(dirname(outputFile), { recursive: true })
writeFileSync(outputFile, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')

console.log(`Import plan written to ${outputFile}`)
console.log(JSON.stringify(plan.totals, null, 2))
