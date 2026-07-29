<template>
  <div class="grid gap-5">
    <header class="flex flex-col gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="bm-kicker">Operacao protegida</p>
        <h1 class="mt-1 font-display text-3xl font-black uppercase">Marketplace Admin</h1>
        <p class="mt-2 max-w-3xl text-xs font-semibold leading-6 text-white/60">
          Anuncios, escrow, transacoes, denuncias e economia em uma unica linha operacional auditada.
        </p>
      </div>
      <button class="bm-button-glass h-10 rounded-md px-4 text-xs font-black" type="button" @click="loadActive">
        <RefreshCw class="mr-2 inline size-4" /> Atualizar
      </button>
    </header>

    <nav class="flex gap-2 overflow-x-auto pb-1" aria-label="Areas do marketplace">
      <button
        v-for="item in visibleTabs"
        :key="item.key"
        class="flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-black transition"
        :class="activeTab === item.key ? 'border-ember/55 bg-ember/15 text-white' : 'border-white/10 bg-white/5 text-white/55 hover:text-white'"
        type="button"
        @click="setTab(item.key)"
      >
        <component :is="item.icon" class="size-4" />
        {{ item.label }}
      </button>
    </nav>

    <p v-if="message" class="rounded-md border px-4 py-3 text-xs font-bold" :class="messageError ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'">
      {{ message }}
    </p>

    <section v-if="activeTab === 'dashboard'" class="grid gap-4">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <article v-for="metric in dashboardMetrics" :key="metric.label" class="bm-panel min-h-24 rounded-md p-4">
          <p class="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">{{ metric.label }}</p>
          <strong class="mt-3 block font-display text-3xl">{{ metric.value }}</strong>
        </article>
      </div>
      <article v-if="dashboard?.financial" class="bm-panel rounded-md border-emerald-400/15 p-5">
        <p class="bm-kicker">Visao exclusiva Super ADM</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-4">
          <Metric label="Volume" :value="dashboard.financial.volume" />
          <Metric label="Taxas" :value="dashboard.financial.fees" />
          <Metric label="Preco medio" :value="dashboard.financial.averagePrice" />
          <Metric label="Vendas" :value="dashboard.financial.completedSales" />
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'listings'" class="grid gap-4">
      <ListToolbar v-model:search="filters.search" v-model:status="filters.status" :statuses="listingStatuses" @reload="reloadPage(loadListings)" />
      <div v-if="canModerateListings" class="bm-glass flex flex-wrap items-center gap-2 rounded-md p-3">
        <label class="flex items-center gap-2 text-[10px] font-bold text-white/55">
          <input type="checkbox" :checked="allListingsSelected" @change="toggleAllListings">
          Selecionar pagina
        </label>
        <select v-model="bulkListingAction" class="bm-admin-input ml-auto max-w-48">
          <option value="SUSPEND">Suspender</option>
          <option value="REACTIVATE">Reativar</option>
          <option value="MANUAL_REVIEW">Revisao manual</option>
          <option value="RETURN_ITEM">Devolver item</option>
          <option value="CANCEL">Cancelar</option>
        </select>
        <UButton color="neutral" variant="soft" size="sm" :disabled="!selectedListingIds.length" @click="runListingBulkAction">
          Aplicar em {{ selectedListingIds.length }}
        </UButton>
        <UButton v-if="canViewReports" color="neutral" variant="soft" size="sm" @click="exportListings">
          Exportar
        </UButton>
      </div>
      <div class="grid gap-3 xl:grid-cols-2">
        <article v-for="row in listings.data" :key="row.id" class="bm-panel rounded-md p-4">
          <div class="flex items-start justify-between gap-3">
            <input v-if="canModerateListings" v-model="selectedListingIds" type="checkbox" :value="row.id" :aria-label="`Selecionar ${row.itemName}`">
            <div class="min-w-0">
              <span class="bm-status">{{ row.status }}</span>
              <h2 class="mt-2 truncate font-display text-xl font-black">{{ row.itemName }}</h2>
              <p class="mt-1 text-xs text-white/55">{{ row.sellerUsername }} · {{ row.price.toLocaleString('pt-BR') }} {{ row.currency }}</p>
              <p class="mt-2 truncate font-mono text-[10px] text-white/35">{{ row.gameItemRef }}</p>
            </div>
            <ShieldCheck class="size-5 shrink-0 text-ember" />
          </div>
          <div v-if="canModerateListings" class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <ActionButton label="Suspender" @click="listingAction(row, 'SUSPEND')" />
            <ActionButton label="Reativar" @click="listingAction(row, 'REACTIVATE')" />
            <ActionButton label="Revisar" @click="listingAction(row, 'MANUAL_REVIEW')" />
            <ActionButton label="Devolver" @click="listingAction(row, 'RETURN_ITEM')" />
            <ActionButton danger label="Cancelar" @click="listingAction(row, 'CANCEL')" />
          </div>
        </article>
      </div>
      <EmptyState v-if="!listings.data.length" text="Nenhum anuncio encontrado." />
      <AdminPagination v-bind="listings" @change="changePage($event, loadListings)" />
    </section>

    <section v-else-if="activeTab === 'escrow'" class="grid gap-4">
      <ListToolbar v-model:search="filters.search" v-model:status="filters.status" :statuses="escrowStatuses" @reload="reloadPage(loadEscrow)" />
      <div class="grid gap-3">
        <article v-for="row in escrow.data" :key="row.id" class="bm-panel grid gap-4 rounded-md p-4 xl:grid-cols-[1fr_1fr_auto] xl:items-center">
          <div>
            <span class="bm-status">{{ row.status }}</span>
            <h2 class="mt-2 font-display text-xl">{{ row.listing.itemName }}</h2>
            <p class="text-xs text-white/50">Proprietario: {{ row.listing.seller?.username || row.originalOwnerId }}</p>
          </div>
          <div class="grid gap-1 text-[11px] text-white/55">
            <span>Serial: <b class="text-white/80">{{ row.itemSerial || 'nao informado' }}</b></span>
            <span>Local: <b class="text-white/80">{{ row.location }}</b></span>
            <span>Tentativas: <b class="text-white/80">{{ row.attempts }}</b></span>
            <span class="truncate font-mono text-[9px]">Hash: {{ row.internalHash }}</span>
          </div>
          <div v-if="canOperateEscrow" class="grid grid-cols-2 gap-2 xl:w-64">
            <ActionButton label="Vendedor" @click="escrowAction(row, 'RETURN_TO_SELLER')" />
            <ActionButton label="Comprador" @click="escrowAction(row, 'SEND_TO_BUYER')" />
            <ActionButton label="Reenfileirar" @click="escrowAction(row, 'REENQUEUE')" />
            <ActionButton danger label="Congelar" @click="escrowAction(row, 'FREEZE')" />
            <ActionButton v-if="canManageTasks" label="Criar tarefa" @click="openTaskFor('ESCROW_FAILURE', { listingId: row.listing.id })" />
          </div>
        </article>
      </div>
      <EmptyState v-if="!escrow.data.length" text="Nenhum item no escrow para este filtro." />
      <AdminPagination v-bind="escrow" @change="changePage($event, loadEscrow)" />
    </section>

    <section v-else-if="activeTab === 'transactions'" class="grid gap-4">
      <ListToolbar v-model:search="filters.search" v-model:status="filters.status" :statuses="orderStatuses" @reload="reloadPage(loadTransactions)" />
      <div class="grid gap-3">
        <article v-for="row in transactions.data" :key="row.id" class="bm-panel grid gap-4 rounded-md p-4 xl:grid-cols-[1fr_1fr_auto] xl:items-center">
          <div>
            <span class="bm-status">{{ row.status }}</span>
            <h2 class="mt-2 font-display text-xl">{{ row.itemName || row.id }}</h2>
            <p class="text-xs text-white/50">{{ row.buyerUsername }} comprou de {{ row.sellerUsername }}</p>
          </div>
          <div class="text-xs text-white/55">
            <p>{{ row.price.toLocaleString('pt-BR') }} {{ row.currency }}</p>
            <p>Taxa: {{ row.fee }} · Liquido: {{ row.sellerAmount }}</p>
            <p class="mt-1 font-mono text-[9px]">{{ row.correlationId }}</p>
          </div>
          <div v-if="canOperateTransactions" class="grid grid-cols-2 gap-2 xl:w-60">
            <ActionButton label="Reprocessar" @click="transactionAction(row, 'REPROCESS')" />
            <ActionButton label="Revisao" @click="transactionAction(row, 'MANUAL_REVIEW')" />
            <ActionButton label="Compensar" @click="transactionAction(row, 'COMPENSATE')" />
            <ActionButton danger label="Cancelar" @click="transactionAction(row, 'CANCEL')" />
            <ActionButton v-if="canManageTasks" label="Criar tarefa" @click="openTaskFor('STUCK_TRANSACTION', { orderId: row.id, listingId: row.listingId })" />
          </div>
        </article>
      </div>
      <AdminPagination v-bind="transactions" @change="changePage($event, loadTransactions)" />
    </section>

    <section v-else-if="activeTab === 'reports'" class="grid gap-4">
      <ListToolbar v-model:search="filters.search" v-model:status="filters.status" :statuses="reportStatuses" @reload="reloadPage(loadReports)" />
      <div class="grid gap-3 xl:grid-cols-2">
        <article v-for="row in reports.data" :key="row.id" class="bm-panel rounded-md p-4">
          <div class="flex justify-between gap-3">
            <div>
              <span class="bm-status">{{ row.status }}</span>
              <h2 class="mt-2 font-display text-xl">{{ row.reason }}</h2>
              <p class="mt-2 text-xs leading-5 text-white/58">{{ row.description }}</p>
              <p class="mt-2 text-[10px] text-white/35">Denunciante: {{ row.reporter.username }} · Responsavel: {{ row.assignedTo || 'nao atribuido' }}</p>
            </div>
            <Flag class="size-5 shrink-0 text-red-300" />
          </div>
          <div v-if="canModerateReports" class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ActionButton label="Assumir" @click="reportAction(row, 'ASSIGN')" />
            <ActionButton label="Analisar" @click="reportAction(row, 'INVESTIGATE')" />
            <ActionButton label="Resolver" @click="reportAction(row, 'RESOLVE')" />
            <ActionButton label="Escalar" @click="reportAction(row, 'ESCALATE')" />
            <ActionButton danger label="Suspender" @click="reportAction(row, 'SUSPEND_LISTING')" />
            <ActionButton v-if="canSuspendUsers && row.reportedUserId" danger label="Bloquear usuario" @click="suspendReportedUser(row)" />
            <ActionButton v-if="canManageTasks" label="Criar tarefa" @click="openTaskFor('REPORT_REVIEW', { reportId: row.id, listingId: row.listing?.id })" />
          </div>
        </article>
      </div>
      <AdminPagination v-bind="reports" @change="changePage($event, loadReports)" />
    </section>

    <section v-else-if="activeTab === 'tasks'" class="grid gap-4 xl:grid-cols-[340px_1fr]">
      <form v-if="canManageTasks" class="bm-panel grid h-fit gap-3 rounded-md p-4" @submit.prevent="createTask">
        <div><p class="bm-kicker">Nova tarefa</p><h2 class="mt-1 font-display text-xl">Trabalho operacional</h2></div>
        <input v-model="taskForm.title" class="bm-admin-input" placeholder="Titulo" required>
        <select v-model="taskForm.type" class="bm-admin-input">
          <option value="REPORT_REVIEW">Denuncia</option>
          <option value="ESCROW_FAILURE">Falha de escrow</option>
          <option value="RETURN_FAILURE">Falha de devolucao</option>
          <option value="STUCK_TRANSACTION">Transacao travada</option>
          <option value="FRAUD_REVIEW">Analise de fraude</option>
          <option value="SUSPICIOUS_USER">Usuario suspeito</option>
        </select>
        <input v-model="taskForm.assigneeId" class="bm-admin-input" placeholder="ID do responsavel">
        <textarea v-model="taskForm.description" class="bm-admin-input min-h-24 py-3" placeholder="Descricao" />
        <button class="rounded-md bg-blood-700 px-4 py-3 text-xs font-black hover:bg-blood-600">Criar tarefa</button>
      </form>
      <div class="grid gap-3">
        <article v-for="row in tasks.data" :key="row.id" class="bm-panel flex flex-col gap-3 rounded-md p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><span class="bm-status">{{ row.status }}</span><h2 class="mt-2 font-display text-lg">{{ row.title }}</h2><p class="text-xs text-white/45">{{ row.type }} · {{ row.priority }}</p></div>
          <div v-if="canManageTasks" class="flex gap-2">
            <ActionButton label="Iniciar" @click="updateTask(row, 'IN_PROGRESS')" />
            <ActionButton label="Concluir" @click="updateTask(row, 'DONE')" />
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'economy'" class="grid gap-4 xl:grid-cols-[1fr_320px]">
      <form v-if="economy" class="bm-panel grid gap-4 rounded-md p-5 sm:grid-cols-2 xl:grid-cols-3" @submit.prevent="saveEconomy">
        <NumberField v-model="economy.publicationFee" label="Taxa de publicacao" />
        <NumberField v-model="economy.saleFeePercent" label="Taxa de venda (%)" />
        <NumberField v-model="economy.listingDurationHours" label="Duracao (horas)" />
        <NumberField v-model="economy.maxListings" label="Limite por conta" />
        <NumberField v-model="economy.vipDiscountPercent" label="Desconto VIP (%)" />
        <NumberField v-model="economy.cooldownMinutes" label="Cooldown (minutos)" />
        <NumberField v-model="economy.minimumPrice" label="Preco minimo" />
        <NumberField v-model="economy.maximumPrice" label="Preco maximo" />
        <label class="grid gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
          Moedas aceitas
          <input v-model="acceptedCurrenciesText" class="bm-admin-input normal-case tracking-normal" placeholder="WCOIN, GOBLIN_POINT, HUNT_POINT">
        </label>
        <label class="grid gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
          Categorias permitidas
          <input v-model="allowedCategoriesText" class="bm-admin-input normal-case tracking-normal" placeholder="weapon, armor, wing">
        </label>
        <button v-if="canManageEconomy" class="self-end rounded-md bg-blood-700 px-4 py-3 text-xs font-black hover:bg-blood-600">Salvar configuracao</button>
      </form>
      <aside class="bm-panel rounded-md p-5">
        <p class="bm-kicker">Protecao</p>
        <h2 class="mt-2 font-display text-xl">Somente Super ADM</h2>
        <p class="mt-3 text-xs leading-6 text-white/55">Alteracoes economicas exigem justificativa, ficam auditadas e aparecem no log de trabalho.</p>
      </aside>
    </section>

    <section v-else-if="activeTab === 'analytics'" class="grid gap-4">
      <div class="grid gap-3 xl:grid-cols-2">
        <article class="bm-panel rounded-md p-5">
          <p class="bm-kicker">Operacao</p>
          <h2 class="mt-2 font-display text-xl">Anuncios por status</h2>
          <div class="mt-4 grid gap-2">
            <div v-for="row in analyticsRows('listingsByStatus')" :key="row.status" class="flex justify-between border-b border-white/8 py-2 text-xs">
              <span>{{ row.status }}</span><b>{{ row._count?._all }}</b>
            </div>
          </div>
        </article>
        <article class="bm-panel rounded-md p-5">
          <p class="bm-kicker">Categorias</p>
          <h2 class="mt-2 font-display text-xl">Preco medio e volume</h2>
          <div class="mt-4 grid gap-2">
            <div v-for="row in analyticsRows('categories')" :key="row.itemCategory" class="flex justify-between border-b border-white/8 py-2 text-xs">
              <span>{{ row.itemCategory }}</span><b>{{ Math.round(row._avg?.price || 0) }} · {{ row._count?._all }}</b>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  BarChart3, ClipboardList, Flag, LayoutDashboard, RefreshCw,
  ReceiptText, Settings2, ShieldCheck, ShoppingBag
} from 'lucide-vue-next'
import type {
  MarketplaceDashboard, MarketplaceEconomy, MarketplaceEscrow,
  MarketplaceListing, MarketplaceOrder, MarketplaceReport, MarketplaceTask
} from '~/composables/useMarketplaceApi'
import { permissions } from '~/data/security'

