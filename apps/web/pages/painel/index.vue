<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminDashboardView)" class="grid gap-6">
      <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div class="bm-liquid-card overflow-hidden p-6 sm:p-8">
          <p class="bm-kicker">Dashboard administrativo</p>
          <h1 class="mt-2 font-display text-4xl font-black uppercase">Painel administrativo</h1>
          <p class="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/68">
            Visao de administracao para acompanhar contas, personagens, loja e movimento geral do servidor.
          </p>

          <div class="mt-8 grid gap-3 sm:grid-cols-3">
            <div v-for="currency in user?.currencies" :key="currency.label" class="bm-liquid-card p-4">
              <p class="text-xs font-black uppercase tracking-[0.2em] text-white/45">{{ currency.label }}</p>
              <p class="mt-2 font-display text-3xl font-black text-white">{{ currency.value.toLocaleString('pt-BR') }}</p>
            </div>
          </div>
        </div>

        <div class="bm-liquid-card p-5">
          <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Resumo administrativo</p>
          <div class="mt-5 grid gap-4">
            <div v-for="item in summaryCards" :key="item.label" class="flex items-center justify-between rounded-3xl bg-white/10 p-4">
              <span class="text-sm font-bold text-white/65">{{ item.label }}</span>
              <span class="font-display text-2xl font-black text-white">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bm-liquid-card p-5">
        <div class="flex items-center justify-between gap-4">
          <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Movimento geral</p>
          <span class="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-100">Online</span>
        </div>
        <div class="mt-6 grid h-64 grid-cols-12 items-end gap-2 border-b border-l border-white/10 px-3 pb-3">
          <div
            v-for="(bar, index) in chartBars"
            :key="index"
            class="rounded-t-full bg-gradient-to-t from-blood-700 via-rose-400 to-cyan-200 shadow-[0_0_22px_rgba(103,232,249,0.18)]"
            :style="{ height: `${bar}%` }"
          />
        </div>
      </div>
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
import { permissions } from '~/data/security'

const { hasPermission, loadSession, user } = useAuth()
const { loadManagement, state } = useManagement()

useSeoMeta({ title: 'Painel administrativo' })

onMounted(() => {
  loadSession()
  loadManagement()
})

const summaryCards = computed(() => [
  { label: 'Contas', value: state.value.accounts.length.toString() },
  { label: 'Personagens', value: state.value.characters.length.toString() },
  { label: 'Compras', value: state.value.purchases.length.toString() },
  { label: 'Recargas', value: state.value.recharges.length.toString() }
])

const chartBars = [32, 48, 38, 64, 58, 74, 44, 82, 76, 92, 68, 88]
</script>
