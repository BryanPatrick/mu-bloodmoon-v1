import type { AccountPermission, Role } from '@prisma/client'

// Role hierarchy: PLAYER < GM < ADMIN < SUPER_ADMIN.
// GM is an operational, game-facing role -- it does NOT inherit ADMIN's
// admin.* permissions. Its baseline is playerPermissions plus a small,
// curated set of gm.* view permissions (see gmPermissions below). Only
// SUPER_ADMIN may promote/demote GM or ADMIN accounts (accounts.service.ts);
// GM itself can never change roles.
//
// 2FA policy: SUPER_ADMIN, ADMIN and GM all require mandatory 2FA; PLAYER's
// stays optional. Enforced in roles.guard.ts (blocks role-gated routes with
// TWO_FACTOR_SETUP_REQUIRED when `role !== 'PLAYER' && !twoFactorEnabled`,
// which covers GM automatically the moment it gets its own @Roles('GM', ...)
// endpoints) and mirrored client-side in data/security.ts's
// isTwoFactorMandatory for the setup-screen redirect (UX only, not the
// source of truth). GM/ADMIN/SUPER_ADMIN cannot self-disable their own 2FA
// (auth.service.ts's disableTwoFactor) -- only a SUPER_ADMIN can reset
// another account's 2FA, via a step-up-gated endpoint
// (accounts.service.ts's adminResetTwoFactor).

export const permissionKeys = {
  adminDashboardView: 'admin.dashboard.view',
  adminAccountsView: 'admin.accounts.view',
  adminAccountsStatusManage: 'admin.accounts.status.manage',
  adminRolesManage: 'admin.roles.manage',
  adminContentManage: 'admin.content.manage',
  adminAuditView: 'admin.audit.view',
  adminAuditHistoryView: 'admin.audit.history.view',
  adminAuditFullView: 'admin.audit.full.view',
  adminWorkLogsView: 'admin.work-logs.view',
  adminWorkLogsManage: 'admin.work-logs.manage',
  adminOperationalLogsView: 'admin.operational-logs.view',
  adminErrorsView: 'admin.errors.view',
  adminErrorsManage: 'admin.errors.manage',
  adminAlertsView: 'admin.alerts.view',
  adminAlertsManage: 'admin.alerts.manage',
  adminLogsExport: 'admin.logs.export',
  adminRetentionManage: 'admin.retention.manage',
  adminShopManage: 'admin.shop.manage',
  adminOrdersOperate: 'admin.orders.operate',
  adminStoreView: 'admin.store.view',
  adminStoreCategories: 'admin.store.categories',
  adminStoreProducts: 'admin.store.products',
  adminStoreReview: 'admin.store.review',
  adminStorePublish: 'admin.store.publish',
  adminStoreOrders: 'admin.store.orders',
  adminStoreRefund: 'admin.store.refund',
  adminStoreDeliveries: 'admin.store.deliveries',
  adminStoreTest: 'admin.store.test',
  adminMarketplaceManage: 'admin.marketplace.manage',
  adminMarketplaceView: 'admin.marketplace.view',
  adminMarketplaceListingsModerate: 'admin.marketplace.listings.moderate',
  adminMarketplaceEscrowOperate: 'admin.marketplace.escrow.operate',
  adminMarketplaceTransactionsOperate: 'admin.marketplace.transactions.operate',
  adminMarketplaceReportsModerate: 'admin.marketplace.reports.moderate',
  adminMarketplaceUsersSuspend: 'admin.marketplace.users.suspend',
  adminMarketplaceEconomyManage: 'admin.marketplace.economy.manage',
  adminMarketplaceTasksManage: 'admin.marketplace.tasks.manage',
  adminMarketplaceReportsView: 'admin.marketplace.reports.view',
  adminCommunityView: 'admin.community.view',
  adminCommunityPostsModerate: 'admin.community.posts.moderate',
  adminCommunityCommentsModerate: 'admin.community.comments.moderate',
  adminCommunityReportsModerate: 'admin.community.reports.moderate',
  adminCommunityUsersModerate: 'admin.community.users.moderate',
  adminCommunityAchievementsManage: 'admin.community.achievements.manage',
  adminCommunityQuestsManage: 'admin.community.quests.manage',
  adminCommunityBadgesManage: 'admin.community.badges.manage',
  adminCommunityPolicyManage: 'admin.community.policy.manage',
  adminCommunityTasksManage: 'admin.community.tasks.manage',
  adminCommunityReportsView: 'admin.community.analytics.view',
  adminTasksView: 'admin.tasks.view',
  adminTasksCreate: 'admin.tasks.create',
  adminTasksAssign: 'admin.tasks.assign',
  adminTasksOperate: 'admin.tasks.operate',
  adminTasksReview: 'admin.tasks.review',
  adminTasksManage: 'admin.tasks.manage',
  adminTasksReportsView: 'admin.tasks.reports.view',
  adminReportsView: 'admin.reports.view',
  adminReportsExport: 'admin.reports.export',
  adminReportsSecurityView: 'admin.reports.security.view',
  adminGameBridgeManage: 'admin.game-bridge.manage',
  adminFinanceView: 'admin.finance.view',
  adminFinancialReportsView: 'admin.finance.reports.view',
  adminServerSettingsManage: 'admin.server-settings.manage',
  adminGameDataView: 'admin.game-data.view',
  adminRoadmapView: 'admin.roadmap.view',
  adminRoadmapCreate: 'admin.roadmap.create',
  adminRoadmapEdit: 'admin.roadmap.edit',
  adminRoadmapReview: 'admin.roadmap.review',
  adminRoadmapApprove: 'admin.roadmap.approve',
  adminRoadmapPublish: 'admin.roadmap.publish',
  adminRoadmapDelete: 'admin.roadmap.delete',
  adminReferencesManage: 'admin.references.manage',
  adminFinanceManage: 'admin.finance.manage',
  adminRechargeManage: 'admin.recharge.manage',
  adminSystemManage: 'admin.system.manage',
  adminGuildsView: 'admin.guilds.view',
  adminGuildsModerate: 'admin.guilds.moderate',
  adminGuildsLevelsManage: 'admin.guilds.levels.manage',
  adminGuildsXpRulesManage: 'admin.guilds.xp-rules.manage',
  adminGuildsReportsView: 'admin.guilds.reports.view',
  accountManage: 'account.manage',
  charactersManage: 'characters.manage',
  shopAccess: 'shop.access',
  marketplaceAccess: 'marketplace.access',
  communityAccess: 'community.access',
  rechargeAccess: 'recharge.access',
  guildsAccess: 'guilds.access',
  guidesFutureView: 'guides.future.view',
  gmDashboardView: 'gm.dashboard.view',
  gmCharactersView: 'gm.characters.view',
  gmGuildsView: 'gm.guilds.view',
  gmOperationalLogsView: 'gm.operational-logs.view'
} as const

