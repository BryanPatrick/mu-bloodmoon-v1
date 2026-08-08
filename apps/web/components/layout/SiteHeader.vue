<template>
  <header ref="headerRef" class="bm-site-header fixed inset-x-0 top-0 z-50">
    <div class="bm-container flex h-[87px] items-center justify-between gap-5">
      <BloodLogo size="header" />

      <UNavigationMenu
        :items="navMenuItems"
        class="bm-desktop-nav hidden xl:flex"
        color="neutral"
        variant="link"
        :content="{ sideOffset: 10 }"
        :ui="navMenuUi"
        aria-label="Navegacao principal"
      />

      <div class="hidden items-center gap-2 xl:flex">
        <a class="bm-header-discord" href="#"><MessageCircle class="size-4" /> Discord</a>
        <div v-if="isLoggedIn && user" class="relative">
          <button class="bm-header-action" type="button" @click.stop="toggleAccountMenu">
            <CircleUserRound class="size-4" />
            <span>Ola, {{ user.name }}</span>
            <ChevronDown class="size-4" :class="{ 'rotate-180': isAccountOpen }" />
          </button>
          <div v-if="isAccountOpen" class="bm-nav-dropdown absolute right-0 top-full mt-2 w-80 p-2">
            <NuxtLink v-for="item in accountLinks" :key="item.to" :to="item.to" class="bm-nav-link flex items-center gap-3 px-3 py-3 text-sm font-bold" @click="closeMenus">
              <component :is="item.icon" class="size-4 text-blood-600" />
              {{ item.label }}
            </NuxtLink>
            <div class="my-2 border-t border-black/10" />
            <NuxtLink v-for="currency in accountCurrencies" :key="currency.label" to="/recarga" class="bm-currency-row" @click="closeMenus">
              <span>{{ currency.label }}</span><strong>{{ currency.value.toLocaleString('pt-BR') }}</strong>
            </NuxtLink>
            <button class="bm-nav-link mt-1 w-full px-3 py-3 text-left text-sm font-bold" type="button" @click="logoutAndClose">Sair</button>
          </div>
        </div>

        <template v-else>
          <NuxtLink to="/login" class="bm-button bm-button-secondary">Entrar</NuxtLink>
          <NuxtLink to="/registrar" class="bm-button bm-button-primary">Criar conta</NuxtLink>
        </template>
      </div>

      <button class="bm-menu-trigger xl:hidden" type="button" :aria-expanded="isMobileOpen" aria-controls="mobile-navigation" aria-label="Abrir menu" @click="isMobileOpen = !isMobileOpen">
        <Menu v-if="!isMobileOpen" class="size-5" />
        <X v-else class="size-5" />
      </button>
    </div>

    <Transition name="drawer">
      <div v-if="isMobileOpen" id="mobile-navigation" class="bm-mobile-drawer xl:hidden">
        <div class="bm-mobile-drawer-head">
          <span class="bm-kicker">Navegacao</span>
          <button class="bm-icon-button" type="button" aria-label="Fechar menu" @click="isMobileOpen = false"><X class="size-5" /></button>
        </div>
        <nav class="grid gap-1" aria-label="Navegacao mobile">
          <div v-for="item in mobileItems" :key="item.label">
            <NuxtLink v-if="item.to" :to="item.to" class="bm-mobile-link" @click="closeMenus">
              <component :is="item.icon" class="size-4" />{{ item.label }}
            </NuxtLink>
          </div>
        </nav>
        <div class="mt-auto grid gap-3 border-t border-black/10 pt-5">
          <label class="bm-field-label" for="mobile-language">Idioma</label>
          <select id="mobile-language" class="bm-input" :value="locale" @change="chooseLocale(($event.target as HTMLSelectElement).value as LocaleCode)">
            <option v-for="option in localeOptions" :key="option.code" :value="option.code">{{ option.label }}</option>
          </select>
          <template v-if="isLoggedIn && user">
            <NuxtLink v-for="item in accountLinks" :key="item.to" :to="item.to" class="bm-mobile-link" @click="closeMenus">
              <component :is="item.icon" class="size-4" />{{ item.label }}
            </NuxtLink>
            <button class="bm-button bm-button-secondary w-full" type="button" @click="logoutAndClose">Sair</button>
          </template>
          <div v-else class="grid grid-cols-2 gap-2">
            <NuxtLink to="/login" class="bm-button bm-button-secondary" @click="closeMenus">Entrar</NuxtLink>
            <NuxtLink to="/registrar" class="bm-button bm-button-primary" @click="closeMenus">Criar conta</NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
    <Transition name="fade"><button v-if="isMobileOpen" class="bm-drawer-backdrop xl:hidden" type="button" aria-label="Fechar menu" @click="isMobileOpen = false" /></Transition>
  </header>
