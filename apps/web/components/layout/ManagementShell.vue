<template>
  <main class="min-h-screen text-white">
    <section
      class="mx-auto w-full max-w-none px-4 pb-16 pt-3 sm:px-6 lg:px-6"
    >
      <div
        class="grid items-start gap-4"
        :class="isMenuCollapsed ? 'lg:grid-cols-[72px_1fr]' : 'lg:grid-cols-[250px_1fr]'"
      >
        <aside class="bm-liquid-card h-fit p-3 transition-[width] lg:sticky lg:top-24">
          <div class="border-b border-white/10 pb-4" :class="{ 'text-center': isMenuCollapsed }">
            <div class="flex items-start justify-between gap-3">
              <div v-if="!isMenuCollapsed" class="min-w-0">
                <p class="text-xs font-black uppercase tracking-[0.24em] text-ember">Gerenciamento</p>
                <p class="mt-2 truncate font-display text-2xl font-black">{{ user?.name || 'Conta' }}</p>
              </div>
              <button
                class="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/[0.065] text-white/70 transition hover:border-ember/45 hover:bg-ember/15 hover:text-white"
                type="button"
                :aria-label="isMenuCollapsed ? 'Expandir menu de gerenciamento' : 'Recolher menu de gerenciamento'"
                @click="toggleMenu"
              >
                <PanelLeftOpen v-if="isMenuCollapsed" class="size-4" />
                <PanelLeftClose v-else class="size-4" />
              </button>
            </div>
          </div>

          <nav v-if="isShellReady" class="mt-4 grid gap-2" aria-label="Menu de gerenciamento">
            <template v-for="item in visibleMenuItems" :key="item.to">
              <div v-if="item.children?.length && !isMenuCollapsed" class="grid gap-1">
                <button
                  class="bm-nav-link flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold"
                  :class="{ 'bm-nav-link-active': isItemActive(item) }"
                  type="button"
                  @click="toggleSection(item.to)"
                >
                  <component :is="item.icon" class="size-4 text-ember" />
                  <span class="min-w-0 flex-1 text-left">{{ item.label }}</span>
                  <ChevronDown class="size-4 transition" :class="{ 'rotate-180': openSections.has(item.to) }" />
                </button>

                <div v-if="openSections.has(item.to)" class="ml-5 grid gap-1 border-l border-white/10 pl-4">
                  <NuxtLink
                    v-for="child in item.children"
                    :key="child.to"
                    :to="child.to"
                    class="rounded-2xl px-3 py-2 text-xs font-black text-white/58 transition hover:bg-white/10 hover:text-white"
                    :class="{ 'bg-white/10 text-white': route.fullPath === child.to }"
                  >
                    {{ child.label }}
                  </NuxtLink>
                </div>
              </div>

              <NuxtLink
                v-else
                :to="item.to"
                class="bm-nav-link flex items-center rounded-2xl text-sm font-bold"
                :class="[
                  isMenuCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3',
                  { 'bm-nav-link-active': route.path === item.to }
                ]"
                :title="isMenuCollapsed ? item.label : undefined"
              >
                <component :is="item.icon" class="size-4 text-ember" />
                <span v-if="!isMenuCollapsed">{{ item.label }}</span>
              </NuxtLink>
            </template>
          </nav>
          <div v-else class="mt-4 grid gap-2">
            <div v-for="item in 4" :key="item" class="h-10 rounded-2xl bg-white/8" />
          </div>

          <div v-if="isShellReady && !isMenuCollapsed" class="mt-5 border-t border-white/10 pt-4">
            <p class="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">Moedas</p>
            <NuxtLink
              v-for="currency in accountCurrencies"
              :key="currency.label"
              to="/recarga"
              class="mt-2 flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2 transition hover:bg-white/15"
            >
              <span class="text-xs font-bold text-white/62">{{ currency.label }}</span>
              <span class="font-display text-sm font-black text-white">{{ currency.value.toLocaleString('pt-BR') }}</span>
            </NuxtLink>
          </div>
        </aside>

        <div class="min-w-0 p-1 sm:p-2">
          <slot />
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import {
  Activity, BarChart3, Bell, ChevronDown, FileSearch, LayoutDashboard, Map, PackageCheck,
  ListTodo, MessageCircle, PanelLeftClose, PanelLeftOpen, Settings, ShoppingBag,
  Store, TicketCheck, UserCog, Users
} from 'lucide-vue-next'
import { permissions, type Permission, type UserRole } from '~/data/security'

