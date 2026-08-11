import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const failures = []
const schema = read('prisma/schema.prisma')
const controller = read('src/modules/guilds/guilds.controller.ts')
const adminController = read('src/modules/guilds/guilds-admin.controller.ts')
const service = read('src/modules/guilds/guilds.service.ts')
const adminService = read('src/modules/guilds/guilds-admin.service.ts')
const permissions = read('src/modules/auth/permissions.ts')

for (const model of [
  'Guild', 'GuildMember', 'GuildJoinRequest', 'GuildFocusAssignment',
  'GuildLevelConfig', 'GuildXpConversionRule', 'GuildRequest', 'GuildProject',
  'GuildMedia', 'GuildTreasury', 'GuildTreasuryBalance', 'GuildVault',
  'GuildVaultItem', 'GuildMovement', 'GuildMovementApproval'
]) {
  if (!schema.includes(`model ${model}`)) failures.push(`Missing Prisma model ${model}`)
}

for (const field of ['source', 'gameGuildId', 'gameGuildName', 'gameGuildTag', 'syncStatus', 'lastSyncedAt']) {
  if (!schema.includes(field)) failures.push(`Guild is missing game-sync-readiness field ${field}`)
}

for (const field of ['memberXp', 'contributionScore']) {
  if (!schema.includes(field)) failures.push(`GuildMember is missing progression field ${field}`)
}

if (!schema.includes('foundedByAccountId')) failures.push('Guild.foundedByAccountId (nullable founder) is missing')

for (const route of [
  "@Get()", 'mine', "@Get(':slug')", 'members', 'requests', 'projects',
  'treasury', 'vault', 'emblem', 'banner', 'join', 'join-requests'
]) {
  if (!controller.includes(route)) failures.push(`Missing public guilds route/handler ${route}`)
}
if (controller.includes("@Post()")) failures.push('Public guilds controller must not expose self-service guild creation this round')

for (const route of ['list', 'detail', 'createGuild', 'action', 'levelConfig', 'xpRules', 'reports']) {
  if (!adminController.includes(route) && !adminService.includes(route)) failures.push(`Missing guilds admin capability ${route}`)
}
if (!adminController.includes('PermissionsGuard')) failures.push('Guilds admin controller lacks granular permission guard')

for (const permission of [
  'admin.guilds.view', 'admin.guilds.moderate', 'admin.guilds.levels.manage',
  'admin.guilds.xp-rules.manage', 'admin.guilds.reports.view', 'guilds.access'
]) {
  if (!permissions.includes(permission)) failures.push(`Missing guilds permission ${permission}`)
}

if (!service.includes('BigInt') && !schema.includes('BigInt')) failures.push('Treasury amounts must use BigInt')
if (!adminService.includes("active: payload.active ?? false")) failures.push('GuildXpConversionRule must default to inactive on creation')
if (service.includes('availableAmount:') && service.includes('.update(')) failures.push('GuildsService must not write to GuildTreasuryBalance this round')

if (failures.length) {
  console.error(`Guilds structure check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}

console.log('Guilds structure OK')
