import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const DATA_ROOT = path.join(root, 'references', 'game-data', 'source-harvest')
const ASSET_ROOT = path.join(root, 'references', 'game-assets', 'source-harvest')

const sources = [
  {
    key: 'guiamu-com-ar',
    title: 'GuiaMu Argentina',
    baseUrl: 'https://guiamu.com.ar/?lang=pt',
    allowedOrigins: ['https://guiamu.com.ar', 'http://guiamu.com.ar'],
    pageUrlAllowed: (url) => {
      const parsed = new URL(url)
      if (!['https://guiamu.com.ar', 'http://guiamu.com.ar'].includes(parsed.origin)) return false
      if (/\.(css|js|xml|ico|png|jpe?g|gif|webp|svg|pdf|zip|rar)$/i.test(parsed.pathname)) return false
      return true
    },
    maxPages: Number(process.env.GUIAMU_MAX_PAGES || 180),
  },
  {
    key: 'webzen-gameinfo-pt',
    title: 'Webzen MU Online Game Info PT',
    baseUrl: 'https://muonline.webzen.com/pt/gameinfo',
    allowedOrigins: [
      'https://muonline.webzen.com',
      'http://muonline.webzen.com',
      'https://eventimage.webzen.com',
      'https://uploadcdn.webzen.com',
      'https://static.webzen.com',
      'http://image.webzen.net',
      'https://image.webzen.net',
    ],
    pageUrlAllowed: (url) => {
      const parsed = new URL(url)
      if (!['https://muonline.webzen.com', 'http://muonline.webzen.com'].includes(parsed.origin)) return false
      if (/\.(css|js|xml|ico|png|jpe?g|gif|webp|svg|pdf|zip|rar)$/i.test(parsed.pathname)) return false
      return /^\/pt\/gameinfo\b/i.test(parsed.pathname) || /^\/gameinfo\/pt\b/i.test(parsed.pathname)
    },
    maxPages: Number(process.env.WEBZEN_MAX_PAGES || 180),
  },
]

const now = new Date().toISOString()

const ensureDir = (dir) => mkdir(dir, { recursive: true })
const relative = (filePath) => path.relative(root, filePath).replaceAll(path.sep, '/')
const sha1 = (data) => createHash('sha1').update(data).digest('hex')
const shortHash = (value) => sha1(value).slice(0, 10)

const decodeHtml = (value = '') =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&aacute;/gi, 'a')
    .replace(/&eacute;/gi, 'e')
    .replace(/&iacute;/gi, 'i')
    .replace(/&oacute;/gi, 'o')
    .replace(/&uacute;/gi, 'u')
    .replace(/&ccedil;/gi, 'c')
    .replace(/&ntilde;/gi, 'n')

const stripTags = (value = '') =>
  decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6]|table)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )

const slugify = (value = '') =>
  stripTags(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'page'

const normalizePageUrl = (url, source) => {
  const parsed = new URL(url)
  parsed.hash = ''

  if (source.key === 'guiamu-com-ar') {
    parsed.searchParams.set('lang', 'pt')
  }

  return parsed.href
}

const absoluteUrl = (baseUrl, resource) => {
  const clean = decodeHtml(resource).trim().replace(/\\/g, '/')
  if (!clean || clean.startsWith('data:')) return null
  return new URL(clean.replace(/^\/\//, 'https://'), baseUrl).href
}

const extensionFor = (url, contentType = '') => {
  const ext = path.extname(new URL(url).pathname).toLowerCase()
  if (ext && ext.length <= 6) return ext
  if (/png/i.test(contentType)) return '.png'
  if (/gif/i.test(contentType)) return '.gif'
  if (/webp/i.test(contentType)) return '.webp'
  if (/svg/i.test(contentType)) return '.svg'
  return '.jpg'
}

const fetchBuffer = async (url, referer) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 BloodMoonReferenceCollector/2.0',
      Referer: referer,
      Accept: '*/*',
    },
  }).finally(() => clearTimeout(timeout))

  if (!response.ok) {
    throw new Error(`${url} => ${response.status} ${response.statusText}`)
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || '',
  }
}

const textFromBuffer = (buffer, contentType) => {
  const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.toLowerCase()
  if (charset && charset !== 'utf-8' && charset !== 'utf8') {
    return new TextDecoder(charset).decode(buffer)
  }

  const text = buffer.toString('utf8')
  return text.includes('�') ? new TextDecoder('iso-8859-1').decode(buffer) : text
}

const fetchText = async (url, referer) => {
  const { buffer, contentType } = await fetchBuffer(url, referer)
  return textFromBuffer(buffer, contentType)
}

const extractLinks = (html, baseUrl) => {
  const links = new Set()
  for (const match of html.matchAll(/\b(?:href|data-href)\s*=\s*["']([^"']+)["']/gi)) {
    const href = match[1]
    if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) continue
    const url = absoluteUrl(baseUrl, href)
    if (url) links.add(url)
  }
  return [...links]
}

