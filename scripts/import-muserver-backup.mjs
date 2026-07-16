import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const defaultBackupDir = 'C:\\Users\\Admin\\Documents\\BloodMoonBackups\\game-vps\\pre-web-migration-20260716-095739'
const backupDir = process.env.MUSERVER_BACKUP_DIR || defaultBackupDir
const zipPath = process.env.MUSERVER_ZIP || path.join(backupDir, 'MuServer-no-live-logs.zip')
const extractRoot = process.env.MUSERVER_EXTRACT_DIR || path.join(repoRoot, 'work', 'muserver-extracted')
const outputRoot = process.env.MUSERVER_EXPORT_DIR || path.join(repoRoot, 'references', 'game-data', 'muserver-export')
const sourceRoot = path.join(extractRoot, 'MuServer-stage')

const classColumns = [
  'darkWizard',
  'darkKnight',
  'fairyElf',
  'magicGladiator',
  'darkLord',
  'summoner',
  'rageFighter'
]

const mapNames = {
  0: 'Lorencia',
  1: 'Dungeon',
  2: 'Devias',
  3: 'Noria',
  4: 'Lost Tower',
  6: 'Arena',
  7: 'Atlans',
  8: 'Tarkan',
  10: 'Icarus',
  30: 'Valley of Loren',
  31: 'Land of Trials',
  33: 'Aida',
  34: 'Crywolf',
  37: 'Kanturu',
  38: 'Kanturu Remain',
  41: 'Barracks',
  42: 'Refuge',
  51: 'Elbeland',
  56: 'Swamp of Peace',
  57: 'Raklion',
  63: 'Vulcanus',
  80: 'Karutan 1',
  81: 'Karutan 2'
}

const itemSectionNames = {
  0: 'Swords',
  1: 'Axes',
  2: 'Maces/Scepters',
  3: 'Spears',
  4: 'Bows/Crossbows',
  5: 'Staffs',
  6: 'Shields',
  7: 'Helms',
  8: 'Armors',
  9: 'Pants',
  10: 'Gloves',
  11: 'Boots',
  12: 'Wings/Orbs/Pets',
  13: 'Misc/Consumables',
  14: 'Jewels',
  15: 'Scrolls/Events',
  16: 'Socket/Seasonal'
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/')
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function readText(filePath) {
  const buffer = readFileSync(filePath)
  return buffer.toString('latin1').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function writeJson(fileName, data) {
  const fullPath = path.join(outputRoot, fileName)
  ensureDir(path.dirname(fullPath))
  writeFileSync(fullPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function writeReadme(summary) {
  const lines = [
    '# MuServer export',
    '',
    'Dados extraidos do backup local do MuServer para alimentar a API, Wiki e CMS.',
    '',
    `- Gerado em: ${summary.generatedAt}`,
    `- Backup: ${backupDir}`,
    `- ZIP: ${zipPath}`,
    `- Origem extraida: ${sourceRoot}`,
    '',
    '## Arquivos gerados',
    '',
    '- `inventory.json`: inventario completo dos arquivos extraidos.',
    '- `items.json`: itens de `Item_por.txt` normalizados por secao/tipo.',
    '- `skills.json`: skills de `Skill_por.txt`.',
    '- `monsters.json`: monstros de `Data/Monster/Monster.txt`.',
    '- `monster-spawns.json`: NPCs, spots e spawns de `MonsterSetBase.txt`.',
    '- `cash-shop-products.json`: produtos de `CashShopProduct.txt`.',
    '- `event-item-bags.json`: bags/drops de `Data/EventItemBag/*.txt`.',
    '- `summary.json`: totais e lacunas principais.',
    '',
    '## Observacoes',
    '',
    '- Todo registro preserva `source.file`, `source.line` e `source.raw` sempre que possivel.',
    '- Parsers sao tolerantes para nao descartar linhas desconhecidas.',
    '- Escrita no servidor do jogo deve passar por API, permissao, transacao e auditoria.',
    ''
  ]
  writeFileSync(path.join(outputRoot, 'README.md'), `${lines.join('\n')}\n`, 'utf8')
}

function extractBackupIfNeeded() {
  if (!existsSync(zipPath)) {
    throw new Error(`MuServer ZIP not found: ${zipPath}`)
  }

  if (existsSync(sourceRoot)) return

  ensureDir(extractRoot)
  const ps = [
    'Add-Type -AssemblyName System.IO.Compression.FileSystem;',
    `$zip = '${zipPath.replace(/'/g, "''")}';`,
    `$dest = '${extractRoot.replace(/'/g, "''")}';`,
    'if (Test-Path $dest) { Remove-Item $dest -Recurse -Force };',
    'New-Item -ItemType Directory -Force -Path $dest | Out-Null;',
    '[System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $dest);'
  ].join(' ')
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { stdio: 'inherit' })
}

function walkFiles(dir) {
  const entries = []
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      entries.push(...walkFiles(fullPath))
    } else {
      entries.push(fullPath)
    }
  }
  return entries
}

function splitComment(line) {
  let inQuote = false
  for (let i = 0; i < line.length - 1; i += 1) {
    if (line[i] === '"') inQuote = !inQuote
    if (!inQuote && line[i] === '/' && line[i + 1] === '/') {
      return {
        body: line.slice(0, i).trim(),
        comment: line.slice(i + 2).trim()
      }
    }
  }
  return { body: line.trim(), comment: '' }
}

function tokenize(line) {
  const tokens = []
  const regex = /"([^"]*)"|(\S+)/g
  let match
  while ((match = regex.exec(line))) {
    tokens.push(match[1] ?? match[2])
  }
  return tokens
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : value
}

