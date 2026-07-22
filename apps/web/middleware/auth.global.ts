import type { Permission } from '~/data/security'
import { permissions } from '~/data/security'

const adminRoutePermissions: Array<[string, Permission]> = [
  ['/painel/admin/contas', permissions.adminAccountsView],
  ['/painel/admin/financeiro', permissions.adminFinancialReportsView],
  ['/painel/admin/conteudo', permissions.adminContentManage],
  ['/painel/admin/loja', permissions.adminShopManage],
  ['/painel/admin/marketplace', permissions.adminMarketplaceManage],
  ['/painel/admin/moderacao', permissions.adminAccountsStatusManage],
  ['/painel/admin/tickets', permissions.adminAccountsStatusManage],
  ['/painel/admin/personagens', permissions.adminAccountsView],
  ['/painel/admin/auditoria', permissions.adminAuditView],
  ['/painel/admin/sistema', permissions.adminServerSettingsManage]
]

export default defineNuxtRouteMiddleware((to) => {
  const { hasPermission, isLoggedIn, loadSession } = useAuth()
  loadSession()

  if (to.path.startsWith('/painel') && !isLoggedIn.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  if (to.path.startsWith('/painel/admin') && !hasPermission(permissions.adminDashboardView)) {
    return navigateTo('/painel/conta')
  }

  const requiredPermission = adminRoutePermissions.find(([path]) => to.path.startsWith(path))?.[1]
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return navigateTo(`/acesso-negado?retorno=${encodeURIComponent('/painel')}`)
  }
})
