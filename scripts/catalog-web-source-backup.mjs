import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const backupRoot = process.env.BLOODMOON_BACKUP_ROOT || 'C:\\Users\\Admin\\Documents\\BloodMoonBackups'
const outputDir = path.resolve('references/web-source-current')
const docsPath = path.resolve('docs/current-web-source-catalog.md')

function safeList(dir, predicate = () => true) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).filter(predicate)
}

function newestPublicHtml(root) {
  const matches = []
  const stack = [{ dir: root, depth: 0 }]

  while (stack.length) {
    const current = stack.pop()
    if (!current || current.depth > 9 || !existsSync(current.dir)) continue

    for (const entry of safeList(current.dir)) {
      const full = path.join(current.dir, entry.name)
      if (!entry.isDirectory()) continue

      if (entry.name === 'public_html') {
        matches.push({ path: full, mtimeMs: statSync(full).mtimeMs })
        continue
      }

      stack.push({ dir: full, depth: current.depth + 1 })
    }
  }

  return matches.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path || ''
}

const publicHtml = process.argv[2] || process.env.WEB_SOURCE_PUBLIC_HTML || newestPublicHtml(backupRoot)

function countTree(dir) {
  const totals = { files: 0, dirs: 0, bytes: 0 }
  if (!existsSync(dir)) return totals

  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of safeList(current)) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        totals.dirs += 1
        stack.push(full)
      } else if (entry.isFile()) {
        totals.files += 1
        totals.bytes += statSync(full).size
      }
    }
  }
  return totals
}

