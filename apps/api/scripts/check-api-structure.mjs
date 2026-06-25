import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))

const required = [
  'src/main.ts',
  'src/app.module.ts',
  'src/modules/auth/auth.contract.ts',
  'src/modules/accounts/accounts.contract.ts',
  'src/modules/characters/characters.contract.ts',
  'src/modules/shop/shop.contract.ts',
  'src/modules/recharge/recharge.contract.ts',
  'src/modules/audit/audit.contract.ts',
  'src/modules/references/references.contract.ts',
  'src/modules/tickets/tickets.contract.ts',
  'src/modules/game-integration/game-integration.contract.ts',
  'prisma/schema.prisma',
  '.env.example'
]

const missing = required.filter((file) => !existsSync(join(root, file)))

if (missing.length) {
  console.error(`API scaffold incomplete:\n${missing.map((file) => `- ${file}`).join('\n')}`)
  process.exit(1)
}

console.log('API scaffold OK')
