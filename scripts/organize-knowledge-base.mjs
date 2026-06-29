import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const knowledgeRoot = path.join(root, 'knowledge')
const appDataRoot = path.join(root, 'apps', 'web', 'data')
const detailRoot = path.join(appDataRoot, 'mu-equipment-details')
const referencesDataRoot = path.join(root, 'references', 'game-data')
const referencesAssetsRoot = path.join(root, 'references', 'game-assets')
const publicRoot = path.join(root, 'apps', 'web', 'public')

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'))
const writeJson = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`)
}
const writeText = async (filePath, text) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, text.replace(/\r\n/g, '\n').replace(/\n{2,}$/u, '\n'))
}
const exists = async (filePath) => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
const slugify = (value) =>
  String(value || 'unknown')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'unknown'
const unique = (items) => Array.from(new Set(items.filter(Boolean)))
const relative = (filePath) => path.relative(root, filePath).replaceAll(path.sep, '/')
const titleCase = (value) => String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const safeValue = (value, fallback = '-') => value === null || value === undefined || value === '' ? fallback : value

const armorCategories = new Set(['Helm', 'Armor', 'Pants', 'Gloves', 'Boots'])
const setCategories = new Set([
  'Ancient Normal',
  'Set Lucky',
  'Bloodangel Ancient',
  'Darkangel Ancient',
  'Holyangel Ancient',
  'Soul Ancient',
  'Blue Eye Ancient',
  'Manticore Ancient',
  'Silver Heart Ancient',
  'Brilliant Ancient',
  'Apocalypse Ancient',
  'Primordial Ancient'
])
const topicSources = [
  {
    key: 'excellent-items',
    title: 'Tutorial sobre excellent item',
    sourceData: 'muonlinefanz-excellent-items-data.json',
    sourceReference: 'muonlinefanz-excellent-items-reference.md',
    sourceUrl: 'https://muonlinefanz.com/guide/items/excellent/'
  },
  {
    key: 'ancient-items',
    title: 'Tutorial sobre ancient item',
    sourceData: 'muonlinefanz-ancient-items-data.json',
    sourceReference: 'muonlinefanz-ancient-items-reference.md',
    sourceUrl: 'https://muonlinefanz.com/guide/items/ancient/'
  },
  {
    key: 'socket-items',
    title: 'Tutorial sobre socket item',
    sourceData: 'muonlinefanz-socket-items-data.json',
    sourceReference: 'muonlinefanz-socket-items-reference.md',
    sourceUrl: 'https://muonlinefanz.com/guide/items/socket/'
  },
  {
    key: 'mastery-sets',
    title: 'Tutorial sobre mastery sets',
    sourceData: 'muonlinefanz-item-guides-batch-data.json',
    sourceReference: 'muonlinefanz-item-guides-batch-reference.md',
    sourceUrl: 'https://muonlinefanz.com/guide/items/mastery-sets/'
  },
  {
    key: 'bloodangel-mastery',
    title: 'Tutorial sobre bloodangel mastery',
    sourceData: 'webzen-bloodangel-mastery-data.json',
    sourceReference: 'webzen-bloodangel-mastery-reference.md',
    sourceUrl: 'https://muonline.webzen.com/pt/gameinfo/guide/detail/137'
  }
]

const loadDetails = async () => {
  const entries = await fs.readdir(detailRoot, { withFileTypes: true })
  const byKey = new Map()
  const byCategory = new Map()

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue

    const filePath = path.join(detailRoot, entry.name)
    const items = await readJson(filePath)
    byCategory.set(entry.name.replace(/\.json$/i, ''), items)
    for (const item of items) {
      byKey.set(item.key, { ...item, detailFile: relative(filePath) })
    }
  }

  return { byKey, byCategory }
}

const itemRecord = (summary, detail) => ({
  schema: 'bloodmoon.knowledge.equipment-item.v1',
  id: summary.key,
  slug: summary.slug,
  name: summary.name,
  title: summary.title,
  category: summary.category,
  categorySlug: summary.categorySlug,
  usableBy: summary.usableBy || [],
  listStats: summary.listStats || {},
  image: summary.image || null,
  source: {
    normalizedIndex: 'apps/web/data/muEquipmentIndex.generated.json',
    detailFile: detail?.detailFile || null,
    sourceUrl: detail?.sourceUrl || summary.sourceUrl || null,
    imageSourceUrl: detail?.image?.sourceUrl || summary.image?.sourceUrl || null
  },
  statsByLevel: detail?.levelStats || [],
  parts: (detail?.parts || []).map(partRecord),
  detailParts: (detail?.detailParts || []).map(partRecord),
  editorial: {
    status: detail ? 'cataloged-from-normalized-source' : 'index-only-needs-detail-review',
    reviewStatus: 'needs-human-gameplay-validation',
    notes: []
  }
})

const partRecord = (part) => ({
  name: part.name,
  slug: part.slug,
  image: part.image || null,
  imageError: part.imageError || null,
  statsByLevel: part.levelStats || []
})

const itemMarkdown = (record) => {
  const stats = Object.entries(record.listStats || {})
    .filter(([, value]) => value && value !== '~')
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n') || '- Sem atributos de lista publicados.'
  const parts = [...(record.parts || []), ...(record.detailParts || [])]
    .map((part) => `- ${part.name}${part.image?.publicPath ? ` (${part.image.publicPath})` : ''}`)
    .join('\n') || '- Nao possui partes internas catalogadas.'

  return `# ${record.title}

