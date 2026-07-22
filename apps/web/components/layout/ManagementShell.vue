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
  Bell, BookOpen, CalendarDays, ChevronDown, CircleDollarSign, FileSearch,
  FileText, Gamepad2, Gavel, LayoutDashboard, Newspaper, PackageCheck,
  PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, ShoppingBag,
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

type MenuChild = { label: string; to: string }
type MenuItem = {
  label: string
  to: string
  icon: unknown
  permission?: Permission
  roles?: UserRole[]
  children?: MenuChild[]
}

const administrativeItems: MenuItem[] = [
  { label: 'Dashboard administrativo', to: '/painel', icon: LayoutDashboard, permission: permissions.adminDashboardView },
  { label: 'Jogadores', to: '/painel/admin/contas', icon: Users, permission: permissions.adminAccountsView, roles: ['admin'] },
  { label: 'Contas', to: '/painel/admin/contas', icon: ShieldCheck, permission: permissions.adminAccountsView, roles: ['super-admin'] },
  { label: 'Administradores', to: '/painel/admin/contas?perfil=admin', icon: UserCog, permission: permissions.adminRolesManage, roles: ['super-admin'] },
  { label: 'Personagens', to: '/painel/admin/personagens', icon: Gamepad2, permission: permissions.adminAccountsView },
  {
    label: 'Conteúdo',
    to: '/painel/admin/conteudo?area=paginas',
    icon: FileText,
    permission: permissions.adminContentManage,
    children: [
      { label: 'Páginas', to: '/painel/admin/conteudo?area=paginas' },
      { label: 'Banners', to: '/painel/admin/conteudo?area=banners' },
      { label: 'Classes', to: '/painel/admin/conteudo?area=classes' },
      { label: 'Mapas', to: '/painel/admin/conteudo?area=mapas' },
      { label: 'Itens', to: '/painel/admin/conteudo?area=itens' }
    ]
  },
  { label: 'Wiki', to: '/painel/admin/conteudo?area=wiki', icon: BookOpen, permission: permissions.adminContentManage },
  { label: 'Notícias', to: '/painel/admin/conteudo?area=noticias', icon: Newspaper, permission: permissions.adminContentManage },
  { label: 'Eventos', to: '/painel/admin/conteudo?area=eventos', icon: CalendarDays, permission: permissions.adminContentManage },
  { label: 'Loja Admin', to: '/painel/admin/loja', icon: Store, permission: permissions.adminShopManage },
  { label: 'Marketplace Admin', to: '/painel/admin/marketplace', icon: ShoppingBag, permission: permissions.adminMarketplaceManage },
  { label: 'Moderação', to: '/painel/admin/moderacao', icon: Gavel, permission: permissions.adminAccountsStatusManage },
  { label: 'Tickets', to: '/painel/admin/tickets', icon: TicketCheck, permission: permissions.adminAccountsStatusManage },
  { label: 'Financeiro', to: '/painel/admin/financeiro', icon: CircleDollarSign, permission: permissions.adminFinancialReportsView, roles: ['super-admin'] },
  { label: 'Auditoria', to: '/painel/admin/auditoria', icon: FileSearch, permission: permissions.adminAuditView },
  { label: 'Configurações do servidor', to: '/painel/admin/sistema', icon: Settings, permission: permissions.adminServerSettingsManage, roles: ['super-admin'] }
]

const playerItems: MenuItem[] = [
  { label: 'Dashboard', to: '/painel', icon: LayoutDashboard, roles: ['player'] },
  { label: 'Minha conta', to: '/painel/conta', icon: UserCog },
  { label: 'Meus personagens', to: '/painel/personagens', icon: Users },
  { label: 'Loja', to: '/painel/loja', icon: Store },
  { label: 'Marketplace', to: '/painel/marketplace', icon: ShoppingBag },
  { label: 'Minhas compras', to: '/painel/compras', icon: PackageCheck },
  { label: 'Meus anúncios', to: '/painel/marketplace?visao=meus-anuncios', icon: ShoppingBag },
  { label: 'Notificações', to: '/painel/notificacoes', icon: Bell },
  { label: 'Suporte', to: '/painel/suporte', icon: TicketCheck },
  { label: 'Configurações', to: '/painel/configuracoes', icon: Settings }
]

const visibleMenuItems = computed(() => {
  const role = user.value?.role
  if (!role) return []
  const items = role === 'player' ? playerItems : [...administrativeItems, ...playerItems.filter((item) => item.to !== '/painel')]
  return items.filter((item) => (!item.roles || item.roles.includes(role)) && (!item.permission || hasPermission(item.permission)))
})

const toggleSection = (key: string) => {
  const next = new Set(openSections.value)
  next.has(key) ? next.delete(key) : next.add(key)
  openSections.value = next
}

const isItemActive = (item: MenuItem) => route.fullPath === item.to || item.children?.some((child) => route.fullPath === child.to)
</script>
