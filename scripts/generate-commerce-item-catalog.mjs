import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const outputDirectory = path.join(root, 'docs', 'catalogs')
const itemsPath = path.join(root, 'references', 'game-data', 'muserver-export', 'items.json')
const cashShopPath = path.join(root, 'references', 'game-data', 'muserver-export', 'cash-shop-products.json')

const items = JSON.parse(await readFile(itemsPath, 'utf8'))
const cashShopProducts = JSON.parse(await readFile(cashShopPath, 'utf8'))

const classLabels = {
  darkWizard: 'Dark Wizard',
  darkKnight: 'Dark Knight',
  fairyElf: 'Fairy Elf',
  magicGladiator: 'Magic Gladiator',
  darkLord: 'Dark Lord',
  summoner: 'Summoner',
  rageFighter: 'Rage Fighter'
}

const sectionLabels = {
  Swords: 'Espadas',
  Axes: 'Machados',
  'Maces/Scepters': 'Maças e cetros',
  Spears: 'Lanças',
  'Bows/Crossbows': 'Arcos e bestas',
  Staffs: 'Cajados',
  Shields: 'Escudos',
  Helms: 'Elmos',
  Armors: 'Armaduras',
  Pants: 'Calças',
  Gloves: 'Luvas',
  Boots: 'Botas',
  'Wings/Orbs/Pets': 'Asas, orbes e pets',
  'Misc/Consumables': 'Joias, consumíveis e itens diversos'
}

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`

function permittedClasses(item) {
  const headers = item.valuesByHeader ?? {}
  const classColumns = {
    darkWizard: 'DW/SM',
    darkKnight: 'DK/BK',
    fairyElf: 'ELF/ME',
    magicGladiator: 'MG',
    darkLord: 'DL',
    summoner: 'SUM',
    rageFighter: 'RF'
  }

  return Object.entries(classColumns)
    .filter(([, column]) => Number(headers[column]) > 0)
    .map(([key, column]) => ({
      name: classLabels[key] ?? key,
      progression: Number(headers[column])
    }))
}

function progressionLabel(value) {
  if (value <= 1) return 'classe inicial'
  if (value === 2) return 'segunda classe'
  return 'terceira classe ou superior'
}

function itemFamily(item) {
  const name = item.name.toLowerCase()

  if (item.section <= 5) return 'Arma'
  if (item.section === 6) return 'Escudo'
  if (item.section >= 7 && item.section <= 11) return 'Armadura'
  if (/(wing|wings|cape|cloak)/i.test(name) && !/talisman/i.test(name)) return 'Asa ou capa'
  if (/(pet|demon|imp|guardian angel|spirit of guardian|panda|skeleton|unicorn|fenrir|dark horse|dark raven|dinorant|uniria|rudolf)/i.test(name)) return 'Pet ou montaria'
  if (/(jewel|gemstone|moonstone|condor flame|condor feather|loch s feather|splinter|fragment|bless of guardian|claw of beast|broken horn|seed sphere|sphere)/i.test(name)) return 'Joia ou material'
  if (/(orb|scroll|book|parchment)/i.test(name) && !/(ticket|blood|archangel|party exp)/i.test(name)) return 'Skill'
  if (/(ticket|invitation|map|symbol|eye|key)/i.test(name)) return 'Entrada de evento'
  if (/(potion|elixir|apple|antidote|remedy|ale)/i.test(name)) return 'Consumível'
  if (/(seal|talisman|scroll|aura|boost)/i.test(name)) return 'Buff temporário'
  if (/(box|chest|package|bundle|bag)/i.test(name)) return 'Caixa ou pacote'
  if (/(ring|necklace|pendant|earring)/i.test(name)) return 'Acessório'
  if (item.section === 12) return 'Item especial'
  return 'Item diverso'
}

function commercePolicy(item, family) {
  const name = item.name.toLowerCase()
  const questLike = /(quest|certificate|scroll of emperor|tear of elf|broken sword|soul shard|dark stone|ring of honor)/i.test(name)
  const eventLike = /(blood castle|devil square|illusion temple|kalima|invisibility cloak|lost map)/i.test(name)
  const premiumConvenience = /(seal|talisman|aura|boost|pet panda|pet skeleton|transformation ring|reset fruit)/i.test(name)

  if (questLike) {
    return {
      officialStore: 'Não recomendado',
      marketplace: 'Bloqueado',
      reason: 'Item de progressão ou missão; vender reduz a integridade do fluxo do jogo.'
    }
  }

  if (eventLike) {
    return {
      officialStore: 'Venda limitada',
      marketplace: 'Permitido se negociável no servidor',
      reason: 'Entrada ou material de evento; convém limitar quantidade e período.'
    }
  }

  if (premiumConvenience) {
    return {
      officialStore: 'Recomendado',
      marketplace: 'Bloqueado ou limitado',
      reason: 'Produto de conveniência apropriado para monetização oficial e controle de duração.'
    }
  }

  if (family === 'Pet ou montaria') {
    return {
      officialStore: 'Venda controlada',
      marketplace: 'Permitido se negociável no servidor',
      reason: 'Pet ou montaria pode ser cosmético ou conceder bônus; duração, atributos e limite por conta precisam ser explícitos.'
    }
  }

  if (['Arma', 'Escudo', 'Armadura', 'Asa ou capa', 'Acessório'].includes(family)) {
    return {
      officialStore: 'Somente cosmético ou progressão controlada',
      marketplace: 'Recomendado',
      reason: 'Equipamento deve circular prioritariamente entre jogadores; venda direta exige limites de nível e opções.'
    }
  }

  if (family === 'Joia ou material') {
    return {
      officialStore: 'Pacotes limitados',
      marketplace: 'Recomendado',
      reason: 'Material econômico de alta liquidez; precisa de limite, preço dinâmico e proteção contra inflação.'
    }
  }

  if (family === 'Consumível' || family === 'Buff temporário') {
    return {
      officialStore: 'Recomendado',
      marketplace: 'Permitido se negociável no servidor',
      reason: 'Consumível recorrente adequado para loja, desde que não torne a progressão obrigatoriamente paga.'
    }
  }

  return {
    officialStore: 'Revisão manual',
    marketplace: 'Conforme flag de trade do servidor',
    reason: 'A função comercial não pode ser confirmada apenas pela tabela de itens.'
  }
}

function requirementsText(item) {
  const headers = item.valuesByHeader ?? {}
  const requirements = [
    ['nível', headers.ReqLvl],
    ['força', headers.ReqStr],
    ['agilidade', headers.ReqDex],
    ['energia', headers.ReqEne],
    ['vitalidade', headers.ReqVit],
    ['comando', headers.ReqLead]
  ].filter(([, value]) => Number(value) > 0)

  return requirements.length
    ? requirements.map(([label, value]) => `${label} ${value}`).join(', ')
    : 'sem requisito numérico registrado'
}

function attributesText(item, family) {
  const headers = item.valuesByHeader ?? {}
  const values = []

  if (Number(headers.DamageMin) || Number(headers.DamageMax)) {
    values.push(`dano ${headers.DamageMin ?? 0}-${headers.DamageMax ?? 0}`)
  }
  if (Number(headers.MagicPW)) values.push(`poder mágico ${headers.MagicPW}`)
  if (Number(headers.AttackSpeed)) values.push(`velocidade de ataque ${headers.AttackSpeed}`)
  if (Number(headers.Defense)) values.push(`defesa ${headers.Defense}`)
  if (Number(headers.MagicDefense)) values.push(`defesa mágica ${headers.MagicDefense}`)
  if (Number(headers.SuccessfulBlocking)) values.push(`bloqueio bem-sucedido ${headers.SuccessfulBlocking}`)
  if (Number(headers.WalkSpeed)) values.push(`velocidade de movimento ${headers.WalkSpeed}`)
  if (Number(headers.Dur)) values.push(`durabilidade ${headers.Dur}`)

  return values.length ? values.join(', ') : `atributos específicos de ${family.toLowerCase()} não registrados na exportação`
}

function buildDescription(item, family, classes) {
  const classText = classes.length
    ? classes.map(({ name, progression }) => `${name} (${progressionLabel(progression)})`).join(', ')
    : 'uso não associado a uma classe específica'

  return `${item.name} é um item da família ${family.toLowerCase()}, catalogado em ${sectionLabels[item.sectionName] ?? item.sectionName}. `
    + `A configuração atual registra ${attributesText(item, family)}. `
    + `Requisitos: ${requirementsText(item)}. `
    + `Uso permitido: ${classText}. `
    + `Ocupa ${item.size?.x ?? 1}x${item.size?.y ?? 1} espaço(s) no inventário e `
    + `${item.flags?.drop ? 'pode participar das tabelas de drop' : 'não está marcado para drop comum'}.`
}

const normalizedItems = items.map((item) => {
  const family = itemFamily(item)
  const classes = permittedClasses(item)
  const policy = commercePolicy(item, family)

  return {
    code: item.code,
    key: item.key,
    name: item.name,
    section: item.section,
    sectionName: item.sectionName,
    category: sectionLabels[item.sectionName] ?? item.sectionName,
    family,
    classes,
    level: item.valuesByHeader?.level ?? item.level,
    attributes: attributesText(item, family),
    requirements: requirementsText(item),
    description: buildDescription(item, family, classes),
    officialStore: policy.officialStore,
    marketplace: policy.marketplace,
    commerceReason: policy.reason,
    flags: item.flags,
    source: item.source
  }
})

const namedCashProducts = cashShopProducts.filter((product) => product.itemName)
const unresolvedCashProducts = cashShopProducts.filter((product) => !product.itemName)
const cashNameGroups = Object.values(namedCashProducts.reduce((groups, product) => {
  const key = product.itemName
  const current = groups[key] ?? {
    name: key,
    variants: 0,
    durations: new Set(),
    itemCodes: new Set()
  }
  current.variants += 1
  if (product.durationSeconds) current.durations.add(product.durationSeconds)
  current.itemCodes.add(product.itemIndex)
  groups[key] = current
  return groups
}, {})).map((group) => ({
  ...group,
  durations: [...group.durations],
  itemCodes: [...group.itemCodes]
})).sort((a, b) => a.name.localeCompare(b.name))

const categorySummary = Object.values(normalizedItems.reduce((groups, item) => {
  const current = groups[item.category] ?? {
    category: item.category,
    count: 0,
    officialRecommended: 0,
    marketplaceRecommended: 0
  }
  current.count += 1
  if (item.officialStore === 'Recomendado') current.officialRecommended += 1
  if (item.marketplace === 'Recomendado') current.marketplaceRecommended += 1
  groups[item.category] = current
  return groups
}, {})).sort((a, b) => a.category.localeCompare(b.category))

const markdown = [
  '# Catálogo comercial de itens Blood Moon',
  '',
  '> Gerado a partir dos arquivos reais do servidor. As recomendações comerciais são uma política inicial para roadmap e precisam ser confirmadas no servidor de testes antes da ativação.',
  '',
  '## Visão geral',
  '',
  `- Itens cadastrados no servidor: **${normalizedItems.length}**.`,
  `- Variações configuradas no Cash Shop: **${cashShopProducts.length}**.`,
  `- Produtos do Cash Shop com nome resolvido: **${namedCashProducts.length}**.`,
  `- Produtos do Cash Shop ainda sem nome resolvido: **${unresolvedCashProducts.length}**.`,
  '',
  '| Categoria | Itens | Recomendados na loja | Recomendados no marketplace |',
  '| --- | ---: | ---: | ---: |',
  ...categorySummary.map((entry) => `| ${entry.category} | ${entry.count} | ${entry.officialRecommended} | ${entry.marketplaceRecommended} |`),
  '',
  '## Política recomendada',
  '',
  '- **Loja oficial:** buffs temporários, conveniência, cosméticos, pets, montarias, ingressos de evento limitados e pacotes controlados de materiais.',
  '- **Marketplace:** equipamentos obtidos no jogo, asas, acessórios, joias e materiais negociáveis, sempre com bloqueio do item antes da publicação.',
  '- **Fora da loja:** itens de missão, itens administrativos, moedas técnicas, itens sem nome resolvido e qualquer item que permita pular progressão obrigatória.',
  '- **Venda condicionada:** equipamentos completos e itens de alto nível só devem ser ativados após definir Season, classe mínima, opções permitidas, limite por conta e política de inflação.',
  '',
  '## Produtos já configurados no Cash Shop',
  '',
  '| Produto | Variações | Códigos | Durações registradas |',
  '| --- | ---: | --- | --- |',
  ...cashNameGroups.map((entry) => `| ${entry.name} | ${entry.variants} | ${entry.itemCodes.join(', ')} | ${entry.durations.length ? entry.durations.map((seconds) => `${seconds}s`).join(', ') : 'permanente/não informado'} |`),
  '',
  `> Há **${unresolvedCashProducts.length} variações** que precisam ser cruzadas com a tabela de nomes antes de poderem aparecer na loja.`,
  '',
  '## Catálogo completo',
  '',
  ...Object.entries(normalizedItems.reduce((groups, item) => {
    ;(groups[item.category] ??= []).push(item)
    return groups
  }, {})).sort(([a], [b]) => a.localeCompare(b)).flatMap(([category, entries]) => [
    `### ${category} (${entries.length})`,
    '',
    ...entries.flatMap((item) => [
      `#### ${item.name} (${item.key})`,
      '',
      item.description,
      '',
      `- **Loja oficial:** ${item.officialStore}.`,
      `- **Marketplace:** ${item.marketplace}.`,
      `- **Motivo:** ${item.commerceReason}`,
      ''
    ])
  ])
].join('\n')

