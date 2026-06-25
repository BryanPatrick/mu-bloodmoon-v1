<template>
  <header ref="headerRef" class="bm-site-header bm-glass fixed inset-x-0 top-0 z-50 overflow-visible">
    <div class="bm-container flex h-20 items-center justify-between gap-4">
      <BloodLogo size="header" />

      <UNavigationMenu
        :items="navMenuItems"
        class="hidden lg:flex"
        color="neutral"
        variant="link"
        :content="{ sideOffset: 0 }"
        :ui="navMenuUi"
        aria-label="Menu principal"
      >
        <template #item-trailing="{ item, active }">
          <ChevronDown
            v-if="item.children?.length"
            class="size-4 transition-transform duration-200"
            :class="{ 'rotate-180 text-white': active }"
          />
        </template>
      </UNavigationMenu>

      <div class="hidden items-center gap-3 lg:flex">
        <div class="relative">
          <button class="bm-button-glass flex h-10 min-w-28 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition hover:scale-[1.03]" type="button" :aria-label="t('language')" @click="toggleLanguageMenu">
            <Languages class="size-4" />
            <span>{{ currentLocale.short }}</span>
            <ChevronDown class="size-4" />
          </button>
          <div v-if="isLanguageOpen" class="bm-nav-dropdown absolute right-0 z-[80] mt-8 w-72 rounded-md p-2">
            <button
              v-for="option in localeOptions"
              :key="option.code"
              class="bm-nav-link grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-md px-3 py-2.5 text-left text-sm font-semibold"
              :class="{ 'bm-nav-link-active': option.code === locale }"
              type="button"
              @click="chooseLocale(option.code)"
            >
              <span class="min-w-0 truncate">{{ option.label }}</span>
              <span class="rounded-sm bg-blood-700/20 px-2 py-0.5 text-[11px] font-extrabold text-blood-300">{{ option.short }}</span>
            </button>
          </div>
        </div>

        <button class="bm-button-glass grid size-10 place-items-center rounded-md transition hover:scale-[1.03]" type="button" :aria-label="themeLabel" @click="toggleTheme">
          <Sun v-if="isLight" class="size-5 text-ember" />
          <Moon v-else class="size-5 text-moon" />
        </button>

        <div v-if="isLoggedIn && user" class="relative">
          <button class="bm-button-glass flex h-10 items-center gap-2 rounded-md px-4 text-sm font-bold transition hover:scale-[1.02]" type="button" @click="toggleAccountMenu">
            <span>Bem vindo, {{ user.name }}!</span>
            <ChevronDown class="size-4 transition-transform" :class="{ 'rotate-180': isAccountOpen }" />
          </button>

          <div v-if="isAccountOpen" class="bm-nav-dropdown absolute right-0 z-[80] mt-8 w-80 rounded-md p-2">
            <NuxtLink
              v-for="item in accountLinks"
              :key="item.to"
              :to="item.to"
              class="bm-nav-link flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold"
              @click="closeMenus"
            >
              <component :is="item.icon" class="size-4 text-ember" />
              <span>{{ item.label }}</span>
            </NuxtLink>

            <div class="my-2 border-t border-white/10" />

            <div class="grid gap-2 px-3 py-2">
              <p class="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">Moedas</p>
              <NuxtLink v-for="currency in accountCurrencies" :key="currency.label" to="/recarga" class="flex items-center justify-between rounded-md bg-black/20 px-3 py-2 transition hover:bg-white/10" @click="closeMenus">
                <span class="text-xs font-bold text-white/65">{{ currency.label }}</span>
                <span class="font-display text-sm font-black text-white">{{ currency.value.toLocaleString('pt-BR') }}</span>
              </NuxtLink>
            </div>

            <button class="bm-nav-link mt-1 w-full rounded-md px-3 py-3 text-left text-sm font-bold" type="button" @click="logoutAndClose">
              Sair
            </button>
          </div>
        </div>

        <template v-else>
          <NuxtLink to="/login" class="bm-button-glass rounded-md px-4 py-2 text-sm font-bold transition hover:scale-[1.02]">
            {{ t('login') }}
          </NuxtLink>
          <NuxtLink to="/registrar" class="rounded-md bg-blood-700 px-4 py-2 text-sm font-bold text-white shadow-glow transition hover:bg-blood-500">
            {{ t('register') }}
          </NuxtLink>
        </template>
      </div>

      <button class="bm-button-glass grid size-11 place-items-center rounded-md lg:hidden" type="button" @click="isMobileOpen = !isMobileOpen">
        <Menu v-if="!isMobileOpen" class="size-5" />
        <X v-else class="size-5" />
      </button>
    </div>

    <div v-if="isMobileOpen" class="bm-glass border-t border-white/10 lg:hidden">
      <div class="bm-container grid gap-2 py-4">
        <UNavigationMenu
          :items="navMenuItems"
          orientation="vertical"
          color="neutral"
          variant="link"
          :ui="mobileNavMenuUi"
          aria-label="Menu principal mobile"
        >
          <template #item-trailing="{ item, active }">
            <ChevronDown
              v-if="item.children?.length"
              class="size-4 transition-transform duration-200"
              :class="{ 'rotate-180 text-white': active }"
            />
          </template>
        </UNavigationMenu>

        <div class="grid gap-2">
          <button class="bm-button-glass rounded-md px-3 py-3 text-left text-sm font-bold" type="button" @click="isLanguageOpen = !isLanguageOpen">
            {{ t('language') }}: {{ currentLocale.short }}
          </button>
          <div v-if="isLanguageOpen" class="grid gap-1">
            <button
              v-for="option in localeOptions"
              :key="option.code"
              class="bm-nav-link rounded-md px-3 py-2 text-left text-sm font-semibold"
              :class="{ 'bm-nav-link-active': option.code === locale }"
              type="button"
              @click="chooseLocale(option.code)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <button class="bm-button-glass rounded-md px-3 py-3 text-center text-sm font-bold" type="button" @click="toggleTheme">
          {{ themeLabel }}
        </button>

        <div v-if="isLoggedIn && user" class="grid gap-2 pt-2">
          <div class="bm-button-glass rounded-md px-3 py-3 text-sm font-bold">
            Bem vindo, {{ user.name }}!
          </div>
          <NuxtLink v-for="item in accountLinks" :key="item.to" :to="item.to" class="bm-nav-link rounded-md px-3 py-3 text-sm font-bold" @click="isMobileOpen = false">
            {{ item.label }}
          </NuxtLink>
          <div class="grid grid-cols-3 gap-2">
            <NuxtLink v-for="currency in accountCurrencies" :key="currency.label" to="/recarga" class="rounded-md border border-white/10 bg-black/20 p-2" @click="isMobileOpen = false">
              <p class="truncate text-[10px] font-black uppercase text-white/45">{{ currency.label }}</p>
              <p class="font-display text-sm font-black text-white">{{ currency.value.toLocaleString('pt-BR') }}</p>
            </NuxtLink>
          </div>
          <button class="bm-nav-link rounded-md px-3 py-3 text-left text-sm font-bold" type="button" @click="logoutAndClose">
            Sair
          </button>
        </div>

        <div v-else class="grid grid-cols-2 gap-2 pt-2">
          <NuxtLink to="/login" class="bm-button-glass rounded-md px-3 py-3 text-center text-sm font-bold">{{ t('login') }}</NuxtLink>
          <NuxtLink to="/registrar" class="rounded-md bg-blood-700 px-3 py-3 text-center text-sm font-bold text-white">{{ t('register') }}</NuxtLink>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ChevronDown, Languages, LayoutDashboard, Menu, Moon, ShoppingBag, Sun, UserCog, Users, X } from 'lucide-vue-next'
