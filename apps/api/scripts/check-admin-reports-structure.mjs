import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const failures = []
const controller = read('src/modules/admin-reports/admin-reports.controller.ts')
const service = read('src/modules/admin-reports/admin-reports.service.ts')
const permissions = read('src/modules/auth/permissions.ts')

for (const route of ["@Get('options')", "@Get('export')", '@Get()']) {
  if (!controller.includes(route)) failures.push(`Missing reports route ${route}`)
}
for (const permission of ['adminReportsView', 'adminReportsExport', 'adminReportsSecurityView']) {
  if (!permissions.includes(permission)) failures.push(`Missing permission ${permission}`)
}
for (const category of ['team', 'roadmap', 'store', 'marketplace', 'community', 'audit', 'errors', 'security']) {
  if (!service.includes(`${category}:`)) failures.push(`Missing report category ${category}`)
}
for (const safeguard of ['canSeeFinancial', 'safeCell', 'AdminLogExport', 'admin.reports.export']) {
  if (!service.includes(safeguard)) failures.push(`Missing reports safeguard ${safeguard}`)
}

if (failures.length) {
  console.error(`Admin reports structure check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}

console.log('Admin reports structure OK')
