import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const databaseUrl = process.env.DATABASE_URL || 'mysql://bloodmoon:bloodmoon@localhost:3306/bloodmoon_portal'

function run(command, args, options = {}) {
  console.log(`> ${command} ${args.join(' ')}`)
  execFileSync(command, args, { stdio: 'inherit', shell: false, ...options })
}

function runNpx(args) {
  if (process.platform === 'win32') {
    run('cmd.exe', ['/d', '/s', '/c', 'npx', ...args])
    return
  }

  run('npx', args)
}

if (!existsSync('apps/api/prisma/schema.prisma')) {
  console.error('Execute este script na raiz do repositorio.')
  process.exit(1)
}

process.env.DATABASE_URL = databaseUrl

runNpx(['prisma', 'validate', '--schema', 'apps/api/prisma/schema.prisma'])
runNpx(['prisma', 'db', 'push', '--schema', 'apps/api/prisma/schema.prisma'])
runNpx(['prisma', 'generate', '--schema', 'apps/api/prisma/schema.prisma'])

console.log('MySQL/MariaDB pronto para consolidacao da base Blood Moon.')
