import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const failures = []
const schema = read('prisma/schema.prisma')
const controller = read('src/modules/admin-tasks/admin-tasks.controller.ts')
const service = read('src/modules/admin-tasks/admin-tasks.service.ts')
const permissions = read('src/modules/auth/permissions.ts')

for (const model of ['AdminTask', 'AdminTaskComment', 'AdminTaskEvidence', 'AdminTaskLink', 'AdminTaskHistory']) {
  if (!schema.includes(`model ${model}`)) failures.push(`Missing Prisma model ${model}`)
}
for (const status of ['BACKLOG', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'IN_REVIEW', 'COMPLETED', 'CANCELED', 'REOPENED']) {
  if (!schema.includes(status)) failures.push(`Missing task status ${status}`)
}
for (const route of ['dashboard/me', 'dashboard/management', 'reports', 'administrators', 'comments', 'evidence', 'links']) {
  if (!controller.includes(route)) failures.push(`Missing task route ${route}`)
}
for (const permission of [
  'admin.tasks.view', 'admin.tasks.create', 'admin.tasks.assign',
  'admin.tasks.operate', 'admin.tasks.review', 'admin.tasks.manage',
  'admin.tasks.reports.view'
]) {
  if (!permissions.includes(permission)) failures.push(`Missing task permission ${permission}`)
}
if (!service.includes('workTaskId: task.id')) failures.push('Task audit/work-log correlation is missing')
if (!service.includes('proof:')) failures.push('Automatic work proof is missing')
if (!service.includes('reopenedCount')) failures.push('Reopening metrics are missing')
if (!controller.includes('PermissionsGuard')) failures.push('Task controller lacks granular permission guard')

if (failures.length) {
  console.error(`Admin task structure check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}

console.log('Admin task structure OK')
