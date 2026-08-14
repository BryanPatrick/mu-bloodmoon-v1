export const permissions = {
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
  gmOperationalLogsView: 'gm.operational-logs.view',
  gmOccurrencesView: 'gm.occurrences.view',
  gmOccurrencesManage: 'gm.occurrences.manage',
  gmEventsView: 'gm.events.view',
  gmEventsExecute: 'gm.events.execute',
  gmEventsCancel: 'gm.events.cancel',
  gmEventsResultsValidate: 'gm.events.results.validate'
} as const

export type Permission = typeof permissions[keyof typeof permissions]
export type UserRole = 'player' | 'gm' | 'admin' | 'super-admin'

export const roleLabels: Record<UserRole, string> = {
  player: 'Player',
  gm: 'Game Master',
  admin: 'Administrador',
  'super-admin': 'Super ADM'
}

const playerPermissions: Permission[] = [
  permissions.accountManage,
  permissions.charactersManage,
  permissions.shopAccess,
  permissions.marketplaceAccess,
  permissions.communityAccess,
  permissions.rechargeAccess,
  permissions.guildsAccess
]

const gmPermissions: Permission[] = [
  ...playerPermissions,
  permissions.gmDashboardView,
  permissions.gmCharactersView,
  permissions.gmGuildsView,
  permissions.gmOperationalLogsView,
  permissions.gmOccurrencesView,
  permissions.gmOccurrencesManage,
  permissions.gmEventsView
]

export const rolePermissions: Record<UserRole, Permission[] | ['*']> = {
  player: playerPermissions,
  gm: gmPermissions,
  admin: [
    ...playerPermissions,
    permissions.guidesFutureView
  ],
  'super-admin': ['*']
}

export const isAdminRole = (role?: UserRole) => role === 'admin' || role === 'super-admin'
export const isGmRole = (role?: UserRole) => role === 'gm'

// GM, ADMIN and SUPER_ADMIN all require 2FA to be active -- PLAYER's stays
// optional. Mirrors the backend rule in apps/api/src/modules/auth/roles.guard.ts.
export const isTwoFactorMandatory = (role?: UserRole) => Boolean(role) && role !== 'player'

export const roleHasPermission = (role: UserRole | undefined, permission: Permission) => {
  if (!role) return false
  const roleAccess = rolePermissions[role]
  return roleAccess.includes('*') || roleAccess.includes(permission)
}
