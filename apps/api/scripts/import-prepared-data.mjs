import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const currentDir = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(currentDir, '../../..')
const sourcePlanPath = resolve(repoRoot, 'references/game-data/source-harvest/postgres-import-plan.json')
const equipmentPlanPath = resolve(repoRoot, 'references/game-data/equipment-postgres-import-plan.json')
process.env.DATABASE_URL ||= 'mysql://bloodmoon:bloodmoon@localhost:53306/bloodmoon_portal'
const prisma = new PrismaClient()

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function enumOrFallback(value, fallback) {
  return value || fallback
}

const characterEvolutionMap = {
  'Dark Knight': ['Dark Knight', 'Blade Knight', 'Blade Master'],
  'Dark Wizard': ['Dark Wizard', 'Soul Master', 'Grand Master'],
  'Fairy Elf': ['Fairy Elf', 'Muse Elf', 'High Elf'],
  Summoner: ['Summoner', 'Bloody Summoner', 'Dimension Master'],
  'Magic Gladiator': ['Magic Gladiator', 'Duel Master'],
  'Dark Lord': ['Dark Lord', 'Lord Emperor'],
  'Rage Fighter': ['Rage Fighter', 'Fist Master']
}

const characterMinSeason = {
  'Dark Knight': 1,
  'Dark Wizard': 1,
  'Fairy Elf': 1,
  Summoner: 3,
  'Magic Gladiator': 1,
  'Dark Lord': 1,
  'Rage Fighter': 6
}

const seasonSixBaseClassNames = new Set([
  'Dark Knight',
  'Dark Wizard',
  'Fairy Elf',
  'Summoner',
  'Magic Gladiator',
  'Dark Lord',
  'Rage Fighter'
])

function keyFor(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())))
}

async function createManyInChunks(modelName, rows, chunkSize = 500) {
  console.log(`Importing ${modelName}: ${rows.length} rows`)
  for (let index = 0; index < rows.length; index += chunkSize) {
    await prisma[modelName].createMany({
      data: rows.slice(index, index + chunkSize),
      skipDuplicates: true
    })
  }
}

function baseClassFor(className) {
  return Object.entries(characterEvolutionMap).find(([base, classes]) => base === className || classes.includes(className))?.[0] || null
}

function publicInSeasonSix(baseClasses, minSeason, group) {
  if ((minSeason ?? 1) > 6) return false
  const classBoundGroups = new Set(['SET', 'SET_PIECE', 'WEAPON', 'SHIELD', 'WING'])
  if (!baseClasses.length) return !classBoundGroups.has(group)
  return baseClasses.some((className) => seasonSixBaseClassNames.has(className))
}

function seasonRowsForEquipment(item) {
  const minSeason = item.minSeason ?? 1
  const baseClasses = uniqueStrings(item.remapData?.baseClasses)
  const isSeasonSix = publicInSeasonSix(baseClasses, minSeason, item.group)
  const rows = []

  for (let season = Math.max(1, minSeason); season <= 6; season += 1) {
    if (season <= 6 && !isSeasonSix) continue
    rows.push({
      season,
      visibility: 'SEASON_6',
      source: 'remap'
    })
  }

  return rows
}

async function seedGameTaxonomy() {
  const characterByName = new Map()
  const classByName = new Map()
  let sortOrder = 1

  for (const [characterName, classes] of Object.entries(characterEvolutionMap)) {
    const minSeason = characterMinSeason[characterName] ?? 1
    const character = await prisma.gameCharacter.upsert({
      where: { key: keyFor(characterName) },
      update: {
        name: characterName,
        sortOrder,
        minSeason,
        isSeasonSixBase: seasonSixBaseClassNames.has(characterName)
      },
      create: {
        key: keyFor(characterName),
        name: characterName,
        sortOrder,
        minSeason,
        isSeasonSixBase: seasonSixBaseClassNames.has(characterName)
      }
    })

    characterByName.set(characterName, character)

    for (const [classIndex, className] of classes.entries()) {
      const gameClass = await prisma.gameClass.upsert({
        where: { key: keyFor(className) },
        update: {
          characterId: character.id,
          name: className,
          tier: classIndex + 1,
          minSeason,
          isSeasonSixBase: className === characterName && seasonSixBaseClassNames.has(characterName)
        },
        create: {
          characterId: character.id,
          key: keyFor(className),
          name: className,
          tier: classIndex + 1,
          minSeason,
          isSeasonSixBase: className === characterName && seasonSixBaseClassNames.has(characterName)
        }
      })

      classByName.set(className, { ...gameClass, character })
    }

    sortOrder += 1
  }

  return { characterByName, classByName }
}

