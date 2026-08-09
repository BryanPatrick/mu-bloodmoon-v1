import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = path.join(root, 'scripts', 'quality', 'prettier-legacy-files.txt')
const lintExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.vue'])
const prettierExtensions = new Set([
  '.css',
  '.graphql',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.scss',
  '.ts',
  '.tsx',
  '.vue',
  '.yaml',
  '.yml'
])

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  })

const runNodeTool = (relativeEntry, args, options = {}) =>
  run(process.execPath, [path.join(root, relativeEntry), ...args], options)

const gitLines = (args) => {
  const result = run('git', args, { capture: true })
  if (result.status !== 0) {
    process.stderr.write(result.stderr || `Falha ao executar git ${args.join(' ')}.\n`)
    process.exit(result.status || 1)
  }
  return result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
}

const changed = new Set([
  ...gitLines(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']),
  ...gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR', 'HEAD']),
  ...gitLines(['ls-files', '--others', '--exclude-standard'])
])
const files = [...changed].filter((file) => !file.includes('node_modules/')).sort()

if (files.length === 0) {
  console.log('quality:changed: nenhum arquivo novo ou modificado para validar.')
  process.exit(0)
}

const diffCheck = run('git', ['diff', '--check', 'HEAD'])
if (diffCheck.status !== 0) process.exit(diffCheck.status || 1)

const lintFiles = files.filter((file) => lintExtensions.has(path.extname(file).toLowerCase()))
if (lintFiles.length > 0) {
  const lint = runNodeTool('node_modules/eslint/bin/eslint.js', lintFiles)
  if (lint.status !== 0) process.exit(lint.status || 1)
}

const prettierFiles = files.filter((file) =>
  prettierExtensions.has(path.extname(file).toLowerCase())
)
if (prettierFiles.length > 0) {
  const prettier = runNodeTool(
    'node_modules/prettier/bin/prettier.cjs',
    ['--list-different', ...prettierFiles],
    { capture: true }
  )
  const different = (prettier.stdout || '')
    .split(/\r?\n/u)
    .map((line) => line.trim().replaceAll('\\', '/'))
    .filter(Boolean)
  const legacy = new Set(
    readFileSync(baselinePath, 'utf8')
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  )
  const newDebt = different.filter((file) => !legacy.has(file))
  const grandfathered = different.filter((file) => legacy.has(file))

  if (grandfathered.length > 0) {
    console.warn(
      `quality:changed: ${grandfathered.length} arquivo(s) tocado(s) permanecem na baseline legada de Prettier.`
    )
  }
  if (newDebt.length > 0) {
    console.error('quality:changed: nova divida de formatacao detectada:')
    for (const file of newDebt) console.error(`- ${file}`)
    process.exit(1)
  }
  if (prettier.status > 1) {
    process.stderr.write(prettier.stderr || 'Falha interna ao executar Prettier.\n')
    process.exit(prettier.status)
  }
}

console.log(`quality:changed: PASS (${files.length} arquivo(s) avaliados).`)
