<template>
  <section class="bm-dashboard-shell grid gap-4 p-4">
    <header>
      <p class="bm-kicker">Operação do servidor</p>
      <h1 class="mt-2 font-display text-3xl font-black uppercase">Dashboard administrativo</h1>
      <p class="mt-2 text-sm font-semibold text-white/60">Pendências, jogadores e conteúdo que precisam de atenção.</p>
    </header>
    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="metric in metrics" :key="metric.label" class="bm-dashboard-card p-4">
        <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45">{{ metric.label }}</p>
        <p class="mt-3 font-display text-3xl font-black">{{ metric.value }}</p>
      </article>
    </section>
    <section class="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <article class="bm-dashboard-card p-5">
        <h2 class="font-display text-xl font-black uppercase">Fila operacional</h2>
        <div class="mt-4 grid gap-2">
          <div v-for="row in summary?.activity || []" :key="row.key" class="grid gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[1fr_auto]">
            <div><strong>{{ row.title }}</strong><p class="mt-1 text-xs text-white/45">{{ row.description }}</p></div>
            <div class="text-right text-xs"><strong>{{ row.status }}</strong><p class="mt-1 text-ember">{{ row.trend }}</p></div>
          </div>
        </div>
      </article>
      <article class="bm-dashboard-card p-5">
        <h2 class="font-display text-xl font-black uppercase">Atalhos</h2>
        <div class="mt-4 grid gap-2">
          <NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black hover:border-ember/50">{{ link.label }}</NuxtLink>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import type { AdminDashboardSummary } from '~/composables/useAdminDashboardApi'
const api = useAdminDashboardApi()
const summary = ref<AdminDashboardSummary | null>(null)
onMounted(async () => { try { summary.value = await api.operational() } catch { summary.value = null } })
const metrics = computed(() => [
  { label: 'Jogadores', value: summary.value?.metrics.accounts || 0 },
  { label: 'Online', value: summary.value?.metrics.onlineCharacters || 0 },
  { label: 'Personagens', value: summary.value?.metrics.characters || 0 },
  { label: 'Tickets', value: summary.value?.metrics.pendingTickets || 0 }
])
const links = [
  { label: 'Pesquisar jogadores', to: '/painel/admin/contas' },
  { label: 'Revisar marketplace', to: '/painel/admin/marketplace' },
  { label: 'Publicar notícia', to: '/painel/admin/conteudo?area=noticias' },
  { label: 'Consultar tickets', to: '/painel/admin/tickets' }
]
</script>
