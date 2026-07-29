import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const failures = []

const schema = read('prisma/schema.prisma')
const authService = read('src/modules/auth/auth.service.ts')
const accountService = read('src/modules/accounts/accounts.service.ts')
const permissions = read('src/modules/auth/permissions.ts')
const protectedControllers = [
  'src/modules/accounts/accounts.controller.ts',
  'src/modules/admin-audit/admin-audit.controller.ts',
  'src/modules/admin-observability/admin-observability.controller.ts',
  'src/modules/admin-observability/admin-errors.controller.ts',
  'src/modules/admin-content/admin-content.controller.ts',
  'src/modules/admin-dashboard/admin-dashboard.controller.ts',
  'src/modules/commerce/commerce.controller.ts',
  'src/modules/marketplace/marketplace.controller.ts',
  'src/modules/support/support.controller.ts',
  'src/modules/muserver-export/muserver-export.controller.ts',
  'src/modules/web-source/web-source.controller.ts',
  'src/modules/roadmap/roadmap.controller.ts',
  'src/modules/community/community-admin.controller.ts',
  'src/modules/admin-tasks/admin-tasks.controller.ts',
  'src/modules/admin-reports/admin-reports.controller.ts'
]

for (const role of ['PLAYER', 'ADMIN', 'SUPER_ADMIN']) {
  if (!schema.includes(role)) failures.push(`Role ${role} is missing from Prisma schema`)
}
for (const removedRole of ['MODERATOR', 'GAME_MASTER']) {
  if (schema.match(new RegExp(`\\s${removedRole}\\s`))) failures.push(`Legacy role ${removedRole} is still active`)
}
if (!schema.includes('model AccountPermission')) failures.push('AccountPermission model is missing')
if (!authService.includes("role: 'PLAYER'")) failures.push('Registration is not explicitly restricted to PLAYER')
if (/ensureDemoAccounts|password:\s*['"]admin['"]/.test(authService)) failures.push('Insecure automatic demo account detected')
if (!accountService.includes("user.role !== 'SUPER_ADMIN'")) failures.push('Role changes are not restricted to SUPER_ADMIN')
if (!accountService.includes('You cannot change your own role or status')) failures.push('Self role/status protection is missing')
if (!permissions.includes("SUPER_ADMIN: ['*']")) failures.push('SUPER_ADMIN wildcard permission is missing')

for (const file of protectedControllers) {
  const source = read(file)
  if (!source.includes('PermissionsGuard') || !source.includes('RequirePermissions')) {
    failures.push(`${file} does not enforce granular permissions`)
  }
}

const protectedModules = [
  'src/modules/accounts/accounts.module.ts',
  'src/modules/admin-audit/admin-audit.module.ts',
  'src/modules/admin-observability/admin-observability.module.ts',
  'src/modules/admin-content/admin-content.module.ts',
  'src/modules/admin-dashboard/admin-dashboard.module.ts',
  'src/modules/commerce/commerce.module.ts',
  'src/modules/marketplace/marketplace.module.ts',
  'src/modules/support/support.module.ts',
  'src/modules/muserver-export/muserver-export.module.ts',
  'src/modules/web-source/web-source.module.ts',
  'src/modules/roadmap/roadmap.module.ts',
  'src/modules/community/community.module.ts',
  'src/modules/admin-tasks/admin-tasks.module.ts',
  'src/modules/admin-reports/admin-reports.module.ts'
]
for (const file of protectedModules) {
  const source = read(file)
  if (!source.includes('AuthModule') || !source.includes('imports:')) {
    failures.push(`${file} does not import AuthModule for its guards`)
  }
}

if (failures.length) {
  console.error(`Security structure check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}

console.log('Security structure OK')