const props = withDefaults(defineProps<{ initialTab?: string }>(), { initialTab: 'dashboard' })
const api = useMarketplaceApi()
const { hasPermission, user } = useAuth()
const canModerateListings = computed(() => hasPermission(permissions.adminMarketplaceListingsModerate))
const canOperateEscrow = computed(() => hasPermission(permissions.adminMarketplaceEscrowOperate))
const canOperateTransactions = computed(() => hasPermission(permissions.adminMarketplaceTransactionsOperate))
const canModerateReports = computed(() => hasPermission(permissions.adminMarketplaceReportsModerate))
const canSuspendUsers = computed(() => hasPermission(permissions.adminMarketplaceUsersSuspend))
const canManageEconomy = computed(() => hasPermission(permissions.adminMarketplaceEconomyManage))
const canManageTasks = computed(() => hasPermission(permissions.adminMarketplaceTasksManage))
const canViewReports = computed(() => hasPermission(permissions.adminMarketplaceReportsView))
const router = useRouter()
const route = useRoute()
const activeTab = ref(String(route.query.secao || props.initialTab))
const message = ref('')
const messageError = ref(false)
const dashboard = ref<MarketplaceDashboard | null>(null)
const analytics = ref<Record<string, any>>({})
const economy = ref<MarketplaceEconomy | null>(null)
const acceptedCurrenciesText = ref('')
const allowedCategoriesText = ref('')
const emptyPage = <T,>(): { data: T[], total: number, page: number, pageSize: number, totalPages: number } => ({ data: [], total: 0, page: 1, pageSize: 30, totalPages: 1 })
const listings = ref(emptyPage<MarketplaceListing>())
const escrow = ref(emptyPage<MarketplaceEscrow>())
const transactions = ref(emptyPage<MarketplaceOrder>())
const reports = ref(emptyPage<MarketplaceReport>())
const tasks = ref(emptyPage<MarketplaceTask>())
const filters = reactive({ search: '', status: String(route.query.status || ''), page: 1, pageSize: 30 })
const taskForm = reactive({
  title: '',
  type: 'REPORT_REVIEW',
  description: '',
  assigneeId: '',
  listingId: null as string | null,
  orderId: null as string | null,
  reportId: null as string | null
})
const selectedListingIds = ref<string[]>([])
const bulkListingAction = ref('SUSPEND')
const allListingsSelected = computed(() =>
  Boolean(listings.value.data.length) &&
  listings.value.data.every(row => selectedListingIds.value.includes(row.id))
)