const route = useRoute()
const { hasPermission, loadSession, user } = useAuth()
const isShellReady = ref(false)
const isMenuCollapsed = ref(false)
const openSections = ref(new Set<string>())
const menuCollapsedStorageKey = 'blood-moon-management-menu-collapsed'

onMounted(() => {
  loadSession()
  isMenuCollapsed.value = localStorage.getItem(menuCollapsedStorageKey) === 'true'
  isShellReady.value = true
})

const toggleMenu = () => {
  isMenuCollapsed.value = !isMenuCollapsed.value
  if (import.meta.client) {
    localStorage.setItem(menuCollapsedStorageKey, String(isMenuCollapsed.value))
  }
}

const accountCurrencies = computed(() => user.value?.currencies || [])

type MenuChild = {
  label: string
  to: string
  permission?: Permission
  roles?: UserRole[]
}
type MenuItem = {
  label: string
  to: string
  icon: unknown
  permission?: Permission
  roles?: UserRole[]
  children?: MenuChild[]
}

const administrativeItems: MenuItem[] = [
  { label: 'Dashboard', to: '/painel', icon: LayoutDashboard, permission: permissions.adminDashboardView },
  {
    label: 'Gestão',
    to: '/painel/admin/tarefas',
    icon: ListTodo,
    children: [
      { label: 'Tarefas', to: '/painel/admin/tarefas?tab=tasks', permission: permissions.adminTasksView },
      { label: 'Notificações', to: '/painel/notificacoes' },
      { label: 'Minha atividade', to: '/painel/admin/logs-trabalho?usuario=me', permission: permissions.adminWorkLogsView }
    ]
  },
  {
    label: 'Roadmap',
    to: '/painel/admin/roadmap',
    icon: Map,
    children: [
      { label: 'Iniciativas', to: '/painel/admin/roadmap', permission: permissions.adminRoadmapView },
      { label: 'Atualizações', to: '/painel/admin/roadmap?visao=atualizacoes', permission: permissions.adminRoadmapView },
      { label: 'Categorias', to: '/painel/admin/roadmap?visao=categorias', permission: permissions.adminRoadmapView },
      { label: 'Revisões', to: '/painel/admin/roadmap?workflowStatus=IN_REVIEW', permission: permissions.adminRoadmapReview }
    ]
  },
  {
    label: 'Loja',
    to: '/painel/admin/loja',
    icon: Store,
    children: [
      { label: 'Produtos', to: '/painel/admin/loja?tab=products', permission: permissions.adminStoreView },
      { label: 'Categorias', to: '/painel/admin/loja?tab=categories', permission: permissions.adminStoreCategories },
      { label: 'Variantes', to: '/painel/admin/loja?tab=products&modo=variantes', permission: permissions.adminStoreProducts },
      { label: 'Pedidos', to: '/painel/admin/loja?tab=orders', permission: permissions.adminStoreOrders },
      { label: 'Entregas', to: '/painel/admin/loja?tab=deliveries', permission: permissions.adminStoreDeliveries },
      { label: 'Estornos', to: '/painel/admin/loja?tab=orders&status=REFUND_PENDING', permission: permissions.adminStoreRefund },
      { label: 'Importação do catálogo', to: '/painel/admin/loja?tab=products&modo=importacao', permission: permissions.adminStoreProducts }
    ]
  },
  {
    label: 'Marketplace',
    to: '/painel/admin/marketplace',
    icon: ShoppingBag,
    children: [
      { label: 'Anúncios', to: '/painel/admin/marketplace?secao=listings', permission: permissions.adminMarketplaceListingsModerate },
      { label: 'Transações', to: '/painel/admin/marketplace?secao=transactions', permission: permissions.adminMarketplaceTransactionsOperate },
      { label: 'Escrow', to: '/painel/admin/marketplace?secao=escrow', permission: permissions.adminMarketplaceEscrowOperate },
      { label: 'Denúncias', to: '/painel/admin/marketplace?secao=reports', permission: permissions.adminMarketplaceReportsModerate },
      { label: 'Usuários suspensos', to: '/painel/admin/marketplace?secao=listings&status=SUSPENDED', permission: permissions.adminMarketplaceUsersSuspend },
      { label: 'Configurações econômicas', to: '/painel/admin/marketplace?secao=economy', permission: permissions.adminMarketplaceEconomyManage }
    ]
  },
  {
    label: 'Comunidade',
    to: '/painel/admin/comunidade',
    icon: MessageCircle,
    children: [
      { label: 'Publicações', to: '/painel/admin/comunidade?tab=posts', permission: permissions.adminCommunityPostsModerate },
      { label: 'Comentários', to: '/painel/admin/comunidade?tab=comments', permission: permissions.adminCommunityCommentsModerate },
      { label: 'Denúncias', to: '/painel/admin/comunidade?tab=reports', permission: permissions.adminCommunityReportsModerate },
      { label: 'Usuários', to: '/painel/admin/comunidade?tab=users', permission: permissions.adminCommunityUsersModerate },
      { label: 'Conquistas', to: '/painel/admin/comunidade?tab=achievements', permission: permissions.adminCommunityAchievementsManage },
      { label: 'Quests', to: '/painel/admin/comunidade?tab=quests', permission: permissions.adminCommunityQuestsManage },
      { label: 'Badges', to: '/painel/admin/comunidade?tab=badges', permission: permissions.adminCommunityBadgesManage },
      { label: 'Moderação', to: '/painel/admin/comunidade?tab=policy', permission: permissions.adminCommunityPolicyManage }
    ]
  },
  {
    label: 'Monitoramento',
    to: '/painel/admin/erros',
    icon: Activity,
    children: [
      { label: 'Central de erros', to: '/painel/admin/erros', permission: permissions.adminErrorsView },
      { label: 'Falhas de entrega', to: '/painel/admin/eventos-operacionais?modulo=store&busca=DELIVERY_FAILED', permission: permissions.adminOperationalLogsView },
      { label: 'Falhas de marketplace', to: '/painel/admin/eventos-operacionais?modulo=marketplace&severidade=ERROR', permission: permissions.adminOperationalLogsView },
      { label: 'Alertas', to: '/painel/admin/alertas', permission: permissions.adminAlertsView }
    ]
  },
  {
    label: 'Auditoria',
    to: '/painel/admin/auditoria',
    icon: FileSearch,
    children: [
      { label: 'Ações administrativas', to: '/painel/admin/auditoria', permission: permissions.adminAuditView },
      { label: 'Histórico de alterações', to: '/painel/admin/historico', permission: permissions.adminAuditHistoryView },
      { label: 'Logs de trabalho', to: '/painel/admin/logs-trabalho', permission: permissions.adminWorkLogsView },
      { label: 'Eventos do sistema', to: '/painel/admin/eventos-operacionais', permission: permissions.adminOperationalLogsView }
    ]
  },
  {
    label: 'Relatórios',
    to: '/painel/admin/relatorios',
    icon: BarChart3,
    children: [
      { label: 'Equipe', to: '/painel/admin/relatorios?category=team', permission: permissions.adminTasksReportsView },
      { label: 'Roadmap', to: '/painel/admin/relatorios?category=roadmap', permission: permissions.adminRoadmapView },
      { label: 'Loja', to: '/painel/admin/relatorios?category=store', permission: permissions.adminStoreView },
      { label: 'Marketplace', to: '/painel/admin/relatorios?category=marketplace', permission: permissions.adminMarketplaceReportsView },
      { label: 'Comunidade', to: '/painel/admin/relatorios?category=community', permission: permissions.adminCommunityReportsView },
      { label: 'Erros', to: '/painel/admin/relatorios?category=errors', permission: permissions.adminErrorsView }
    ]
  },
  {
    label: 'Configurações',
    to: '/painel/admin/sistema',
    icon: Settings,
    roles: ['super-admin'],
    children: [
      { label: 'Permissões', to: '/painel/admin/contas?secao=permissoes', permission: permissions.adminRolesManage, roles: ['super-admin'] },
      { label: 'Administradores', to: '/painel/admin/contas?perfil=admin', permission: permissions.adminRolesManage, roles: ['super-admin'] },
      { label: 'Moedas', to: '/painel/admin/financeiro?secao=moedas', permission: permissions.adminFinanceManage, roles: ['super-admin'] },
      { label: 'Integrações', to: '/painel/admin/sistema?secao=integracoes', permission: permissions.adminServerSettingsManage, roles: ['super-admin'] },
      { label: 'Configurações gerais', to: '/painel/admin/sistema', permission: permissions.adminServerSettingsManage, roles: ['super-admin'] }
    ]
  }
]

