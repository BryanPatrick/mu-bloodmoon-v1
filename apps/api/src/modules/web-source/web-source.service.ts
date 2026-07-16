import { Injectable, NotFoundException } from '@nestjs/common'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type {
  WebSourceCatalog,
  WebSourceFileRow,
  WebSourceMigrationGroup,
  WebSourceNormalizedCatalog
} from './web-source.types'

function resolveRepoFile(...segments: string[]) {
  const candidates = [
    path.resolve(process.cwd(), ...segments),
    path.resolve(process.cwd(), '..', '..', ...segments)
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

const catalogPath = resolveRepoFile('references', 'web-source-current', 'catalog.json')
const normalizedPath = resolveRepoFile('references', 'web-source-current', 'normalized-domains.json')

const migrationGroups: WebSourceMigrationGroup[] = [
  {
    key: 'admin-control',
    title: 'Painel administrativo',
    priority: 'high',
    description: 'Recriar no NestJS as funcoes do AdminCP antigo com permissao, auditoria e validacao.',
    sourceAreas: ['controller.admincp.php', 'model.admin.php', 'assets/admincp'],
    targetModules: ['admin-dashboard', 'admin-content', 'accounts', 'characters', 'audit'],
    items: [
      { label: 'Gerenciar contas', source: 'model.account.php + model.admin.php', target: 'accounts/admin', status: 'ready-to-map' },
      { label: 'Gerenciar personagens', source: 'model.character.php + controller.admincp.php', target: 'characters/admin', status: 'ready-to-map' },
      { label: 'Editor de warehouse', source: 'model.warehouse.php', target: 'game-integration/warehouse', status: 'needs-review' },
      { label: 'Editor de creditos/moedas', source: 'controller.admincp.php', target: 'finance/recharge/admin', status: 'needs-review' },
      { label: 'Logs administrativos', source: 'controller.admincp.php + plugins cashshop_log', target: 'audit', status: 'ready-to-map' }
    ]
  },
  {
    key: 'item-database',
    title: 'Itens, tooltips e imagens',
    priority: 'high',
    description: 'Consolidar dados e imagens da base atual com a nossa Wiki/API.',
    sourceAreas: ['application/data/ServerData/en', 'assets/item_images'],
    targetModules: ['wiki/equipment', 'admin-content/equipment', 'shop/catalog'],
    items: [
      { label: 'Item.xml e ItemList.xml', source: 'ServerData/en', target: 'equipment database', status: 'ready-to-map' },
      { label: 'Tooltips e textos de item', source: 'ItemTooltip.csv + ItemTooltipText.csv', target: 'wiki item details', status: 'ready-to-map' },
      { label: 'Excellent options', source: 'ExcellentCommonOption.txt + ItemOptionSystem_Exc.xml', target: 'tutorials/excellent + equipment options', status: 'ready-to-map' },
      { label: 'Ancient/set options', source: 'ItemSetOption.xml + ItemSetType.xml', target: 'tutorials/ancient + set effects', status: 'ready-to-map' },
      { label: 'Socket e harmony', source: 'SocketItem.txt + JewelOfHarmonyOption.txt', target: 'tutorials/socket/harmony', status: 'ready-to-map' },
      { label: 'Imagens de itens', source: 'assets/item_images', target: 'reference assets + public previews', status: 'ready-to-map' }
    ]
  },
  {
    key: 'commerce',
    title: 'Loja, marketplace e recompensas',
    priority: 'high',
    description: 'Recriar fluxos economicos com transacao, idempotencia e auditoria.',
    sourceAreas: ['controller.shop.php', 'model.shop.php', 'controller.market.php', 'plugins'],
    targetModules: ['shop', 'marketplace', 'recharge', 'game-bridge'],
    items: [
      { label: 'Shop legado', source: 'controller.shop.php + model.shop.php', target: 'shop/admin + shop/public', status: 'needs-review' },
      { label: 'Market de personagem/item', source: 'controller.market.php + character_market', target: 'marketplace', status: 'needs-review' },
      { label: 'Gift code', source: 'plugins/gift_code', target: 'commerce/promotions', status: 'future' },
      { label: 'Battle pass', source: 'plugins/battle_pass', target: 'commerce/season-pass', status: 'future' },
      { label: 'Wheel of fortune', source: 'plugins/wheel_of_fortune', target: 'commerce/events', status: 'future' }
    ]
  },
  {
    key: 'payments',
    title: 'Pagamentos e recargas',
    priority: 'medium',
    description: 'Usar provedores antigos como referencia, mas implementar webhooks novos e seguros.',
    sourceAreas: ['mercadopago', 'stripe', 'paghiper', 'binance', 'coinbase', 'gerencianet'],
    targetModules: ['recharge', 'finance', 'audit'],
    items: [
      { label: 'Mercado Pago', source: 'plugins/mercadopago', target: 'recharge/providers/mercadopago', status: 'needs-review' },
      { label: 'Stripe', source: 'plugins/stripe', target: 'recharge/providers/stripe', status: 'future' },
      { label: 'PagHiper', source: 'plugins/paghiper', target: 'recharge/providers/paghiper', status: 'future' },
      { label: 'Crypto providers', source: 'plugins/binance + coinbase', target: 'recharge/providers/crypto', status: 'future' }
    ]
  },
  {
    key: 'public-content',
    title: 'Conteudo publico e CMS',
    priority: 'medium',
    description: 'Migrar conteudos publicos para CMS editavel e reaproveitavel em outros servidores.',
    sourceAreas: ['controllers home/news/guides/downloads/rankings', 'application/views'],
    targetModules: ['admin-content', 'wiki', 'news', 'downloads', 'rankings'],
    items: [
      { label: 'Noticias e banners', source: 'controller.home.php + config/news', target: 'admin-content/news', status: 'ready-to-map' },
      { label: 'Guias antigos', source: 'controller.guides.php + views', target: 'wiki/tutorials', status: 'ready-to-map' },
      { label: 'Downloads', source: 'controller.downloads.php', target: 'downloads', status: 'ready-to-map' },
      { label: 'Rankings', source: 'controller.rankings.php + model.rankings.php', target: 'rankings/api', status: 'needs-review' }
    ]
  }
]

function byName(rows: WebSourceFileRow[]) {
  return rows.slice().sort((a, b) => a.name.localeCompare(b.name))
}

@Injectable()
export class WebSourceService {
  private catalogCache: WebSourceCatalog | null = null

  private catalog() {
    if (this.catalogCache) {
      return this.catalogCache
    }

    if (!existsSync(catalogPath)) {
      throw new NotFoundException(`Web source catalog not found at ${catalogPath}. Run npm run web-source:catalog first.`)
    }

    this.catalogCache = JSON.parse(readFileSync(catalogPath, 'utf8')) as WebSourceCatalog
    return this.catalogCache
  }

  summary() {
    const catalog = this.catalog()
    const highPriority = migrationGroups.filter((group) => group.priority === 'high').length
    const migrationItems = migrationGroups.flatMap((group) => group.items)

    return {
      generatedAt: catalog.generatedAt,
      cms: catalog.cms,
      totals: catalog.totals,
      sections: {
        controllers: catalog.controllers.length,
        models: catalog.models.length,
        plugins: catalog.plugins.length,
        serverData: catalog.serverData.length,
        itemImageGroups: catalog.itemImageGroups.length,
        configFiles: catalog.configFiles.length
      },
      migration: {
        groups: migrationGroups.length,
        highPriority,
        items: migrationItems.length,
        readyToMap: migrationItems.filter((item) => item.status === 'ready-to-map').length,
        needsReview: migrationItems.filter((item) => item.status === 'needs-review').length,
        future: migrationItems.filter((item) => item.status === 'future').length
      },
      warning: catalog.warning
    }
  }

  controllers() {
    return byName(this.catalog().controllers)
  }

  models() {
    return byName(this.catalog().models)
  }

  plugins() {
    return byName(this.catalog().plugins)
  }

  serverData() {
    return byName(this.catalog().serverData)
  }

  itemImageGroups() {
    return this.catalog().itemImageGroups
      .slice()
      .sort((a, b) => Number(a.name) - Number(b.name))
  }

  reusePlan() {
    return this.catalog().reusePlan
  }

  migrationBoard() {
    return migrationGroups
  }

  normalizedDomains() {
    if (!existsSync(normalizedPath)) {
      throw new NotFoundException(`Normalized web source domains not found at ${normalizedPath}. Run npm run web-source:normalize first.`)
    }

    return JSON.parse(readFileSync(normalizedPath, 'utf8')) as WebSourceNormalizedCatalog
  }
}