function isSectionLine(body) {
  return /^-?\d+$/.test(body.trim())
}

function sourceFor(file, lineNumber, raw) {
  return {
    file: normalizeSlashes(path.relative(sourceRoot, file)),
    line: lineNumber,
    raw
  }
}

function parseSectionedFile(file) {
  const lines = readText(file).split('\n')
  let section = null
  let header = []
  const rows = []
  const unknown = []

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const { body, comment } = splitComment(raw)
    if (!body && comment && comment.includes('\t')) {
      header = tokenize(comment)
      continue
    }
    if (!body) continue
    if (/^end$/i.test(body)) {
      section = null
      continue
    }
    if (isSectionLine(body)) {
      section = Number(body)
      continue
    }
    const tokens = tokenize(body)
    if (!tokens.length) continue
    rows.push({
      section,
      tokens,
      valuesByHeader: mapValuesByHeader(header, tokens),
      comment,
      source: sourceFor(file, i + 1, raw)
    })
  }

  return { rows, unknown }
}

function mapValuesByHeader(header, tokens) {
  if (!header.length) return null
  const mapped = {}
  header.forEach((column, index) => {
    mapped[column] = tokens[index] !== undefined ? toNumber(tokens[index]) : null
  })
  return mapped
}

function parseItems(file) {
  const { rows } = parseSectionedFile(file)
  return rows
    .filter((row) => row.section !== null && row.tokens.length >= 25)
    .map((row) => {
    const t = row.tokens
      const type = Number(t[0])
      const section = row.section
      const classValues = t.slice(24).map(toNumber)
      const classes = {}
      classColumns.forEach((name, index) => {
        classes[name] = classValues[index] ?? null
      })

      return {
        key: `${section}-${type}`,
        code: section * 512 + type,
        section,
        sectionName: itemSectionNames[section] ?? `Section ${section}`,
        type,
        name: t[8],
        slot: toNumber(t[1]),
        skill: toNumber(t[2]),
        size: { x: toNumber(t[3]), y: toNumber(t[4]) },
        flags: {
          serial: toNumber(t[5]),
          option: toNumber(t[6]),
          drop: toNumber(t[7])
        },
        level: toNumber(t[9]),
        damage: { min: toNumber(t[10]), max: toNumber(t[11]) },
        attackSpeed: toNumber(t[12]),
        durability: toNumber(t[13]),
        magic: {
          durability: toNumber(t[14]),
          power: toNumber(t[15])
        },
        requirements: {
          level: toNumber(t[16]),
          strength: toNumber(t[17]),
          agility: toNumber(t[18]),
          energy: toNumber(t[19]),
          vitality: toNumber(t[20]),
          command: toNumber(t[21])
        },
        setAttribute: toNumber(t[22]),
        classes,
        valuesByHeader: row.valuesByHeader,
        source: row.source
      }
    })
}