async function upsertSources(sources) {
  const sourceIdByKey = new Map()

  for (const source of sources) {
    const record = await prisma.referenceSource.upsert({
      where: { key: source.key },
      update: {
        title: source.title,
        baseUrl: source.baseUrl,
        publisher: source.publisher ?? null,
        language: source.language ?? null,
        notes: source.notes ?? null
      },
      create: {
        key: source.key,
        title: source.title,
        baseUrl: source.baseUrl,
        publisher: source.publisher ?? null,
        language: source.language ?? null,
        notes: source.notes ?? null
      }
    })

    sourceIdByKey.set(source.key, record.id)
  }

  return sourceIdByKey
}

async function importKnowledge(sourcePlan) {
  const sourceIdByKey = await upsertSources(sourcePlan.sources ?? [])
  const entryIdByCanonicalKey = new Map()

  for (const entry of sourcePlan.entries ?? []) {
    const sourceId = entry.sourceKey ? sourceIdByKey.get(entry.sourceKey) : null
    const record = await prisma.knowledgeEntry.upsert({
      where: { canonicalKey: entry.canonicalKey },
      update: {
        sourceId,
        sourceKey: entry.sourceKey ?? null,
        sourceUrl: entry.sourceUrl ?? null,
        slug: entry.slug,
        title: entry.title,
        kind: enumOrFallback(entry.kind, 'UNKNOWN'),
        scope: enumOrFallback(entry.scope, 'NEEDS_REVIEW'),
        status: enumOrFallback(entry.status, 'RAW'),
        seasonMin: entry.seasonMin ?? null,
        seasonMax: entry.seasonMax ?? null,
        summary: entry.summary ?? null,
        rawData: entry.rawData ?? null,
        normalizedData: entry.normalizedData ?? null
      },
      create: {
        sourceId,
        sourceKey: entry.sourceKey ?? null,
        sourceUrl: entry.sourceUrl ?? null,
        canonicalKey: entry.canonicalKey,
        slug: entry.slug,
        title: entry.title,
        kind: enumOrFallback(entry.kind, 'UNKNOWN'),
        scope: enumOrFallback(entry.scope, 'NEEDS_REVIEW'),
        status: enumOrFallback(entry.status, 'RAW'),
        seasonMin: entry.seasonMin ?? null,
        seasonMax: entry.seasonMax ?? null,
        summary: entry.summary ?? null,
        rawData: entry.rawData ?? null,
        normalizedData: entry.normalizedData ?? null
      }
    })

    entryIdByCanonicalKey.set(entry.canonicalKey, record.id)
  }

  const assetIdByPlanKey = new Map()
  const assetIdBySha1 = new Map()

  for (const asset of sourcePlan.assets ?? []) {
    const sourceId = asset.sourceKey ? sourceIdByKey.get(asset.sourceKey) : null
    const localPath = asset.localPath ?? asset.path

    if (!localPath) continue

    const record = await prisma.referenceAsset.upsert({
      where: { localPath },
      update: {
        sourceId,
        sourceUrl: asset.sourceUrl ?? null,
        publicPath: asset.publicPath ?? null,
        kind: enumOrFallback(asset.kind, 'IMAGE'),
        mimeType: asset.mimeType ?? null,
        sha1: asset.sha1 ?? null,
        bytes: asset.bytes ?? null,
        status: enumOrFallback(asset.status, 'RAW'),
        metadata: asset.metadata ?? null
      },
      create: {
        sourceId,
        sourceUrl: asset.sourceUrl ?? null,
        localPath,
        publicPath: asset.publicPath ?? null,
        kind: enumOrFallback(asset.kind, 'IMAGE'),
        mimeType: asset.mimeType ?? null,
        sha1: asset.sha1 ?? null,
        bytes: asset.bytes ?? null,
        status: enumOrFallback(asset.status, 'RAW'),
        metadata: asset.metadata ?? null
      }
    })

    assetIdByPlanKey.set(asset.assetKey ?? asset.key ?? localPath, record.id)
    assetIdByPlanKey.set(localPath, record.id)
    if (asset.sha1 && !assetIdBySha1.has(asset.sha1)) {
      assetIdBySha1.set(asset.sha1, record.id)
    }
  }

  for (const relation of sourcePlan.entryAssets ?? []) {
    const entryId = entryIdByCanonicalKey.get(relation.entryCanonicalKey ?? relation.canonicalKey)
    const assetId = assetIdByPlanKey.get(relation.assetKey ?? relation.localPath) ?? assetIdBySha1.get(relation.assetSha1)

    if (!entryId || !assetId) continue

    await prisma.knowledgeEntryAsset.upsert({
      where: {
        entryId_assetId_role: {
          entryId,
          assetId,
          role: relation.role ?? 'reference'
        }
      },
      update: {
        sortOrder: relation.sortOrder ?? 0
      },
      create: {
        entryId,
        assetId,
        role: relation.role ?? 'reference',
        sortOrder: relation.sortOrder ?? 0
      }
    })
  }
}

