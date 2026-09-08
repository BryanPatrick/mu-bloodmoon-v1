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
  // PHASE S (2026-09-02) -- the X-Shop/CashShop admin control plane
  // desired-state layer. `sync` is deliberately its OWN key, separate
  // from `edit` -- editing the Portal's own desired-state record is a
  // normal content operation; a future real GameServer sync action is
  // materially more sensitive (Part N's own explicit instruction) and
  // must never be granted merely because an account already has edit
  // access. No GameServer sync is implemented yet (see
  // legacy-catalog-config.service.ts) -- this key exists now so the
  // eventual sync endpoint has an RBAC boundary ready on day one rather
  // than reusing `edit` out of convenience later.
  adminStoreLegacyCatalogView: 'admin.store.legacy-catalog.view',
  adminStoreLegacyCatalogEdit: 'admin.store.legacy-catalog.edit',
  adminStoreLegacyCatalogSync: 'admin.store.legacy-catalog.sync',
  // PHASE U (2026-09-03) -- the Progression control plane (XP/Drop/
  // Reset/Master Reset). Per Bryan's own OQ-032 closure: admin
  // control-plane ACCESS is RBAC (these three keys); real GameServer
  // MUTATION is this `.sync` permission PLUS a runtime kill switch
  // (PROGRESSION_RUNTIME_SYNC_ENABLED), never a separate portal-management
  // flag layered on top of RBAC. No `.approve` key -- unlike Store's
  // review->publish pipeline, a progression desired-state edit has no
  // separate approval step in this foundation phase; `.edit` is the
  // terminal action.
  adminProgressionView: 'admin.progression.view',
  adminProgressionEdit: 'admin.progression.edit',
  adminProgressionSync: 'admin.progression.sync',
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
  adminVipManage: 'admin.vip.manage',
  adminBetaLifecycleManage: 'admin.beta-lifecycle.manage',
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
  adminGameProvisioningView: 'admin.game-provisioning.view',
  adminGameProvisioningManage: 'admin.game-provisioning.manage',
  adminVipSyncView: 'admin.vip-sync.view',
  adminVipSyncManage: 'admin.vip-sync.manage',
  // GameBridge extension plan Part 5 + Bryan's follow-up decision
  // (2026-08-30): PURGE_GAME_ACCOUNT is irreversible and restricted to
  // SUPER_ADMIN by default -- ADMIN does not automatically inherit
  // destructive purge permission, unlike every other admin.* key here.
  // Delegating it to ADMIN in the future must be a deliberate,
  // separately-reviewed change, not an artifact of the blanket
  // adminAccountsStatusManage permission NORMAL_ACCOUNT_DELETION uses.
  adminAccountsPurgeManage: 'admin.accounts.purge.manage',
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
  // PHASE P (2026-08-31): the chargeback dispersal trace is a real
  // read-only report (WalletLedgerService.traceChargebackDispersal()),
  // but still real financial data about potentially multiple accounts,
  // gated distinctly from ordinary finance viewing (adminFinanceView).
  adminChargebackView: 'admin.chargeback.view',
  // PHASE P (2026-08-31): acting on a chargeback case (notes/resolution)
  // is more consequential than viewing the read-only dispersal trace --
  // separately gated, same reasoning as adminRechargeRefund vs.
  // adminOrdersOperate above.
  adminChargebackManage: 'admin.chargeback.manage',
  // PHASE P (2026-08-31): antifraud foundation -- risk case visibility and
  // the ability to apply/lift a case action (MANUAL_REVIEW/
  // PAYMENT_RESTRICTION/TRANSFER_RESTRICTION/ACCOUNT_RESTRICTION) are
  // gated separately, same "do not assume all ADM roles can act on this"
  // principle as every other finance-sensitive permission in this file.
  adminRiskView: 'admin.risk.view',
  adminRiskManage: 'admin.risk.manage',
  adminSystemManage: 'admin.system.manage',
  adminGuildsView: 'admin.guilds.view',
  adminGuildsModerate: 'admin.guilds.moderate',
  adminGuildsLevelsManage: 'admin.guilds.levels.manage',
  adminGuildsXpRulesManage: 'admin.guilds.xp-rules.manage',
  adminGuildsReportsView: 'admin.guilds.reports.view',
  adminLauncherContentRead: 'admin.launcher.content.read',
  adminLauncherContentEdit: 'admin.launcher.content.edit',
  adminLauncherContentPublish: 'admin.launcher.content.publish',
  adminLauncherAssetsManage: 'admin.launcher.assets.manage',
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

export type PermissionKey = typeof permissionKeys[keyof typeof permissionKeys]

const adminPermissions = Object.values(permissionKeys)
  .filter((permission): permission is PermissionKey => permission.startsWith('admin.'))

export const delegableAdminPermissions: PermissionKey[] = [...adminPermissions]

// GM event actions beyond viewing are deliberately NOT part of every GM's
// baseline (permissionsForRole below) -- "não entregar todas
// automaticamente se não forem necessárias". A SUPER_ADMIN grants these
// per-account via the same AccountPermission delegation mechanism ADMIN
// already uses (see accounts.service.ts's accountPermissions/
// updateAccountPermissions, extended to accept GM accounts too).
export const delegableGmPermissions: PermissionKey[] = [
  permissionKeys.gmEventsExecute,
  permissionKeys.gmEventsCancel,
  permissionKeys.gmEventsResultsValidate
]

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
  permissionKeys.gmOperationalLogsView,
  permissionKeys.gmOccurrencesView,
  permissionKeys.gmOccurrencesManage,
  permissionKeys.gmEventsView
]

const rolePermissions: Record<Role, PermissionKey[] | ['*']> = {
  PLAYER: playerPermissions,
  GM: gmPermissions,
  ADMIN: [
    ...playerPermissions,
    permissionKeys.guidesFutureView,
    permissionKeys.adminDashboardView,
    // ADMIN configures event definitions and schedules. Execution,
    // cancellation and result validation remain separately delegated.
    permissionKeys.gmEventsView
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