function parseSkills(file) {
  const lines = readText(file).split('\n')
  const rows = []
  let header = []
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const { body, comment } = splitComment(raw)
    if (!body && comment && comment.includes('\t')) {
      header = tokenize(comment)
      continue
    }
    if (!body || isSectionLine(body) || /^end$/i.test(body)) continue
    const t = tokenize(body)
    if (t.length < 20 || Number.isNaN(Number(t[0]))) continue
    const classOffset = 16
    rows.push({
      index: toNumber(t[0]),
      name: t[1],
      damage: toNumber(t[2]),
      mana: toNumber(t[3]),
      bp: toNumber(t[4]),
      distance: toNumber(t[5]),
      delay: toNumber(t[6]),
      requirements: {
        energy: toNumber(t[7]),
        command: toNumber(t[8])
      },
      attribute: toNumber(t[9]),
      type: toNumber(t[10]),
      useType: toNumber(t[11]),
      brand: toNumber(t[12]),
      killCount: toNumber(t[13]),
      states: [toNumber(t[14]), toNumber(t[15]), toNumber(t[16])],
      classes: {
        darkWizard: toNumber(t[classOffset + 1]),
        darkKnight: toNumber(t[classOffset + 2]),
        fairyElf: toNumber(t[classOffset + 3]),
        magicGladiator: toNumber(t[classOffset + 4]),
        darkLord: toNumber(t[classOffset + 5]),
        summoner: toNumber(t[classOffset + 6]),
        rageFighter: toNumber(t[classOffset + 7])
      },
      valuesByHeader: mapValuesByHeader(header, t),
      source: sourceFor(file, i + 1, raw)
    })
  }
  return rows
}

function parseMonsters(file) {
  const lines = readText(file).split('\n')
  const rows = []
  let group = null
  const columns = [
    'index',
    'rate',
    'name',
    'level',
    'maxLife',
    'maxMana',
    'damageMin',
    'damageMax',
    'defense',
    'magicDefense',
    'attackRate',
    'defenseRate',
    'moveRange',
    'attackType',
    'attackRange',
    'viewRange',
    'moveSpeed',
    'attackSpeed',
    'regenTime',
    'attribute',
    'itemRate',
    'moneyRate',
    'maxItemLevel',
    'monsterSkill',
    'resistance1',
    'resistance2',
    'resistance3',
    'resistance4'
  ]

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const { body, comment } = splitComment(raw)
    if (!body && comment && !comment.includes('====') && !comment.includes('Index')) {
      group = comment.replace(/^\/+/, '').trim() || group
      continue
    }
    if (!body) continue
    const t = tokenize(body)
    if (t.length < 20 || Number.isNaN(Number(t[0]))) continue
    const monster = { group, source: sourceFor(file, i + 1, raw) }
    columns.forEach((column, index) => {
      monster[column] = column === 'name' ? t[index] : toNumber(t[index])
    })
    rows.push(monster)
  }
  return rows
}