## Identidade

- ID: \`${record.id}\`
- Nome canonico: ${record.name}
- Categoria: ${record.category}
- Quem usa: ${record.usableBy.length ? record.usableBy.join(', ') : 'nao informado na fonte normalizada'}
- Status editorial: ${record.editorial.status}

## Atributos de lista

${stats}

## Partes relacionadas

${parts}

## Fontes

- Indice normalizado: \`${record.source.normalizedIndex}\`
${record.source.detailFile ? `- Detalhe normalizado: \`${record.source.detailFile}\`\n` : ''}${record.source.sourceUrl ? `- URL fonte: ${record.source.sourceUrl}\n` : ''}${record.source.imageSourceUrl ? `- URL imagem: ${record.source.imageSourceUrl}\n` : ''}
## Notas editoriais

- Validar em jogo antes de publicar textos finais.
- Este arquivo foi gerado mecanicamente a partir da base local; edicoes humanas devem preferir campos estruturados no \`item.json\`.
`
}

const sourceInventory = async () => {
  const files = []
  const walk = async (dir) => {
    if (!await exists(dir)) return
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else {
        const stat = await fs.stat(fullPath)
        files.push({
          path: relative(fullPath),
          bytes: stat.size,
          extension: path.extname(entry.name).toLowerCase() || '(none)'
        })
      }
    }
  }

  await walk(appDataRoot)
  await walk(referencesDataRoot)

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      files: files.length,
      bytes: files.reduce((sum, file) => sum + file.bytes, 0)
    },
    byExtension: Object.values(files.reduce((acc, file) => {
      acc[file.extension] ||= { extension: file.extension, files: 0, bytes: 0 }
      acc[file.extension].files += 1
      acc[file.extension].bytes += file.bytes
      return acc
    }, {})).sort((a, b) => a.extension.localeCompare(b.extension)),
    files: files.sort((a, b) => a.path.localeCompare(b.path))
  }
}

const hashFile = async (filePath) => {
  const data = await fs.readFile(filePath)
  return crypto.createHash('sha1').update(data).digest('hex')
}