const playerItems: MenuItem[] = [
  { label: 'Dashboard', to: '/painel', icon: LayoutDashboard, roles: ['player'] },
  { label: 'Minha conta', to: '/painel/conta', icon: UserCog },
  { label: 'Meus personagens', to: '/painel/personagens', icon: Users },
  { label: 'Loja', to: '/painel/loja', icon: Store },
  { label: 'Marketplace', to: '/painel/marketplace', icon: ShoppingBag },
  { label: 'Comunidade', to: '/comunidade', icon: MessageCircle },
  { label: 'Meu perfil social', to: '/comunidade?painel=perfil', icon: UserCog },
  { label: 'Minhas compras', to: '/painel/compras', icon: PackageCheck },
  { label: 'Meus anúncios', to: '/painel/marketplace?visao=meus-anuncios', icon: ShoppingBag },
  { label: 'Notificações', to: '/painel/notificacoes', icon: Bell },
  { label: 'Suporte', to: '/painel/suporte', icon: TicketCheck },
  { label: 'Configurações', to: '/painel/configuracoes', icon: Settings }
]

const visibleMenuItems = computed(() => {
  const role = user.value?.role
  if (!role) return []
  const items = role === 'player' ? playerItems : administrativeItems
  return items
    .filter((item) => (!item.roles || item.roles.includes(role)) && (!item.permission || hasPermission(item.permission)))
    .map((item) => ({
      ...item,
      children: item.children?.filter(
        (child) =>
          (!child.roles || child.roles.includes(role)) &&
          (!child.permission || hasPermission(child.permission))
      )
    }))
    .filter((item) => !item.children || item.children.length > 0)
})

const toggleSection = (key: string) => {
  const next = new Set(openSections.value)
  next.has(key) ? next.delete(key) : next.add(key)
  openSections.value = next
}

const isItemActive = (item: MenuItem) => route.fullPath === item.to || item.children?.some((child) => route.fullPath === child.to)

const openActiveSection = () => {
  const active = visibleMenuItems.value.find((item) =>
    item.children?.some((child) => route.path === child.to.split('?')[0])
  )
  if (!active) return
  const next = new Set(openSections.value)
  next.add(active.to)
  openSections.value = next
}

watch(
  [() => route.fullPath, () => visibleMenuItems.value.length],
  openActiveSection,
  { immediate: true }
)
</script>