function parseMonsterSpawns(file) {
  const lines = readText(file).split('\n')
  const rows = []
  let scriptType = null
  let group = null
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const { body, comment } = splitComment(raw)
    if (!body && comment && !comment.includes('====') && !comment.includes('Monster')) {
      group = comment.trim() || group
      continue
    }
    if (!body) continue
    if (/^end$/i.test(body)) {
      scriptType = null
      continue
    }
    if (isSectionLine(body)) {
      scriptType = Number(body)
      continue
    }
    const t = tokenize(body)
    if (t.length < 6 || Number.isNaN(Number(t[0]))) continue
    rows.push({
      scriptType,
      group,
      monsterIndex: toNumber(t[0]),
      mapNumber: toNumber(t[1]),
      mapName: mapNames[Number(t[1])] ?? `Map ${t[1]}`,
      range: toNumber(t[2]),
      position: {
        x: toNumber(t[3]),
        y: toNumber(t[4])
      },
      direction: toNumber(t[5]),
      comment,
      source: sourceFor(file, i + 1, raw)
    })
  }
  return rows
}

function parseCashShopProducts(file) {
  const lines = readText(file).split('\n')
  const rows = []
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const { body } = splitComment(raw)
    if (!body || /^end$/i.test(body)) continue
    const t = tokenize(body)
    if (t.length < 19 || Number.isNaN(Number(t[0]))) continue
    const itemIndex = Number(t[3])
    rows.push({
      baseIndex: toNumber(t[0]),
      mainIndex: toNumber(t[1]),
      coinValue: toNumber(t[2]),
      itemIndex,
      item: {
        section: Math.floor(itemIndex / 512),
        type: itemIndex % 512,
        code: itemIndex
      },
      level: toNumber(t[4]),
      options: {
        option1: toNumber(t[5]),
        option2: toNumber(t[6]),
        option3: toNumber(t[7]),
        newOption: toNumber(t[8]),
        setOption: toNumber(t[9]),
        harmonyOption: toNumber(t[10]),
        optionEx: toNumber(t[11]),
        sockets: [toNumber(t[12]), toNumber(t[13]), toNumber(t[14]), toNumber(t[15]), toNumber(t[16])]
      },
      quantity: toNumber(t[17]),
      durationSeconds: toNumber(t[18]),
      source: sourceFor(file, i + 1, raw)
    })
  }
  return rows
}

function parseEventItemBag(file) {
  const lines = readText(file).split('\n')
  const bag = {
    key: path.basename(file, '.txt').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name: path.basename(file, '.txt'),
    config: null,
    itemGroups: [],
    setItems: [],
    rawSections: {},
    sourceFile: normalizeSlashes(path.relative(sourceRoot, file))
  }
  let section = null
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const { body } = splitComment(raw)
    if (!body) continue
    if (/^end$/i.test(body)) {
      section = null
      continue
    }
    if (isSectionLine(body)) {
      section = Number(body)
      if (!bag.rawSections[section]) bag.rawSections[section] = []
      continue
    }
    const t = tokenize(body)
    if (!t.length) continue
    const record = { tokens: t.map(toNumber), source: sourceFor(file, i + 1, raw) }
    bag.rawSections[section ?? 'none'] ??= []
    bag.rawSections[section ?? 'none'].push(record)

    if (section === 0 && t.length >= 7) {
      bag.config = {
        eventName: t[0],
        dropZen: toNumber(t[1]),
        itemDropRate: toNumber(t[2]),
        itemDropCount: toNumber(t[3]),
        setItemDropRate: toNumber(t[4]),
        itemDropType: toNumber(t[5]),
        fireworks: toNumber(t[6]),
        source: record.source
      }
    }
    if (section === 1 && t.length >= 8) {
      bag.itemGroups.push({
        section: toNumber(t[0]),
        type: toNumber(t[1]),
        minLevel: toNumber(t[2]),
        maxLevel: toNumber(t[3]),
        skill: toNumber(t[4]),
        luck: toNumber(t[5]),
        option: toNumber(t[6]),
        excellent: toNumber(t[7]),
        source: record.source
      })
    }
    if (section === 2 && t.length >= 2) {
      bag.setItems.push({
        index: toNumber(t[0]),
        level: toNumber(t[1]),
        source: record.source
      })
    }
  }
  return bag
}

