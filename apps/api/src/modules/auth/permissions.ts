import type { AccountPermission, Role } from '@prisma/client'

export const permissionKeys = {
  adminDashboardView: 'admin.dashboard.view',
  adminAccountsView: 'admin.accounts.view',
  adminAccountsStatusManage: 'admin.accounts.status.manage',
  adminRolesManage: 'admin.roles.manage',
  adminContentManage: 'admin.content.manage',
  adminAuditView: 'admin.audit.view',
  adminShopManage: 'admin.shop.manage',
  adminOrdersOperate: 'admin.orders.operate',
  adminMarketplaceManage: 'admin.marketplace.manage',
  adminGameBridgeManage: 'admin.game-bridge.manage',
  adminFinanceView: 'admin.finance.view',
  adminFinancialReportsView: 'admin.finance.reports.view',
  adminServerSettingsManage: 'admin.server-settings.manage',
  adminGameDataView: 'admin.game-data.view',
  adminRoadmapView: 'admin.roadmap.view',
  adminReferencesManage: 'admin.references.manage',
  adminFinanceManage: 'admin.finance.manage',
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

const adminPermissions = Object.values(permissionKeys)
  .filter((permission): permission is PermissionKey => permission.startsWith('admin.'))

export const delegableAdminPermissions: PermissionKey[] = [...adminPermissions]

const playerPermissions: PermissionKey[] = [
  permissionKeys.accountManage,
  permissionKeys.charactersManage,
  permissionKeys.shopAccess,
  permissionKeys.marketplaceAccess,
  permissionKeys.rechargeAccess
]

const rolePermissions: Record<Role, PermissionKey[] | ['*']> = {
  PLAYER: playerPermissions,
  ADMIN: [
    ...playerPermissions,
    ...adminPermissions,
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