const collectAssetHashes = async (dir, limit = 2500) => {
  const files = []
  const walk = async (current) => {
    if (files.length >= limit || !await exists(current)) return
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (files.length >= limit) return
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (/\.(png|jpe?g|webp|gif)$/i.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }
  await walk(dir)

  const result = []
  for (const filePath of files) {
    result.push({ path: relative(filePath), sha1: await hashFile(filePath) })
  }

  return { limit, scanned: result.length, files: result }
}

const buildSets = (items, detailsByKey, ancientReferences) => {
  const normalGroups = new Map()
  for (const item of items.filter((entry) => armorCategories.has(entry.category))) {
    normalGroups.set(item.name, [...(normalGroups.get(item.name) || []), item])
  }

  const sets = []
  for (const [name, parts] of normalGroups) {
    const categories = unique(parts.map((part) => part.category)).sort()
    if (categories.length < 2) continue
    const qualities = ['Normal']
    if (parts.some((part) => part.listStats?.excellentDrop && part.listStats.excellentDrop !== '~')) {
      qualities.push('Excellent')
    }

    sets.push({
      schema: 'bloodmoon.knowledge.equipment-set.v1',
      id: `set-${slugify(name)}`,
      slug: slugify(name),
      name,
      family: 'normal-armor-set',
      qualities,
      usableBy: unique(parts.flatMap((part) => part.usableBy || [])),
      parts: parts.map((part) => ({
        itemId: part.key,
        name: part.title,
        category: part.category,
        slug: part.slug,
        image: part.image || null
      })),
      setOptions: [],
      source: {
        normalizedIndex: 'apps/web/data/muEquipmentIndex.generated.json',
        detailFiles: unique(parts.map((part) => detailsByKey.get(part.key)?.detailFile))
      },
      editorial: {
        status: 'cataloged-from-normalized-parts',
        reviewStatus: 'needs-human-gameplay-validation'
      }
    })
  }

  const ancientByName = new Map((ancientReferences.sampleSetsCapturedFromPage || []).map((entry) => [
    slugify(entry.name.replace(/\s+set$/i, '')),
    entry
  ]))

  for (const item of items.filter((entry) => setCategories.has(entry.category))) {
    const detail = detailsByKey.get(item.key)
    const reference = ancientByName.get(slugify(item.name))
    const listParts = Object.values(item.listStats || {}).filter((value) => value && !/^opci/i.test(value))
    const rawDetailParts = [...(detail?.detailParts || []), ...(detail?.parts || [])]
    const detailPartBySlug = new Map()
    for (const part of rawDetailParts) {
      const partSlug = slugify(part.name)
      const existing = detailPartBySlug.get(partSlug)
      if (!existing || (!existing.levelStats?.length && part.levelStats?.length)) {
        detailPartBySlug.set(partSlug, part)
      }
    }
    const detailedParts = Array.from(detailPartBySlug.values()).map((part) => ({
      name: part.name,
      slug: part.slug,
      image: part.image || null,
      hasStats: Boolean(part.levelStats?.length),
      source: 'detailParts'
    }))
    const detailedPartNames = new Set(detailedParts.map((part) => slugify(part.name)))
    const listOnlyParts = listParts
      .filter((name) => !detailedPartNames.has(slugify(name)))
      .map((name) => ({ name, source: 'listStats' }))

    sets.push({
      schema: 'bloodmoon.knowledge.equipment-set.v1',
      id: item.key,
      slug: item.slug,
      name: item.name,
      family: item.category,
      qualities: item.category === 'Set Lucky' ? ['Lucky'] : ['Ancient'],
      usableBy: reference?.classes || item.usableBy || [],
      parts: [...detailedParts, ...listOnlyParts],
      setOptions: reference?.setOptions || [],
      baseSetDefense: reference?.baseSetDefense || null,
      source: {
        normalizedIndex: 'apps/web/data/muEquipmentIndex.generated.json',
        detailFile: detail?.detailFile || null,
        ancientReference: reference ? 'references/game-data/muonlinefanz-ancient-items-data.json' : null,
        sourceUrl: detail?.sourceUrl || null
      },
      editorial: {
        status: detail ? 'cataloged-from-normalized-source' : 'index-only-needs-detail-review',
        reviewStatus: 'needs-human-gameplay-validation'
      }
    })
  }

  return sets.sort((a, b) => a.name.localeCompare(b.name))
}

const setMarkdown = (record) => {
  const parts = record.parts.length
    ? record.parts.map((part) => `- ${part.category ? `${part.category}: ` : ''}${part.name}${part.itemId ? ` (\`${part.itemId}\`)` : ''}`).join('\n')
    : '- Sem partes catalogadas.'
  const options = record.setOptions.length
    ? record.setOptions.map((option) => `- ${option.pieces} Set option: ${option.option}`).join('\n')
    : '- Sem opcoes de set confirmadas nesta base.'

  return `# ${record.name}

## Identidade

- ID: \`${record.id}\`
- Familia: ${record.family}
- Qualidades: ${record.qualities.join(', ')}
- Quem usa: ${record.usableBy.length ? record.usableBy.join(', ') : 'nao informado'}
- Status editorial: ${record.editorial.status}

## Partes

${parts}

## Opcoes do set

${options}

## Fontes

- Indice normalizado: \`${record.source.normalizedIndex}\`
${record.source.detailFile ? `- Detalhe normalizado: \`${record.source.detailFile}\`\n` : ''}${record.source.ancientReference ? `- Referencia Ancient complementar: \`${record.source.ancientReference}\`\n` : ''}${record.source.sourceUrl ? `- URL fonte: ${record.source.sourceUrl}\n` : ''}
## Notas editoriais

- Conferir partes e bonus antes de publicar como texto final.
- Sets Ancient podem incluir armas, escudos, aneis ou pendant alem de armaduras.
`
}

const tutorialMarkdown = async (topic) => {
  const dataPath = path.join(referencesDataRoot, topic.sourceData)
  const referencePath = path.join(referencesDataRoot, topic.sourceReference)
  const data = await exists(dataPath) ? await readJson(dataPath) : null
  const referenceExists = await exists(referencePath)

  return `# ${topic.title}

## Fonte

- URL: ${topic.sourceUrl}
- Dados locais: \`${relative(dataPath)}\`
${referenceExists ? `- Resumo local: \`${relative(referencePath)}\`\n` : ''}
## Estado editorial

- Status: catalogado como tutorial de conhecimento.
- Revisao: precisa ser convertido em pagina final da wiki com linguagem propria do Blood Moon.

## Conteudo estruturado disponivel

\`\`\`json
${JSON.stringify(data ? Object.keys(data) : [], null, 2)}
\`\`\`

## Diretriz para publicacao

- Usar este arquivo como prateleira de referencia, nao como texto final copiado.
- Transformar regras gerais em tutorial da wiki.
- Ligar exemplos do tutorial aos objetos canonicos em \`knowledge/equipment\`.
`
}

