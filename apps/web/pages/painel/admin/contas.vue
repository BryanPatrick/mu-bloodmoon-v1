<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminDashboardView)" class="grid gap-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="bm-kicker">Administracao</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Contas</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
            Controle inicial de usuarios, perfis, status da conta, moedas e vinculo com personagens.
          </p>
        </div>

        <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-3 xl:min-w-[680px]">
          <input
            v-model="query"
            class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
            placeholder="Buscar conta"
            type="search"
          >
          <select v-model="activeRole" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="Todos">Todos perfis</option>
            <option v-for="role in roles" :key="role" class="bg-zinc-950 text-white" :value="role">{{ role }}</option>
          </select>
          <select v-model="activeStatus" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="Todos">Todos status</option>
            <option v-for="status in statuses" :key="status" class="bg-zinc-950 text-white" :value="status">{{ status }}</option>
          </select>
        </div>
      </div>

      <section class="grid gap-3 sm:grid-cols-4">
        <article v-for="card in summaryCards" :key="card.label" class="bm-panel rounded-md p-4">
          <p class="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">{{ card.label }}</p>
          <p class="mt-3 font-display text-3xl font-black text-white">{{ card.value }}</p>
        </article>
      </section>

      <section class="grid gap-4">
        <article v-for="account in filteredAccounts" :key="account.id" class="bm-panel rounded-md p-5">
          <div class="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(account.status)">
                  {{ account.status }}
                </span>
                <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">
                  {{ account.role }}
                </span>
              </div>

              <h2 class="mt-3 font-display text-3xl font-black leading-tight">{{ account.name }}</h2>
              <p class="mt-1 text-sm font-bold text-white/58">{{ account.username }} - {{ account.email }}</p>

              <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-md bg-black/25 p-3">
                  <p class="text-xs font-bold text-white/45">Personal ID</p>
                  <p class="mt-1 font-display text-lg font-black">{{ account.personalIdMask }}</p>
                </div>
                <div class="rounded-md bg-black/25 p-3">
                  <p class="text-xs font-bold text-white/45">Personagens</p>
                  <p class="mt-1 font-display text-lg font-black">{{ account.characters }}</p>
                </div>
                <div class="rounded-md bg-black/25 p-3">
                  <p class="text-xs font-bold text-white/45">Criada em</p>
                  <p class="mt-1 font-display text-lg font-black">{{ formatDate(account.createdAt) }}</p>
                </div>
                <div class="rounded-md bg-black/25 p-3">
                  <p class="text-xs font-bold text-white/45">Ultimo login</p>
                  <p class="mt-1 font-display text-lg font-black">{{ formatDate(account.lastLoginAt) }}</p>
                </div>
              </div>

              <div class="mt-4 grid gap-2 sm:grid-cols-3">
                <div v-for="(value, currency) in account.currencies" :key="currency" class="flex items-center justify-between rounded-md bg-white/[0.045] px-3 py-2">
                  <span class="text-xs font-bold text-white/58">{{ currency }}</span>
                  <span class="font-display text-sm font-black">{{ value.toLocaleString('pt-BR') }}</span>
                </div>
              </div>
            </div>

            <div class="grid gap-2 sm:grid-cols-3 xl:w-52 xl:grid-cols-1">
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="markAccount(account, 'Ativa')">
                Ativar
              </button>
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="markAccount(account, 'Pendente')">
                Marcar pendente
              </button>
              <button class="rounded-md border border-blood-500/40 bg-blood-900/30 px-4 py-3 text-sm font-black text-blood-100" type="button" @click="markAccount(account, 'Bloqueada')">
                Bloquear
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { ManagedAccount, ManagedAccountStatus } from '~/data/management'
import { permissions } from '~/data/security'

const { hasPermission, loadSession, recordAudit } = useAuth()
const { loadManagement, state, updateAccountStatus } = useManagement()

useSeoMeta({ title: 'Gerenciar contas' })

const query = ref('')
const activeRole = ref('Todos')
const activeStatus = ref('Todos')

onMounted(() => {
  loadSession()
  loadManagement()
})

const accounts = computed(() => state.value.accounts)
const roles = computed(() => Array.from(new Set(accounts.value.map((account) => account.role))).sort())
const statuses = computed(() => Array.from(new Set(accounts.value.map((account) => account.status))).sort())

const filteredAccounts = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return accounts.value.filter((account) => {
    const matchesRole = activeRole.value === 'Todos' || account.role === activeRole.value
    const matchesStatus = activeStatus.value === 'Todos' || account.status === activeStatus.value
    const matchesQuery = !normalizedQuery || [account.username, account.name, account.email, account.role, account.status]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)

    return matchesRole && matchesStatus && matchesQuery
  })
})

const summaryCards = computed(() => [
  { label: 'Contas', value: accounts.value.length.toString() },
  { label: 'Ativas', value: accounts.value.filter((account) => account.status === 'Ativa').length.toString() },
  { label: 'Bloqueadas', value: accounts.value.filter((account) => account.status === 'Bloqueada').length.toString() },
  { label: 'Filtradas', value: filteredAccounts.value.length.toString() }
])

const markAccount = (account: ManagedAccount, status: ManagedAccountStatus) => {
  const updatedAccount = updateAccountStatus(account.id, status)
  if (!updatedAccount) {
    return
  }

  recordAudit({
    type: 'admin.account.status',
    message: `Conta ${account.username} marcada como ${status}.`,
    meta: {
      account: account.username,
      status
    }
  })
}

const statusClass = (status: ManagedAccountStatus) => ({
  'bg-emerald-500/15 text-emerald-100': status === 'Ativa',
  'bg-blood-700/25 text-blood-100': status === 'Bloqueada',
  'bg-ember/15 text-ember': status === 'Pendente'
})

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
</script>
