<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminDashboardView)" class="grid gap-4">
      <section class="bm-dashboard-shell grid gap-4 p-3 md:p-4 xl:grid-cols-[72px_1fr]">
        <aside class="hidden rounded-[22px] border border-white/10 bg-black/22 p-3 xl:grid xl:content-between">
          <div class="grid gap-3">
            <button
              v-for="item in sideActions"
              :key="item.label"
              class="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/70 transition hover:border-ember/45 hover:bg-ember/15 hover:text-white"
              type="button"
              :aria-label="item.label"
            >
              <component :is="item.icon" class="size-4" />
            </button>
          </div>

          <div class="grid gap-3">
            <button class="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/70" type="button" aria-label="Notificacoes">
              <Bell class="size-4" />
            </button>
            <button class="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/70" type="button" aria-label="Configuracoes">
              <Settings class="size-4" />
            </button>
          </div>
        </aside>

        <div class="grid min-w-0 gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <p class="bm-kicker">Blood Moon Admin</p>
              <h1 class="mt-[6px] font-display text-3xl font-black uppercase text-white">Painel administrativo</h1>
            </div>

            <div class="flex items-center gap-2">
              <button class="bm-dashboard-icon" type="button" aria-label="Mensagens">
                <Mail class="size-4" />
              </button>
              <button class="bm-dashboard-icon" type="button" aria-label="Busca">
                <Search class="size-4" />
              </button>
              <div class="grid size-10 place-items-center rounded-full border border-white/15 bg-gradient-to-br from-blood-500/45 via-ember/35 to-cyan-300/35 font-display text-sm font-black">
                {{ userInitials }}
              </div>
            </div>
          </div>

          <section class="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
            <article class="bm-dashboard-hero min-h-[280px] overflow-hidden rounded-[28px] p-5 sm:p-6">
              <div class="relative z-10 max-w-[560px]">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-white/58">Visao geral</p>
                <h2 class="mt-3 max-w-[420px] text-4xl font-black leading-tight text-white sm:text-5xl">
                  Controle o servidor sem perder o ritmo.
                </h2>
                <p class="mt-4 max-w-[440px] text-sm font-semibold leading-6 text-white/66">
                  Acompanhe contas, personagens, recargas e pendencias operacionais em uma leitura unica.
                </p>
                <NuxtLink to="/painel/admin/pendencias" class="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-zinc-950 transition hover:scale-[1.02]">
                  Revisar pendencias
                </NuxtLink>
              </div>

              <div class="relative z-10 mt-7 grid gap-3 sm:grid-cols-4">
                <div v-for="metric in heroMetrics" :key="metric.label" class="rounded-2xl border border-white/12 bg-white/[0.10] p-3 backdrop-blur-xl">
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">{{ metric.label }}</p>
                  <p class="mt-2 font-display text-2xl font-black text-white">{{ metric.value }}</p>
                </div>
              </div>
            </article>

            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <article class="bm-dashboard-card p-5">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Usuarios ativos</p>
                    <h3 class="mt-1 font-display text-3xl font-black text-white">{{ onlineUsers }}</h3>
                  </div>
                  <span class="rounded-full bg-emerald-400/16 px-3 py-1 text-xs font-black text-emerald-100">Online</span>
                </div>

                <div class="mt-6 h-28">
                  <svg class="h-full w-full overflow-visible" viewBox="0 0 320 120" role="img" aria-label="Grafico de usuarios ativos">
                    <polyline points="0,92 42,70 84,78 126,44 168,58 210,28 252,38 320,16" fill="none" stroke="rgba(245,158,11,.95)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    <polyline points="0,102 42,84 84,88 126,68 168,72 210,46 252,52 320,34" fill="none" stroke="rgba(103,232,249,.72)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
              </article>

              <article class="bm-dashboard-card grid grid-cols-[1fr_112px] items-center gap-4 p-5">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Receita recente</p>
                  <h3 class="mt-2 font-display text-3xl font-black text-white">R$ {{ recentRevenue }}</h3>
                  <p class="mt-2 text-xs font-bold text-emerald-200">+{{ rechargeGrowth }}% comparado ao ciclo anterior</p>
                </div>
                <div class="grid aspect-square place-items-center rounded-[26px] border border-white/12 bg-black/20">
                  <Gem class="size-12 text-cyan-200 drop-shadow-[0_0_18px_rgba(103,232,249,.45)]" />
                </div>
              </article>
            </div>
          </section>

          <section class="grid gap-4 xl:grid-cols-[1fr_0.42fr]">
            <article class="bm-dashboard-card p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Movimento do servidor</p>
                  <h3 class="mt-1 font-display text-2xl font-black text-white">Atividade semanal</h3>
                </div>
                <button class="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black text-white/75" type="button">
                  Popularidade
                </button>
              </div>

              <div class="mt-6 grid h-56 grid-cols-12 items-end gap-2 rounded-[22px] border border-white/10 bg-black/16 p-4">
                <div
                  v-for="(bar, index) in chartBars"
                  :key="index"
                  class="rounded-t-full bg-gradient-to-t from-blood-700 via-ember to-cyan-200 shadow-[0_0_24px_rgba(245,158,11,0.18)]"
                  :style="{ height: `${bar}%` }"
                />
              </div>
            </article>

            <article class="bm-dashboard-card p-5">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Moedas da conta</p>
              <div class="mt-4 grid gap-3">
                <NuxtLink
                  v-for="currency in accountCurrencies"
                  :key="currency.label"
                  to="/recarga"
                  class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 transition hover:border-ember/45 hover:bg-ember/12"
                >
                  <span class="text-sm font-bold text-white/62">{{ currency.label }}</span>
                  <span class="font-display text-lg font-black text-white">{{ currency.value.toLocaleString('pt-BR') }}</span>
                </NuxtLink>
              </div>
            </article>
          </section>

          <article class="bm-dashboard-card overflow-hidden p-4">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Fila operacional</p>
                <h3 class="mt-1 font-display text-2xl font-black text-white">Ultimas leituras administrativas</h3>
              </div>
              <NuxtLink to="/painel/admin/auditoria" class="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black text-white/75">
                Ver auditoria
              </NuxtLink>
            </div>

            <div class="grid gap-2">
              <article
                v-for="row in activityRows"
                :key="row.title"
                class="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 md:grid-cols-[52px_1fr_120px_100px]"
              >
                <div class="grid size-12 place-items-center rounded-2xl bg-black/22">
                  <component :is="row.icon" class="size-5 text-ember" />
                </div>
                <div>
                  <h4 class="font-bold text-white">{{ row.title }}</h4>
                  <p class="mt-1 text-xs leading-5 text-white/50">{{ row.description }}</p>
                </div>
                <span class="self-center text-xs font-black uppercase tracking-[0.16em] text-white/45">{{ row.status }}</span>
                <span class="self-center text-right text-xs font-black text-emerald-200">{{ row.trend }}</span>
              </article>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-else class="bm-liquid-card p-6">
      <p class="bm-kicker">Conta</p>
      <h1 class="mt-2 font-display text-4xl font-black uppercase">Acesso administrativo</h1>
      <p class="mt-3 text-sm font-semibold leading-7 text-white/68">
        Dashboard disponivel apenas para contas administrativas.
      </p>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { Bell, ClipboardList, Gem, LayoutDashboard, Mail, Search, Settings, ShieldCheck, ShoppingBag, UserCog, Users } from 'lucide-vue-next'
