export const permissions = {
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

export type Permission = typeof permissions[keyof typeof permissions]
export type UserRole = 'player' | 'admin' | 'super-admin'

export const roleLabels: Record<UserRole, string> = {
  player: 'Player',
  admin: 'Administrador',
  'super-admin': 'Super ADM'
}

const playerPermissions: Permission[] = [
  permissions.accountManage,
  permissions.charactersManage,
  permissions.shopAccess,
  permissions.marketplaceAccess,
  permissions.rechargeAccess
]

export const rolePermissions: Record<UserRole, Permission[] | ['*']> = {
  player: playerPermissions,
  admin: [
    ...playerPermissions,
    permissions.adminDashboardView,
    permissions.adminAccountsView,
    permissions.adminAccountsStatusManage,
    permissions.adminContentManage,
    permissions.adminAuditView,
    permissions.adminShopManage,
    permissions.adminOrdersOperate,
    permissions.adminMarketplaceManage,
    permissions.guidesFutureView
  ],
  'super-admin': ['*']
}

export const isAdminRole = (role?: UserRole) => role === 'admin' || role === 'super-admin'

export const roleHasPermission = (role: UserRole | undefined, permission: Permission) => {
  if (!role) return false
  const roleAccess = rolePermissions[role]
  return roleAccess.includes('*') || roleAccess.includes(permission)
}
