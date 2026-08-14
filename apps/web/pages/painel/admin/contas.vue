<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminAccountsView)" class="grid gap-6">
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

      <p v-if="isLoadingApi || apiError" class="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white/62">
        {{ isLoadingApi ? 'Carregando contas do banco...' : apiError }}
      </p>

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
              <button
                v-if="user?.role === 'super-admin' && account.role === 'player'"
                class="bm-button-glass rounded-md px-4 py-3 text-sm font-black"
                type="button"
                @click="changeRole(account, 'GM')"
              >
                Promover a GM
              </button>
              <button
                v-if="user?.role === 'super-admin' && (account.role === 'player' || account.role === 'gm')"
                class="bm-button-glass rounded-md px-4 py-3 text-sm font-black"
                type="button"
                @click="changeRole(account, 'ADMIN')"
              >
                Promover a ADM
              </button>
              <button
                v-if="user?.role === 'super-admin' && account.role === 'gm'"
                class="rounded-md border border-amber-500/40 bg-amber-900/20 px-4 py-3 text-sm font-black text-amber-100"
                type="button"
                @click="changeRole(account, 'PLAYER')"
              >
                Rebaixar a player
              </button>
              <button
                v-if="user?.role === 'super-admin' && account.role === 'admin'"
                class="rounded-md border border-amber-500/40 bg-amber-900/20 px-4 py-3 text-sm font-black text-amber-100"
                type="button"
                @click="changeRole(account, 'GM')"
              >
                Rebaixar a GM
              </button>
              <button
                v-if="user?.role === 'super-admin' && account.role === 'admin'"
                class="rounded-md border border-amber-500/40 bg-amber-900/20 px-4 py-3 text-sm font-black text-amber-100"
                type="button"
                @click="changeRole(account, 'PLAYER')"
              >
                Rebaixar a player
              </button>
              <button v-if="user?.role === 'super-admin' && account.role === 'admin'" class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="openPermissions(account)">Permissões</button>
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="revokeSessions(account)">Revogar sessões</button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="permissionAccount" class="bm-panel grid gap-4 rounded-md p-5">
        <div class="flex items-center justify-between gap-3"><div><p class="bm-kicker">Permissões do ADM</p><h2 class="mt-1 font-display text-2xl font-black uppercase">{{ permissionAccount.username }}</h2></div><button class="bm-admin-action" type="button" @click="permissionAccount = null">Fechar</button></div>
        <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <label v-for="permission in delegablePermissions" :key="permission.key" class="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm font-bold">
            <input v-model="selectedPermissions" type="checkbox" :value="permission.key" class="size-4 accent-ember">
            {{ permission.label }}
          </label>
        </div>
        <button class="bm-admin-primary w-fit" type="button" @click="savePermissions">Salvar permissões</button>
      </section>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { ManagedAccount, ManagedAccountStatus } from '~/data/management'
import { permissions } from '~/data/security'

const { hasPermission, loadSession, recordAudit, user } = useAuth()
const adminAccountsApi = useAdminAccountsApi()

useSeoMeta({ title: 'Gerenciar contas' })

