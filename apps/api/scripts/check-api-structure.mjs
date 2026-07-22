import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))

const required = [
  'src/main.ts',
  'src/app.module.ts',
  'src/database/database.module.ts',
  'src/database/prisma.service.ts',
  'src/modules/auth/auth.contract.ts',
  'src/modules/auth/auth.controller.ts',
  'src/modules/auth/auth.module.ts',
  'src/modules/auth/auth.service.ts',
  'src/modules/auth/auth.types.ts',
  'src/modules/auth/current-user.decorator.ts',
  'src/modules/auth/jwt-auth.guard.ts',
  'src/modules/auth/permissions.ts',
  'src/modules/auth/permissions.decorator.ts',
  'src/modules/auth/permissions.guard.ts',
  'src/modules/auth/roles.decorator.ts',
  'src/modules/auth/roles.guard.ts',
  'src/modules/accounts/accounts.contract.ts',
  'src/modules/accounts/accounts.controller.ts',
  'src/modules/accounts/accounts.module.ts',
  'src/modules/accounts/accounts.service.ts',
  'src/modules/accounts/accounts.types.ts',
  'src/modules/characters/characters.contract.ts',
  'src/modules/characters/characters.controller.ts',
  'src/modules/characters/characters.module.ts',
  'src/modules/characters/characters.service.ts',
  'src/modules/characters/characters.types.ts',
  'src/modules/shop/shop.contract.ts',
  'src/modules/recharge/recharge.contract.ts',
  'src/modules/audit/audit.contract.ts',
  'src/modules/audit/audit.module.ts',
  'src/modules/audit/audit.service.ts',
  'src/modules/admin-audit/admin-audit.contract.ts',
  'src/modules/admin-audit/admin-audit.controller.ts',
  'src/modules/admin-audit/admin-audit.module.ts',
  'src/modules/admin-audit/admin-audit.service.ts',
  'src/modules/references/references.contract.ts',
  'src/modules/tickets/tickets.contract.ts',
  'src/modules/game-integration/game-integration.contract.ts',
  'src/modules/admin-content/admin-content.module.ts',
  'src/modules/admin-content/admin-content.controller.ts',
  'src/modules/admin-content/admin-content.service.ts',
  'src/modules/admin-content/admin-content.types.ts',
  'src/modules/admin-dashboard/admin-dashboard.controller.ts',
  'src/modules/admin-dashboard/admin-dashboard.module.ts',
  'src/modules/admin-dashboard/admin-dashboard.service.ts',
  'src/modules/commerce/commerce.contract.ts',
  'src/modules/commerce/commerce.controller.ts',
  'src/modules/commerce/commerce.module.ts',
  'src/modules/commerce/commerce.service.ts',
  'src/modules/marketplace/marketplace.contract.ts',
  'src/modules/marketplace/marketplace.controller.ts',
  'src/modules/marketplace/marketplace.module.ts',
  'src/modules/marketplace/marketplace.service.ts',
  'src/modules/wiki/wiki.module.ts',
  'src/modules/wiki/wiki.controller.ts',
  'src/modules/wiki/wiki.service.ts',
  'src/modules/wiki/wiki.types.ts',
  'prisma/schema.prisma',
  'scripts/seed-test-accounts.mjs',
  'scripts/check-security-structure.mjs',
  'scripts/check-auth-integration.mjs',
  '.env.example'
]

const missing = required.filter((file) => !existsSync(join(root, file)))

if (missing.length) {
  console.error(`API scaffold incomplete:\n${missing.map((file) => `- ${file}`).join('\n')}`)
  process.exit(1)
}

console.log('API scaffold OK')
