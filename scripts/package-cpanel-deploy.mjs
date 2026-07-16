import { copyFile, cp, mkdir, rm, stat, writeFile } from 'node:fs/promises'
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

function zipDirectory(sourceDir, targetFile) {
  if (process.platform === 'win32') {
    const command = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `if (Test-Path '${targetFile}') { Remove-Item -LiteralPath '${targetFile}' -Force }; Compress-Archive -Path '${path.join(sourceDir, '*')}' -DestinationPath '${targetFile}' -Force`
    ]
    const result = spawnSync('powershell', command, { stdio: 'inherit' })
    if (result.status !== 0) {
      throw new Error(`Compress-Archive failed for ${sourceDir}`)
    }
    return
  }

  const result = spawnSync('zip', ['-r', targetFile, '.'], { cwd: sourceDir, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`zip failed for ${sourceDir}`)
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
        }
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
    await (await import('node:fs/promises')).readFile(path.join(root, 'apps', 'api', 'package.json'), 'utf8')
  )
  const apiDeployPackage = {
    name: 'bloodmoon-api-cpanel',
    private: true,
    type: 'commonjs',
    engines: { node: '22.17.0' },
    scripts: {
      start: 'node dist/apps/api/src/main.js',
      postinstall: 'prisma generate --schema prisma/schema.prisma'
    },
    dependencies: {
      ...apiPackage.dependencies,
      prisma: apiPackage.devDependencies.prisma
    }
  }

  await cp(apiDist, path.join(apiStage, 'dist'), { recursive: true })
  await cp(path.join(root, 'apps', 'api', 'prisma'), path.join(apiStage, 'prisma'), { recursive: true })
  await copyIfExists(path.join(root, 'references', 'web-source-current'), path.join(apiStage, 'references', 'web-source-current'))
  await copyIfExists(path.join(root, 'references', 'game-data', 'muserver-export'), path.join(apiStage, 'references', 'game-data', 'muserver-export'))
  await copyIfExists(path.join(root, 'references', 'game-data', 'source-harvest'), path.join(apiStage, 'references', 'game-data', 'source-harvest'))
  await copyIfExists(path.join(root, 'references', 'game-data', 'equipment-postgres-import-plan.json'), path.join(apiStage, 'references', 'game-data', 'equipment-postgres-import-plan.json'))
  await copyIfExists(path.join(root, 'references', 'game-data', 'equipment-remap-audit.md'), path.join(apiStage, 'references', 'game-data', 'equipment-remap-audit.md'))
  await writeFile(path.join(apiStage, 'package.json'), `${JSON.stringify(apiDeployPackage, null, 2)}\n`)
  await writeFile(
    path.join(apiStage, 'README-cpanel.md'),
    [
      '# Blood Moon API - cPanel',
      '',
      'Node.js: selecione 22.17.0.',
      'Raiz do aplicativo: pasta extraida deste pacote.',
      'Arquivo de inicializacao: dist/apps/api/src/main.js',
      '',
      'Variaveis obrigatorias:',
      '- NODE_ENV=production',
      '- DATABASE_URL=mysql://usuario:senha@localhost:3306/banco',
      '- JWT_ACCESS_SECRET=troque-por-um-segredo-longo',
      '- JWT_REFRESH_SECRET=troque-por-outro-segredo-longo',
      '- WEB_PUBLIC_URLS=https://mubloodmoon.com.br,https://www.mubloodmoon.com.br',
      '- API_GLOBAL_PREFIX=api',
      '',
      'Observacao: se o app for montado diretamente em uma subpasta /api e o Passenger remover o prefixo da URL, use API_GLOBAL_PREFIX vazio.',
      ''
    ].join('\n')
  )

  await mkdir(deployRoot, { recursive: true })
  zipDirectory(webStage, path.join(deployRoot, 'bloodmoon-web-cpanel.zip'))
  zipDirectory(apiStage, path.join(deployRoot, 'bloodmoon-api-cpanel.zip'))
  await writeFile(
    path.join(deployRoot, 'README.md'),
    [
      '# Pacotes cPanel Blood Moon',
      '',
      '- `bloodmoon-web-cpanel.zip`: aplicacao Nuxt publica.',
      '- `bloodmoon-api-cpanel.zip`: API Nest com Prisma.',
      '',
      'Use Node.js 22.17.0 no cPanel.',
      'A API precisa de MySQL/MariaDB acessivel via `DATABASE_URL` antes de funcionar em producao.',
      '',
      'Ordem sugerida:',
      '1. Criar app/subdominio da API.',
      '2. Instalar dependencias da API e rodar migrations/importacao no banco final.',
      '3. Criar app do site apontando `NUXT_PUBLIC_API_BASE` para a API.',
      '4. Validar login admin, Wiki, painel e rotas `/api/health`, `/api/wiki/equipment/sets`.',
      ''
    ].join('\n')
  )

  console.log(`cPanel packages created in ${deployRoot}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
