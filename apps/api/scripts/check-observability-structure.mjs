import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const failures = []

const schema = read('prisma/schema.prisma')
const audit = read('src/modules/audit/audit.service.ts')
const filter = read('src/common/safe-exception.filter.ts')
const sanitizer = read('src/common/sensitive-data.ts')
const controller = read('src/modules/admin-observability/admin-observability.controller.ts')
const errorController = read('src/modules/admin-observability/admin-errors.controller.ts')

for (const model of [
  'AuditEvent',
  'AdminWorkLog',
  'SystemError',
  'SystemErrorOccurrence',
  'SystemErrorTimeline',
  'OperationalEvent',
  'SystemAlert',
  'AdminLogExport',
  'ObservabilityRetentionPolicy'
]) {
  if (!schema.includes(`model ${model}`)) failures.push(`Missing model ${model}`)
}

for (const field of [
  'correlationId',
  'beforeData',
  'afterData',
  'occurrenceCount',
  'assignedTo',
  'resolution'
]) {
  if (!schema.includes(field)) failures.push(`Missing observability field ${field}`)
}

if (!audit.includes('toSafeJson')) failures.push('Audit payloads are not sanitized')
if (!audit.includes('adminWorkLog.create')) failures.push('Automatic work log creation is missing')
if (!filter.includes('recordSystemError')) failures.push('Global exception capture is missing')
if (!sanitizer.includes('sensitiveKeyPattern')) failures.push('Sensitive key redaction is missing')
if (!sanitizer.includes('PROTECTED_JWT')) failures.push('JWT redaction is missing')
if (!controller.includes("Get('export')")) failures.push('CSV export endpoint is missing')
if (!controller.includes("Get('retention')")) failures.push('Retention endpoint is missing')
if (!errorController.includes("Controller('admin/errors')")) failures.push('Error center endpoint is missing')
if (!errorController.includes("Controller('admin/alerts')")) failures.push('Alert endpoint is missing')

if (failures.length) {
  console.error(`Observability structure check failed:\n${failures.map((item) => `- ${item}`).join('\n')}`)
  process.exit(1)
}

console.log('Observability structure OK')