async function seedInternalKnowledge() {
  const source = await prisma.referenceSource.upsert({
    where: { key: 'bloodmoon-internal' },
    update: {
      title: 'Blood Moon Internal CMS',
      baseUrl: 'internal://bloodmoon',
      publisher: 'Blood Moon',
      language: 'pt-BR',
      notes: 'Conteudos editoriais internos para Wiki, tutoriais e estrutura inicial do site.'
    },
    create: {
      key: 'bloodmoon-internal',
      title: 'Blood Moon Internal CMS',
      baseUrl: 'internal://bloodmoon',
      publisher: 'Blood Moon',
      language: 'pt-BR',
      notes: 'Conteudos editoriais internos para Wiki, tutoriais e estrutura inicial do site.'
    }
  })

  const entries = [
    {
      slug: 'primeiros-passos',
      title: 'Primeiros passos',
      kind: 'GUIDE',
      scope: 'SEASON_6',
      summary: 'Fluxo inicial para o jogador criar conta, baixar cliente, escolher personagem, entrar no servidor e iniciar a progressao.',
      headings: ['Cadastro', 'Download do cliente', 'Login', 'Criacao de personagem', 'Primeiros mapas', 'Primeiro reset']
    },
    {
      slug: 'como-jogar',
      title: 'Como jogar',
      kind: 'GUIDE',
      scope: 'SEASON_6',
      summary: 'Guia introdutorio sobre interface, controles, party, mapas, reset, eventos e leitura basica dos sistemas do servidor.',
      headings: ['Interface', 'Controles', 'Party', 'Spots de up', 'Reset', 'Eventos']
    },
    {
      slug: 'itens-excellent',
      title: 'Itens Excellent',
      kind: 'ITEM',
      scope: 'SEASON_6',
      summary: 'Itens Excellent usam nome verde e podem receber linhas especiais como dano excellent, reflect, HP, Mana, Zen, defesa e velocidade.',
      headings: ['Nome verde', 'Luck', 'Additional', 'Excellent options', 'Armas', 'Defesas']
    },
    {
      slug: 'itens-ancient',
      title: 'Itens Ancient',
      kind: 'ITEM',
      scope: 'SEASON_6',
      summary: 'Itens Ancient exibem informacao de set, pecas vinculadas e bonus por quantidade equipada. A leitura deve preservar o padrao do jogo.',
      headings: ['Nome verde', 'Set Item Equipment Information', 'Pecas do set', '2 equipamentos', 'Set completo']
    },
    {
      slug: 'itens-socket',
      title: 'Itens Socket',
      kind: 'ITEM',
      scope: 'SEASON_6',
      summary: 'Itens Socket usam nome roxo, possuem sockets para Seed Sphere e precisam exibir as linhas de descricao na ordem do jogo.',
      headings: ['Nome roxo', 'Socket item option info', 'Seed Sphere', 'Socket 1', 'Socket 2', 'Socket 3']
    },
    {
      slug: 'archangel',
      title: 'Armas Archangel',
      kind: 'ITEM',
      scope: 'SEASON_6',
      summary: 'Armas Archangel possuem nome rosado, requisitos, dano/velocidade e variacao por upgrade +0 ate +15.',
      headings: ['Divine Sword of Archangel', 'Divine Staff of Archangel', 'Divine Stick of Archangel', 'Upgrade +0 a +15']
    },
    {
      slug: 'chaos-machine',
      title: 'Chaos Machine',
      kind: 'SYSTEM',
      scope: 'SEASON_6',
      summary: 'Sistema de mixes para Chaos Weapon, asas, upgrades, jewels e combinacoes especiais conforme versao do servidor.',
      headings: ['Chaos Weapon', 'Wing mix', 'Jewel mix', 'Taxas', 'Materiais']
    },
    {
      slug: 'comercio-e-loja-pessoal',
      title: 'Comercio e loja pessoal',
      kind: 'GUIDE',
      scope: 'SEASON_6',
      summary: 'Base para trade, personal store, marketplace futuro, moedas e regras de comercio entre jogadores.',
      headings: ['Trade', 'Personal Store', 'Marketplace', 'WCoin', 'Goblin Point', 'Hunt Point']
    },
    ...Object.entries(characterEvolutionMap).map(([characterName, classes]) => ({
      slug: `personagem-${keyFor(characterName)}`,
      title: characterName,
      kind: 'CHARACTER',
      scope: 'SEASON_6',
      seasonMin: characterMinSeason[characterName] ?? 1,
      summary: `${characterName}: personagem catalogado com evolucoes ${classes.join(' > ')}.`,
      headings: classes
    }))
  ]

  for (const entry of entries) {
    await prisma.knowledgeEntry.upsert({
      where: { canonicalKey: `bloodmoon-internal:${entry.slug}` },
      update: {
        sourceId: source.id,
        sourceKey: source.key,
        sourceUrl: `internal://bloodmoon/wiki/${entry.slug}`,
        slug: entry.slug,
        title: entry.title,
        kind: entry.kind,
        scope: entry.scope,
        status: 'NORMALIZED',
        seasonMin: entry.seasonMin ?? null,
        seasonMax: null,
        summary: entry.summary,
        rawData: {
          categories: [entry.kind.toLowerCase()],
          headings: entry.headings.map((text) => ({ text })),
          paragraphCount: 1,
          tableCount: 0,
          imageCount: 0,
          source: 'internal-seed'
        },
        normalizedData: {
          topic: entry.slug,
          headings: entry.headings
        }
      },
      create: {
        sourceId: source.id,
        sourceKey: source.key,
        sourceUrl: `internal://bloodmoon/wiki/${entry.slug}`,
        canonicalKey: `bloodmoon-internal:${entry.slug}`,
        slug: entry.slug,
        title: entry.title,
        kind: entry.kind,
        scope: entry.scope,
        status: 'NORMALIZED',
        seasonMin: entry.seasonMin ?? null,
        seasonMax: null,
        summary: entry.summary,
        rawData: {
          categories: [entry.kind.toLowerCase()],
          headings: entry.headings.map((text) => ({ text })),
          paragraphCount: 1,
          tableCount: 0,
          imageCount: 0,
          source: 'internal-seed'
        },
        normalizedData: {
          topic: entry.slug,
          headings: entry.headings
        }
      }
    })
  }
}