const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowed: computed(() => true) },
  { key: 'listings', label: 'Anuncios', icon: ShoppingBag, allowed: canModerateListings },
  { key: 'escrow', label: 'Escrow', icon: ShieldCheck, allowed: canOperateEscrow },
  { key: 'transactions', label: 'Transacoes', icon: ReceiptText, allowed: canOperateTransactions },
  { key: 'reports', label: 'Denuncias', icon: Flag, allowed: canModerateReports },
  { key: 'tasks', label: 'Tarefas', icon: ClipboardList, allowed: canManageTasks },
  { key: 'economy', label: 'Economia', icon: Settings2, allowed: computed(() => true) },
  { key: 'analytics', label: 'Relatorios', icon: BarChart3, allowed: canViewReports }
]
const visibleTabs = computed(() => tabs.filter(item => item.allowed.value))
const listingStatuses = ['DRAFT', 'ESCROW_PENDING', 'ACTIVE', 'RESERVED', 'SOLD', 'CANCELED', 'EXPIRED', 'SUSPENDED', 'RETURN_PENDING', 'RETURNED', 'MANUAL_REVIEW', 'FAILED']
const escrowStatuses = ['ENTRY_PENDING', 'HELD', 'TRANSFER_PENDING', 'RETURN_PENDING', 'RELEASED_TO_BUYER', 'RETURNED_TO_SELLER', 'FROZEN', 'MANUAL_REVIEW', 'FAILED']
const orderStatuses = ['PREPARED', 'PAID', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED']
const reportStatuses = ['NEW', 'ASSIGNED', 'INVESTIGATING', 'WAITING_FOR_USER', 'RESOLVED', 'REJECTED', 'ESCALATED']

const dashboardMetrics = computed(() => {
  if (!dashboard.value) return []
  return [
    ['Anuncios ativos', dashboard.value.activeListings],
    ['Criados hoje', dashboard.value.createdToday],
    ['Vendas concluidas', dashboard.value.soldListings],
    ['Transacoes em curso', dashboard.value.transactionsInProgress],
    ['Itens em escrow', dashboard.value.escrowHeld],
    ['Falhas de retorno', dashboard.value.returnFailures],
    ['Denuncias pendentes', dashboard.value.pendingReports],
    ['Usuarios suspensos', dashboard.value.suspendedUsers],
    ['Erros criticos', dashboard.value.criticalErrors],
    ['Minhas tarefas', dashboard.value.assignedTasks],
    ['Expirados', dashboard.value.expiredListings],
    ['Suspensos', dashboard.value.suspendedListings]
  ].map(([label, value]) => ({ label, value }))
})

const notify = (text: string, error = false) => {
  message.value = text
  messageError.value = error
}
const askReason = (label: string) => import.meta.client ? window.prompt(`Justificativa para ${label}:`)?.trim() || '' : ''
const setTab = async (tab: string) => {
  activeTab.value = tab
  filters.search = ''
  filters.status = ''
  filters.page = 1
  await router.replace({ query: { ...route.query, secao: tab } })
  await loadActive()
}

watch(
  [() => route.query.secao, () => route.query.status],
  async ([section, status]) => {
    const next = String(section || 'dashboard')
    filters.status = String(status || '')
    filters.page = 1
    if (activeTab.value === next) {
      await loadActive()
      return
    }
    activeTab.value = next
    await loadActive()
  }
)
const loadDashboard = async () => { dashboard.value = await api.adminDashboard() }
const loadListings = async () => {
  listings.value = await api.adminManageListings(filters)
  selectedListingIds.value = selectedListingIds.value.filter(id =>
    listings.value.data.some(row => row.id === id)
  )
}
const loadEscrow = async () => { escrow.value = await api.adminEscrow(filters) }
const loadTransactions = async () => { transactions.value = await api.adminTransactions(filters) }
const loadReports = async () => { reports.value = await api.adminReports(filters) }
const loadTasks = async () => { tasks.value = await api.adminTasks(filters) }
const loadEconomy = async () => {
  economy.value = await api.adminEconomy()
  acceptedCurrenciesText.value = economy.value.acceptedCurrencies.join(', ')
  allowedCategoriesText.value = economy.value.allowedCategories?.join(', ') || ''
}
const loadAnalytics = async () => { analytics.value = await api.adminAnalytics() }
const loaders: Record<string, () => Promise<void>> = {
  dashboard: loadDashboard, listings: loadListings, escrow: loadEscrow,
  transactions: loadTransactions, reports: loadReports, tasks: loadTasks,
  economy: loadEconomy, analytics: loadAnalytics
}
const loadActive = async () => {
  try {
    await (loaders[activeTab.value] || loadDashboard)()
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Falha ao carregar o marketplace.', true)
  }
}
const changePage = async (page: number, loader: () => Promise<void>) => {
  filters.page = page
  await loader()
}
const reloadPage = async (loader: () => Promise<void>) => {
  filters.page = 1
  await loader()
}
const listingAction = async (row: MarketplaceListing, action: string) => {
  const reason = askReason(action)
  if (!reason) return
  try { await api.adminListingAction(row.id, action, reason); notify('Anuncio atualizado e auditado.'); await loadListings() } catch { notify('Nao foi possivel atualizar o anuncio.', true) }
}
const toggleAllListings = () => {
  selectedListingIds.value = allListingsSelected.value
    ? []
    : listings.value.data.map(row => row.id)
}
const runListingBulkAction = async () => {
  const reason = askReason(`${bulkListingAction.value} em lote`)
  if (!reason) return
  try {
    const result = await api.adminListingBulkAction(
      selectedListingIds.value,
      bulkListingAction.value,
      reason
    )
    notify(`${result.succeeded} anuncios atualizados; ${result.failed} falharam.`)
    selectedListingIds.value = []
    await loadListings()
  } catch {
    notify('Nao foi possivel executar a acao em lote.', true)
  }
}
const exportListings = async () => {
  try {
    const result = await api.adminExportListings(filters)
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `marketplace-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    notify(`${result.rows.length} anuncios exportados.`)
  } catch {
    notify('Falha ao exportar anuncios.', true)
  }
}
const escrowAction = async (row: MarketplaceEscrow, action: string) => {
  const reason = askReason(action)
  if (!reason) return
  try { await api.adminEscrowAction(row.id, action, reason); notify('Acao de escrow registrada.'); await loadEscrow() } catch { notify('Falha na acao de escrow.', true) }
}
const transactionAction = async (row: MarketplaceOrder, action: string) => {
  const reason = askReason(action)
  if (!reason) return
  try { await api.adminTransactionAction(row.id, action, reason); notify('Transacao atualizada.'); await loadTransactions() } catch { notify('Falha ao operar a transacao.', true) }
}
const reportAction = async (row: MarketplaceReport, action: string) => {
  const reason = askReason(action)
  if (!reason) return
  const payload: Record<string, unknown> = { action, reason }
  if (action === 'ASSIGN') Object.assign(payload, { status: 'ASSIGNED', assignedTo: user.value?.id })
  if (action === 'INVESTIGATE') Object.assign(payload, { status: 'INVESTIGATING', assignedTo: user.value?.id })
  try { await api.adminUpdateReport(row.id, payload); notify('Denuncia atualizada.'); await loadReports() } catch { notify('Falha ao moderar denuncia.', true) }
}
const suspendReportedUser = async (row: MarketplaceReport) => {
  const reason = askReason('suspensao do usuario')
  if (!reason) return
  try {
    await api.adminSuspendReportedUser(row.id, reason)
    notify('Usuario bloqueado com permissao dedicada e auditoria.')
    await loadReports()
  } catch {
    notify('Nao foi possivel bloquear o usuario denunciado.', true)
  }
}
const openTaskFor = async (
  type: string,
  links: { listingId?: string | null, orderId?: string | null, reportId?: string | null }
) => {
  Object.assign(taskForm, {
    type,
    title: `Revisar ${type.toLowerCase().replaceAll('_', ' ')}`,
    listingId: links.listingId || null,
    orderId: links.orderId || null,
    reportId: links.reportId || null
  })
  await setTab('tasks')
}
const createTask = async () => {
  try {
    await api.adminCreateTask({ ...taskForm, assigneeId: taskForm.assigneeId || null })
    Object.assign(taskForm, {
      title: '',
      description: '',
      assigneeId: '',
      listingId: null,
      orderId: null,
      reportId: null
    })
    notify('Tarefa criada e vinculada ao log de trabalho.')
    await loadTasks()
  } catch { notify('Falha ao criar tarefa.', true) }
}
const updateTask = async (row: MarketplaceTask, status: string) => {
  try { await api.adminUpdateTask(row.id, { status }); notify('Tarefa atualizada.'); await loadTasks() } catch { notify('Falha ao atualizar tarefa.', true) }
}
const saveEconomy = async () => {
  if (!economy.value) return
  const reason = askReason('alteracao economica')
  if (!reason) return
  const acceptedCurrencies = acceptedCurrenciesText.value
    .split(',')
    .map(value => value.trim().toUpperCase())
    .filter((value): value is MarketplaceEconomy['acceptedCurrencies'][number] =>
      ['WCOIN', 'GOBLIN_POINT', 'HUNT_POINT'].includes(value)
    )
  const allowedCategories = allowedCategoriesText.value
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  try {
    economy.value = await api.adminUpdateEconomy({
      ...economy.value,
      acceptedCurrencies,
      allowedCategories: allowedCategories.length ? allowedCategories : null,
      reason
    })
    notify('Economia atualizada e auditada.')
  } catch {
    notify('Somente Super ADM pode alterar a economia.', true)
  }
}
const analyticsRows = (key: string) => Array.isArray(analytics.value[key]) ? analytics.value[key] : []

onMounted(async () => {
  if (!visibleTabs.value.some(item => item.key === activeTab.value)) {
    activeTab.value = 'dashboard'
    await router.replace({ query: { ...route.query, secao: 'dashboard' } })
  }
  await loadActive()
})
</script>

<style scoped>
.bm-status { display: inline-flex; border: 1px solid rgb(245 158 11 / .28); border-radius: 3px; background: rgb(245 158 11 / .1); padding: 3px 6px; color: rgb(253 230 138); font-size: 8px; font-weight: 900; letter-spacing: .12em; }
</style>
