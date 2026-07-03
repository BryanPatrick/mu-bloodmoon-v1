import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const DATA_ROOT = path.join(root, 'references', 'game-data', 'source-harvest')
const OUTPUT_FILE = path.join(DATA_ROOT, 'normalized-index.json')
const REPORT_FILE = path.join(DATA_ROOT, 'normalization-report.md')

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'))
const writeJson = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`)
}
const writeText = async (filePath, text) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, text.replace(/\r\n/g, '\n'))
}
const sha1 = (value = '') => crypto.createHash('sha1').update(value).digest('hex')
const slugify = (value = '') =>
  String(value || 'unknown')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'unknown'

const muTerms = [
  'mu online', 'dark knight', 'dark wizard', 'fairy elf', 'summoner', 'dark lord',
  'rage fighter', 'magic gladiator', 'slayer', 'grow lancer', 'lemuria', 'gun crusher',
  'lorencia', 'noria', 'devias', 'dungeon', 'atlans', 'tarkan', 'aida', 'icarus',
  'kanturu', 'raklion', 'crywolf', 'kalima', 'elbeland', 'swamp', 'karutan',
  'set', 'conjunto', 'arma', 'armas', 'asa', 'asas', 'joia', 'jewel', 'skill',
  'habilidade', 'evento', 'quest', 'npc', 'chaos machine', 'socket', 'ancient',
  'excellent', 'mastery', 'ruud', 'pentagrama', 'ertel', 'muun', 'monstro', 'boss',
  'temporada', 'season', 'versao', 'versao mu',
]

const offTopicTerms = [
  'diamond research', 'international relations', 'hydrogen fuel', 'paleoecology',
  'mycoremediation', 'embryology', 'frame theory', 'physical activity',
  'ubiquitous computing', 'speech language pathology', 'virtual reality',
  'reliability engineering', 'evolutionary game theory', 'deformation monitoring',
  'digital logic', 'rare book conservation',
]

const classifyScope = (page) => {
  const haystack = `${page.title} ${page.url} ${page.description} ${page.headings?.map((h) => h.text).join(' ') || ''} ${page.paragraphs?.join(' ') || ''}`.toLowerCase()
  const muScore = muTerms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0)
  const offScore = offTopicTerms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0)

  if (offScore > 0 && muScore < 2) return 'off-topic-candidate'
  if (muScore >= 1 || page.categories?.length) return 'mu-game'
  return 'needs-review'
}

const canonicalTitleFor = (page) => {
  const heading = page.headings?.find((item) => item.level === 1 && item.text && !/guide library/i.test(item.text))?.text
  const fallbackHeading = page.headings?.find((item) => item.text && !/guide library/i.test(item.text))?.text
  return heading || fallbackHeading || page.title || new URL(page.url).pathname
}

const textFingerprintFor = (page) => sha1([
  canonicalTitleFor(page).toLowerCase(),
  page.paragraphs?.slice(0, 8).join('\n').toLowerCase() || '',
  JSON.stringify(page.tables?.slice(0, 3) || []).toLowerCase(),
].join('\n')).slice(0, 16)

const sourceDataFiles = [
  path.join(DATA_ROOT, 'guiamu-com-ar', 'guiamu-com-ar-data.json'),
  path.join(DATA_ROOT, 'webzen-gameinfo-pt', 'webzen-gameinfo-pt-data.json'),
]

const sourceDatas = []
for (const filePath of sourceDataFiles) {
  sourceDatas.push(await readJson(filePath))
}

const allPages = sourceDatas.flatMap((sourceData) => sourceData.pages.map((page) => ({
  ...page,
  canonicalTitle: canonicalTitleFor(page),
  normalizedSlug: slugify(canonicalTitleFor(page)),
  scope: classifyScope(page),
  textFingerprint: textFingerprintFor(page),
})))

const canonicalMap = new Map()
for (const page of allPages) {
  const key = `${page.sourceKey}:${page.normalizedSlug}:${page.textFingerprint}`
  const existing = canonicalMap.get(key)
  if (!existing) {
    canonicalMap.set(key, {
      ...page,
      duplicateUrls: [],
    })
    continue
  }

  existing.duplicateUrls.push(page.url)
  existing.images = [...existing.images, ...page.images]
  existing.links = [...new Set([...existing.links, ...page.links])]
}

const canonicalPages = [...canonicalMap.values()]
const imagesByHash = new Map()
for (const sourceData of sourceDatas) {
  for (const image of sourceData.images) {
    if (!image.sha1) continue
    const existing = imagesByHash.get(image.sha1)
    if (!existing) {
      imagesByHash.set(image.sha1, {
        sha1: image.sha1,
        localPath: image.localPath,
        bytes: image.bytes,
        contentType: image.contentType,
        sourceUrls: [image.sourceUrl],
        pageUrls: [image.pageUrl],
      })
      continue
    }
    existing.sourceUrls = [...new Set([...existing.sourceUrls, image.sourceUrl])]
    existing.pageUrls = [...new Set([...existing.pageUrls, image.pageUrl])]
  }
}

const categoryTotals = canonicalPages.reduce((acc, page) => {
  for (const category of page.categories || ['uncategorized']) {
    acc[category] = (acc[category] || 0) + 1
  }
  return acc
}, {})

const scopeTotals = canonicalPages.reduce((acc, page) => {
  acc[page.scope] = (acc[page.scope] || 0) + 1
  return acc
}, {})

const normalized = {
  schema: 'bloodmoon.source-harvest.normalized-index.v1',
  generatedAt: new Date().toISOString(),
  totals: {
    sourcePages: allPages.length,
    canonicalPages: canonicalPages.length,
    duplicatePages: allPages.length - canonicalPages.length,
    uniqueImages: imagesByHash.size,
    rawImages: sourceDatas.reduce((sum, sourceData) => sum + sourceData.images.length, 0),
  },
  scopeTotals,
  categoryTotals: Object.fromEntries(Object.entries(categoryTotals).sort((a, b) => a[0].localeCompare(b[0]))),
  pages: canonicalPages
    .sort((a, b) => a.sourceKey.localeCompare(b.sourceKey) || a.scope.localeCompare(b.scope) || a.canonicalTitle.localeCompare(b.canonicalTitle))
    .map((page) => ({
      id: `${page.sourceKey}:${page.normalizedSlug}:${page.textFingerprint}`,
      sourceKey: page.sourceKey,
      sourceTitle: page.sourceTitle,
      url: page.url,
      canonicalTitle: page.canonicalTitle,
      slug: page.normalizedSlug,
      scope: page.scope,
      categories: page.categories,
      headings: page.headings,
      paragraphCount: page.paragraphs?.length || 0,
      tableCount: page.tables?.length || 0,
      imageCount: page.images?.filter((image) => image.localPath).length || 0,
      duplicateUrls: page.duplicateUrls,
      files: page.files,
    })),
  uniqueImages: [...imagesByHash.values()].sort((a, b) => a.localPath.localeCompare(b.localPath)),
}

await writeJson(OUTPUT_FILE, normalized)

const usefulPages = normalized.pages.filter((page) => page.scope === 'mu-game')
const offTopicPages = normalized.pages.filter((page) => page.scope === 'off-topic-candidate')

await writeText(REPORT_FILE, `# Source Harvest Normalization Report

