import type { Role } from '@prisma/client'

export const permissionKeys = {
  adminDashboardView: 'admin.dashboard.view',
  adminRoadmapView: 'admin.roadmap.view',
  adminReferencesManage: 'admin.references.manage',
  adminAuditView: 'admin.audit.view',
  adminFinanceManage: 'admin.finance.manage',
  adminShopManage: 'admin.shop.manage',
  adminMarketplaceManage: 'admin.marketplace.manage',
  adminGameBridgeManage: 'admin.game-bridge.manage',
  adminRechargeManage: 'admin.recharge.manage',
  adminSystemManage: 'admin.system.manage',
  accountManage: 'account.manage',
  charactersManage: 'characters.manage',
  shopAccess: 'shop.access',
  marketplaceAccess: 'marketplace.access',
  rechargeAccess: 'recharge.access',
  guidesFutureView: 'guides.future.view'
} as const

export type PermissionKey = typeof permissionKeys[keyof typeof permissionKeys]

const rolePermissions: Record<Role, PermissionKey[] | ['*']> = {
  PLAYER: [
    permissionKeys.accountManage,
    permissionKeys.charactersManage,
    permissionKeys.shopAccess,
    permissionKeys.marketplaceAccess,
    permissionKeys.rechargeAccess
  ],
  MODERATOR: [
    permissionKeys.accountManage,
    permissionKeys.charactersManage,
    permissionKeys.shopAccess,
    permissionKeys.marketplaceAccess,
    permissionKeys.rechargeAccess
  ],
  GAME_MASTER: [
    permissionKeys.accountManage,
    permissionKeys.charactersManage,
    permissionKeys.shopAccess,
    permissionKeys.marketplaceAccess,
    permissionKeys.rechargeAccess,
    permissionKeys.guidesFutureView
  ],
  ADMIN: [
    permissionKeys.adminDashboardView,
    permissionKeys.adminRoadmapView,
    permissionKeys.adminReferencesManage,
    permissionKeys.adminAuditView,
    permissionKeys.adminFinanceManage,
    permissionKeys.adminShopManage,
    permissionKeys.adminMarketplaceManage,
    permissionKeys.adminGameBridgeManage,
    permissionKeys.adminRechargeManage,
    permissionKeys.adminSystemManage,
    permissionKeys.accountManage,
    permissionKeys.charactersManage,
    permissionKeys.shopAccess,
    permissionKeys.marketplaceAccess,
    permissionKeys.rechargeAccess,
    permissionKeys.guidesFutureView
  ],
  SUPER_ADMIN: ['*']
}

export const permissionsForRole = (role: Role) => {
  const permissions = rolePermissions[role]
  return permissions[0] === '*' ? ['*'] : permissions
}

export const roleHasAny = (role: Role | undefined, allowedRoles: Role[]) =>
  Boolean(role && allowedRoles.includes(role))
