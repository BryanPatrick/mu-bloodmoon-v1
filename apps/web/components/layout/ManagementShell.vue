<template>
  <main class="min-h-screen text-white">
    <section
      class="mx-auto w-full max-w-[1880px] px-4 pb-16 pt-4 sm:px-6 lg:px-8"
    >
      <div class="bm-liquid-shell grid gap-6 p-3 sm:p-4 lg:grid-cols-[250px_1fr]">
        <aside class="bm-liquid-card h-fit p-4 lg:sticky lg:top-24">
          <div class="border-b border-white/10 pb-4">
            <p class="text-xs font-black uppercase tracking-[0.24em] text-ember">Gerenciamento</p>
            <p class="mt-2 truncate font-display text-2xl font-black">{{ user?.name || 'Conta' }}</p>
          </div>

          <nav v-if="isShellReady" class="mt-4 grid gap-2" aria-label="Menu de gerenciamento">
            <div v-if="referenceItem" class="grid gap-1">
              <button
                class="bm-nav-link flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold"
                :class="{ 'bm-nav-link-active': route.path.startsWith(referenceItem.to) }"
                type="button"
                @click="isReferenceOpen = !isReferenceOpen"
              >
                <component :is="referenceItem.icon" class="size-4 text-ember" />
                <span class="min-w-0 flex-1">{{ referenceItem.label }}</span>
                <ChevronDown class="size-4 transition" :class="{ 'rotate-180': isReferenceOpen }" />
              </button>

              <div v-if="isReferenceOpen" class="grid gap-1 pl-7">
                <NuxtLink
                  v-for="child in referenceItem.children"
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
              v-for="item in visibleItems"
              :key="item.to"
              :to="item.to"
              class="bm-nav-link flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold"
              :class="{ 'bm-nav-link-active': route.path === item.to }"
            >
              <component :is="item.icon" class="size-4 text-ember" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
          <div v-else class="mt-4 grid gap-2">
            <div v-for="item in 4" :key="item" class="h-10 rounded-2xl bg-white/8" />
          </div>

          <div v-if="isShellReady" class="mt-5 border-t border-white/10 pt-4">
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
import { ChevronDown, CircleDollarSign, ClipboardList, FileSearch, Images, LayoutDashboard, Settings, ShieldCheck, ShoppingBag, UserCog, Users } from 'lucide-vue-next'
import { permissions } from '~/data/security'

const route = useRoute()
const { hasPermission, loadSession, user } = useAuth()
const { getAccountByUsername, loadManagement } = useManagement()
const isReferenceOpen = ref(route.path.startsWith('/painel/admin/referencias'))
const isShellReady = ref(false)

onMounted(() => {
  loadSession()
  loadManagement()
  isShellReady.value = true
})

const accountCurrencies = computed(() => {
  const account = getAccountByUsername(user.value?.username)
  if (!account) {
    return user.value?.currencies || []
  }

  return Object.entries(account.currencies).map(([label, value]) => ({ label, value }))
})

const menuItems = computed(() => [
  { label: 'Dashboard', to: '/painel', icon: LayoutDashboard, adminOnly: true },
  { label: 'Contas', to: '/painel/admin/contas', icon: ShieldCheck, adminOnly: true },
  { label: 'Financeiro', to: '/painel/admin/financeiro', icon: CircleDollarSign, adminOnly: true },
  { label: 'Loja Admin', to: '/painel/admin/loja', icon: ShoppingBag, adminOnly: true },
  { label: 'Recargas Admin', to: '/painel/admin/recargas', icon: CircleDollarSign, adminOnly: true },
  { label: 'Implementacoes', to: '/painel/admin/pendencias', icon: ClipboardList, adminOnly: true },
  { label: 'Auditoria', to: '/painel/admin/auditoria', icon: FileSearch, adminOnly: true },
  { label: 'Sistema', to: '/painel/admin/sistema', icon: Settings, adminOnly: true },
  {
    label: 'Referencias Dev',
    to: '/painel/admin/referencias',
    icon: Images,
    adminOnly: true,
    children: [
      { label: 'Personagens', to: '/painel/admin/referencias?grupo=Personagens' },
      { label: 'Equipamentos', to: '/painel/admin/referencias?grupo=Equipamentos' },
      { label: 'Mapas', to: '/painel/admin/referencias?grupo=Mapas' },
      { label: 'Monstros', to: '/painel/admin/referencias?grupo=Monstros' },
      { label: 'Fontes', to: '/painel/admin/referencias?grupo=Fontes' }
    ]
  },
  { label: 'Gerenciar personagens', to: '/painel/personagens', icon: Users, adminOnly: false },
  { label: 'Gerenciar conta', to: '/painel/conta', icon: UserCog, adminOnly: false },
  { label: 'Acessar loja', to: '/painel/loja', icon: ShoppingBag, adminOnly: false }
])

const visibleMenuItems = computed(() => menuItems.value.filter((item) => !item.adminOnly || hasPermission(permissions.adminDashboardView)))
const referenceItem = computed(() => visibleMenuItems.value.find((item) => item.to === '/painel/admin/referencias'))
const visibleItems = computed(() => visibleMenuItems.value.filter((item) => item.to !== '/painel/admin/referencias'))
</script>
