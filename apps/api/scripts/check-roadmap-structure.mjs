import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const schema = read('prisma/schema.prisma')
const service = read('src/modules/roadmap/roadmap.service.ts')
const controller = read('src/modules/roadmap/roadmap.controller.ts')
const permissions = read('src/modules/auth/permissions.ts')
const failures = []

for (const model of ['RoadmapItem', 'RoadmapUpdate', 'RoadmapTask', 'RoadmapRelation']) {
  if (!schema.includes(`model ${model}`)) failures.push(`${model} model is missing`)
}
for (const enumName of ['RoadmapHorizon', 'RoadmapStatus', 'RoadmapWorkflowStatus', 'RoadmapVisibility']) {
  if (!schema.includes(`enum ${enumName}`)) failures.push(`${enumName} enum is missing`)
}
for (const permission of ['adminRoadmapCreate', 'adminRoadmapEdit', 'adminRoadmapReview', 'adminRoadmapApprove', 'adminRoadmapPublish', 'adminRoadmapDelete']) {
  if (!permissions.includes(permission)) failures.push(`${permission} permission is missing`)
}
for (const feature of ['processDueSchedules', 'recordSystemError', 'recordOperationalEvent', 'workDescription', 'deletedAt', 'scheduledPublishAt']) {
  if (!service.includes(feature)) failures.push(`Roadmap service is missing ${feature}`)
}
for (const route of ["@Controller('roadmap')", "@Controller('admin/roadmap')", "@Post(':id/updates')", "@Post(':id/tasks')", "@Get(':id/history')"]) {
  if (!controller.includes(route)) failures.push(`Roadmap controller is missing ${route}`)
}

if (failures.length) {
  console.error(`Roadmap structure check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}
console.log('Roadmap structure OK')