const extractImages = (html, baseUrl) => {
  const images = new Set()
  const add = (raw) => {
    const url = absoluteUrl(baseUrl, raw)
    if (url) images.add(url)
  }

  for (const match of html.matchAll(/<img[^>]+(?:src|data-src|data-original)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    add(match[1])
  }
  for (const match of html.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const entry of match[1].split(',')) add(entry.trim().split(/\s+/)[0])
  }
  for (const match of html.matchAll(/url\(([^)]+)\)/gi)) {
    const raw = match[1].replace(/^['"]|['"]$/g, '').trim()
    if (raw && !raw.startsWith('data:')) add(raw)
  }

  return [...images]
}

const titleFor = (html) => {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return stripTags(h1 || title || 'Untitled')
}

const metaDescriptionFor = (html) =>
  decodeHtml(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || '')

const headingsFor = (html) =>
  [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((match) => ({
      level: Number(match[1]),
      text: stripTags(match[2]),
    }))
    .filter((heading) => heading.text)

const tableRowsFor = (tableHtml) =>
  [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((rowMatch) =>
      [...rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cellMatch) => stripTags(cellMatch[1]))
        .filter(Boolean),
    )
    .filter((row) => row.length)

const tablesFor = (html) =>
  [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)]
    .map((match, index) => ({
      index,
      rows: tableRowsFor(match[0]),
    }))
    .filter((table) => table.rows.length)

const paragraphsFor = (html) =>
  [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((text) => text.length > 20)
    .slice(0, 80)

const classifyPage = (title, url, text) => {
  const haystack = `${title} ${new URL(url).pathname} ${text.slice(0, 2000)}`.toLowerCase()
  const checks = [
    ['drop', /\bdrop|drops|item drop|monstro|monster|mob/],
    ['skill', /\bskill|habilidade|orb|scroll|book|master skill/],
    ['map', /\bmapa|map|lorencia|noria|devias|dungeon|atlans|tarkan|aida|icarus/],
    ['spot', /\bspot|spots|respawn|up\b|level/],
    ['event', /\bevento|event|blood castle|devil square|chaos castle|castle siege|crywolf/],
    ['quest', /\bquest|missao|marlin|marlon|classe|evolution/],
    ['npc', /\bnpc|merchant|vendedor|goblin|chaos machine/],
    ['item', /\bitem|equipment|set|weapon|armor|wing|jewel|ancient|excellent|socket/],
    ['character', /\bcharacter|personagem|dark knight|dark wizard|fairy elf|summoner|dark lord|rage fighter/],
  ]
  return checks.filter(([, regex]) => regex.test(haystack)).map(([key]) => key)
}

const downloadImage = async ({ source, pageUrl, imageUrl, assetDir, imageHashes }) => {
  const parsed = new URL(imageUrl)
  if (!source.allowedOrigins.includes(parsed.origin)) return null

  try {
    const { buffer, contentType } = await fetchBuffer(imageUrl, pageUrl)
    if (!/^image\//i.test(contentType) && !/\.(png|jpe?g|gif|webp|svg)$/i.test(parsed.pathname)) return null

    const hash = sha1(buffer)
    const ext = extensionFor(imageUrl, contentType)
    const existing = imageHashes.get(hash)
    const slug = slugify(path.basename(parsed.pathname, path.extname(parsed.pathname)) || 'image')
    const target = existing || path.join(assetDir, 'images', `${slug}-${hash.slice(0, 10)}${ext}`)

    if (!existing) {
      await ensureDir(path.dirname(target))
      await writeFile(target, buffer)
      imageHashes.set(hash, target)
    }

    return {
      sourceUrl: imageUrl,
      localPath: relative(target),
      bytes: buffer.length,
      sha1: hash,
      duplicateOf: existing ? relative(existing) : null,
      contentType,
    }
  } catch (error) {
    return {
      sourceUrl: imageUrl,
      error: error.message,
    }
  }
}

const crawlSource = async (source) => {
  const dataDir = path.join(DATA_ROOT, source.key)
  const assetDir = path.join(ASSET_ROOT, source.key)
  await ensureDir(dataDir)
  await ensureDir(path.join(assetDir, 'html'))
  await ensureDir(path.join(assetDir, 'text'))

  const queue = [normalizePageUrl(source.baseUrl, source)]
  const visited = new Set()
  const pageRecords = []
  const imageRecords = []
  const errors = []
  const imageHashes = new Map()

  while (queue.length && visited.size < source.maxPages) {
    const url = queue.shift()
    if (!url || visited.has(url) || !source.pageUrlAllowed(url)) continue

    visited.add(url)
    try {
      const html = await fetchText(url, source.baseUrl)
      const title = titleFor(html)
      const slug = `${slugify(title)}-${shortHash(url)}`
      const text = stripTags(html)
      const htmlPath = path.join(assetDir, 'html', `${slug}.html`)
      const textPath = path.join(assetDir, 'text', `${slug}.txt`)

      await writeFile(htmlPath, html)
      await writeFile(textPath, `${url}\n\n${text}\n`)

      const links = extractLinks(html, url)
        .map((link) => {
          try {
            return normalizePageUrl(link, source)
          } catch {
            return null
          }
        })
        .filter(Boolean)

      for (const link of links) {
        if (!visited.has(link) && source.pageUrlAllowed(link) && !queue.includes(link) && queue.length < source.maxPages * 4) {
          queue.push(link)
        }
      }

      const rawImages = extractImages(html, url)
      const images = []
      for (const imageUrl of rawImages.slice(0, 120)) {
        const imageRecord = await downloadImage({ source, pageUrl: url, imageUrl, assetDir, imageHashes })
        if (imageRecord) {
          images.push(imageRecord)
          imageRecords.push({ pageUrl: url, ...imageRecord })
        }
      }

      pageRecords.push({
        sourceKey: source.key,
        sourceTitle: source.title,
        url,
        title,
        slug,
        description: metaDescriptionFor(html),
        categories: classifyPage(title, url, text),
        headings: headingsFor(html),
        paragraphs: paragraphsFor(html),
        tables: tablesFor(html),
        links: links.filter((link) => source.pageUrlAllowed(link)).slice(0, 200),
        images,
        files: {
          html: relative(htmlPath),
          text: relative(textPath),
        },
      })

      console.log(`[${source.key}] ${visited.size}/${source.maxPages} ${title}`)
    } catch (error) {
      errors.push({ url, error: error.message })
      console.warn(`[${source.key}] failed ${url}: ${error.message}`)
    }
  }

  const duplicates = Object.values(imageRecords.reduce((acc, image) => {
    if (!image.sha1) return acc
    acc[image.sha1] ||= []
    acc[image.sha1].push(image)
    return acc
  }, {})).filter((items) => items.length > 1)

  const data = {
    schema: 'bloodmoon.source-harvest.v1',
    generatedAt: now,
    source: {
      key: source.key,
      title: source.title,
      baseUrl: source.baseUrl,
      maxPages: source.maxPages,
    },
    totals: {
      pages: pageRecords.length,
      images: imageRecords.length,
      imageDuplicates: duplicates.length,
      errors: errors.length,
    },
    pages: pageRecords,
    images: imageRecords,
    duplicateImageGroups: duplicates.map((items) => ({
      sha1: items[0].sha1,
      count: items.length,
      localPath: items[0].localPath,
      sourceUrls: [...new Set(items.map((item) => item.sourceUrl))],
      pageUrls: [...new Set(items.map((item) => item.pageUrl))],
    })),
    errors,
  }

  const dataPath = path.join(dataDir, `${source.key}-data.json`)
  const summaryPath = path.join(dataDir, `${source.key}-summary.md`)
  await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`)
  await writeFile(summaryPath, `# ${source.title}

Fonte inicial: ${source.baseUrl}

Gerado em: ${now}

## Totais

- Paginas coletadas: ${data.totals.pages}
- Imagens encontradas/baixadas: ${data.totals.images}
- Grupos de imagem duplicada: ${data.totals.imageDuplicates}
- Erros: ${data.totals.errors}

## Categorias inferidas

${Object.entries(pageRecords.reduce((acc, page) => {
  for (const category of page.categories) acc[category] = (acc[category] || 0) + 1
  return acc
}, {})).sort((a, b) => a[0].localeCompare(b[0])).map(([category, count]) => `- ${category}: ${count}`).join('\n') || '- Nenhuma categoria inferida.'}

## Arquivos

- Dados: \`${relative(dataPath)}\`
- Assets: \`${relative(assetDir)}\`
`)

  return data
}

await ensureDir(DATA_ROOT)
await ensureDir(ASSET_ROOT)

const results = []
for (const source of sources) {
  results.push(await crawlSource(source))
}

const combined = {
  schema: 'bloodmoon.source-harvest.index.v1',
  generatedAt: now,
  sources: results.map((result) => ({
    key: result.source.key,
    title: result.source.title,
    baseUrl: result.source.baseUrl,
    totals: result.totals,
    dataPath: `references/game-data/source-harvest/${result.source.key}/${result.source.key}-data.json`,
    assetPath: `references/game-assets/source-harvest/${result.source.key}`,
  })),
  globalTotals: {
    pages: results.reduce((sum, result) => sum + result.totals.pages, 0),
    images: results.reduce((sum, result) => sum + result.totals.images, 0),
    errors: results.reduce((sum, result) => sum + result.totals.errors, 0),
  },
}

await writeFile(path.join(DATA_ROOT, 'index.json'), `${JSON.stringify(combined, null, 2)}\n`)
await writeFile(path.join(DATA_ROOT, 'README.md'), `# Source Harvest

Coleta bruta e normalizada de fontes externas para migracao posterior ao PostgreSQL.

Gerado em: ${now}

## Fontes

${combined.sources.map((source) => `- ${source.title}: ${source.totals.pages} paginas, ${source.totals.images} imagens, ${source.totals.errors} erros. Dados em \`${source.dataPath}\`.`).join('\n')}

## Regra

Estes arquivos sao material de referencia interna e rastreabilidade. Nao publicar imagens externas diretamente sem remasterizacao/autorizacao/revisao editorial.
`)

console.log(`Source harvest complete: ${combined.globalTotals.pages} pages, ${combined.globalTotals.images} images.`)