import { permissions } from '~/data/security'

const route = useRoute()
const router = useRouter()
const { currentLocale, dictionary, locale, localeOptions, setLocale, t } = useLocale()
const { hasPermission, isLoggedIn, loadSession, logout, user } = useAuth()
const { getAccountByUsername, loadManagement } = useManagement()
const headerRef = ref<HTMLElement | null>(null)
const isMobileOpen = ref(false)
const isLanguageOpen = ref(false)
const isAccountOpen = ref(false)
const isLight = ref(false)
const themeLabel = computed(() => (isLight.value ? t('darkMode') : t('lightMode')))

const navLabel = (to: string, fallback: string) => dictionary.value.nav.find((item) => item.to === to)?.label || fallback
const closeAfterNavigate = () => closeMenus()

const navMenuItems = computed(() => [
  {
    label: navLabel('/noticias', 'Noticias'),
    value: '/noticias',
    active: isNavActive('/noticias'),
    class: isNavActive('/noticias') ? 'bm-nav-link-active' : '',
    children: [
      { label: 'Todas as noticias', description: 'Central completa com eventos, atualizacoes e avisos.', to: '/noticias', onSelect: closeAfterNavigate },
      { label: 'Eventos', description: 'Atalhos para novidades de eventos e bonificacoes.', to: '/noticias?categoria=eventos', onSelect: closeAfterNavigate },
      { label: 'Atualizacoes', description: 'Mudancas de servidor, balanceamentos e melhorias.', to: '/noticias?categoria=atualizacoes', onSelect: closeAfterNavigate },
      { label: 'Manutencoes', description: 'Janelas tecnicas, correcoes e estabilidade.', to: '/noticias?categoria=manutencoes', onSelect: closeAfterNavigate }
    ]
  },
  {
    label: navLabel('/downloads', 'Downloads'),
    value: '/downloads',
    to: '/downloads',
    active: isNavActive('/downloads'),
    class: isNavActive('/downloads') ? 'bm-nav-link-active' : '',
    onSelect: closeAfterNavigate
  },
  {
    label: navLabel('/rankings', 'Rankings'),
    value: '/rankings',
    active: isNavActive('/rankings'),
    class: isNavActive('/rankings') ? 'bm-nav-link-active' : '',
    children: [
      { label: 'Ranking geral', description: 'Pagina completa com todos os filtros competitivos.', to: '/rankings', onSelect: closeAfterNavigate },
      { label: 'Reset', description: 'Acompanhe a corrida principal da temporada.', to: '/rankings?tipo=reset', onSelect: closeAfterNavigate },
      { label: 'Master Reset', description: 'Progressao avancada e disputa de longo prazo.', to: '/rankings?tipo=master-reset', onSelect: closeAfterNavigate },
      { label: 'PvP', description: 'Pontuacao de duelos, kills e performance em combate.', to: '/rankings?tipo=pvp', onSelect: closeAfterNavigate },
      { label: 'Guilds', description: 'Guilds em destaque e dominio competitivo.', to: '/rankings?tipo=guilds', onSelect: closeAfterNavigate },
      { label: 'Eventos', description: 'Rankings especificos de eventos do servidor.', to: '/rankings?tipo=eventos', onSelect: closeAfterNavigate }
    ]
  },
  {
    label: navLabel('/wiki', 'Wiki'),
    value: '/wiki',
    to: '/wiki',
    active: isNavActive('/wiki'),
    class: isNavActive('/wiki') ? 'bm-nav-link-active' : '',
    onSelect: closeAfterNavigate
  },
  {
    label: navLabel('/about', 'About'),
    value: '/about',
    to: '/about',
    active: isNavActive('/about'),
    class: isNavActive('/about') ? 'bm-nav-link-active' : '',
    onSelect: closeAfterNavigate
  }
])

