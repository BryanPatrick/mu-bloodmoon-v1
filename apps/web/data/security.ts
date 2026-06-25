export const permissions = {
  adminDashboardView: 'admin.dashboard.view',
  adminRoadmapView: 'admin.roadmap.view',
  adminReferencesManage: 'admin.references.manage',
  adminAuditView: 'admin.audit.view',
  adminFinanceManage: 'admin.finance.manage',
  adminShopManage: 'admin.shop.manage',
  adminRechargeManage: 'admin.recharge.manage',
  adminSystemManage: 'admin.system.manage',
  accountManage: 'account.manage',
  charactersManage: 'characters.manage',
  shopAccess: 'shop.access',
  rechargeAccess: 'recharge.access',
  guidesFutureView: 'guides.future.view'
} as const

export type Permission = typeof permissions[keyof typeof permissions]

export type UserRole = 'player' | 'moderator' | 'game-master' | 'admin' | 'super-admin'

export const roleLabels: Record<UserRole, string> = {
  player: 'Player',
  moderator: 'Moderador',
  'game-master': 'Game Master',
  admin: 'Administrador',
  'super-admin': 'Super Admin'
}

export const rolePermissions: Record<UserRole, Permission[] | ['*']> = {
  player: [
    permissions.accountManage,
    permissions.charactersManage,
    permissions.shopAccess,
    permissions.rechargeAccess
  ],
  moderator: [
    permissions.accountManage,
    permissions.charactersManage,
    permissions.shopAccess,
    permissions.rechargeAccess
  ],
  'game-master': [
    permissions.accountManage,
    permissions.charactersManage,
    permissions.shopAccess,
    permissions.rechargeAccess,
    permissions.guidesFutureView
  ],
  admin: [
    permissions.adminDashboardView,
    permissions.adminRoadmapView,
    permissions.adminReferencesManage,
    permissions.adminAuditView,
    permissions.adminFinanceManage,
    permissions.adminShopManage,
    permissions.adminRechargeManage,
    permissions.adminSystemManage,
    permissions.accountManage,
    permissions.charactersManage,
    permissions.shopAccess,
    permissions.rechargeAccess,
    permissions.guidesFutureView
  ],
  'super-admin': ['*']
}

export const isAdminRole = (role?: UserRole) => role === 'admin' || role === 'super-admin'

export const roleHasPermission = (role: UserRole | undefined, permission: Permission) => {
  if (!role) {
    return false
  }

  const roleAccess = rolePermissions[role]
  return roleAccess.includes('*') || roleAccess.includes(permission)
}