const redundancyReport = async (inventory, referenceHashes, publicHashes) => {
  const publicByHash = new Map()
  for (const file of publicHashes.files) {
    publicByHash.set(file.sha1, [...(publicByHash.get(file.sha1) || []), file.path])
  }
  const duplicatedAssets = referenceHashes.files
    .map((file) => ({ ...file, publicMatches: publicByHash.get(file.sha1) || [] }))
    .filter((file) => file.publicMatches.length)

  return `# Relatorio de redundancia

Gerado em: ${inventory.generatedAt}

## Regra da biblioteca

Nada deve ser excluido so porque parece duplicado. Primeiro o conteudo precisa estar catalogado em \`knowledge/\`, com fonte e status editorial.

## Dados

- Arquivos inventariados em dados: ${inventory.totals.files}
- Bytes inventariados em dados: ${inventory.totals.bytes}
- Arquivos de referencia visual escaneados para hash: ${referenceHashes.scanned}
- Arquivos publicos escaneados para hash: ${publicHashes.scanned}
- Assets em \`references/game-assets\` com hash tambem encontrado em \`apps/web/public\`: ${duplicatedAssets.length}

## Candidatos a revisao, nao apagar automaticamente

- \`references/game-assets/**\`: manter como fonte bruta enquanto houver marca d'agua, contexto de coleta ou manifesto associado.
- \`apps/web/public/dev-references/**\`: revisar depois de confirmar se a imagem equivalente ja esta em \`apps/web/public/images/game-assets/**\`.
- \`references/game-data/*-reference.md\`: manter como resumo humano das fontes ate a wiki tutorial final estar escrita.
- \`references/game-data/*-data.json\`: manter como fonte primaria externa; alguns dados complementam o indice gerado, como opcoes Ancient.

## Duplicidades de asset por hash

${duplicatedAssets.slice(0, 200).map((file) => `- \`${file.path}\` tambem existe em ${file.publicMatches.map((match) => `\`${match}\``).join(', ')}`).join('\n') || '- Nenhuma duplicidade encontrada no limite escaneado.'}

${duplicatedAssets.length > 200 ? `\n> Lista truncada: ${duplicatedAssets.length - 200} duplicidades adicionais.\n` : ''}
`
}