const navMenuUi = {
  root: 'overflow-visible',
  list: 'items-center gap-1 bg-transparent',
  item: 'relative',
  link: 'bm-nav-link rounded-md px-4 py-2 text-sm font-semibold transition hover:scale-[1.02] data-[state=open]:bg-white/[0.12] data-[state=open]:text-white',
  linkLabel: 'font-semibold',
  linkTrailing: 'ml-1.5',
  content: 'bm-nav-dropdown min-w-[30rem] rounded-md p-2',
  viewport: 'mt-8 overflow-hidden rounded-md border-0 bg-transparent shadow-none',
  childList: 'grid min-w-[30rem] grid-cols-2 gap-2 p-2',
  childLink: 'bm-nav-link rounded-md p-3 transition hover:scale-[1.01]',
  childLinkLabel: 'font-bold text-white',
  childLinkDescription: 'mt-1 text-xs leading-5 text-zinc-400'
}

const mobileNavMenuUi = {
  list: 'grid gap-2 bg-transparent',
  item: 'w-full',
  link: 'bm-nav-link w-full rounded-md px-3 py-3 text-sm font-bold',
  linkLabel: 'font-bold',
  linkTrailing: 'ml-auto',
  childList: 'grid gap-1 py-1 pl-3',
  childLink: 'bm-nav-link rounded-md px-3 py-2',
  childLinkLabel: 'text-sm font-bold text-white',
  childLinkDescription: 'text-xs leading-5 text-zinc-400'
}

const accountLinks = computed(() => [
  ...(hasPermission(permissions.adminDashboardView) ? [{ label: 'Dashboard', to: '/painel', icon: LayoutDashboard }] : []),
  { label: 'Gerenciar personagens', to: '/painel/personagens', icon: Users },
  { label: 'Gerenciar conta', to: '/painel/conta', icon: UserCog },
  { label: 'Acessar loja', to: '/painel/loja', icon: ShoppingBag }
])

const accountCurrencies = computed(() => {
  const account = getAccountByUsername(user.value?.username)
  if (!account) {
    return user.value?.currencies || []
  }

  return Object.entries(account.currencies).map(([label, value]) => ({ label, value }))
})

type LocaleCode = 'pt-BR' | 'pt-PT' | 'es-ES' | 'en-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'it-IT'

const applyTheme = (theme: 'light' | 'dark') => {
  isLight.value = theme === 'light'
  document.documentElement.classList.toggle('light', isLight.value)
  document.documentElement.classList.toggle('dark', !isLight.value)
  localStorage.setItem('blood-moon-theme', theme)
}

const toggleTheme = () => {
  applyTheme(isLight.value ? 'dark' : 'light')
}

const toggleLanguageMenu = () => {
  isLanguageOpen.value = !isLanguageOpen.value
  if (isLanguageOpen.value) {
    isAccountOpen.value = false
  }
}

const toggleAccountMenu = () => {
  isAccountOpen.value = !isAccountOpen.value
  if (isAccountOpen.value) {
    isLanguageOpen.value = false
  }
}

const closeMenus = () => {
  isLanguageOpen.value = false
  isAccountOpen.value = false
  isMobileOpen.value = false
}

const logoutAndClose = () => {
  logout()
  closeMenus()
  router.push('/')
}

const isNavActive = (to: string) => route.path.startsWith(to) && to !== '/'

const chooseLocale = (code: LocaleCode) => {
  setLocale(code)
  isLanguageOpen.value = false
  isMobileOpen.value = false
}

onMounted(() => {
  loadSession()
  loadManagement()
  isLight.value = document.documentElement.classList.contains('light')
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (target && headerRef.value?.contains(target)) {
    return
  }

  isLanguageOpen.value = false
  isAccountOpen.value = false
}
</script>