import { permissions } from '~/data/security'

const { hasPermission, loadSession, user } = useAuth()
const { getAccountByUsername, loadManagement, state } = useManagement()

useSeoMeta({ title: 'Painel administrativo' })

onMounted(() => {
  loadSession()
  loadManagement()
})

const accountCurrencies = computed(() => {
  const account = getAccountByUsername(user.value?.username)
  if (!account) {
    return user.value?.currencies || []
  }

  return Object.entries(account.currencies).map(([label, value]) => ({ label, value }))
})

const onlineUsers = computed(() => Math.max(42, state.value.characters.length * 8 + 18))
const recentRevenue = computed(() => (state.value.recharges.length * 129 + 586).toLocaleString('pt-BR'))
const rechargeGrowth = computed(() => Math.max(12, state.value.recharges.length * 6))
const userInitials = computed(() => (user.value?.name || 'BM').slice(0, 2).toUpperCase())

const heroMetrics = computed(() => [
  { label: 'Contas', value: state.value.accounts.length.toString() },
  { label: 'Chars', value: state.value.characters.length.toString() },
  { label: 'Compras', value: state.value.purchases.length.toString() },
  { label: 'Recargas', value: state.value.recharges.length.toString() }
])

const sideActions = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Contas', icon: ShieldCheck },
  { label: 'Personagens', icon: Users },
  { label: 'Loja', icon: ShoppingBag },
  { label: 'Conta', icon: UserCog },
  { label: 'Pendencias', icon: ClipboardList }
]

const activityRows = computed(() => [
  {
    icon: Users,
    title: 'Personagens cadastrados',
    description: 'Base pronta para cruzar personagens, classes e futuras leituras do servidor.',
    status: `${state.value.characters.length} registros`,
    trend: '+8.4%'
  },
  {
    icon: ShoppingBag,
    title: 'Loja e compras',
    description: 'Fluxo preparado para catalogo, moedas, compras e auditoria administrativa.',
    status: `${state.value.purchases.length} compras`,
    trend: '+4.9%'
  },
  {
    icon: Gem,
    title: 'Recargas pendentes',
    description: 'Area financeira organizada para revisar status, comprovantes e historico.',
    status: `${state.value.recharges.length} recargas`,
    trend: '+12%'
  }
])

const chartBars = [34, 48, 42, 66, 58, 78, 52, 86, 74, 94, 70, 88]
</script>