async function importEquipment(equipmentPlan) {
  console.log('Importing equipment taxonomy and relations')
  const { classByName } = await seedGameTaxonomy()
  const variantsByEquipmentKey = new Map()
  const piecesByEquipmentKey = new Map()
  const optionsByEquipmentKey = new Map()
  const equipmentIdByKey = new Map()

  for (const variant of equipmentPlan.variants ?? []) {
    if (!variantsByEquipmentKey.has(variant.equipmentKey)) variantsByEquipmentKey.set(variant.equipmentKey, [])
    variantsByEquipmentKey.get(variant.equipmentKey).push(variant)
  }

  for (const piece of equipmentPlan.pieces ?? []) {
    if (!piecesByEquipmentKey.has(piece.equipmentKey)) piecesByEquipmentKey.set(piece.equipmentKey, [])
    piecesByEquipmentKey.get(piece.equipmentKey).push(piece)
  }

  for (const option of equipmentPlan.options ?? []) {
    if (!optionsByEquipmentKey.has(option.equipmentKey)) optionsByEquipmentKey.set(option.equipmentKey, [])
    optionsByEquipmentKey.get(option.equipmentKey).push(option)
  }

  await prisma.equipmentClassLink.deleteMany()
  await prisma.equipmentSeason.deleteMany()
  await prisma.equipmentOption.deleteMany()
  await prisma.equipmentPiece.deleteMany()
  await prisma.equipmentVariant.deleteMany()
  await prisma.equipmentRecord.deleteMany()

  const equipmentRows = (equipmentPlan.equipment ?? []).map((item) => {
    const id = randomUUID()
    equipmentIdByKey.set(item.key, id)

    return {
      id,
      key: item.key,
      name: item.name,
      title: item.title,
      category: item.category,
      categorySlug: item.categorySlug,
      group: enumOrFallback(item.group, 'MISC'),
      baseSetName: item.baseSetName ?? null,
      sourceUrl: item.sourceUrl ?? null,
      minSeason: item.minSeason ?? 1,
      status: enumOrFallback(item.status, 'NORMALIZED'),
      rawData: item.rawData ?? null,
      remapData: item.remapData ?? null
    }
  })

  await createManyInChunks('equipmentRecord', equipmentRows)

  const variantRows = []
  const pieceRows = []
  const optionRows = []
  const classLinkRows = []
  const classLinkKeys = new Set()
  const seasonRows = []

  for (const item of equipmentPlan.equipment ?? []) {
    const equipmentId = equipmentIdByKey.get(item.key)
    if (!equipmentId) continue

    for (const variant of variantsByEquipmentKey.get(item.key) ?? item.variants ?? []) {
      variantRows.push({
        id: randomUUID(),
        equipmentId,
        quality: enumOrFallback(variant.quality, 'NORMAL'),
        minSeason: variant.minSeason ?? item.minSeason ?? 1,
        data: variant.data ?? null
      })
    }

    for (const piece of piecesByEquipmentKey.get(item.key) ?? item.pieces ?? []) {
      pieceRows.push({
        id: randomUUID(),
        equipmentId,
        name: piece.name,
        slot: piece.slot,
        imagePath: piece.imagePath ?? null,
        data: piece.data ?? null,
        sortOrder: piece.sortOrder ?? 0
      })
    }

    for (const option of optionsByEquipmentKey.get(item.key) ?? item.options ?? []) {
      optionRows.push({
        id: randomUUID(),
        equipmentId,
        scope: option.scope,
        label: option.label,
        data: option.data ?? null,
        sortOrder: option.sortOrder ?? 0
      })
    }

    const baseClasses = uniqueStrings(item.remapData?.baseClasses)
    const playableClasses = uniqueStrings(item.remapData?.playableClasses)
    const targetClasses = uniqueStrings(item.remapData?.targetClasses)
    const classLinks = [
      ...baseClasses.map((className) => ({ className, role: 'BASE' })),
      ...playableClasses.map((className) => ({ className, role: 'PLAYABLE' })),
      ...targetClasses.map((className) => ({ className, role: 'TARGET' }))
    ]

    for (const link of classLinks) {
      const gameClass = classByName.get(link.className)
      const baseCharacter = gameClass?.character ?? classByName.get(baseClassFor(link.className))?.character

      if (!gameClass || !baseCharacter) continue

      const classLinkKey = `${equipmentId}:${gameClass.id}:${link.role}`
      if (classLinkKeys.has(classLinkKey)) continue
      classLinkKeys.add(classLinkKey)

      classLinkRows.push({
        equipmentId,
        classId: gameClass.id,
        characterId: baseCharacter.id,
        role: link.role,
        source: 'remap'
      })
    }

    for (const row of seasonRowsForEquipment(item)) {
      seasonRows.push({
        id: randomUUID(),
        equipmentId,
        ...row
      })
    }
  }

  await createManyInChunks('equipmentVariant', variantRows)
  await createManyInChunks('equipmentPiece', pieceRows)
  await createManyInChunks('equipmentOption', optionRows)
  await createManyInChunks('equipmentClassLink', classLinkRows, 1000)
  await createManyInChunks('equipmentSeason', seasonRows, 1000)
}