function buildInventory() {
  const files = walkFiles(sourceRoot)
  return files.map((file) => {
    const stats = statSync(file)
    const entry = {
      path: normalizeSlashes(path.relative(sourceRoot, file)),
      bytes: stats.size,
      extension: path.extname(file).toLowerCase() || null,
      modifiedAt: stats.mtime.toISOString(),
    }
    try {
      const buffer = readFileSync(file)
      entry.sha256 = sha256(buffer)
    } catch (error) {
      entry.sha256 = null
      entry.readError = error instanceof Error ? error.message : String(error)
    }
    return entry
  })
}

function classifyFile(inventoryEntry) {
  const filePath = inventoryEntry.path.toLowerCase()
  const groups = []
  if (filePath.includes('/cashshop/')) groups.push('shop')
  if (filePath.includes('/eventitembag/')) groups.push('drops', 'events')
  if (filePath.includes('/data/event/')) groups.push('events')
  if (filePath.includes('/monster')) groups.push('monsters', 'maps-spots')
  if (filePath.includes('movere') || filePath.includes('gate') || filePath.includes('minimap')) groups.push('maps-spots')
  if (filePath.includes('skill')) groups.push('characters', 'skills')
  if (filePath.includes('item')) groups.push('equipment', 'shop')
  if (filePath.includes('/custom/')) groups.push('server-custom')
  if (filePath.includes('reset') || filePath.includes('masterreset')) groups.push('resets')
  if (filePath.includes('ranking')) groups.push('rankings')
  if (filePath.includes('quest')) groups.push('quests')
  if (filePath.includes('npc') || filePath.includes('bot')) groups.push('npcs')
  if (filePath.includes('jewel')) groups.push('jewels')
  if (filePath.includes('wing')) groups.push('wings')
  if (filePath.endsWith('.ini') || filePath.endsWith('.dat')) groups.push('server-config')
  return [...new Set(groups.length ? groups : ['unclassified'])]
}

