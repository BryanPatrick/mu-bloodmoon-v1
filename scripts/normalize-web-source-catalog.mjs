import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const catalogPath = path.resolve('references/web-source-current/catalog.json')
const outputPath = path.resolve('references/web-source-current/normalized-domains.json')

if (!existsSync(catalogPath)) {
  throw new Error('Catalog not found. Run npm run web-source:catalog first.')
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))

const includesAny = (value, words) => {
  const normalized = value.toLowerCase()
  return words.some(word => normalized.includes(word))
}

const entity = (row, target, priority = 'medium', status = 'ready-to-map') => ({
  name: row.name,
  source: row.source || row.name,
  target,
  priority,
  status
})

const controllers = catalog.controllers || []
const models = catalog.models || []
const plugins = catalog.plugins || []
const serverData = catalog.serverData || []
const itemImageGroups = catalog.itemImageGroups || []
const configFiles = catalog.configFiles || []

const domains = [
  {
    key: 'admin-control',
    title: 'Administracao e seguranca',
    description: 'Tudo que vira painel administrativo, permissao, auditoria e operacao do servidor.',
    entities: [
      ...controllers.filter(row => includesAny(row.name, ['admin', 'account', 'character'])).map(row => entity(row, 'apps/api/admin + apps/web/painel/admin', 'high')),
      ...models.filter(row => includesAny(row.name, ['admin', 'account', 'character', 'warehouse'])).map(row => entity(row, 'apps/api/modules/accounts|characters|audit', 'high')),
      ...configFiles.map(row => entity(row, 'apps/api/config safe env mapping', 'high', 'needs-review'))
    ]
  },
  {
    key: 'knowledge-base',
    title: 'Wiki, tutoriais e conteudo publico',
    description: 'Conteudo que alimenta Wiki, guias, noticias, downloads, rankings e paginas publicas.',
    entities: [
      ...controllers.filter(row => includesAny(row.name, ['guide', 'news', 'home', 'download', 'ranking'])).map(row => entity(row, 'apps/api/modules/wiki|admin-content|rankings', 'medium')),
      ...models.filter(row => includesAny(row.name, ['ranking', 'news', 'download', 'guide'])).map(row => entity(row, 'apps/api/modules/wiki|admin-content|rankings', 'medium'))
    ]
  },
  {
    key: 'equipment-database',
    title: 'Itens, equipamentos e tooltips',
    description: 'Dados de itens, opcoes, sets, imagens e material para a Wiki e loja.',
    entities: [
      ...serverData.map(row => entity(row, 'references/game-data + wiki/equipment', 'high')),
      ...itemImageGroups.map(row => entity(row, 'assets/equipment-previews', 'high')),
      ...models.filter(row => includesAny(row.name, ['item', 'shop', 'warehouse'])).map(row => entity(row, 'apps/api/modules/wiki|commerce|game-bridge', 'high'))
    ]
  },
  {
    key: 'commerce',
    title: 'Loja, marketplace e economia',
    description: 'Fluxos de loja, venda jogador para jogador, moedas, bau e entrega de itens.',
    entities: [
      ...controllers.filter(row => includesAny(row.name, ['shop', 'market', 'warehouse', 'credit', 'donat'])).map(row => entity(row, 'apps/api/modules/commerce|marketplace|game-bridge', 'high', 'needs-review')),
      ...models.filter(row => includesAny(row.name, ['shop', 'market', 'warehouse', 'credit', 'donat'])).map(row => entity(row, 'apps/api/modules/commerce|marketplace|game-bridge', 'high', 'needs-review')),
      ...plugins.filter(row => includesAny(row.name, ['gift', 'battle', 'wheel', 'cash', 'shop'])).map(row => entity(row, 'apps/api/modules/commerce extensions', 'medium', 'future'))
    ]
  },
  {
    key: 'payments',
    title: 'Pagamentos e recargas',
    description: 'Provedores de pagamento, webhooks, recargas e conciliacao financeira.',
    entities: [
      ...plugins.filter(row => includesAny(row.name, ['mercado', 'stripe', 'pag', 'pix', 'coin', 'binance', 'payment', 'donat'])).map(row => entity(row, 'apps/api/modules/commerce/recharge providers', 'high', 'needs-review'))
    ]
  }
].map(domain => ({
  ...domain,
  entities: domain.entities.sort((a, b) => a.name.localeCompare(b.name))
}))

const normalized = {
  generatedAt: new Date().toISOString(),
  domains
}

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(normalized, null, 2)}\n`)
console.log(`Wrote ${outputPath}`)
