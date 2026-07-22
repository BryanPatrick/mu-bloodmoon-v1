<template>
  <section class="bm-dashboard-shell grid gap-4 p-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div><p class="bm-kicker">Visão estratégica</p><h1 class="mt-2 font-display text-3xl font-black uppercase">Dashboard geral</h1><p class="mt-2 text-sm font-semibold text-white/60">Operação, segurança, administração e finanças.</p></div>
      <NuxtLink to="/painel/admin/auditoria" class="rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-xs font-black">Abrir auditoria</NuxtLink>
    </header>
    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article v-for="metric in metrics" :key="metric.label" class="bm-dashboard-card p-4">
        <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45">{{ metric.label }}</p>
        <p class="mt-3 font-display text-3xl font-black">{{ metric.value }}</p>
      </article>
    </section>
    <section class="grid gap-4 xl:grid-cols-[1fr_.7fr]">
      <article class="bm-dashboard-card p-5">
        <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45">Financeiro exclusivo</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4"><span class="text-xs text-white/50">Receita confirmada</span><p class="mt-2 font-display text-2xl font-black text-emerald-200">R$ {{ revenue }}</p></div>
          <div class="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4"><span class="text-xs text-white/50">Ultimos 30 dias</span><p class="mt-2 font-display text-2xl font-black text-cyan-100">R$ {{ revenue30Days }}</p></div>
          <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4"><span class="text-xs text-white/50">Recargas pagas</span><p class="mt-2 font-display text-2xl font-black">{{ summary?.financial?.paidRecharges || 0 }}</p></div>
          <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4"><span class="text-xs text-white/50">Vendas concluidas</span><p class="mt-2 font-display text-2xl font-black">{{ summary?.financial?.completedMarketOrders || 0 }}</p></div>
        </div>
        <div class="mt-4 grid grid-cols-6 items-end gap-2 rounded-xl border border-white/10 bg-black/15 p-4" aria-label="Receita dos ultimos seis meses">
          <div v-for="item in monthlyRevenue" :key="item.month" class="grid gap-2 text-center"><div class="mx-auto w-full max-w-10 rounded-t bg-emerald-300/55" :style="{ height: `${item.height}px` }"/><span class="text-[10px] font-bold text-white/45">{{ item.label }}</span></div>
        </div>
      </article>
      <article class="bm-dashboard-card p-5"><h2 class="font-display text-xl font-black uppercase">Administração</h2><div class="mt-4 grid gap-2"><NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black hover:border-ember/50">{{ link.label }}</NuxtLink></div></article>
    </section>
  </section>
</template>

<script setup lang="ts">
import type { AdminDashboardSummary } from '~/composables/useAdminDashboardApi'
const api = useAdminDashboardApi()
const summary = ref<AdminDashboardSummary | null>(null)
onMounted(async () => { try { summary.value = await api.strategic() } catch { summary.value = null } })
const revenue = computed(() => (summary.value?.metrics.recentRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
const revenue30Days = computed(() => (summary.value?.financial?.revenue30Days || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
const monthlyRevenue = computed(() => {
  const rows = summary.value?.financial?.monthlyRevenue || []
  const max = Math.max(1, ...rows.map((row) => row.value))
  return rows.map((row) => ({ ...row, label: row.month.slice(5), height: Math.max(4, Math.round((row.value / max) * 64)) }))
})
const metrics = computed(() => [
  { label: 'Contas', value: summary.value?.metrics.accounts || 0 }, { label: 'Online', value: summary.value?.metrics.onlineCharacters || 0 },
  { label: 'Personagens', value: summary.value?.metrics.characters || 0 }, { label: 'Compras', value: summary.value?.metrics.purchases || 0 },
  { label: 'Pendências', value: summary.value?.metrics.pending || 0 }
])
const links = [{ label: 'Gerenciar administradores', to: '/painel/admin/contas?perfil=admin' }, { label: 'Relatórios financeiros', to: '/painel/admin/financeiro' }, { label: 'Configurações do servidor', to: '/painel/admin/sistema' }]
</script>