function buildCmsModules(inventory, summary, counts) {
  const modules = [
    {
      key: 'wiki',
      name: 'Wiki e base de conhecimento',
      purpose: 'Publicar personagens, equipamentos, mapas, monstros, eventos, quests e tutoriais.',
      generatedData: ['items.json', 'skills.json', 'monsters.json', 'maps-summary.json', 'event-item-bags.json'],
      adminFeatures: ['revisar importacao', 'editar textos publicos', 'vincular imagens', 'publicar/ocultar topicos']
    },
    {
      key: 'equipment',
      name: 'Equipamentos',
      purpose: 'Controlar itens, sets, asas, joias, options e relacoes por personagem/classe.',
      generatedData: ['items.json'],
      adminFeatures: ['editar item', 'agrupar em set', 'marcar lacuna de imagem', 'comparar com referencias externas']
    },
    {
      key: 'characters',
      name: 'Personagens e skills',
      purpose: 'Usar classes, skills e requisitos reais do servidor.',
      generatedData: ['skills.json'],
      adminFeatures: ['editar perfil do personagem', 'organizar skills', 'definir temporada visivel']
    },
    {
      key: 'maps-spots',
      name: 'Mapas, spots e NPCs',
      purpose: 'Renderizar mapas, spawns, spots de up, NPCs e monstros por mapa.',
      generatedData: ['monster-spawns.json', 'maps-summary.json', 'monsters.json'],
      adminFeatures: ['editar descricao do mapa', 'destacar spots', 'separar NPC de monstro', 'marcar boss/evento']
    },
    {
      key: 'drops-events',
      name: 'Drops e eventos',
      purpose: 'Aproveitar event bags, eventos padrao e drops customizados.',
      generatedData: ['event-item-bags.json'],
      adminFeatures: ['editar bag', 'explicar evento', 'vincular monstros', 'publicar tabela de drop']
    },
    {
      key: 'shop',
      name: 'Loja e Cash Shop',
      purpose: 'Usar produtos reais do CashShopProduct e depois permitir loja custom do CMS.',
      generatedData: ['cash-shop-products.json'],
      adminFeatures: ['editar produto', 'preco', 'duracao', 'quantidade', 'status', 'entrega segura']
    },
    {
      key: 'server-custom',
      name: 'Custom do servidor',
      purpose: 'Catalogar configs custom como reset, quests, jewels, wings, eventos e sistemas proprios.',
      generatedData: ['inventory.json'],
      adminFeatures: ['abrir arquivo fonte', 'converter para formulario', 'validar antes de aplicar']
    },
    {
      key: 'game-bridge',
      name: 'Ponte com servidor do jogo',
      purpose: 'Aplicar mudancas sensiveis via API/worker com auditoria, transacao e rollback.',
      generatedData: [],
      adminFeatures: ['fila de jobs', 'tentativas', 'rollback', 'logs', 'permissoes']
    }
  ]

  const filesByGroup = {}
  for (const file of inventory) {
    for (const group of classifyFile(file)) {
      filesByGroup[group] ??= []
      filesByGroup[group].push(file)
    }
  }

  return {
    generatedAt: summary.generatedAt,
    totals: counts,
    modules: modules.map((module) => ({
      ...module,
      sourceGroups: Object.entries(filesByGroup)
        .filter(([group]) => {
          if (module.key === 'wiki') return ['equipment', 'characters', 'skills', 'maps-spots', 'monsters', 'drops', 'events', 'quests', 'npcs'].includes(group)
          if (module.key === 'drops-events') return ['drops', 'events'].includes(group)
          if (module.key === 'characters') return ['characters', 'skills'].includes(group)
          return group === module.key
        })
        .map(([group, files]) => ({
          group,
          files: files.length,
          examples: files.slice(0, 12).map((file) => file.path)
        }))
    })),
    filesByGroup: Object.fromEntries(
      Object.entries(filesByGroup)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, files]) => [
          group,
          {
            count: files.length,
            files: files.map((file) => ({
              path: file.path,
              bytes: file.bytes,
              sha256: file.sha256,
              readError: file.readError ?? undefined
            }))
          }
        ])
    )
  }
}

function readIfExists(relativePath) {
  const fullPath = path.join(sourceRoot, ...relativePath.split('/'))
  return existsSync(fullPath) ? fullPath : null
}