const main = async () => {
  await fs.rm(knowledgeRoot, { recursive: true, force: true })
  await fs.mkdir(knowledgeRoot, { recursive: true })

  const equipmentIndex = await readJson(path.join(appDataRoot, 'muEquipmentIndex.generated.json'))
  const ancientReferences = await readJson(path.join(referencesDataRoot, 'muonlinefanz-ancient-items-data.json'))
  const details = await loadDetails()
  const inventory = await sourceInventory()

  const itemRecords = []
  for (const summary of equipmentIndex) {
    const detail = details.byKey.get(summary.key)
    const record = itemRecord(summary, detail)
    itemRecords.push(record)
    const itemDir = path.join(knowledgeRoot, 'equipment', 'items', record.categorySlug, record.slug)
    await writeJson(path.join(itemDir, 'item.json'), record)
    await writeText(path.join(itemDir, 'README.md'), itemMarkdown(record))
  }

  const setRecords = buildSets(equipmentIndex, details.byKey, ancientReferences)
  for (const record of setRecords) {
    const setDir = path.join(knowledgeRoot, 'equipment', 'sets', record.slug)
    await writeJson(path.join(setDir, 'set.json'), record)
    await writeText(path.join(setDir, 'README.md'), setMarkdown(record))
  }

  for (const topic of topicSources) {
    await writeText(
      path.join(knowledgeRoot, 'topics', 'equipment', 'tutorials', topic.key, 'README.md'),
      await tutorialMarkdown(topic)
    )
  }

  const referenceHashes = await collectAssetHashes(referencesAssetsRoot)
  const publicHashes = await collectAssetHashes(publicRoot)
  await writeJson(path.join(knowledgeRoot, 'audit', 'source-inventory.json'), inventory)
  await writeJson(path.join(knowledgeRoot, 'audit', 'asset-hash-sample.json'), {
    generatedAt: inventory.generatedAt,
    referenceHashes,
    publicHashes
  })
  await writeText(path.join(knowledgeRoot, 'audit', 'redundancy-report.md'), await redundancyReport(inventory, referenceHashes, publicHashes))

  const index = {
    schema: 'bloodmoon.knowledge.index.v1',
    generatedAt: inventory.generatedAt,
    counts: {
      equipmentItems: itemRecords.length,
      equipmentSets: setRecords.length,
      tutorials: topicSources.length,
      sourceFiles: inventory.totals.files
    },
    paths: {
      equipmentItems: 'knowledge/equipment/items',
      equipmentSets: 'knowledge/equipment/sets',
      equipmentTutorials: 'knowledge/topics/equipment/tutorials',
      audit: 'knowledge/audit'
    },
    rules: [
      'Preferir objetos canonicos em knowledge/equipment para renderizacao futura.',
      'Manter references como fonte bruta ate o relatorio de redundancia liberar exclusao.',
      'Todo item publicado deve ter fonte, status editorial e revisao humana.'
    ]
  }
  await writeJson(path.join(knowledgeRoot, 'INDEX.json'), index)
  await writeText(path.join(knowledgeRoot, 'README.md'), `# Blood Moon Knowledge Library

Biblioteca canonica do projeto, organizada como uma estante editorial.

## Filosofia

- Primeiro catalogar a menor unidade confiavel: item, parte, regra, tutorial.
- Depois montar composicoes: sets, guias, paginas da wiki e sistemas.
- Referencias brutas continuam em \`references/\` ate serem auditadas.
- O app continua usando \`apps/web/data\` enquanto esta biblioteca amadurece.

## Estrutura

- \`equipment/items/<categoria>/<item>/item.json\`: objeto canonico do item.
- \`equipment/items/<categoria>/<item>/README.md\`: ficha humana do item.
- \`equipment/sets/<set>/set.json\`: composicao de set.
- \`equipment/sets/<set>/README.md\`: ficha humana do set.
- \`topics/equipment/tutorials/<topico>/README.md\`: prateleira de tutorial.
- \`audit/source-inventory.json\`: inventario de dados locais.
- \`audit/redundancy-report.md\`: candidatos de redundancia, sem exclusao automatica.

## Indice rapido

- Itens catalogados: ${index.counts.equipmentItems}
- Sets catalogados: ${index.counts.equipmentSets}
- Tutoriais iniciais: ${index.counts.tutorials}
- Arquivos de fonte inventariados: ${index.counts.sourceFiles}

## Proxima regra de trabalho

Toda alteracao de wiki deve consultar esta biblioteca e, se a informacao nao estiver aqui, consultar a fonte bruta em \`references/\` antes de implementar.
`)

  console.log(JSON.stringify(index.counts, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