const query = ref('')
const activeRole = ref('Todos')
const activeStatus = ref('Todos')
const apiAccounts = ref<ManagedAccount[]>([])
const apiError = ref('')
const isLoadingApi = ref(false)
const permissionAccount = ref<ManagedAccount | null>(null)
const selectedPermissions = ref<string[]>([])
const delegablePermissions = [
  { key: permissions.adminAccountsView, label: 'Consultar jogadores' },
  { key: permissions.adminAccountsStatusManage, label: 'Bloquear e desbloquear jogadores' },
  { key: permissions.adminContentManage, label: 'Gerenciar conteúdo' },
  { key: permissions.adminShopManage, label: 'Gerenciar loja' },
  { key: permissions.adminOrdersOperate, label: 'Operar pedidos' },
  { key: permissions.adminStoreView, label: 'Visualizar Loja Admin' },
  { key: permissions.adminStoreCategories, label: 'Gerenciar categorias da loja' },
  { key: permissions.adminStoreProducts, label: 'Gerenciar produtos da loja' },
  { key: permissions.adminStoreReview, label: 'Revisar produtos da loja' },
  { key: permissions.adminStorePublish, label: 'Publicar produtos da loja' },
  { key: permissions.adminStoreOrders, label: 'Operar pedidos da loja' },
  { key: permissions.adminStoreRefund, label: 'Estornar pedidos da loja' },
  { key: permissions.adminStoreDeliveries, label: 'Gerenciar entregas da loja' },
  { key: permissions.adminStoreTest, label: 'Testar produtos em desenvolvimento' },
  { key: permissions.adminMarketplaceManage, label: 'Moderar marketplace' },
  { key: permissions.adminMarketplaceView, label: 'Visualizar Marketplace Admin' },
  { key: permissions.adminMarketplaceListingsModerate, label: 'Moderar anuncios do marketplace' },
  { key: permissions.adminMarketplaceEscrowOperate, label: 'Operar escrow do marketplace' },
  { key: permissions.adminMarketplaceTransactionsOperate, label: 'Operar transacoes do marketplace' },
  { key: permissions.adminMarketplaceReportsModerate, label: 'Moderar denuncias do marketplace' },
  { key: permissions.adminMarketplaceUsersSuspend, label: 'Suspender usuarios pelo marketplace' },
  { key: permissions.adminMarketplaceEconomyManage, label: 'Configurar economia do marketplace' },
  { key: permissions.adminMarketplaceTasksManage, label: 'Gerenciar tarefas do marketplace' },
  { key: permissions.adminMarketplaceReportsView, label: 'Visualizar relatorios do marketplace' },
  { key: permissions.adminAuditView, label: 'Visualizar ações administrativas' },
  { key: permissions.adminAuditHistoryView, label: 'Visualizar histórico de alterações' },
  { key: permissions.adminAuditFullView, label: 'Visualizar detalhes técnicos de auditoria' },
  { key: permissions.adminWorkLogsView, label: 'Visualizar logs de trabalho' },
  { key: permissions.adminWorkLogsManage, label: 'Registrar logs de trabalho' },
  { key: permissions.adminOperationalLogsView, label: 'Visualizar eventos operacionais' },
  { key: permissions.adminErrorsView, label: 'Visualizar central de erros' },
  { key: permissions.adminErrorsManage, label: 'Tratar e resolver erros' },
  { key: permissions.adminAlertsView, label: 'Visualizar alertas críticos' },
  { key: permissions.adminAlertsManage, label: 'Reconhecer e resolver alertas' },
  { key: permissions.adminLogsExport, label: 'Exportar auditoria e monitoramento' },
  { key: permissions.adminRetentionManage, label: 'Gerenciar retenção de logs' },
  { key: permissions.adminRoadmapView, label: 'Visualizar Roadmap Admin' },
  { key: permissions.adminRoadmapCreate, label: 'Criar iniciativas do roadmap' },
  { key: permissions.adminRoadmapEdit, label: 'Editar iniciativas e tarefas do roadmap' },
  { key: permissions.adminRoadmapReview, label: 'Revisar e rejeitar iniciativas do roadmap' },
  { key: permissions.adminRoadmapApprove, label: 'Aprovar iniciativas do roadmap' },
  { key: permissions.adminRoadmapPublish, label: 'Publicar e agendar o roadmap' },
  { key: permissions.adminRoadmapDelete, label: 'Excluir iniciativas do roadmap' },
  { key: permissions.adminCommunityView, label: 'Visualizar Comunidade Admin' },
  { key: permissions.adminCommunityReportsView, label: 'Visualizar relatórios da comunidade' },
  { key: permissions.adminTasksView, label: 'Visualizar central de tarefas' },
  { key: permissions.adminTasksReportsView, label: 'Visualizar relatórios da equipe' },
  { key: permissions.adminReportsView, label: 'Acessar central de relatórios' },
  { key: permissions.adminReportsExport, label: 'Exportar relatórios administrativos' },
  { key: permissions.adminReportsSecurityView, label: 'Visualizar relatórios de segurança' },
  { key: permissions.adminFinancialReportsView, label: 'Visualizar relatórios financeiros restritos' }
]

onMounted(() => {
  loadSession()
  void loadAccountsFromApi()
})

type ApiAccount = {
  id: string
  username: string
  name: string
  email: string
  role: string
  status: string
  personalIdMask?: string
  createdAt: string
  updatedAt: string
  currencies: Record<string, number>
  characters?: number
}

type ApiPaginatedResponse<T> = {
  data: T[]
  total: number
}

const accountStatusFromApi = (status: string): ManagedAccountStatus => ({
  ACTIVE: 'Ativa',
  BLOCKED: 'Bloqueada',
  PENDING: 'Pendente'
})[status] as ManagedAccountStatus || 'Pendente'

const accountRoleFromApi = (role: string) =>
  role.toLowerCase().replaceAll('_', '-') as ManagedAccount['role']

const accountStatusToApi = (status: ManagedAccountStatus) => ({
  Ativa: 'ACTIVE',
  Bloqueada: 'BLOCKED',
  Pendente: 'PENDING'
})[status]