function main() {
  extractBackupIfNeeded()
  if (!existsSync(sourceRoot)) {
    throw new Error(`Extracted source root not found: ${sourceRoot}`)
  }
  if (existsSync(outputRoot)) rmSync(outputRoot, { recursive: true, force: true })
  ensureDir(outputRoot)

  const inventory = buildInventory()
  const itemFile = readIfExists('Item_por.txt')
  const skillFile = readIfExists('Skill_por.txt')
  const monsterFile = readIfExists('Data/Monster/Monster.txt') ?? readIfExists('Backup/Monster.txt')
  const monsterSetFile = readIfExists('Data/Monster/MonsterSetBase.txt') ?? readIfExists('Backup/MonsterSetBase.txt')
  const cashShopFile = readIfExists('Data/CashShop/CashShopProduct.txt')
  const eventBagRoot = path.join(sourceRoot, 'Data', 'EventItemBag')

  const items = itemFile ? parseItems(itemFile) : []
  const itemByCode = new Map(items.map((item) => [item.code, item]))
  const skills = skillFile ? parseSkills(skillFile) : []
  const monsters = monsterFile ? parseMonsters(monsterFile) : []
  const monsterByIndex = new Map(monsters.map((monster) => [monster.index, monster]))
  const monsterSpawns = monsterSetFile ? parseMonsterSpawns(monsterSetFile).map((spawn) => ({
    ...spawn,
    monsterName: monsterByIndex.get(spawn.monsterIndex)?.name ?? null
  })) : []
  const cashShopProducts = cashShopFile ? parseCashShopProducts(cashShopFile).map((product) => ({
    ...product,
    itemName: itemByCode.get(product.item.code)?.name ?? null
  })) : []
  const eventItemBags = existsSync(eventBagRoot)
    ? readdirSync(eventBagRoot)
      .filter((file) => file.toLowerCase().endsWith('.txt'))
      .sort((a, b) => a.localeCompare(b, 'en'))
      .map((file) => parseEventItemBag(path.join(eventBagRoot, file)))
      .map((bag) => ({
        ...bag,
        itemGroups: bag.itemGroups.map((drop) => ({
          ...drop,
          itemCode: Number(drop.section) * 512 + Number(drop.type),
          itemName: itemByCode.get(Number(drop.section) * 512 + Number(drop.type))?.name ?? null
        }))
      }))
    : []

  const mapSummary = {}
  for (const spawn of monsterSpawns) {
    mapSummary[spawn.mapName] ??= {
      mapNumber: spawn.mapNumber,
      mapName: spawn.mapName,
      npcCount: 0,
      spotCount: 0,
      monsterCount: 0,
      monsters: {}
    }
    if (spawn.scriptType === 0) mapSummary[spawn.mapName].npcCount += 1
    if (spawn.scriptType === 1) mapSummary[spawn.mapName].spotCount += 1
    if (spawn.scriptType !== 0) mapSummary[spawn.mapName].monsterCount += 1
    if (spawn.monsterName) {
      mapSummary[spawn.mapName].monsters[spawn.monsterName] = (mapSummary[spawn.mapName].monsters[spawn.monsterName] ?? 0) + 1
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    backupDir,
    zipPath,
    sourceRoot,
    totals: {
      files: inventory.length,
      items: items.length,
      skills: skills.length,
      monsters: monsters.length,
      monsterSpawns: monsterSpawns.length,
      cashShopProducts: cashShopProducts.length,
      eventItemBags: eventItemBags.length
    },
    keyFiles: {
      itemFile: itemFile ? normalizeSlashes(path.relative(sourceRoot, itemFile)) : null,
      skillFile: skillFile ? normalizeSlashes(path.relative(sourceRoot, skillFile)) : null,
      monsterFile: monsterFile ? normalizeSlashes(path.relative(sourceRoot, monsterFile)) : null,
      monsterSetFile: monsterSetFile ? normalizeSlashes(path.relative(sourceRoot, monsterSetFile)) : null,
      cashShopFile: cashShopFile ? normalizeSlashes(path.relative(sourceRoot, cashShopFile)) : null,
      eventBagRoot: existsSync(eventBagRoot) ? normalizeSlashes(path.relative(sourceRoot, eventBagRoot)) : null
    },
    mapSummary: Object.values(mapSummary).map((map) => ({
      ...map,
      monsters: Object.entries(map.monsters)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    }))
  }

  const cmsModules = buildCmsModules(inventory, summary, summary.totals)

  writeJson('inventory.json', inventory)
  writeJson('items.json', items)
  writeJson('skills.json', skills)
  writeJson('monsters.json', monsters)
  writeJson('monster-spawns.json', monsterSpawns)
  writeJson('maps-summary.json', summary.mapSummary)
  writeJson('cash-shop-products.json', cashShopProducts)
  writeJson('event-item-bags.json', eventItemBags)
  writeJson('cms-modules.json', cmsModules)
  writeJson('summary.json', summary)
  writeReadme(summary)

  console.log(JSON.stringify(summary.totals, null, 2))
  console.log(`Export written to ${outputRoot}`)
}

main()
