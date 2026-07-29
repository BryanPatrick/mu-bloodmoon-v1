import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const failures = []
const schema = read('prisma/schema.prisma')
const controller = read('src/modules/community/community.controller.ts')
const adminController = read('src/modules/community/community-admin.controller.ts')
const service = read('src/modules/community/community.service.ts')
const permissions = read('src/modules/auth/permissions.ts')

for (const model of [
  'CommunityProfile', 'CommunityPost', 'CommunityPostRevision', 'CommunityComment',
  'CommunityReaction', 'CommunityReport', 'CommunityModerationAction',
  'CommunityAchievement', 'CommunityAchievementGrant', 'CommunityQuest',
  'CommunityQuestParticipant', 'CommunityBadge', 'CommunityBadgeGrant',
  'CommunityPolicy', 'CommunityTask'
]) {
  if (!schema.includes(`model ${model}`)) failures.push(`Missing Prisma model ${model}`)
}

for (const route of ['feed', 'profiles/:username', 'posts', 'reports', 'quests']) {
  if (!controller.includes(route)) failures.push(`Missing public community route ${route}`)
}

for (const route of ['dashboard', 'posts', 'comments', 'users', 'reports', 'achievements', 'quests', 'badges', 'policy', 'tasks', 'analytics']) {
  if (!adminController.includes(route)) failures.push(`Missing community admin route ${route}`)
}

for (const permission of [
  'admin.community.view', 'admin.community.posts.moderate',
  'admin.community.comments.moderate', 'admin.community.reports.moderate',
  'admin.community.users.moderate', 'admin.community.achievements.manage',
  'admin.community.quests.manage', 'admin.community.badges.manage',
  'admin.community.policy.manage', 'admin.community.tasks.manage',
  'admin.community.analytics.view'
]) {
  if (!permissions.includes(permission)) failures.push(`Missing community permission ${permission}`)
}

if (!service.includes('COMMUNITY_SPAM_RATE_LIMIT')) failures.push('Hourly anti-spam enforcement is missing')
if (!service.includes('COMMUNITY_SPAM_BLOCKED_LINK')) failures.push('Domain moderation enforcement is missing')
if (!adminController.includes('PermissionsGuard')) failures.push('Community admin controller lacks granular permission guard')

if (failures.length) {
  console.error(`Community structure check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}

console.log('Community structure OK')