const mapApiAccount = (account: ApiAccount): ManagedAccount => ({
  id: account.id,
  username: account.username,
  name: account.name,
  email: account.email,
  role: accountRoleFromApi(account.role),
  status: accountStatusFromApi(account.status),
  personalIdMask: account.personalIdMask || 'Nao definido',
  createdAt: account.createdAt,
  lastLoginAt: account.updatedAt,
  characters: account.characters || 0,
  currencies: {
    WCoin: account.currencies.WCOIN || account.currencies.WCoin || 0,
    'Goblin Point': account.currencies.GOBLIN_POINT || account.currencies['Goblin Point'] || 0,
    'Hunt Point': account.currencies.HUNT_POINT || account.currencies['Hunt Point'] || 0
  }
})

const loadAccountsFromApi = async () => {
  isLoadingApi.value = true
  apiError.value = ''
  try {
    const response = await adminAccountsApi.list({ page: 1, pageSize: 100 }) as ApiPaginatedResponse<ApiAccount>
    apiAccounts.value = response.data.map(mapApiAccount)
  } catch {
    apiAccounts.value = []
    apiError.value = 'API de contas indisponivel. Base local de desenvolvimento nao sera usada como fallback.'
  } finally {
    isLoadingApi.value = false
  }
}

const accounts = computed(() => apiAccounts.value)
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
  void markAccountViaApi(account, status)
}

const markAccountViaApi = async (account: ManagedAccount, status: ManagedAccountStatus) => {
  const reason = requestReason(`Alterar o status de ${account.username} para ${status}`)
  if (!reason) return

  try {
    const updated = await adminAccountsApi.update(account.id, {
      status: accountStatusToApi(status),
      reason
    }) as ApiAccount

    const mapped = mapApiAccount(updated)
    apiAccounts.value = apiAccounts.value.map((item) => item.id === mapped.id ? mapped : item)
    recordAudit({
      type: 'admin.account.status',
      message: `Conta ${account.username} marcada como ${status} via API.`,
      meta: {
        account: account.username,
        status
      }
    })
  } catch {
    apiError.value = 'Nao foi possivel alterar a conta pela API.'
  }
}

const changeRole = async (account: ManagedAccount, role: 'PLAYER' | 'GM' | 'ADMIN') => {
  const action = role === 'ADMIN' ? 'promover a ADM' : role === 'GM' ? 'definir como GM' : 'rebaixar a player'
  const reason = requestReason(`${action}: ${account.username}`)
  if (!reason || !window.confirm(`Confirma ${action} para ${account.username}?`)) return

  try {
    const updated = await adminAccountsApi.update(account.id, { role, reason }) as ApiAccount
    const mapped = mapApiAccount(updated)
    apiAccounts.value = apiAccounts.value.map((item) => item.id === mapped.id ? mapped : item)
  } catch {
    apiError.value = 'Nao foi possivel alterar o papel da conta pela API.'
  }
}

const openPermissions = async (account: ManagedAccount) => {
  try {
    const result = await adminAccountsApi.permissions(account.id) as { effective: string[] }
    permissionAccount.value = account
    selectedPermissions.value = delegablePermissions.filter((permission) => result.effective.includes(permission.key)).map((permission) => permission.key)
  } catch { apiError.value = 'Não foi possível carregar as permissões desta conta.' }
}

const savePermissions = async () => {
  if (!permissionAccount.value) return
  const reason = requestReason(`Alterar permissões de ${permissionAccount.value.username}`)
  if (!reason) return
  const entries = delegablePermissions.map((permission) => ({ key: permission.key, granted: selectedPermissions.value.includes(permission.key) }))
  try {
    await adminAccountsApi.updatePermissions(permissionAccount.value.id, { permissions: entries, reason })
    permissionAccount.value = null
    apiError.value = ''
  } catch { apiError.value = 'Não foi possível salvar as permissões.' }
}

const revokeSessions = async (account: ManagedAccount) => {
  const reason = requestReason(`Revogar todas as sessões de ${account.username}`)
  if (!reason || !window.confirm(`Encerrar todas as sessões de ${account.username}?`)) return
  try { await adminAccountsApi.revokeSessions(account.id, reason); apiError.value = '' } catch { apiError.value = 'Não foi possível revogar as sessões.' }
}

const requestReason = (action: string) => {
  if (!import.meta.client) return ''
  const reason = window.prompt(`${action}. Informe a justificativa (minimo 5 caracteres):`)?.trim() || ''
  if (reason.length < 5) {
    apiError.value = 'A alteracao foi cancelada: informe uma justificativa com pelo menos 5 caracteres.'
    return ''
  }
  return reason
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
