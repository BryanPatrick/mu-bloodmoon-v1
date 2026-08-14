import type { Permission, UserRole } from '~/data/security'
import { isTwoFactorMandatory, permissions } from '~/data/security'

const adminRoutePermissions: Array<[string, Permission]> = [
  ['/painel/admin/contas', permissions.adminAccountsView],
  ['/painel/admin/financeiro', permissions.adminFinancialReportsView],
  ['/painel/admin/conteudo', permissions.adminContentManage],
  ['/painel/admin/loja', permissions.adminStoreView],
  ['/painel/admin/marketplace', permissions.adminMarketplaceView],
  ['/painel/admin/comunidade', permissions.adminCommunityView],
  ['/painel/admin/tarefas', permissions.adminTasksView],
  ['/painel/admin/relatorios', permissions.adminReportsView],
  ['/painel/admin/moderacao', permissions.adminAccountsStatusManage],
  ['/painel/admin/tickets', permissions.adminAccountsStatusManage],
  ['/painel/admin/personagens', permissions.adminAccountsView],
  ['/painel/admin/roadmap', permissions.adminRoadmapView],
  ['/painel/admin/auditoria', permissions.adminAuditView],
  ['/painel/admin/historico', permissions.adminAuditHistoryView],
  ['/painel/admin/logs-trabalho', permissions.adminWorkLogsView],
  ['/painel/admin/eventos-operacionais', permissions.adminOperationalLogsView],
  ['/painel/admin/exportacoes', permissions.adminLogsExport],
  ['/painel/admin/erros', permissions.adminErrorsView],
  ['/painel/admin/alertas', permissions.adminAlertsView],
  ['/painel/admin/retencao', permissions.adminRetentionManage],
  ['/painel/admin/sistema', permissions.adminServerSettingsManage],
  ['/painel/admin/guildas', permissions.adminGuildsView]
]

const gmRoutePermissions: Array<[string, Permission]> = [
  ['/painel/gm/eventos', permissions.gmEventsView],
  ['/painel/gm/ocorrencias', permissions.gmOccurrencesView],
  ['/painel/gm/logs', permissions.gmOperationalLogsView],
  ['/painel/gm', permissions.gmDashboardView]
]

export default defineNuxtRouteMiddleware((to) => {
  const { hasPermission, isLoggedIn, loadSession, user } = useAuth()
  loadSession()

  if (to.path.startsWith('/painel') && !isLoggedIn.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // Backend already enforces this (RolesGuard rejects role-gated routes for
  // GM/ADMIN/SUPER_ADMIN accounts without 2FA active) -- this redirect is UX
  // only, so the user lands on the setup screen instead of a bare 403.
  const isAdminOrGmRoute = to.path.startsWith('/painel/admin') || to.path.startsWith('/painel/gm')
  if (
    isAdminOrGmRoute &&
    isTwoFactorMandatory(user.value?.role as UserRole | undefined) &&
    !user.value?.twoFactorEnabled
  ) {
    return navigateTo('/painel/conta')
  }

  if (to.path.startsWith('/painel/admin') && !hasPermission(permissions.adminDashboardView)) {
    return navigateTo('/painel/conta')
  }

  if (to.path.startsWith('/painel/gm') && !hasPermission(permissions.gmDashboardView)) {
    return navigateTo('/painel/conta')
  }

  const requiredPermission = [...adminRoutePermissions, ...gmRoutePermissions].find(([path]) => to.path.startsWith(path))?.[1]
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return navigateTo(`/acesso-negado?retorno=${encodeURIComponent('/painel')}`)
  }
})
