<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminFinanceManage)" class="grid gap-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="bm-kicker">Administracao</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Financeiro</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
            Acompanhe compras e recargas preparadas, aprove pagamentos, cancele solicitacoes e audite o movimento de moedas.
          </p>
        </div>

        <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-3 xl:min-w-[680px]">
          <input
            v-model="query"
            class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
            placeholder="Buscar usuario ou item"
            type="search"
          >
          <select v-model="activeStatus" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="Todos">Todos status</option>
            <option v-for="status in statuses" :key="status" class="bg-zinc-950 text-white" :value="status">{{ status }}</option>
          </select>
          <select v-model="activeType" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="Todos">Tudo</option>
            <option class="bg-zinc-950 text-white" value="Compras">Compras</option>
            <option class="bg-zinc-950 text-white" value="Recargas">Recargas</option>
          </select>
        </div>
      </div>

      <section class="grid gap-3 sm:grid-cols-4">
        <article v-for="card in summaryCards" :key="card.label" class="bm-panel rounded-md p-4">
          <p class="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">{{ card.label }}</p>
          <p class="mt-3 font-display text-3xl font-black text-white">{{ card.value }}</p>
        </article>
      </section>

      <section v-if="activeType !== 'Recargas'" class="grid gap-4">
        <div class="flex items-end justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.28em] text-ember">Fila</p>
            <h2 class="mt-1 font-display text-2xl font-black uppercase text-white">Compras</h2>
          </div>
          <span class="text-xs font-black uppercase tracking-[0.2em] text-white/45">{{ filteredPurchases.length }} registros</span>
        </div>

        <article v-for="purchase in filteredPurchases" :key="purchase.id" class="bm-panel rounded-md p-5">
          <div class="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(purchase.status)">
                  {{ purchase.status }}
                </span>
                <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">
                  Compra
                </span>
              </div>
              <h3 class="mt-3 font-display text-2xl font-black">{{ purchase.productName }}</h3>
              <p class="mt-1 text-sm font-bold text-white/58">
                {{ purchase.username }} - {{ purchase.price.toLocaleString('pt-BR') }} {{ purchase.currency }} - {{ formatDate(purchase.createdAt) }}
              </p>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 xl:w-72">
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="setPurchaseStatus(purchase.id, 'Concluida')">
                Concluir
              </button>
              <button class="rounded-md border border-blood-500/40 bg-blood-900/30 px-4 py-3 text-sm font-black text-blood-100" type="button" @click="setPurchaseStatus(purchase.id, 'Cancelada')">
                Cancelar
              </button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="activeType !== 'Compras'" class="grid gap-4">
        <div class="flex items-end justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.28em] text-ember">Fila</p>
            <h2 class="mt-1 font-display text-2xl font-black uppercase text-white">Recargas</h2>
          </div>
          <span class="text-xs font-black uppercase tracking-[0.2em] text-white/45">{{ filteredRecharges.length }} registros</span>
        </div>

        <article v-for="recharge in filteredRecharges" :key="recharge.id" class="bm-panel rounded-md p-5">
          <div class="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(recharge.status)">
                  {{ recharge.status }}
                </span>
                <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">
                  Recarga
                </span>
              </div>
              <h3 class="mt-3 font-display text-2xl font-black">{{ recharge.amount.toLocaleString('pt-BR') }} {{ recharge.currency }}</h3>
              <p class="mt-1 text-sm font-bold text-white/58">
                {{ recharge.username }} - Bonus {{ recharge.bonus.toLocaleString('pt-BR') }} - R$ {{ recharge.price }} - {{ formatDate(recharge.createdAt) }}
              </p>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 xl:w-72">
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="setRechargeStatus(recharge.id, 'Paga')">
                Aprovar
              </button>
              <button class="rounded-md border border-blood-500/40 bg-blood-900/30 px-4 py-3 text-sm font-black text-blood-100" type="button" @click="setRechargeStatus(recharge.id, 'Cancelada')">
                Cancelar
              </button>
            </div>
          </div>
        </article>
      </section>

      <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">
        {{ message }}
      </p>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { permissions } from '~/data/security'
import type { PurchaseIntent, RechargeIntent } from '~/composables/useManagement'

type FinancialStatus = PurchaseIntent['status'] | RechargeIntent['status']

const { hasPermission, loadSession, recordAudit } = useAuth()
const { loadManagement, state, updatePurchaseStatus, updateRechargeStatus } = useManagement()

useSeoMeta({ title: 'Financeiro' })

const query = ref('')
const activeStatus = ref('Todos')
const activeType = ref('Todos')
const message = ref('')
const isSuccess = ref(true)

onMounted(() => {
  loadSession()
  loadManagement()
})

const statuses = ['Preparada', 'Concluida', 'Cancelada', 'Paga']

const filteredPurchases = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return state.value.purchases.filter((purchase) => {
    const matchesStatus = activeStatus.value === 'Todos' || purchase.status === activeStatus.value
    const matchesQuery = !normalizedQuery || [purchase.username, purchase.productName, purchase.currency, purchase.status]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)

    return matchesStatus && matchesQuery
  })
})

const filteredRecharges = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return state.value.recharges.filter((recharge) => {
    const matchesStatus = activeStatus.value === 'Todos' || recharge.status === activeStatus.value
    const matchesQuery = !normalizedQuery || [recharge.username, recharge.currency, recharge.status]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)

    return matchesStatus && matchesQuery
  })
})

const summaryCards = computed(() => [
  { label: 'Compras', value: state.value.purchases.length.toString() },
  { label: 'Recargas', value: state.value.recharges.length.toString() },
  { label: 'Pendentes', value: (state.value.purchases.filter((item) => item.status === 'Preparada').length + state.value.recharges.filter((item) => item.status === 'Preparada').length).toString() },
  { label: 'Filtrados', value: (filteredPurchases.value.length + filteredRecharges.value.length).toString() }
])

const setPurchaseStatus = (purchaseId: string, status: PurchaseIntent['status']) => {
  const result = updatePurchaseStatus(purchaseId, status)
  isSuccess.value = result.ok
  message.value = result.message

  if (result.ok && result.purchase) {
    recordAudit({
      type: 'admin.finance.purchase',
      message: `Compra ${result.purchase.productName} marcada como ${status}.`,
      meta: {
        username: result.purchase.username,
        status
      }
    })
  }
}

const setRechargeStatus = (rechargeId: string, status: RechargeIntent['status']) => {
  const result = updateRechargeStatus(rechargeId, status)
  isSuccess.value = result.ok
  message.value = result.message

  if (result.ok && result.recharge) {
    recordAudit({
      type: 'admin.finance.recharge',
      message: `Recarga de ${result.recharge.amount} ${result.recharge.currency} marcada como ${status}.`,
      meta: {
        username: result.recharge.username,
        status
      }
    })
  }
}

const statusClass = (status: FinancialStatus) => ({
  'bg-ember/15 text-ember': status === 'Preparada',
  'bg-emerald-500/15 text-emerald-100': status === 'Concluida' || status === 'Paga',
  'bg-blood-700/25 text-blood-100': status === 'Cancelada'
})

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
</script>
