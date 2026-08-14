<template>
  <section class="bm-dashboard-shell grid gap-4 p-4">
    <header>
      <p class="bm-kicker">Operação de jogo</p>
      <h1 class="mt-2 font-display text-3xl font-black uppercase">Painel Game Master</h1>
      <p class="mt-2 text-sm font-semibold text-white/60">Olá, {{ user?.name }}. Visão operacional do que precisa de atenção agora.</p>
    </header>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article class="bm-dashboard-card p-4">
        <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45">Ocorrências abertas</p>
        <p class="mt-3 font-display text-3xl font-black">{{ summary?.occurrences.open ?? '—' }}</p>
      </article>
      <article class="bm-dashboard-card p-4">
        <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45">Ocorrências totais</p>
        <p class="mt-3 font-display text-3xl font-black">{{ summary?.occurrences.total ?? '—' }}</p>
      </article>
      <article class="bm-dashboard-card p-4">
        <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45">Personagens online</p>
        <p class="mt-3 font-display text-3xl font-black">{{ summary?.characters.online ?? '—' }}</p>
      </article>
      <article class="bm-dashboard-card p-4">
        <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45">Personagens totais</p>
        <p class="mt-3 font-display text-3xl font-black">{{ summary?.characters.total ?? '—' }}</p>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <article class="bm-dashboard-card p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-display text-xl font-black uppercase">Avisos operacionais</h2>
        </div>
        <div class="mt-4 grid gap-2">
          <div v-for="alert in summary?.recentAlerts || []" :key="alert.id" class="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div class="flex items-center justify-between gap-3">
              <strong>{{ alert.title }}</strong>
              <span class="text-xs text-white/45">{{ alert.severity }}</span>
            </div>
            <p class="mt-1 text-xs text-white/45">{{ alert.message }}</p>
          </div>
          <p v-if="!summary?.recentAlerts?.length" class="py-6 text-center text-sm text-white/45">Nenhum aviso operacional pendente.</p>
        </div>
      </article>

      <article class="bm-dashboard-card p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-display text-xl font-black uppercase">Minhas ações recentes</h2>
        </div>
        <div class="mt-4 grid gap-2">
          <div v-for="action in summary?.recentActions || []" :key="action.id" class="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div class="flex items-center justify-between gap-3">
              <strong>{{ action.action }}</strong>
              <span class="text-xs text-white/45">{{ action.result }}</span>
            </div>
            <p class="mt-1 text-xs text-white/45">{{ action.targetType }}{{ action.targetId ? ` · ${action.targetId}` : '' }}</p>
          </div>
          <p v-if="!summary?.recentActions?.length" class="py-6 text-center text-sm text-white/45">Nenhuma ação registrada ainda.</p>
        </div>
      </article>
    </section>

    <section class="bm-dashboard-card p-5">
      <h2 class="font-display text-xl font-black uppercase">Atalhos</h2>
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        <NuxtLink to="/painel/gm/ocorrencias" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black hover:border-ember/50">
          Ocorrências
        </NuxtLink>
        <NuxtLink to="/painel/gm/logs" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black hover:border-ember/50">
          Logs operacionais
        </NuxtLink>
        <NuxtLink to="/painel/personagens" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black hover:border-ember/50">
          Consultar personagens
        </NuxtLink>
        <NuxtLink to="/guilds" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black hover:border-ember/50">
          Consultar guildas
        </NuxtLink>
      </div>
    </section>

    <p v-if="loadError" class="rounded-xl border border-amber-300/25 bg-amber-400/10 p-3 text-xs font-bold text-amber-100">
      Não foi possível carregar os dados do painel pela API.
    </p>
  </section>
</template>

<script setup lang="ts">
import type { GmDashboardSummary } from '~/composables/useGmApi'

const { user } = useAuth()
const gmApi = useGmApi()
const summary = ref<GmDashboardSummary | null>(null)
const loadError = ref(false)

onMounted(async () => {
  try {
    summary.value = await gmApi.dashboard()
  } catch {
    summary.value = null
    loadError.value = true
  }
})
</script>