function fileRows(dir) {
  return safeList(dir, entry => entry.isFile())
    .map(entry => {
      const full = path.join(dir, entry.name)
      return { name: entry.name, bytes: statSync(full).size }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function dirRows(dir) {
  return safeList(dir, entry => entry.isDirectory())
    .map(entry => {
      const full = path.join(dir, entry.name)
      return { name: entry.name, ...countTree(full) }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function readJson(file) {
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function mdTable(rows, columns) {
  if (!rows.length) return '_Nada encontrado._'
  const header = `| ${columns.map(column => column.label).join(' | ')} |`
  const sep = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows
    .map(row => `| ${columns.map(column => String(row[column.key] ?? '')).join(' | ')} |`)
    .join('\n')
  return `${header}\n${sep}\n${body}`
}

if (!publicHtml || !existsSync(publicHtml)) {
  throw new Error('public_html not found. Set WEB_SOURCE_PUBLIC_HTML or BLOODMOON_BACKUP_ROOT.')
}

const composer = readJson(path.join(publicHtml, 'composer.json'))
const importantDirs = [
  'application/controllers',
  'application/models',
  'application/views',
  'application/plugins',
  'application/config',
  'application/data/ServerData/en',
  'assets/item_images',
  'assets/uploads',
  'assets/season6',
  'assets/admincp'
]

const dirSummary = importantDirs.map(rel => ({
  path: rel,
  ...countTree(path.join(publicHtml, rel))
}))

const controllers = fileRows(path.join(publicHtml, 'application/controllers'))
const models = fileRows(path.join(publicHtml, 'application/models'))
const plugins = dirRows(path.join(publicHtml, 'application/plugins'))
const serverData = fileRows(path.join(publicHtml, 'application/data/ServerData/en'))
const itemImageGroups = dirRows(path.join(publicHtml, 'assets/item_images'))
const configFiles = fileRows(path.join(publicHtml, 'application/config'))

const reusePlan = [
  {
    area: 'Dados de itens',
    source: 'application/data/ServerData/en',
    use: 'Comparar arquivos de itens, tooltips, opcoes excellent, ancient, socket e harmony com a nossa base da Wiki/API.'
  },
  {
    area: 'Imagens de itens',
    source: 'assets/item_images',
    use: 'Mapear por grupo/index para preencher previews de equipamentos, armas, asas, joias e consumiveis.'
  },
  {
    area: 'Painel atual',
    source: 'application/controllers/controller.admincp.php e application/models/model.admin.php',
    use: 'Extrair fluxo funcional e transformar em modulos seguros no NestJS, sem reaproveitar acesso direto do browser ao banco.'
  },
  {
    area: 'Loja, mercado e bau',
    source: 'controllers/models de shop, market, warehouse e plugins relacionados',
    use: 'Usar como referencia de regra de negocio para loja, marketplace, bau e transferencia, reimplementando com transacao/auditoria.'
  },
  {
    area: 'Pagamentos',
    source: 'plugins de provedores de pagamento',
    use: 'Catalogar provedores possiveis e integrar novamente com webhooks seguros no backend novo.'
  },
  {
    area: 'Configuracoes',
    source: 'application/config e application/config/xml',
    use: 'Migrar valores publicos/editoriais para CMS. Segredos ficam somente em .env fora do Git.'
  }
]

const catalog = {
  generatedAt: new Date().toISOString(),
  sourcePublicHtml: 'external-backup/public_html',
  warning: 'Catalogo sem segredos. Nao versionar arquivos de credenciais nem copias completas do sistema externo.',
  cms: {
    name: 'Sistema web atual',
    package: composer?.name ? 'catalogado' : null,
    version: composer?.version ?? null,
    php: composer?.require?.php ?? null
  },
  totals: countTree(publicHtml),
  dirSummary,
  controllers,
  models,
  plugins,
  serverData,
  itemImageGroups,
  configFiles,
  reusePlan
}

mkdirSync(outputDir, { recursive: true })
writeFileSync(path.join(outputDir, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`)

const doc = `# Catalogo da fonte web atual

Este documento mapeia a base web atual para orientar a migracao para o Blood Moon novo.

## Origem

- Raiz: backup externo local, fora do projeto.
- Identificacao: ${catalog.cms.name}
- Pacote Composer: ${catalog.cms.package ?? 'nao identificado'}
- Versao Composer: ${catalog.cms.version ?? 'nao identificado'}
- PHP requerido pelo Composer: ${catalog.cms.php ?? 'nao identificado'}
- Total extraido: ${catalog.totals.files} arquivos, ${catalog.totals.dirs} pastas.

> Seguranca: este catalogo nao inclui credenciais. Segredos devem ficar fora do Git.

## Areas principais

${mdTable(dirSummary, [
  { key: 'path', label: 'Caminho' },
  { key: 'files', label: 'Arquivos' },
  { key: 'dirs', label: 'Pastas' }
])}

## Controllers atuais

${mdTable(controllers, [
  { key: 'name', label: 'Arquivo' },
  { key: 'bytes', label: 'Bytes' }
])}

## Models atuais

${mdTable(models, [
  { key: 'name', label: 'Arquivo' },
  { key: 'bytes', label: 'Bytes' }
])}

## Modulos atuais

${mdTable(plugins, [
  { key: 'name', label: 'Modulo' },
  { key: 'files', label: 'Arquivos' },
  { key: 'dirs', label: 'Pastas' }
])}

## Dados tecnicos reaproveitaveis

${mdTable(serverData, [
  { key: 'name', label: 'Arquivo' },
  { key: 'bytes', label: 'Bytes' }
])}

## Imagens de itens

${mdTable(itemImageGroups, [
  { key: 'name', label: 'Grupo' },
  { key: 'files', label: 'Arquivos' },
  { key: 'dirs', label: 'Pastas' }
])}

## Plano de reaproveitamento

${mdTable(reusePlan, [
  { key: 'area', label: 'Area' },
  { key: 'source', label: 'Origem interna' },
  { key: 'use', label: 'Uso no sistema novo' }
])}

## Decisao arquitetural

A base atual deve ser tratada como referencia e fonte de dados/assets. O sistema novo deve manter:

- frontend Nuxt;
- backend/API com regras de negocio;
- adaptador SQL Server server-side;
- camada de permissao, auditoria e validacao;
- nenhum acesso direto do navegador ao banco do jogo.
`

writeFileSync(docsPath, doc)
console.log(`Wrote ${path.join(outputDir, 'catalog.json')}`)
console.log(`Wrote ${docsPath}`)
