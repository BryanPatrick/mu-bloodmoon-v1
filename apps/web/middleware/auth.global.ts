import { permissions } from '~/data/security'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) {
    return
  }

  const { hasPermission, isLoggedIn, loadSession } = useAuth()

  loadSession()

  if (to.path.startsWith('/painel') && !isLoggedIn.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  if (to.path.startsWith('/painel/admin') && !hasPermission(permissions.adminDashboardView)) {
    return navigateTo('/painel/conta')
  }
})
