import { existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const repoRoot = process.cwd()
const databaseUrl = process.env.DATABASE_URL || 'postgresql://bloodmoon:bloodmoon@localhost:55432/bloodmoon_portal?schema=public'
const dbName = 'bloodmoon_portal'
const dbUser = 'bloodmoon'
const pgPort = '55432'
const localPgData = resolve(repoRoot, 'work/postgres-data')
const localPgLog = resolve(repoRoot, 'work/postgres.log')
const knownDockerPaths = [
  'docker',
  'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe'
]
const knownPostgresBins = [
  'C:\\Program Files\\PostgreSQL\\18\\bin',
  'C:\\Program Files\\PostgreSQL\\17\\bin',
  'C:\\Program Files\\PostgreSQL\\16\\bin',
  'C:\\Program Files\\PostgreSQL\\15\\bin'
]

function run(command, args, options = {}) {
  const resolvedCommand = resolveWindowsCommand(command)
  console.log(`> ${resolvedCommand} ${args.join(' ')}`)
  execFileSync(resolvedCommand, args, { stdio: 'inherit', shell: false, ...options })
}

function tryRun(command, args, options = {}) {
  try {
    execFileSync(resolveWindowsCommand(command), args, { stdio: 'ignore', shell: false, ...options })
    return true
  } catch {
    return false
  }
}

function resolveWindowsCommand(command) {
  if (process.platform !== 'win32') return command
  return command
}

function runNpx(args) {
  if (process.platform === 'win32') {
    run('cmd.exe', ['/d', '/s', '/c', 'npx', ...args])
    return
  }

  run('npx', args)
}

function findDocker() {
  return knownDockerPaths.find((candidate) => tryRun(candidate, ['--version']))
}

function findPgBin() {
  return knownPostgresBins.find((candidate) => existsSync(join(candidate, 'psql.exe')))
}

function ensureRepoRoot() {
  if (!existsSync('apps/api/prisma/schema.prisma')) {
    console.error('Execute este script na raiz do repositorio.')
    process.exit(1)
  }
}

function dockerEngineIsHealthy(docker) {
  return tryRun(docker, ['info'])
}

function startDockerPostgres(docker) {
  if (!dockerEngineIsHealthy(docker)) return false

  run(docker, ['compose', 'up', '-d', 'postgres'])
  return true
}

function startLocalPostgres(pgBin) {
  mkdirSync(resolve(repoRoot, 'work'), { recursive: true })

  if (!existsSync(localPgData)) {
    run(join(pgBin, 'initdb.exe'), ['-D', localPgData, '-U', dbUser, '--auth=trust', '--encoding=UTF8', '--locale=C'])
  }

  if (!tryRun(join(pgBin, 'pg_ctl.exe'), ['-D', localPgData, 'status'])) {
    run(join(pgBin, 'pg_ctl.exe'), ['-D', localPgData, '-l', localPgLog, '-o', `-p ${pgPort}`, 'start'])
  }

  try {
    execFileSync(join(pgBin, 'createdb.exe'), ['-h', 'localhost', '-p', pgPort, '-U', dbUser, dbName], {
      stdio: 'ignore',
      shell: false
    })
  } catch {
    // Database already exists.
  }

  run(join(pgBin, 'psql.exe'), ['-h', 'localhost', '-p', pgPort, '-U', dbUser, '-d', dbName, '-c', 'select current_database(), current_user;'])
}

ensureRepoRoot()

const docker = findDocker()
const startedWithDocker = docker ? startDockerPostgres(docker) : false

if (!startedWithDocker) {
  const pgBin = findPgBin()

  if (!pgBin) {
    console.error('Nao encontrei Docker saudavel nem instalacao local do PostgreSQL com psql.exe.')
    console.error(`DATABASE_URL esperado: ${databaseUrl}`)
    process.exit(1)
  }

  console.log('Docker indisponivel ou engine nao saudavel. Usando PostgreSQL local isolado em work/postgres-data.')
  startLocalPostgres(pgBin)
}

process.env.DATABASE_URL = databaseUrl
runNpx(['prisma', 'validate', '--schema', 'apps/api/prisma/schema.prisma'])
runNpx(['prisma', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'])
runNpx(['prisma', 'generate', '--schema', 'apps/api/prisma/schema.prisma'])

console.log('PostgreSQL pronto para consolidacao da base Blood Moon.')
