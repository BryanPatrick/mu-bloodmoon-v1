import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const deployRoot = path.join(root, 'work', 'deploy', 'cpanel')
const stageRoot = path.join(deployRoot, 'stage')
const webStage = path.join(stageRoot, 'bloodmoon-web')
const apiStage = path.join(stageRoot, 'bloodmoon-api')

async function pathExists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function copyIfExists(from, to) {
  if (await pathExists(from)) {
    await mkdir(path.dirname(to), { recursive: true })
    await cp(from, to, { recursive: true })
  }
}

async function patchNuxtServerForCpanel(outputDir) {
  const chunksDir = path.join(outputDir, 'server', 'chunks')
  const files = []

  async function collectFiles(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await collectFiles(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
        files.push(fullPath)
      }
    }
  }

  await collectFiles(chunksDir)

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8')
    const patched = source.replace(/tailwindcss\/colors(?!\.js)/g, 'tailwindcss/colors.js')
    if (patched !== source) {
      await writeFile(filePath, patched)
    }
  }
}

function tarGzipDirectory(sourceDir, targetFile) {
  const result = spawnSync('tar', ['-czf', targetFile, '-C', sourceDir, '.'], { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`tar.gz failed for ${sourceDir}`)
  }
}

async function main() {
  const webOutput = path.join(root, 'apps', 'web', '.output')
  const apiDist = path.join(root, 'apps', 'api', 'dist')

  if (!existsSync(webOutput)) {
    throw new Error('apps/web/.output not found. Run npm run web:build first.')
  }

  if (!existsSync(apiDist)) {
    throw new Error('apps/api/dist not found. Run npm run api:build first.')
  }

  await rm(deployRoot, { recursive: true, force: true })
  await mkdir(webStage, { recursive: true })
  await mkdir(apiStage, { recursive: true })

  await cp(webOutput, path.join(webStage, '.output'), { recursive: true })
  // Binaries are uploaded independently so routine web deploys stay small.
  await rm(
    path.join(webStage, '.output', 'public', 'downloads', 'BloodMoonLauncher.zip'),
    { force: true }
  )
  await patchNuxtServerForCpanel(path.join(webStage, '.output'))
  const webServerPackage = JSON.parse(
    await readFile(path.join(webOutput, 'server', 'package.json'), 'utf8')
  )
  await writeFile(
    path.join(webStage, 'package.json'),
    `${JSON.stringify(
      {
        name: 'bloodmoon-web-cpanel',
        private: true,
        type: 'module',
        engines: { node: '22.17.0' },
        scripts: {
          start: 'node .output/server/index.mjs'
        },
        dependencies: webServerPackage.dependencies ?? {}
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    path.join(webStage, 'README-cpanel.md'),
    [
      '# Blood Moon Web - cPanel',
      '',
      'Node.js: selecione 22.17.0.',
      'Raiz do aplicativo: pasta extraida deste pacote.',
      'Arquivo de inicializacao: .output/server/index.mjs',
      '',
      'Variaveis:',
      '- NODE_ENV=production',
      '- NUXT_PUBLIC_API_BASE=https://api.mubloodmoon.com.br/api',
      ''
    ].join('\n')
  )

  const apiPackage = JSON.parse(
    await readFile(path.join(root, 'apps', 'api', 'package.json'), 'utf8')
  )
  const apiDeployPackage = {
    name: 'bloodmoon-api-cpanel',
    private: true,
    type: 'commonjs',
    engines: { node: '22.17.0' },
    scripts: {
      start: 'node server.js'
    },
    dependencies: {
      ...apiPackage.dependencies,
      prisma: apiPackage.devDependencies.prisma
    }
  }

  await cp(apiDist, path.join(apiStage, 'dist'), { recursive: true })
  await cp(path.join(root, 'apps', 'api', 'prisma'), path.join(apiStage, 'prisma'), { recursive: true })
  await copyIfExists(
    path.join(root, 'apps', 'api', 'scripts', 'import-prepared-data.mjs'),
    path.join(apiStage, 'apps', 'api', 'scripts', 'import-prepared-data.mjs')
  )
  await copyIfExists(path.join(root, 'references', 'web-source-current'), path.join(apiStage, 'references', 'web-source-current'))
  await copyIfExists(path.join(root, 'references', 'game-data', 'muserver-export'), path.join(apiStage, 'references', 'game-data', 'muserver-export'))
  await copyIfExists(path.join(root, 'references', 'game-data', 'source-harvest'), path.join(apiStage, 'references', 'game-data', 'source-harvest'))
  await copyIfExists(path.join(root, 'references', 'game-data', 'equipment-postgres-import-plan.json'), path.join(apiStage, 'references', 'game-data', 'equipment-postgres-import-plan.json'))
  await copyIfExists(path.join(root, 'references', 'game-data', 'equipment-remap-audit.md'), path.join(apiStage, 'references', 'game-data', 'equipment-remap-audit.md'))
  await writeFile(path.join(apiStage, 'package.json'), `${JSON.stringify(apiDeployPackage, null, 2)}\n`)
  await writeFile(
    path.join(apiStage, 'server.js'),
    [
      "const { spawnSync } = require('node:child_process')",
      "const { existsSync, rmSync } = require('node:fs')",
      "const path = require('node:path')",
      "const appRoot = __dirname",
      "const prismaCli = require.resolve('prisma/build/index.js')",
      "const schema = path.join(appRoot, 'prisma', 'schema.prisma')",
      "const runPrisma = (args, options = {}) => spawnSync(process.execPath, [prismaCli, ...args, '--schema', schema], { cwd: appRoot, encoding: 'utf8', ...options })",
      "const assertPrisma = (result, action) => {",
      "  if (result.status === 0) return",
      "  const output = `${result.stdout || ''}\\n${result.stderr || ''}`.trim()",
      "  throw new Error(`Prisma failed during ${action} with status ${result.status}${output ? `\\n${output}` : ''}`)",
      "}",
      "if (process.env.PRISMA_GENERATE_ON_START === '1') {",
      "  assertPrisma(runPrisma(['generate']), 'client generation')",
      "}",
      "let migration = runPrisma(['migrate', 'deploy'])",
      "const migrationOutput = `${migration.stdout || ''}\\n${migration.stderr || ''}`",
      "if (migration.status !== 0 && migrationOutput.includes('P3005')) {",
      "  const legacyMigrations = [",
      "    '20260718130000_mysql_baseline',",
      "    '20260718150000_single_session'",
      "  ]",
      "  console.warn('Existing production schema detected; recording its migration baseline.')",
      "  for (const name of legacyMigrations) assertPrisma(runPrisma(['migrate', 'resolve', '--applied', name]), `baseline ${name}`)",
      "  migration = runPrisma(['migrate', 'deploy'])",
      "}",
      "const obsoleteMigrations = [",
      "  '20260630195500_knowledge_base',",
      "  '20260701123000_equipment_relations',",
      "  '20260701124500_equipment_target_class',",
      "  '20260702110000_shop_recharge_management',",
      "  '20260702113000_account_characters',",
      "  '20260702123000_marketplace_game_bridge'",
      "]",
      "const retryOutput = `${migration.stdout || ''}\\n${migration.stderr || ''}`",
      "if (migration.status !== 0 && retryOutput.includes('P3009')) {",
      "  assertPrisma(runPrisma(['migrate', 'resolve', '--rolled-back', obsoleteMigrations[0]]), 'legacy migration rollback')",
      "  for (const name of obsoleteMigrations) {",
      "    const migrationDir = path.join(appRoot, 'prisma', 'migrations', name)",
      "    if (existsSync(migrationDir)) rmSync(migrationDir, { recursive: true, force: true })",
      "  }",
      "  migration = runPrisma(['migrate', 'deploy'])",
      "}",
      "assertPrisma(migration, 'migration deployment')",
      "require('./dist/apps/api/src/main.js')",
      ''
    ].join('\n')
  )
  await writeFile(
    path.join(apiStage, 'README-cpanel.md'),
    [
      '# Blood Moon API - cPanel',
      '',
      'Node.js: selecione 22.17.0.',
      'Raiz do aplicativo: pasta extraida deste pacote.',
      'Arquivo de inicializacao: server.js',
      '',
      'Variaveis obrigatorias:',
      '- NODE_ENV=production',
      '- DATABASE_URL=mysql://usuario:senha@localhost:3306/banco',
      '- JWT_ACCESS_SECRET=troque-por-um-segredo-longo',
      '- JWT_REFRESH_SECRET=troque-por-outro-segredo-longo',
      '- TWO_FACTOR_ENCRYPTION_KEY=troque-por-um-segredo-longo-e-independente',
      '- SESSION_TTL_HOURS=24',
      '- WEB_PUBLIC_URLS=https://mubloodmoon.com.br,https://www.mubloodmoon.com.br',
      '- API_GLOBAL_PREFIX=api',
      '',
      'Observacao: se o app for montado diretamente em uma subpasta /api e o Passenger remover o prefixo da URL, use API_GLOBAL_PREFIX vazio.',
      ''
    ].join('\n')
  )

  await mkdir(deployRoot, { recursive: true })
  tarGzipDirectory(webStage, path.join(deployRoot, 'bloodmoon-web-cpanel.tar.gz'))
  tarGzipDirectory(apiStage, path.join(deployRoot, 'bloodmoon-api-cpanel.tar.gz'))
  await writeFile(
    path.join(deployRoot, 'README.md'),
    [
      '# Pacotes cPanel Blood Moon',
      '',
      '- `bloodmoon-web-cpanel.tar.gz`: aplicacao Nuxt publica.',
      '- `bloodmoon-api-cpanel.tar.gz`: API Nest com Prisma.',
      '',
      'Use Node.js 22.17.0 no cPanel.',
      'A API precisa de MySQL/MariaDB acessivel via `DATABASE_URL` antes de funcionar em producao.',
      '',
      'Ordem sugerida:',
      '1. Criar app/subdominio da API.',
      '2. Instalar dependencias da API e rodar migrations/importacao no banco final.',
      '3. Criar app do site apontando `NUXT_PUBLIC_API_BASE` para a API.',
      '4. Validar login admin, Wiki, painel e rotas `/api/content/entries`, `/api/wiki/equipment/sets`.',
      ''
    ].join('\n')
  )

  console.log(`cPanel packages created in ${deployRoot}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