</template>

<script setup lang="ts">
import { BookOpen, ChevronDown, CircleUserRound, Compass, Download, Info, LayoutDashboard, Menu, MessageCircle, Newspaper, ShoppingBag, ShoppingBasket, Store, Trophy, UserCog, Users, UsersRound, X } from 'lucide-vue-next'
import { permissions } from '~/data/security'

const route = useRoute()
const router = useRouter()
const { currentLocale, locale, localeOptions, setLocale } = useLocale()
const { hasPermission, isLoggedIn, loadSession, logout, user } = useAuth()
const headerRef = ref<HTMLElement | null>(null)
const isMobileOpen = ref(false)
const isLanguageOpen = ref(false)
const isAccountOpen = ref(false)

const links = [
  { label: 'Home', to: '/', icon: CircleUserRound },
  { label: 'Notícias', to: '/noticias', icon: Newspaper },
  { label: 'Wiki', to: '/wiki', icon: BookOpen },
  { label: 'Ranking', to: '/rankings', icon: Trophy },
  { label: 'Downloads', to: '/downloads', icon: Download },
  { label: 'Roadmap', to: '/roadmap', icon: Compass },
  { label: 'Loja', to: '/loja', icon: Store },
  { label: 'Marketplace', to: '/marketplace', icon: ShoppingBasket },
  { label: 'Comunidade', to: '/comunidade', icon: UsersRound },
  { label: 'Sobre', to: '/about', icon: Info }
]
const mobileItems = links
const navMenuItems = computed(() => links.map((link) => ({
  label: link.label,
  to: link.to,
  active: link.to === '/' ? route.path === '/' : route.path.startsWith(link.to)
})))
const navMenuUi = {
  list: 'items-center gap-1 bg-transparent',
  link: 'bm-nav-link px-3 py-2 text-[13px] font-bold',
  content: 'bm-nav-dropdown min-w-[28rem] p-2',
  viewport: 'mt-2 overflow-hidden bg-transparent shadow-none',
  childList: 'grid min-w-[28rem] grid-cols-2 gap-1 p-1',
  childLink: 'bm-nav-link p-3',
  childLinkLabel: 'font-bold',
  childLinkDescription: 'mt-1 text-xs leading-5 text-stone-500'
}
const accountLinks = computed(() => [
  ...(hasPermission(permissions.adminDashboardView) ? [{ label: 'Painel administrativo', to: '/painel', icon: LayoutDashboard }] : []),
  { label: 'Personagens', to: '/painel/personagens', icon: Users },
  { label: 'Minha conta', to: '/painel/conta', icon: UserCog },
  { label: 'Loja', to: '/painel/loja', icon: ShoppingBag }
])
const accountCurrencies = computed(() => user.value?.currencies || [])
type LocaleCode = 'pt-BR' | 'pt-PT' | 'es-ES' | 'en-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'it-IT'
const toggleLanguageMenu = () => { isLanguageOpen.value = !isLanguageOpen.value; isAccountOpen.value = false }
const toggleAccountMenu = () => { isAccountOpen.value = !isAccountOpen.value; isLanguageOpen.value = false }
const closeMenus = () => { isLanguageOpen.value = false; isAccountOpen.value = false; isMobileOpen.value = false }
const chooseLocale = (code: LocaleCode) => { setLocale(code); closeMenus() }
const logoutAndClose = () => { logout(); closeMenus(); router.push('/') }
const closeOutside = (event: MouseEvent) => { if (!headerRef.value?.contains(event.target as Node)) closeMenus() }
onMounted(() => { loadSession(); document.addEventListener('click', closeOutside) })
onBeforeUnmount(() => document.removeEventListener('click', closeOutside))
watch(() => route.fullPath, () => closeMenus())
</script>