async function main() {
  const sourcePlan = readJson(sourcePlanPath)
  const equipmentPlan = readJson(equipmentPlanPath)

  if (process.env.SKIP_KNOWLEDGE_IMPORT !== '1') {
    console.log('Importing knowledge entries and reference assets')
    await importKnowledge(sourcePlan)
    await seedInternalKnowledge()
  } else {
    console.log('Skipping knowledge import by SKIP_KNOWLEDGE_IMPORT=1')
  }

  await importEquipment(equipmentPlan)

  const counts = {
    referenceSources: await prisma.referenceSource.count(),
    knowledgeEntries: await prisma.knowledgeEntry.count(),
    referenceAssets: await prisma.referenceAsset.count(),
    knowledgeEntryAssets: await prisma.knowledgeEntryAsset.count(),
    equipmentRecords: await prisma.equipmentRecord.count(),
    equipmentVariants: await prisma.equipmentVariant.count(),
    equipmentPieces: await prisma.equipmentPiece.count(),
    equipmentOptions: await prisma.equipmentOption.count(),
    gameCharacters: await prisma.gameCharacter.count(),
    gameClasses: await prisma.gameClass.count(),
    equipmentClassLinks: await prisma.equipmentClassLink.count(),
    equipmentSeasons: await prisma.equipmentSeason.count()
  }

  console.log(JSON.stringify(counts, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