export type PermissionKey = typeof permissionKeys[keyof typeof permissionKeys]

const adminPermissions = Object.values(permissionKeys)
  .filter((permission): permission is PermissionKey => permission.startsWith('admin.'))

export const delegableAdminPermissions: PermissionKey[] = [...adminPermissions]

const playerPermissions: PermissionKey[] = [
  permissionKeys.accountManage,
  permissionKeys.charactersManage,
  permissionKeys.shopAccess,
  permissionKeys.marketplaceAccess,
  permissionKeys.communityAccess,
  permissionKeys.rechargeAccess,
  permissionKeys.guildsAccess
]

const gmPermissions: PermissionKey[] = [
  ...playerPermissions,
  permissionKeys.gmDashboardView,
  permissionKeys.gmCharactersView,
  permissionKeys.gmGuildsView,
  permissionKeys.gmOperationalLogsView
]

const rolePermissions: Record<Role, PermissionKey[] | ['*']> = {
  PLAYER: playerPermissions,
  GM: gmPermissions,
  ADMIN: [
    ...playerPermissions,
    permissionKeys.guidesFutureView
  ],
  SUPER_ADMIN: ['*']
}

export const permissionsForRole = (role: Role) => {
  const permissions = rolePermissions[role]
  return permissions[0] === '*' ? ['*'] : [...permissions]
}

export const permissionsForAccount = (role: Role, overrides: Pick<AccountPermission, 'key' | 'granted'>[] = []) => {
  const base = permissionsForRole(role)
  if (base.includes('*')) {
    return base
  }

  const result = new Set(base)
  for (const override of overrides) {
    if (override.granted) {
      result.add(override.key as PermissionKey)
    } else {
      result.delete(override.key as PermissionKey)
    }
  }
  return [...result]
}

export const roleHasAny = (role: Role | undefined, allowedRoles: Role[]) =>
  Boolean(role && allowedRoles.includes(role))