Generated at: ${normalized.generatedAt}

## Totals

- Source pages: ${normalized.totals.sourcePages}
- Canonical pages: ${normalized.totals.canonicalPages}
- Duplicate pages collapsed: ${normalized.totals.duplicatePages}
- Raw image records: ${normalized.totals.rawImages}
- Unique image files by SHA1: ${normalized.totals.uniqueImages}

## Scope

${Object.entries(normalized.scopeTotals).map(([scope, count]) => `- ${scope}: ${count}`).join('\n')}

## Categories

${Object.entries(normalized.categoryTotals).map(([category, count]) => `- ${category}: ${count}`).join('\n')}

## Useful MU Pages Sample

${usefulPages.slice(0, 40).map((page) => `- [${page.sourceKey}] ${page.canonicalTitle} (${page.categories.join(', ') || 'uncategorized'}) - ${page.url}`).join('\n')}

## Off Topic Candidates Sample

${offTopicPages.slice(0, 30).map((page) => `- ${page.canonicalTitle} - ${page.url}`).join('\n') || '- None.'}

## Next Step

Use \`normalized-index.json\` as the import source for PostgreSQL. Keep raw source-harvest files until all records are imported and audited.
`)

console.log(`Normalized ${normalized.totals.sourcePages} pages into ${normalized.totals.canonicalPages} canonical records.`)