const csvHeaders = [
  'codigo',
  'chave',
  'nome',
  'categoria',
  'familia',
  'classes',
  'nivel_item',
  'atributos',
  'requisitos',
  'descricao',
  'loja_oficial',
  'marketplace',
  'motivo_comercial'
]

const csvRows = normalizedItems.map((item) => [
  item.code,
  item.key,
  item.name,
  item.category,
  item.family,
  item.classes.map(({ name, progression }) => `${name} (${progressionLabel(progression)})`).join('; '),
  item.level,
  item.attributes,
  item.requirements,
  item.description,
  item.officialStore,
  item.marketplace,
  item.commerceReason
])

await mkdir(outputDirectory, { recursive: true })
await writeFile(path.join(outputDirectory, 'commerce-item-catalog.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  totals: {
    items: normalizedItems.length,
    cashShopVariants: cashShopProducts.length,
    namedCashShopVariants: namedCashProducts.length,
    unresolvedCashShopVariants: unresolvedCashProducts.length
  },
  categorySummary,
  cashShop: {
    namedGroups: cashNameGroups,
    unresolvedProducts: unresolvedCashProducts
  },
  items: normalizedItems
}, null, 2)}\n`)
await writeFile(path.join(outputDirectory, 'commerce-item-catalog.csv'), [
  csvHeaders.map(escapeCsv).join(','),
  ...csvRows.map((row) => row.map(escapeCsv).join(','))
].join('\n'))
await writeFile(path.join(outputDirectory, 'commerce-item-catalog.md'), markdown)

console.log(`Catálogo gerado em ${outputDirectory}`)
console.log(`${normalizedItems.length} itens e ${cashShopProducts.length} variações do Cash Shop processados.`)
